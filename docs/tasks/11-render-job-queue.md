# Task 11: Render Job Queue via API

## Overview

Create API endpoints for submitting render jobs, batch rendering, and tracking render status. Renders are queued via BullMQ and processed by the render worker (Task 12).

## Subtasks

1. [ ] POST /api/renders — create render job with validation
2. [ ] POST /api/renders/batch — batch render multiple posts
3. [ ] GET /api/renders — list renders with filters
4. [ ] GET /api/renders/:id — get render details + progress
5. [ ] Verify: render job is created, queued in BullMQ, status is tracked

## Details

### Render Routes (`apps/api/src/routes/renders.ts`)

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { db, renders, posts } from '@renderforge/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { addRenderJob } from '../jobs/queues';

const renderRoutes = new Hono();

const createRenderSchema = z.object({
  postId: z.string().uuid(),
  format: z.enum(['story', 'post', 'landscape']).default('story'),
});

const batchRenderSchema = z.object({
  postIds: z.array(z.string().uuid()).min(1).max(50),
  formats: z.array(z.enum(['story', 'post', 'landscape'])).min(1).default(['story']),
});

// POST /api/renders — create single render job
renderRoutes.post('/', async (c) => {
  const data = createRenderSchema.parse(await c.req.json());

  // Validate post exists and is "ready"
  const [post] = await db.select().from(posts).where(eq(posts.id, data.postId));
  if (!post) return c.json({ error: 'Post not found' }, 404);
  if (post.status !== 'ready' && post.status !== 'rendered') {
    return c.json({
      error: `Post must be in "ready" or "rendered" status to render. Current: "${post.status}"`,
    }, 400);
  }

  // Create renders DB row
  const [render] = await db.insert(renders).values({
    postId: data.postId,
    format: data.format,
    status: 'queued',
    progress: 0,
  }).returning();

  // Update post status to "rendering"
  await db.update(posts).set({ status: 'rendering', updatedAt: new Date() })
    .where(eq(posts.id, data.postId));

  // Add to BullMQ queue
  const job = await addRenderJob({
    renderId: render.id,
    postId: data.postId,
    format: data.format,
  });

  // Store job ID for reference
  await db.update(renders).set({ jobId: job.id })
    .where(eq(renders.id, render.id));

  return c.json({
    render: { ...render, jobId: job.id },
    message: 'Render job queued',
  }, 201);
});

// POST /api/renders/batch — batch render multiple posts × formats
renderRoutes.post('/batch', async (c) => {
  const data = batchRenderSchema.parse(await c.req.json());
  const results: Array<{ postId: string; format: string; renderId?: string; error?: string }> = [];

  for (const postId of data.postIds) {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));

    if (!post) {
      results.push({ postId, format: '*', error: 'Post not found' });
      continue;
    }

    if (post.status !== 'ready' && post.status !== 'rendered') {
      results.push({ postId, format: '*', error: `Invalid status: ${post.status}` });
      continue;
    }

    for (const format of data.formats) {
      try {
        const [render] = await db.insert(renders).values({
          postId,
          format,
          status: 'queued',
          progress: 0,
        }).returning();

        const job = await addRenderJob({ renderId: render.id, postId, format });
        await db.update(renders).set({ jobId: job.id }).where(eq(renders.id, render.id));

        results.push({ postId, format, renderId: render.id });
      } catch (err: any) {
        results.push({ postId, format, error: err.message });
      }
    }

    // Update post status
    await db.update(posts).set({ status: 'rendering', updatedAt: new Date() })
      .where(eq(posts.id, postId));
  }

  const queued = results.filter(r => r.renderId).length;
  const errors = results.filter(r => r.error).length;

  return c.json({ total: results.length, queued, errors, results }, 201);
});

// GET /api/renders — list renders with filters
renderRoutes.get('/', async (c) => {
  const postId = c.req.query('postId');
  const status = c.req.query('status');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const conditions = [];
  if (postId) conditions.push(eq(renders.postId, postId));
  if (status) conditions.push(eq(renders.status, status as any));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(renders).where(where)
      .limit(limit).offset(offset).orderBy(desc(renders.createdAt)),
    db.select({ count: sql<number>`count(*)` }).from(renders).where(where),
  ]);

  return c.json({
    items,
    total: Number(countResult[0].count),
    page,
    limit,
    totalPages: Math.ceil(Number(countResult[0].count) / limit),
  });
});

// GET /api/renders/:id — get render details
renderRoutes.get('/:id', async (c) => {
  const [render] = await db.select().from(renders).where(eq(renders.id, c.req.param('id')));
  if (!render) return c.json({ error: 'Render not found' }, 404);

  // Include presigned URL if completed
  let downloadUrl: string | undefined;
  if (render.status === 'completed' && render.outputUrl) {
    downloadUrl = await storage.getPresignedUrl(render.outputUrl);
  }

  return c.json({ ...render, downloadUrl });
});

// POST /api/renders/:id/retry — retry a failed render
renderRoutes.post('/:id/retry', async (c) => {
  const [render] = await db.select().from(renders).where(eq(renders.id, c.req.param('id')));
  if (!render) return c.json({ error: 'Render not found' }, 404);
  if (render.status !== 'failed') {
    return c.json({ error: 'Can only retry failed renders' }, 400);
  }

  // Reset and re-queue
  await db.update(renders).set({
    status: 'queued',
    progress: 0,
    error: null,
    updatedAt: new Date(),
  }).where(eq(renders.id, render.id));

  const job = await addRenderJob({
    renderId: render.id,
    postId: render.postId,
    format: render.format,
  });

  await db.update(renders).set({ jobId: job.id }).where(eq(renders.id, render.id));

  return c.json({ message: 'Render re-queued', jobId: job.id });
});

// POST /api/renders/:id/cancel — cancel a queued/rendering job
renderRoutes.post('/:id/cancel', async (c) => {
  const [render] = await db.select().from(renders).where(eq(renders.id, c.req.param('id')));
  if (!render) return c.json({ error: 'Render not found' }, 404);

  if (!['queued', 'rendering'].includes(render.status)) {
    return c.json({ error: 'Can only cancel queued or rendering jobs' }, 400);
  }

  // Remove from BullMQ if queued
  if (render.jobId) {
    const job = await renderQueue.getJob(render.jobId);
    if (job) await job.remove();
  }

  await db.update(renders).set({
    status: 'cancelled',
    updatedAt: new Date(),
  }).where(eq(renders.id, render.id));

  return c.json({ message: 'Render cancelled' });
});

export { renderRoutes };
```

### Server Integration

```typescript
import { renderRoutes } from './routes/renders';
app.route('/api/renders', renderRoutes);
```

## Verification

1. Create a render job:
   ```bash
   curl -X POST http://localhost:3100/api/renders \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"postId": "<ready-post-id>", "format": "story"}'
   ```
   Returns 201 with render ID and job ID

2. Attempting to render a non-ready post returns 400

3. Batch render:
   ```bash
   curl -X POST http://localhost:3100/api/renders/batch \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"postIds": ["id1", "id2"], "formats": ["story", "post"]}'
   ```
   Creates 4 render jobs (2 posts x 2 formats)

4. `GET /api/renders` lists all renders with pagination
5. `GET /api/renders?postId=xxx` filters by post
6. `GET /api/renders/:id` shows render detail with progress
7. `POST /api/renders/:id/retry` re-queues a failed render
8. `POST /api/renders/:id/cancel` cancels a queued render
9. Render appears in BullMQ dashboard (Bull Board or similar)
