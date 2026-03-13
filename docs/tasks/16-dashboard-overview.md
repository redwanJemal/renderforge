# Task 16: Dashboard Overview Page

## Overview

Create the main dashboard page with KPI cards, charts, and recent activity. Build the backend stats endpoint that aggregates data from the database.

## Subtasks

1. [ ] Create `apps/api/src/routes/dashboard.ts` — GET /api/dashboard/stats
2. [ ] Create `apps/api/src/services/dashboard.ts` — aggregate queries for stats
3. [ ] Create `apps/admin/src/features/dashboard/` — DashboardPage with KPI cards, charts, activity feed
4. [ ] Create `apps/admin/src/hooks/use-dashboard.ts` — TanStack Query hook
5. [ ] Verify: dashboard shows real data from DB, charts render correctly

## Details

### Dashboard Stats API

**GET /api/dashboard/stats**

Response:
```json
{
  "kpi": {
    "totalPosts": 142,
    "totalRenders": 89,
    "publishedThisWeek": 12,
    "pendingAudio": 23
  },
  "rendersByStatus": {
    "queued": 3,
    "rendering": 1,
    "completed": 78,
    "failed": 5,
    "cancelled": 2
  },
  "postsByNiche": [
    { "niche": "Motivational", "slug": "motivational", "count": 100 },
    { "niche": "Stoic", "slug": "stoic", "count": 25 },
    { "niche": "YLD", "slug": "yld", "count": 17 }
  ],
  "postsByStatus": {
    "draft": 20,
    "audio_pending": 23,
    "ready": 35,
    "rendering": 1,
    "rendered": 50,
    "published": 13
  },
  "recentRenders": [
    {
      "id": "uuid",
      "postTitle": "The Power of Persistence",
      "format": "story",
      "status": "completed",
      "progress": 100,
      "createdAt": "2026-03-13T10:00:00Z"
    }
  ],
  "recentPosts": [
    {
      "id": "uuid",
      "title": "New Motivational Post",
      "niche": "Motivational",
      "status": "draft",
      "createdAt": "2026-03-13T09:00:00Z"
    }
  ]
}
```

### Dashboard Service (`apps/api/src/services/dashboard.ts`)

```typescript
import { db, posts, renders, niches, scheduledPosts } from '@renderforge/db';
import { eq, sql, gte, desc, and } from 'drizzle-orm';

export const dashboardService = {
  async getStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      totalRenders,
      publishedThisWeek,
      pendingAudio,
      rendersByStatus,
      postsByNiche,
      postsByStatus,
      recentRenders,
      recentPosts,
    ] = await Promise.all([
      // KPIs
      db.select({ count: sql<number>`count(*)` }).from(posts),
      db.select({ count: sql<number>`count(*)` }).from(renders),
      db.select({ count: sql<number>`count(*)` }).from(posts)
        .where(and(eq(posts.status, 'published'), gte(posts.updatedAt, weekAgo))),
      db.select({ count: sql<number>`count(*)` }).from(posts)
        .where(eq(posts.status, 'audio_pending')),

      // Aggregates
      db.select({
        status: renders.status,
        count: sql<number>`count(*)`,
      }).from(renders).groupBy(renders.status),

      db.select({
        niche: niches.name,
        slug: niches.slug,
        count: sql<number>`count(*)`,
      }).from(posts)
        .innerJoin(niches, eq(posts.nicheId, niches.id))
        .groupBy(niches.name, niches.slug),

      db.select({
        status: posts.status,
        count: sql<number>`count(*)`,
      }).from(posts).groupBy(posts.status),

      // Recent activity
      db.select({
        id: renders.id,
        postId: renders.postId,
        format: renders.format,
        status: renders.status,
        progress: renders.progress,
        createdAt: renders.createdAt,
      }).from(renders).orderBy(desc(renders.createdAt)).limit(5),

      db.select({
        id: posts.id,
        title: posts.title,
        status: posts.status,
        createdAt: posts.createdAt,
      }).from(posts).orderBy(desc(posts.createdAt)).limit(5),
    ]);

    return {
      kpi: {
        totalPosts: Number(totalPosts[0].count),
        totalRenders: Number(totalRenders[0].count),
        publishedThisWeek: Number(publishedThisWeek[0].count),
        pendingAudio: Number(pendingAudio[0].count),
      },
      rendersByStatus: Object.fromEntries(rendersByStatus.map(r => [r.status, Number(r.count)])),
      postsByNiche,
      postsByStatus: Object.fromEntries(postsByStatus.map(p => [p.status, Number(p.count)])),
      recentRenders,
      recentPosts,
    };
  },
};
```

### Dashboard Page (`apps/admin/src/features/dashboard/dashboard-page.tsx`)

Components:
1. **KPI Cards** (4 cards in a row):
   - Total Posts — FileText icon, primary color
   - Total Renders — Film icon, blue
   - Published This Week — TrendingUp icon, green
   - Pending Audio — Mic icon, amber

2. **Charts Row** (2 charts side by side):
   - Renders by Status — donut/pie chart or horizontal bar chart
   - Posts by Niche — bar chart

3. **Recent Activity** (2 columns):
   - Recent Renders — list with status badges and progress
   - Recent Posts — list with status badges

Use shadcn Card components for all sections. For charts, use a lightweight library like recharts or just CSS-based bars (to avoid heavy dependencies).

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { FileText, Film, TrendingUp, Mic } from 'lucide-react';

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Posts" value={stats.kpi.totalPosts} icon={FileText} />
        <KPICard title="Total Renders" value={stats.kpi.totalRenders} icon={Film} />
        <KPICard title="Published This Week" value={stats.kpi.publishedThisWeek} icon={TrendingUp} />
        <KPICard title="Pending Audio" value={stats.kpi.pendingAudio} icon={Mic} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RendersByStatusChart data={stats.rendersByStatus} />
        <PostsByNicheChart data={stats.postsByNiche} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentRendersCard renders={stats.recentRenders} />
        <RecentPostsCard posts={stats.recentPosts} />
      </div>
    </div>
  );
}
```

### TanStack Query Hook (`apps/admin/src/hooks/use-dashboard.ts`)

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
```

### Server Integration

```typescript
import { dashboardRoutes } from './routes/dashboard';
app.route('/api/dashboard', dashboardRoutes);
```

## Verification

1. `GET /api/dashboard/stats` returns all aggregate data
2. Dashboard page loads with KPI cards showing real numbers
3. Charts render correctly with data from the DB
4. Recent activity shows latest 5 renders and posts
5. Dashboard auto-refreshes every 30 seconds
6. Loading skeleton shows while data is fetching
7. All cards are responsive (stack on mobile, grid on desktop)
8. Status badges use appropriate colors (green=completed, red=failed, etc.)
