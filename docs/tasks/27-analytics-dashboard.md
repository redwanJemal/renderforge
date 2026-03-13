# Task 27: Analytics Dashboard

## Overview

Build the analytics dashboard that fetches performance data from social media platforms and displays engagement metrics, trends, and per-post breakdowns.

## Subtasks

1. [ ] Create `apps/api/src/jobs/analytics-worker.ts` — BullMQ repeatable job to fetch analytics every 6 hours
2. [ ] Create `apps/api/src/routes/analytics.ts` — analytics API endpoints
3. [ ] Create `apps/admin/src/features/analytics/` — AnalyticsPage with charts and tables
4. [ ] Create `apps/admin/src/hooks/use-analytics.ts` — TanStack Query hooks
5. [ ] Verify: analytics fetched from providers, displayed in dashboard with charts

## Details

### Analytics Worker (`apps/api/src/jobs/analytics-worker.ts`)

```typescript
import { Worker, Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { db, analytics, scheduledPosts, socialAccounts } from '@renderforge/db';
import { eq, and } from 'drizzle-orm';
import { socialRegistry } from '../social/registry';
import { decrypt } from '../lib/crypto';

export function startAnalyticsWorker() {
  const queue = new Queue('analytics', { connection: createRedisConnection() });

  // Run every 6 hours
  queue.add('fetch-analytics', {}, {
    repeat: { every: 6 * 60 * 60 * 1000 },
    removeOnComplete: { count: 10 },
  });

  const worker = new Worker('analytics', async () => {
    console.log('[analytics-worker] Fetching analytics for published posts...');

    // Get all published scheduled posts
    const published = await db.select({
      id: scheduledPosts.id,
      platformPostId: scheduledPosts.platformPostId,
      provider: socialAccounts.provider,
      accessTokenEnc: socialAccounts.accessTokenEnc,
    })
      .from(scheduledPosts)
      .innerJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
      .where(eq(scheduledPosts.status, 'published'));

    let fetched = 0;
    let errors = 0;

    for (const post of published) {
      if (!post.platformPostId) continue;

      try {
        const provider = socialRegistry.get(post.provider);
        const accessToken = decrypt(post.accessTokenEnc);
        const stats = await provider.getAnalytics(post.platformPostId, accessToken);

        // Upsert analytics record
        await db.insert(analytics).values({
          scheduledPostId: post.id,
          views: stats.views,
          likes: stats.likes,
          shares: stats.shares,
          comments: stats.comments,
          engagementRate: stats.engagementRate.toFixed(2),
          fetchedAt: new Date(),
        });

        fetched++;
      } catch (err: any) {
        console.error(`[analytics-worker] Failed for ${post.provider}:${post.platformPostId}:`, err.message);
        errors++;
      }
    }

    console.log(`[analytics-worker] Fetched ${fetched} analytics, ${errors} errors`);
    return { fetched, errors };
  }, {
    connection: createRedisConnection(),
  });

  return { queue, worker };
}
```

### Analytics API Routes (`apps/api/src/routes/analytics.ts`)

