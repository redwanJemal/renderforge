/**
 * Render Queue — BullMQ-based job queue for production rendering.
 *
 * In development, renders are handled in-process (see routes/render.ts).
 * For production, swap in this queue to handle concurrent renders with
 * configurable concurrency, retries, and Redis-backed persistence.
 *
 * Setup:
 *   npm install bullmq ioredis
 *
 * Usage:
 *   import { renderQueue, addRenderJob } from './queue';
 *
 *   // Add a job
 *   const job = await addRenderJob({
 *     templateId: 'product-launch',
 *     props: { ... },
 *     theme: 'dark',
 *     format: 'story',
 *   });
 *
 *   // Check status
 *   const state = await job.getState();
 */

import type { RenderRequest, RenderJob } from '../types';

interface QueueConfig {
  redisUrl: string;
  concurrency: number;
  maxRetries: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  concurrency: 2,
  maxRetries: 3,
};

/**
 * Initialize the render queue.
 * Call this in production to set up BullMQ workers.
 */
export async function initializeQueue(
  config: Partial<QueueConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Dynamic import to avoid requiring bullmq in dev
    const { Queue, Worker } = await import('bullmq' as string);
    const IORedis = (await import('ioredis' as string)).default;

    const connection = new IORedis(finalConfig.redisUrl);

    const queue = new Queue('renderforge-renders', { connection });

    const worker = new Worker(
      'renderforge-renders',
      async (job: any) => {
        const request: RenderRequest = job.data;
        console.log(`[Queue] Processing render: ${request.templateId} (${job.id})`);

        // The actual render logic would be extracted from routes/render.ts
        // and called here. For now, we log and acknowledge.
        await job.updateProgress(50);

        // Simulate rendering time
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await job.updateProgress(100);
        return { status: 'complete', jobId: job.id };
      },
      {
        connection,
        concurrency: finalConfig.concurrency,
      }
    );

    worker.on('completed', (job: any) => {
      console.log(`[Queue] Render complete: ${job.id}`);
    });

    worker.on('failed', (job: any, err: Error) => {
      console.error(`[Queue] Render failed: ${job?.id}`, err.message);
    });

    console.log(
      `[Queue] Initialized with concurrency=${finalConfig.concurrency}`
    );
  } catch (err) {
    console.warn(
      '[Queue] BullMQ/ioredis not installed. Queue disabled. Install with: npm install bullmq ioredis'
    );
  }
}

/**
 * Add a render job to the queue.
 * Returns a job ID for status tracking.
 */
export async function addRenderJob(
  request: RenderRequest
): Promise<string> {
  try {
    const { Queue } = await import('bullmq' as string);
    const IORedis = (await import('ioredis' as string)).default;

    const connection = new IORedis(
      process.env.REDIS_URL ?? 'redis://localhost:6379'
    );
    const queue = new Queue('renderforge-renders', { connection });

    const job = await queue.add('render', request, {
      attempts: DEFAULT_CONFIG.maxRetries,
      backoff: { type: 'exponential', delay: 2000 },
    });

    await connection.quit();
    return job.id!;
  } catch {
    throw new Error(
      'Queue not available. Install bullmq and ioredis, or use the direct render endpoint.'
    );
  }
}
