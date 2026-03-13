# Task 04: Background Job System (BullMQ + Redis)

## Overview

Set up BullMQ job queues with Redis for background processing of render and publish jobs. Create stub workers, wire them into the server lifecycle, and add an SSE endpoint for render progress streaming.

## Subtasks

1. [ ] Create `apps/api/src/lib/redis.ts` — Redis/IORedis connection factory from config
2. [ ] Create `apps/api/src/jobs/render-worker.ts` — BullMQ worker for 'render' queue (stub implementation)
3. [ ] Create `apps/api/src/jobs/publish-worker.ts` — BullMQ worker for 'publish' queue (stub implementation)
4. [ ] Create `apps/api/src/routes/sse.ts` — SSE endpoint for render progress
5. [ ] Wire workers into server startup with graceful shutdown
6. [ ] Verify: Redis connects, job can be added to queue, worker processes it, SSE endpoint streams events

## Details

### Redis Connection (`apps/api/src/lib/redis.ts`)

```typescript
import IORedis from 'ioredis';
import { config } from '../config';

// Shared connection for general use
export const redis = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Factory for creating new connections (needed for BullMQ workers and subscribers)
export function createRedisConnection() {
  return new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

// Connection for pub/sub (dedicated, since pub/sub puts connection in subscriber mode)
export function createSubscriber() {
  return new IORedis(config.REDIS_URL);
}
```

### Queue Setup (`apps/api/src/jobs/queues.ts`)

```typescript
import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const renderQueue = new Queue('render', { connection: redis });
export const publishQueue = new Queue('publish', { connection: redis });

// Helper to add a render job
export async function addRenderJob(data: {
  renderId: string;
  postId: string;
  format: string;
}) {
  return renderQueue.add('render-video', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });
}

// Helper to add a publish job
export async function addPublishJob(data: {
  scheduledPostId: string;
  renderId: string;
  socialAccountId: string;
}) {
  return publishQueue.add('publish-video', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  });
}
```

### Render Worker (`apps/api/src/jobs/render-worker.ts`)

Stub implementation that simulates rendering:

```typescript
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { db, renders } from '@renderforge/db';
import { eq } from 'drizzle-orm';

type RenderJobData = {
  renderId: string;
  postId: string;
  format: string;
};

async function processRender(job: Job<RenderJobData>) {
  const { renderId, postId, format } = job.data;
  console.log(`[render-worker] Processing render ${renderId} for post ${postId} (${format})`);

  // Update status to rendering
  await db.update(renders).set({ status: 'rendering', progress: 0 }).where(eq(renders.id, renderId));
  await publishProgress(renderId, 0, 'rendering', 'Starting render...');

  // TODO: Replace with actual Remotion render in Task 12
  // Simulate progress
  for (let p = 10; p <= 90; p += 10) {
    await new Promise(resolve => setTimeout(resolve, 500));
    await db.update(renders).set({ progress: p }).where(eq(renders.id, renderId));
    await publishProgress(renderId, p, 'rendering', `Rendering... ${p}%`);
    await job.updateProgress(p);
  }

  // Mark completed
  await db.update(renders).set({
    status: 'completed',
    progress: 100,
    updatedAt: new Date(),
  }).where(eq(renders.id, renderId));
  await publishProgress(renderId, 100, 'completed', 'Render complete');

  return { renderId, status: 'completed' };
}

async function publishProgress(renderId: string, progress: number, status: string, message: string) {
  const { redis } = await import('../lib/redis');
  await redis.publish(`render:progress:${renderId}`, JSON.stringify({ renderId, progress, status, message }));
}

export function startRenderWorker() {
  const worker = new Worker('render', processRender, {
    connection: createRedisConnection(),
    concurrency: 2,
  });

  worker.on('completed', (job) => console.log(`[render-worker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[render-worker] Job ${job?.id} failed:`, err.message));

  return worker;
}
```

### Publish Worker (`apps/api/src/jobs/publish-worker.ts`)

Stub implementation:

```typescript
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';

type PublishJobData = {
  scheduledPostId: string;
  renderId: string;
  socialAccountId: string;
};

async function processPublish(job: Job<PublishJobData>) {
  console.log(`[publish-worker] Processing publish for scheduled post ${job.data.scheduledPostId}`);
  // TODO: Implement in Task 26 with actual social provider calls
  return { status: 'completed' };
}

export function startPublishWorker() {
  const worker = new Worker('publish', processPublish, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  worker.on('completed', (job) => console.log(`[publish-worker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[publish-worker] Job ${job?.id} failed:`, err.message));

  return worker;
}
```

### SSE Endpoint (`apps/api/src/routes/sse.ts`)

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createSubscriber } from '../lib/redis';

const sseRoutes = new Hono();

// SSE for a specific render
sseRoutes.get('/renders/:id', async (c) => {
  const renderId = c.req.param('id');

  return streamSSE(c, async (stream) => {
    const subscriber = createSubscriber();
    const channel = `render:progress:${renderId}`;

    await subscriber.subscribe(channel);

    // Heartbeat interval
    const heartbeat = setInterval(() => {
      stream.writeSSE({ data: '', event: 'heartbeat' });
    }, 15000);

    subscriber.on('message', (_ch, message) => {
      stream.writeSSE({ data: message, event: 'progress' });
    });

    // Cleanup on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    });
  });
});

export { sseRoutes };
```

### Server Integration

Update `apps/api/src/server.ts` to start workers and handle graceful shutdown:

```typescript
import { startRenderWorker } from './jobs/render-worker';
import { startPublishWorker } from './jobs/publish-worker';
import { sseRoutes } from './routes/sse';

// Add SSE routes (protected)
app.route('/api/sse', sseRoutes);

// Start workers
const renderWorker = startRenderWorker();
const publishWorker = startPublishWorker();
console.log('Workers started');

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await renderWorker.close();
  await publishWorker.close();
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

## Verification

1. Redis connects successfully (check health endpoint)
2. Add a test job: `await renderQueue.add('render-video', { renderId: 'test', postId: 'test', format: 'story' })`
3. Worker picks up and processes the job (see console logs)
4. Progress published to Redis pub/sub channel
5. SSE endpoint at `GET /api/sse/renders/:id` streams progress events when connected via EventSource
6. Graceful shutdown closes workers and Redis connections cleanly