```typescript
import { Hono } from 'hono';
import { db, analytics, scheduledPosts, posts, socialAccounts } from '@renderforge/db';
import { eq, desc, sql, gte } from 'drizzle-orm';

const analyticsRoutes = new Hono();

// GET /api/analytics/overview — aggregate metrics
analyticsRoutes.get('/overview', async (c) => {
  const days = parseInt(c.req.query('days') || '30');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Total engagement metrics
  const totals = await db.select({
    totalViews: sql<number>`coalesce(sum(${analytics.views}), 0)`,
    totalLikes: sql<number>`coalesce(sum(${analytics.likes}), 0)`,
    totalShares: sql<number>`coalesce(sum(${analytics.shares}), 0)`,
    totalComments: sql<number>`coalesce(sum(${analytics.comments}), 0)`,
    avgEngagement: sql<number>`coalesce(avg(${analytics.engagementRate}), 0)`,
  }).from(analytics)
    .where(gte(analytics.fetchedAt, since));

  // Engagement over time (daily aggregation)
  const dailyTrend = await db.select({
    date: sql<string>`date_trunc('day', ${analytics.fetchedAt})::date`,
    views: sql<number>`sum(${analytics.views})`,
    likes: sql<number>`sum(${analytics.likes})`,
    shares: sql<number>`sum(${analytics.shares})`,
    comments: sql<number>`sum(${analytics.comments})`,
  }).from(analytics)
    .where(gte(analytics.fetchedAt, since))
    .groupBy(sql`date_trunc('day', ${analytics.fetchedAt})`)
    .orderBy(sql`date_trunc('day', ${analytics.fetchedAt})`);

  // By platform
  const byPlatform = await db.select({
    provider: socialAccounts.provider,
    totalViews: sql<number>`sum(${analytics.views})`,
    totalLikes: sql<number>`sum(${analytics.likes})`,
    totalShares: sql<number>`sum(${analytics.shares})`,
    avgEngagement: sql<number>`avg(${analytics.engagementRate})`,
  }).from(analytics)
    .innerJoin(scheduledPosts, eq(analytics.scheduledPostId, scheduledPosts.id))
    .innerJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
    .where(gte(analytics.fetchedAt, since))
    .groupBy(socialAccounts.provider);

  return c.json({
    period: { days, since: since.toISOString() },
    totals: totals[0],
    dailyTrend,
    byPlatform,
  });
});

// GET /api/analytics/posts — per-post breakdown
analyticsRoutes.get('/posts', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const sort = c.req.query('sort') || 'views'; // views, likes, engagement
  const offset = (page - 1) * limit;

  // Get latest analytics for each scheduled post
  const items = await db.select({
    scheduledPostId: scheduledPosts.id,
    postTitle: posts.title,
    provider: socialAccounts.provider,
    accountName: socialAccounts.accountName,
    publishedAt: scheduledPosts.publishedAt,
    views: analytics.views,
    likes: analytics.likes,
    shares: analytics.shares,
    comments: analytics.comments,
    engagementRate: analytics.engagementRate,
    fetchedAt: analytics.fetchedAt,
  })
    .from(analytics)
    .innerJoin(scheduledPosts, eq(analytics.scheduledPostId, scheduledPosts.id))
    .innerJoin(posts, eq(scheduledPosts.postId, posts.id))
    .innerJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
    // Get only the latest analytics per scheduled post
    .where(eq(analytics.id,
      db.select({ id: sql`max(${analytics.id})` })
        .from(analytics)
        .where(eq(analytics.scheduledPostId, scheduledPosts.id))
    ))
    .orderBy(sort === 'likes' ? desc(analytics.likes) :
             sort === 'engagement' ? desc(analytics.engagementRate) :
             desc(analytics.views))
    .limit(limit)
    .offset(offset);

  return c.json({ items, page, limit });
});

// GET /api/analytics/top — best performing content
analyticsRoutes.get('/top', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10');

  const topPosts = await db.select({
    postTitle: posts.title,
    provider: socialAccounts.provider,
    views: analytics.views,
    likes: analytics.likes,
    engagementRate: analytics.engagementRate,
  })
    .from(analytics)
    .innerJoin(scheduledPosts, eq(analytics.scheduledPostId, scheduledPosts.id))
    .innerJoin(posts, eq(scheduledPosts.postId, posts.id))
    .innerJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
    .orderBy(desc(analytics.views))
    .limit(limit);

  return c.json({ topPosts });
});

export { analyticsRoutes };
```

### Analytics Page (`apps/admin/src/features/analytics/analytics-page.tsx`)

