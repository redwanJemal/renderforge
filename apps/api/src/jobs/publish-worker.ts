import { Worker, type Job } from "bullmq";
import { getRedis } from "../lib/redis.js";

export type PublishJobData = {
  scheduledPostId: string;
  postId: string;
  renderId: string;
  socialAccountId: string;
};

async function processPublishJob(job: Job<PublishJobData>) {
  const { scheduledPostId, postId } = job.data;
  console.log(`[publish-worker] Publishing scheduled post ${scheduledPostId} for post ${postId}`);

  // TODO: Implement actual social publishing in Tasks 22-25
  console.log(`[publish-worker] Stub complete for ${scheduledPostId}`);
}

export function createPublishWorker() {
  const redis = getRedis();

  const worker = new Worker<PublishJobData>("publish", processPublishJob, {
    connection: redis,
    concurrency: 2,
  });

  worker.on("completed", (job) => {
    console.log(`[publish-worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[publish-worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
