import { Worker, type Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { db, scheduledPosts, socialAccounts, analytics, eq } from "@renderforge/db";
import { getProvider } from "../social/providers/index.js";
import { decrypt } from "../lib/crypto.js";

export function createAnalyticsWorker() {
  const redis = getRedis();

  const worker = new Worker(
    "analytics",
    async (job: Job) => {
      console.log("[analytics-worker] Fetching analytics...");

      // Get all published posts with social accounts
      const published = await db
        .select()
        .from(scheduledPosts)
        .where(eq(scheduledPosts.status, "published"));

      for (const post of published) {
        if (!post.platformPostId) continue;

        try {
          const [account] = await db
            .select()
            .from(socialAccounts)
            .where(eq(socialAccounts.id, post.socialAccountId))
            .limit(1);

          if (!account) continue;

          const provider = getProvider(account.provider);
          const accessToken = decrypt(account.accessTokenEnc);
          const data = await provider.getAnalytics(post.platformPostId, accessToken);

          await db.insert(analytics).values({
            scheduledPostId: post.id,
            views: data.views,
            likes: data.likes,
            shares: data.shares,
            comments: data.comments,
            engagementRate: String(data.engagementRate),
          });
        } catch (err) {
          console.error(`[analytics-worker] Failed for post ${post.id}:`, err);
        }
      }

      console.log(`[analytics-worker] Processed ${published.length} posts`);
    },
    { connection: redis },
  );

  return worker;
}