```typescript
export function AnalyticsPage() {
  const [period, setPeriod] = useState(30); // days
  const { data: overview, isLoading } = useAnalyticsOverview(period);
  const { data: topPosts } = useTopPosts();
  const { data: postBreakdown } = useAnalyticsPosts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Select value={String(period)} onValueChange={v => setPeriod(Number(v))}>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Views" value={formatNumber(overview?.totals?.totalViews)} icon={Eye} />
        <KPICard title="Total Likes" value={formatNumber(overview?.totals?.totalLikes)} icon={Heart} />
        <KPICard title="Total Shares" value={formatNumber(overview?.totals?.totalShares)} icon={Share2} />
        <KPICard title="Total Comments" value={formatNumber(overview?.totals?.totalComments)} icon={MessageCircle} />
        <KPICard title="Avg Engagement" value={`${overview?.totals?.avgEngagement?.toFixed(1)}%`} icon={TrendingUp} />
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader><CardTitle>Engagement Trend</CardTitle></CardHeader>
        <CardContent>
          <EngagementTrendChart data={overview?.dailyTrend || []} />
        </CardContent>
      </Card>

      {/* Two columns: Platform breakdown + Top posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Platform */}
        <Card>
          <CardHeader><CardTitle>By Platform</CardTitle></CardHeader>
          <CardContent>
            <PlatformBreakdown data={overview?.byPlatform || []} />
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        <Card>
          <CardHeader><CardTitle>Top Performing</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPosts?.topPosts?.map((post, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{post.postTitle}</p>
                    <Badge variant="outline" className="text-xs">{post.provider}</Badge>
                  </div>
                  <div className="text-right text-sm">
                    <p>{formatNumber(post.views)} views</p>
                    <p className="text-muted-foreground">{post.engagementRate}% engagement</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Post Breakdown Table */}
      <Card>
        <CardHeader><CardTitle>All Published Posts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {postBreakdown?.items?.map(item => (
                <TableRow key={item.scheduledPostId}>
                  <TableCell>{item.postTitle}</TableCell>
                  <TableCell><Badge variant="outline">{item.provider}</Badge></TableCell>
                  <TableCell>{formatDate(item.publishedAt)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.views)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.likes)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.shares)}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.comments)}</TableCell>
                  <TableCell className="text-right">{item.engagementRate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Charts

For charts, use either:
- **recharts** — most popular React charting library
- **CSS-based bars** — lightweight, no dependency

Example with CSS-based trend visualization:

```typescript
function EngagementTrendChart({ data }: { data: DailyTrend[] }) {
  const maxViews = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="space-y-2">
      {data.map(day => (
        <div key={day.date} className="flex items-center gap-2">
          <span className="w-20 text-xs text-muted-foreground">{formatShortDate(day.date)}</span>
          <div className="flex-1 flex gap-1 h-6">
            <div className="bg-blue-500 rounded" style={{ width: `${(day.views / maxViews) * 100}%` }}
              title={`${day.views} views`} />
          </div>
          <span className="w-16 text-xs text-right">{formatNumber(day.views)}</span>
        </div>
      ))}
    </div>
  );
}
```

### TanStack Query Hooks (`apps/admin/src/hooks/use-analytics.ts`)

```typescript
export function useAnalyticsOverview(days: number) {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: () => api.get(`/analytics/overview?days=${days}`),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

export function useTopPosts(limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'top', limit],
    queryFn: () => api.get(`/analytics/top?limit=${limit}`),
  });
}

export function useAnalyticsPosts(page = 1, sort = 'views') {
  return useQuery({
    queryKey: ['analytics', 'posts', page, sort],
    queryFn: () => api.get(`/analytics/posts?page=${page}&sort=${sort}`),
  });
}
```

### Server Integration

```typescript
import { analyticsRoutes } from './routes/analytics';
import { startAnalyticsWorker } from './jobs/analytics-worker';

app.route('/api/analytics', analyticsRoutes);
const analyticsWorker = startAnalyticsWorker();
```

### Route Registration (Admin)

```typescript
<Route path="/analytics" element={<AnalyticsPage />} />
```

## Verification

1. Analytics worker runs every 6 hours, fetches data from all connected providers
2. `GET /api/analytics/overview` returns aggregate metrics for the selected period
3. `GET /api/analytics/posts` returns per-post breakdown with sorting
4. `GET /api/analytics/top` returns best-performing content
5. Analytics page shows KPI cards with real numbers
6. Trend chart displays daily engagement over time
7. Platform breakdown shows metrics per social platform
8. Top performing posts ranked by views
9. Per-post table sortable by views, likes, engagement
10. Period selector (7/30/90 days) filters all data
