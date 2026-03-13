import { db, posts, renders, niches, count, eq, sql } from "@renderforge/db";

export const dashboardService = {
  async getStats() {
    const [
      [{ totalPosts }],
      [{ totalRenders }],
      [{ pendingAudio }],
      [{ publishedThisWeek }],
    ] = await Promise.all([
      db.select({ totalPosts: count() }).from(posts),
      db.select({ totalRenders: count() }).from(renders),
      db.select({ pendingAudio: count() }).from(posts).where(eq(posts.status, "audio_pending")),
      db.select({ publishedThisWeek: count() }).from(posts)
        .where(sql`${posts.status} = 'published' AND ${posts.createdAt} > now() - interval '7 days'`),
    ]);

    // Renders by status
    const rendersByStatus = await db
      .select({ status: renders.status, count: count() })
      .from(renders)
      .groupBy(renders.status);

    // Posts by niche
    const postsByNiche = await db
      .select({ nicheId: posts.nicheId, nicheName: niches.name, count: count() })
      .from(posts)
      .innerJoin(niches, eq(posts.nicheId, niches.id))
      .groupBy(posts.nicheId, niches.name);

    return {
      totalPosts,
      totalRenders,
      pendingAudio,
      publishedThisWeek,
      rendersByStatus,
      postsByNiche,
    };
  },
};
