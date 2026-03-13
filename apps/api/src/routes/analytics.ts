import { Hono } from "hono";
import { db, analytics, scheduledPosts, posts, eq, desc, sql, count } from "@renderforge/db";
import { authMiddleware } from "../middleware/auth.js";

const analyticsRouter = new Hono();

analyticsRouter.use("*", authMiddleware);

analyticsRouter.get("/overview", async (c) => {
  const totals = await db
    .select({
      totalViews: sql<number>`coalesce(sum(${analytics.views}), 0)`,
      totalLikes: sql<number>`coalesce(sum(${analytics.likes}), 0)`,
      totalShares: sql<number>`coalesce(sum(${analytics.shares}), 0)`,
      totalComments: sql<number>`coalesce(sum(${analytics.comments}), 0)`,
    })
    .from(analytics);

  const [{ publishedCount }] = await db
    .select({ publishedCount: count() })
    .from(scheduledPosts)
    .where(eq(scheduledPosts.status, "published"));

  return c.json({
    ...totals[0],
    publishedCount,
  });
});

analyticsRouter.get("/posts", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const perPage = Number(c.req.query("perPage") ?? 20);
  const offset = (page - 1) * perPage;

  const results = await db
    .select({
      postId: scheduledPosts.postId,
      postTitle: posts.title,
      views: sql<number>`coalesce(sum(${analytics.views}), 0)`,
      likes: sql<number>`coalesce(sum(${analytics.likes}), 0)`,
      shares: sql<number>`coalesce(sum(${analytics.shares}), 0)`,
      comments: sql<number>`coalesce(sum(${analytics.comments}), 0)`,
    })
    .from(analytics)
    .innerJoin(scheduledPosts, eq(analytics.scheduledPostId, scheduledPosts.id))
    .innerJoin(posts, eq(scheduledPosts.postId, posts.id))
    .groupBy(scheduledPosts.postId, posts.title)
    .orderBy(desc(sql`sum(${analytics.views})`))
    .limit(perPage)
    .offset(offset);

  return c.json({ items: results });
});

export { analyticsRouter };
