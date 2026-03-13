import { Worker, type Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { db, scheduledPosts, socialAccounts, renders, posts, eq } from "@renderforge/db";
import { decrypt } from "../lib/crypto.js";
import { getProvider } from "../social/providers/index.js";
import type { SocialVideoMetadata } from "../social/types.js";

export type PublishJobData = {
  scheduledPostId: string;
  postId: string;
  renderId: string;
  socialAccountId: string;
};

async function processPublishJob(job: Job<PublishJobData>) {
  const { scheduledPostId, postId, renderId, socialAccountId } = job.data;
  console.log(`[publish-worker] Publishing scheduled post ${scheduledPostId} for post ${postId}`);

  try {
    // Update status to publishing
    await db
      .update(scheduledPosts)
      .set({ status: "publishing" })
      .where(eq(scheduledPosts.id, scheduledPostId));

    // Fetch render, post, and social account
    const [render] = await db.select().from(renders).where(eq(renders.id, renderId)).limit(1);
    if (!render) throw new Error(`Render ${renderId} not found`);
    if (!render.outputUrl) throw new Error(`Render ${renderId} has no output file`);
    if (render.status !== "completed") throw new Error(`Render ${renderId} is not completed (status: ${render.status})`);

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) throw new Error(`Post ${postId} not found`);

    const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, socialAccountId)).limit(1);
    if (!account) throw new Error(`Social account ${socialAccountId} not found`);

    // Generate presigned URL for the video file
    const { storage } = await import("../services/storage.js");
    const s3Key = render.outputUrl.startsWith("renders/") ? render.outputUrl : `renders/${render.id}.mp4`;
    const videoUrl = await storage.getPresignedUrl(s3Key, 3600);

    // Decrypt the access token
    const accessToken = decrypt(account.accessTokenEnc);

    // Build metadata
    const metadata = (post.metadata ?? {}) as Record<string, unknown>;
    const videoMetadata: SocialVideoMetadata = {
      title: post.title,
      description: (metadata.description as string) || post.title,
      tags: (metadata.tags as string[]) || ["motivation", "mindset", "yourlastdollar"],
    };

    // Get the provider and publish
    const provider = getProvider(account.provider);
    console.log(`[publish-worker] Uploading to ${account.provider} (${account.accountName})...`);

    const result = await provider.publish(videoUrl, videoMetadata, accessToken);

    // Update scheduled post as published
    await db
      .update(scheduledPosts)
      .set({
        status: "published",
        publishedAt: new Date(),
        platformPostId: result.platformPostId,
      })
      .where(eq(scheduledPosts.id, scheduledPostId));

    // Update post status to published
    await db
      .update(posts)
      .set({ status: "published" })
      .where(eq(posts.id, postId));

    console.log(`[publish-worker] Published to ${account.provider}! platformPostId=${result.platformPostId}${result.url ? ` url=${result.url}` : ""}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown publish error";
    console.error(`[publish-worker] Failed to publish ${scheduledPostId}:`, errorMsg);

    await db
      .update(scheduledPosts)
      .set({ status: "failed", error: errorMsg })
      .where(eq(scheduledPosts.id, scheduledPostId));

    throw error;
  }
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
