# Task 07: Post Management API

## Overview

Create full CRUD API for posts with nested scene management. Posts represent individual content pieces that go through a status workflow from draft to published. Each post contains multiple scenes with text, narration, and audio.

## Subtasks

1. [ ] Create `apps/api/src/services/post.ts` — CRUD with scenes: list, getById, create, update, delete, updateStatus
2. [ ] Create `apps/api/src/routes/posts.ts` — full CRUD + status transitions
3. [ ] Scene sub-routes: PUT /api/posts/:id/scenes (bulk upsert), POST /api/posts/:id/scenes/:sceneId/audio
4. [ ] Status workflow validation: enforce valid transitions
5. [ ] Verify: create post with scenes, update scenes, upload scene audio, status transitions work

## Details

### Status Workflow

```
draft → audio_pending → ready → rendering → rendered → published
```

Valid transitions:
- `draft` → `audio_pending` (scripts written, awaiting TTS)
- `audio_pending` → `ready` (all scene audio uploaded)
- `ready` → `rendering` (render job started)
- `rendering` → `rendered` (render completed)
- `rendering` → `ready` (render failed, can retry)
- `rendered` → `published` (published to social)
- Any → `draft` (reset to draft)

### Post Service (`apps/api/src/services/post.ts`)

```typescript
import { db, posts, scenes } from '@renderforge/db';
import { eq, and, ilike, sql, inArray, asc } from 'drizzle-orm';

type CreatePostInput = {
  nicheId: string;
  title: string;
  theme?: string;
  templateId?: string;
  format?: string;
  metadata?: Record<string, unknown>;
  scenes?: CreateSceneInput[];
};

type CreateSceneInput = {
  sortOrder: number;
  key: string;
  displayText: string;
  narrationText: string;
  entrance?: string;
  textSize?: string;
  extraProps?: Record<string, unknown>;
};

type ListOptions = {
  nicheId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['audio_pending', 'ready'], // ready allowed if no audio needed
  audio_pending: ['ready', 'draft'],
  ready: ['rendering', 'draft'],
  rendering: ['rendered', 'ready'], // ready on failure
  rendered: ['published', 'ready', 'draft'],
  published: ['draft'],
};

export const postService = {
  async list(options: ListOptions = {}) {
    const { nicheId, status, search, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const conditions = [];

    if (nicheId) conditions.push(eq(posts.nicheId, nicheId));
    if (status) conditions.push(eq(posts.status, status as any));
    if (search) conditions.push(ilike(posts.title, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db.select().from(posts).where(where).limit(limit).offset(offset).orderBy(posts.createdAt),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(where),
    ]);

    return {
      items,
      total: Number(countResult[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    };
  },

  async getById(id: string) {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) return null;

    const postScenes = await db.select().from(scenes)
      .where(eq(scenes.postId, id))
      .orderBy(asc(scenes.sortOrder));

    return { ...post, scenes: postScenes };
  },

  async create(input: CreatePostInput) {
    const { scenes: sceneInputs, ...postData } = input;

    const [post] = await db.insert(posts).values(postData).returning();

    if (sceneInputs?.length) {
      const sceneRows = sceneInputs.map(s => ({ ...s, postId: post.id }));
      await db.insert(scenes).values(sceneRows);
    }

    return this.getById(post.id);
  },

  async update(id: string, input: Partial<CreatePostInput>) {
    const { scenes: sceneInputs, ...postData } = input;

    const [post] = await db.update(posts)
      .set({ ...postData, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();

    if (!post) return null;
    return this.getById(post.id);
  },

  async delete(id: string) {
    // Scenes cascade delete via FK
    const [post] = await db.delete(posts).where(eq(posts.id, id)).returning();
    return post || null;
  },

  async updateStatus(id: string, newStatus: string) {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    if (!post) throw new NotFoundError('Post not found');

    const allowed = VALID_TRANSITIONS[post.status];
    if (!allowed?.includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition: ${post.status} → ${newStatus}. Allowed: ${allowed?.join(', ')}`
      );
    }

    const [updated] = await db.update(posts)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();

    return updated;
  },

  // Bulk upsert scenes for a post
  async upsertScenes(postId: string, sceneInputs: CreateSceneInput[]) {
    // Delete existing scenes
    await db.delete(scenes).where(eq(scenes.postId, postId));

    // Insert new scenes
    if (sceneInputs.length > 0) {
      const sceneRows = sceneInputs.map(s => ({ ...s, postId }));
      await db.insert(scenes).values(sceneRows);
    }

    return db.select().from(scenes)
      .where(eq(scenes.postId, postId))
      .orderBy(asc(scenes.sortOrder));
  },
};
```

### Routes (`apps/api/src/routes/posts.ts`)

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { postService } from '../services/post';
import { storage } from '../services/storage';
import { getAudioDuration } from '../lib/ffprobe';

const postRoutes = new Hono();

const sceneSchema = z.object({
  sortOrder: z.number().int().min(0),
  key: z.string().min(1),
  displayText: z.string().min(1),
  narrationText: z.string().min(1),
  entrance: z.string().default('fade'),
  textSize: z.string().default('md'),
  extraProps: z.record(z.unknown()).optional(),
});

const createPostSchema = z.object({
  nicheId: z.string().uuid(),
  title: z.string().min(1),
  theme: z.string().optional(),
  templateId: z.string().optional(),
  format: z.string().default('story'),
  metadata: z.record(z.unknown()).optional(),
  scenes: z.array(sceneSchema).optional(),
});

const updatePostSchema = createPostSchema.partial();

// GET /api/posts — list with filters
postRoutes.get('/', async (c) => {
  const result = await postService.list({
    nicheId: c.req.query('nicheId'),
    status: c.req.query('status'),
    search: c.req.query('search'),
    page: parseInt(c.req.query('page') || '1'),
    limit: parseInt(c.req.query('limit') || '20'),
  });
  return c.json(result);
});

// GET /api/posts/:id — get with scenes
postRoutes.get('/:id', async (c) => {
  const post = await postService.getById(c.req.param('id'));
  if (!post) return c.json({ error: 'Post not found' }, 404);
  return c.json(post);
});

// POST /api/posts — create with optional scenes
postRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const data = createPostSchema.parse(body);
  const post = await postService.create(data);
  return c.json(post, 201);
});

// PUT /api/posts/:id — update post
postRoutes.put('/:id', async (c) => {
  const body = await c.req.json();
  const data = updatePostSchema.parse(body);
  const post = await postService.update(c.req.param('id'), data);
  if (!post) return c.json({ error: 'Post not found' }, 404);
  return c.json(post);
});

// DELETE /api/posts/:id — delete post and cascade scenes
postRoutes.delete('/:id', async (c) => {
  const post = await postService.delete(c.req.param('id'));
  if (!post) return c.json({ error: 'Post not found' }, 404);
  return c.json({ message: 'Deleted' });
});

// PATCH /api/posts/:id/status — update status with validation
postRoutes.patch('/:id/status', async (c) => {
  const { status } = z.object({ status: z.string() }).parse(await c.req.json());
  const post = await postService.updateStatus(c.req.param('id'), status);
  return c.json(post);
});

// PUT /api/posts/:id/scenes — bulk upsert scenes
postRoutes.put('/:id/scenes', async (c) => {
  const body = await c.req.json();
  const data = z.array(sceneSchema).parse(body);
  const postScenes = await postService.upsertScenes(c.req.param('id'), data);
  return c.json(postScenes);
});

// POST /api/posts/:id/scenes/:sceneId/audio — upload audio for a specific scene
postRoutes.post('/:id/scenes/:sceneId/audio', async (c) => {
  // Handle multipart upload, ffprobe duration, update scene
  // See Task 08 for full implementation
});

export { postRoutes };
```

### Server Integration

```typescript
import { postRoutes } from './routes/posts';
app.route('/api/posts', postRoutes);
```

## Verification

1. `POST /api/posts` creates a post with scenes
2. `GET /api/posts` returns paginated list with filters (nicheId, status, search)
3. `GET /api/posts/:id` returns post with all scenes ordered by sortOrder
4. `PUT /api/posts/:id` updates post fields
5. `PUT /api/posts/:id/scenes` bulk-replaces all scenes
6. `DELETE /api/posts/:id` cascades to delete scenes
7. `PATCH /api/posts/:id/status` validates transitions:
   - `draft → audio_pending` succeeds
   - `draft → published` fails with 400
   - `rendering → rendered` succeeds
8. Scene audio upload endpoint exists (implementation in Task 08)
