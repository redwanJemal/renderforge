# Task 26: Content Calendar & Scheduling

## Overview

Build a content calendar UI for scheduling rendered videos to be published on social media platforms at specific times. Implement the full publish worker that fires at the scheduled time and calls the appropriate social provider.

## Subtasks

1. [ ] Create `apps/admin/src/features/calendar/` — CalendarPage with month/week/day views
2. [ ] Drag-to-schedule: drag rendered posts onto calendar slots
3. [ ] Multi-platform scheduling: schedule same render to multiple social accounts
4. [ ] Create `apps/api/src/jobs/publish-worker.ts` — full implementation with delayed BullMQ jobs
5. [ ] Verify: schedule a post, see it on calendar, publish fires at scheduled time

## Details

### Calendar Page (`apps/admin/src/features/calendar/calendar-page.tsx`)

```typescript
export function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: scheduled } = useScheduledPosts(currentDate, view);
  const { data: readyRenders } = useRendersForScheduling();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <div className="flex gap-2">
          <div className="flex border rounded-md">
            <Button variant={view === 'month' ? 'default' : 'ghost'} size="sm"
              onClick={() => setView('month')}>Month</Button>
            <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm"
              onClick={() => setView('week')}>Week</Button>
            <Button variant={view === 'day' ? 'default' : 'ghost'} size="sm"
              onClick={() => setView('day')}>Day</Button>
          </div>
          <Button onClick={() => setShowScheduleDialog(true)}>Schedule Post</Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigateBack()}>Previous</Button>
        <h2 className="text-xl font-semibold">{formatPeriod(currentDate, view)}</h2>
        <Button variant="outline" size="sm" onClick={() => navigateForward()}>Next</Button>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <MonthView
          date={currentDate}
          scheduledPosts={scheduled}
          onSlotClick={(date) => { setSelectedSlot(date); setShowScheduleDialog(true); }}
        />
      )}
      {view === 'week' && (
        <WeekView
          date={currentDate}
          scheduledPosts={scheduled}
          onSlotClick={(date) => { setSelectedSlot(date); setShowScheduleDialog(true); }}
        />
      )}
      {view === 'day' && (
        <DayView
          date={currentDate}
          scheduledPosts={scheduled}
          onSlotClick={(date) => { setSelectedSlot(date); setShowScheduleDialog(true); }}
        />
      )}

      <ScheduleDialog
        open={showScheduleDialog}
        onClose={() => { setShowScheduleDialog(false); setSelectedSlot(null); }}
        initialDate={selectedSlot}
        readyRenders={readyRenders}
      />
    </div>
  );
}
```

### Month View

```typescript
function MonthView({ date, scheduledPosts, onSlotClick }: MonthViewProps) {
  const days = getMonthDays(date); // 42 days (6 weeks grid)

  return (
    <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 text-center text-sm font-medium bg-muted border-b">
          {day}
        </div>
      ))}

      {/* Day cells */}
      {days.map(day => {
        const dayPosts = scheduledPosts?.filter(sp =>
          isSameDay(new Date(sp.scheduledAt), day)
        ) || [];

        return (
          <div
            key={day.toISOString()}
            className={cn(
              'min-h-[120px] p-1 border-b border-r cursor-pointer hover:bg-accent/50',
              !isSameMonth(day, date) && 'text-muted-foreground bg-muted/30',
              isToday(day) && 'bg-primary/5',
            )}
            onClick={() => onSlotClick(day)}
          >
            <span className="text-sm">{day.getDate()}</span>
            <div className="space-y-1 mt-1">
              {dayPosts.slice(0, 3).map(sp => (
                <ScheduledPostChip key={sp.id} scheduledPost={sp} />
              ))}
              {dayPosts.length > 3 && (
                <span className="text-xs text-muted-foreground">+{dayPosts.length - 3} more</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduledPostChip({ scheduledPost }: { scheduledPost: ScheduledPost }) {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    publishing: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className={cn('text-xs p-1 rounded truncate', statusColors[scheduledPost.status])}>
      <span className="font-medium">{formatTime(scheduledPost.scheduledAt)}</span>{' '}
      {scheduledPost.postTitle}
      <Badge variant="outline" className="ml-1 text-[10px]">{scheduledPost.provider}</Badge>
    </div>
  );
}
```

### Schedule Dialog

```typescript
function ScheduleDialog({ open, onClose, initialDate, readyRenders }: ScheduleDialogProps) {
  const socialAccounts = useSocialAccounts();
  const schedulePost = useSchedulePost();

  const [form, setForm] = useState({
    renderId: '',
    accountIds: [] as string[],
    scheduledAt: initialDate || new Date(),
    scheduledTime: '09:00',
  });

  const handleSchedule = async () => {
    const scheduledAt = combineDateAndTime(form.scheduledAt, form.scheduledTime);

    // Schedule to each selected account
    for (const accountId of form.accountIds) {
      await schedulePost.mutateAsync({
        renderId: form.renderId,
        socialAccountId: accountId,
        scheduledAt: scheduledAt.toISOString(),
      });
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Select rendered video */}
          <div>
            <Label>Select Video</Label>
            <Select value={form.renderId} onValueChange={v => setForm(f => ({ ...f, renderId: v }))}>
              {readyRenders?.map(render => (
                <SelectItem key={render.id} value={render.id}>
                  {render.postTitle} ({render.format})
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Select platforms/accounts */}
          <div>
            <Label>Publish To</Label>
            <div className="space-y-2 mt-1">
              {socialAccounts?.accounts?.map(account => (
                <label key={account.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.accountIds.includes(account.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm(f => ({ ...f, accountIds: [...f.accountIds, account.id] }));
                      } else {
                        setForm(f => ({ ...f, accountIds: f.accountIds.filter(id => id !== account.id) }));
                      }
                    }}
                  />
                  <Badge variant="outline">{account.provider}</Badge>
                  <span>{account.accountName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={form.scheduledAt}
                onSelect={(date) => date && setForm(f => ({ ...f, scheduledAt: date }))}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={form.scheduledTime}
                onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={!form.renderId || form.accountIds.length === 0}>
            Schedule ({form.accountIds.length} platform{form.accountIds.length !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Scheduling API Routes

```typescript
// apps/api/src/routes/scheduled-posts.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { db, scheduledPosts, renders, posts, socialAccounts } from '@renderforge/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { publishQueue } from '../jobs/queues';

const scheduledRoutes = new Hono();

// POST /api/scheduled-posts — schedule a post
scheduledRoutes.post('/', async (c) => {
  const data = z.object({
    renderId: z.string().uuid(),
    socialAccountId: z.string().uuid(),
    scheduledAt: z.string().datetime(),
  }).parse(await c.req.json());

  // Verify render exists and is completed
  const [render] = await db.select().from(renders).where(eq(renders.id, data.renderId));
  if (!render || render.status !== 'completed') {
    return c.json({ error: 'Render not found or not completed' }, 400);
  }

  // Create scheduled post record
  const [scheduled] = await db.insert(scheduledPosts).values({
    postId: render.postId,
    renderId: data.renderId,
    socialAccountId: data.socialAccountId,
    scheduledAt: new Date(data.scheduledAt),
    status: 'scheduled',
  }).returning();

  // Add delayed BullMQ job
  const delay = new Date(data.scheduledAt).getTime() - Date.now();
  await publishQueue.add('publish-video', {
    scheduledPostId: scheduled.id,
    renderId: data.renderId,
    socialAccountId: data.socialAccountId,
  }, {
    delay: Math.max(delay, 0), // Fire at scheduled time
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
  });

  return c.json(scheduled, 201);
});

// GET /api/scheduled-posts — list with date range
scheduledRoutes.get('/', async (c) => {
  const start = c.req.query('start');
  const end = c.req.query('end');

  const conditions = [];
  if (start) conditions.push(gte(scheduledPosts.scheduledAt, new Date(start)));
  if (end) conditions.push(lte(scheduledPosts.scheduledAt, new Date(end)));

  const items = await db.select({
    id: scheduledPosts.id,
    scheduledAt: scheduledPosts.scheduledAt,
    status: scheduledPosts.status,
    postId: scheduledPosts.postId,
    renderId: scheduledPosts.renderId,
    provider: socialAccounts.provider,
    accountName: socialAccounts.accountName,
    postTitle: posts.title,
  })
    .from(scheduledPosts)
    .innerJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
    .innerJoin(posts, eq(scheduledPosts.postId, posts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(scheduledPosts.scheduledAt);

  return c.json({ items });
});

// DELETE /api/scheduled-posts/:id — cancel scheduled post
scheduledRoutes.delete('/:id', async (c) => {
  const [sp] = await db.delete(scheduledPosts)
    .where(and(eq(scheduledPosts.id, c.req.param('id')), eq(scheduledPosts.status, 'scheduled')))
    .returning();

  if (!sp) return c.json({ error: 'Scheduled post not found or already published' }, 404);
  return c.json({ message: 'Cancelled' });
});

export { scheduledRoutes };
```

### Publish Worker — Full Implementation (`apps/api/src/jobs/publish-worker.ts`)

```typescript
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { db, scheduledPosts, socialAccounts, renders } from '@renderforge/db';
import { eq } from 'drizzle-orm';
import { socialRegistry } from '../social/registry';
import { decrypt } from '../lib/crypto';
import { storage } from '../services/storage';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type PublishJobData = {
  scheduledPostId: string;
  renderId: string;
  socialAccountId: string;
};

async function processPublish(job: Job<PublishJobData>) {
  const { scheduledPostId, renderId, socialAccountId } = job.data;
  const tempDir = await mkdtemp(join(tmpdir(), 'rf-publish-'));

  try {
    // Update status to publishing
    await db.update(scheduledPosts).set({ status: 'publishing' })
      .where(eq(scheduledPosts.id, scheduledPostId));

    // Get render details
    const [render] = await db.select().from(renders).where(eq(renders.id, renderId));
    if (!render?.outputUrl) throw new Error('Render output not found');

    // Get social account details
    const [account] = await db.select().from(socialAccounts)
      .where(eq(socialAccounts.id, socialAccountId));
    if (!account) throw new Error('Social account not found');

    // Get post details for metadata
    const [sp] = await db.select().from(scheduledPosts)
      .where(eq(scheduledPosts.id, scheduledPostId));

    const post = await db.query.posts.findFirst({ where: eq(posts.id, sp.postId) });
    if (!post) throw new Error('Post not found');

    // Download video from MinIO to temp
    const videoPath = join(tempDir, 'video.mp4');
    const stream = await storage.download(render.outputUrl);
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    await writeFile(videoPath, Buffer.concat(chunks));

    // Get provider and decrypt token
    const provider = socialRegistry.get(account.provider);
    const accessToken = decrypt(account.accessTokenEnc);

    // Publish
    const result = await provider.publish(videoPath, {
      title: post.title,
      description: (post.metadata as any)?.description || post.title,
      tags: (post.metadata as any)?.tags || [],
    }, accessToken);

    if (result.success) {
      await db.update(scheduledPosts).set({
        status: 'published',
        publishedAt: new Date(),
        platformPostId: result.platformPostId,
      }).where(eq(scheduledPosts.id, scheduledPostId));

      console.log(`[publish-worker] Published ${scheduledPostId} to ${account.provider}: ${result.url}`);
    } else {
      throw new Error(result.error || 'Publish failed');
    }

    return result;
  } catch (error: any) {
    await db.update(scheduledPosts).set({
      status: 'failed',
      error: error.message,
    }).where(eq(scheduledPosts.id, scheduledPostId));

    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function startPublishWorker() {
  const worker = new Worker('publish', processPublish, {
    connection: createRedisConnection(),
    concurrency: 2,
  });

  worker.on('completed', (job) => console.log(`[publish-worker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[publish-worker] Job ${job?.id} failed:`, err.message));

  return worker;
}
```

### Server Integration

```typescript
import { scheduledRoutes } from './routes/scheduled-posts';
app.route('/api/scheduled-posts', scheduledRoutes);
```

### Route Registration (Admin)

```typescript
<Route path="/calendar" element={<CalendarPage />} />
```

## Verification

1. Calendar page renders with month/week/day views
2. Clicking a day opens the schedule dialog
3. Select a completed render + social accounts + date/time
4. Scheduled post appears on calendar at correct date/time
5. Status shown correctly: scheduled (blue), published (green), failed (red)
6. At scheduled time, publish worker fires and calls social provider
7. Published status updates with platformPostId
8. Cancel scheduled post removes it from calendar and BullMQ
9. Multi-platform: same render scheduled to multiple accounts creates separate entries
10. Month navigation works correctly (previous/next month)
