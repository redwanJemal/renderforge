# Task 18: Render Management UI

## Overview

Build the render management interface with real-time SSE progress tracking, batch rendering, video preview, and download capabilities.

## Subtasks

1. [ ] Create `apps/admin/src/features/renders/` — RenderListPage with real-time progress
2. [ ] New Render dialog: select post + format
3. [ ] Batch Render dialog: select multiple posts + formats
4. [ ] Actions: download (presigned URL), retry (re-queue), cancel
5. [ ] Video player preview for completed renders
6. [ ] Create `apps/admin/src/hooks/use-renders.ts` + `use-sse.ts`
7. [ ] Verify: trigger render, watch progress in real-time, download completed render

## Details

### SSE Hook (`apps/admin/src/hooks/use-sse.ts`)

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/auth-store';

type SSEProgress = {
  renderId: string;
  progress: number;
  status: string;
  message: string;
  timestamp: number;
};

export function useRenderSSE(renderId?: string) {
  const [progress, setProgress] = useState<SSEProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    if (!renderId || !token) return;

    const url = `/api/sse/renders/${renderId}?token=${token}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data) as SSEProgress;
      setProgress(data);

      // Auto-close on terminal state
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        es.close();
        setConnected(false);
      }
    });

    es.addEventListener('heartbeat', () => {
      setConnected(true);
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [renderId, token]);

  return { progress, connected };
}

// Hook for monitoring all active renders
export function useAllRendersSSE() {
  const [progresses, setProgresses] = useState<Map<string, SSEProgress>>(new Map());
  const token = useAuthStore(s => s.token);

  useEffect(() => {
    if (!token) return;

    const url = `/api/sse/renders?token=${token}`;
    const es = new EventSource(url);

    es.addEventListener('init', (e) => {
      const { activeRenders } = JSON.parse(e.data);
      const map = new Map<string, SSEProgress>();
      for (const r of activeRenders) {
        map.set(r.renderId, { renderId: r.renderId, progress: r.progress, status: r.status, message: '', timestamp: Date.now() });
      }
      setProgresses(map);
    });

    es.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data) as SSEProgress;
      setProgresses(prev => new Map(prev).set(data.renderId, data));
    });

    return () => es.close();
  }, [token]);

  return { progresses };
}
```

### Render List Page (`apps/admin/src/features/renders/render-list-page.tsx`)

Features:
- Table with columns: Post Title, Format, Status (with real-time progress bar), Duration, Size, Created, Actions
- Live progress bars for active renders (animated, color-coded)
- Status badges: queued (gray), rendering (blue/animated), completed (green), failed (red), cancelled (gray strikethrough)
- Filter by status dropdown
- "New Render" and "Batch Render" buttons

```typescript
export function RenderListPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useRenders({ status: statusFilter });
  const { progresses } = useAllRendersSSE();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [previewRender, setPreviewRender] = useState<Render | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Renders</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBatchDialog(true)}>Batch Render</Button>
          <Button onClick={() => setShowNewDialog(true)}>New Render</Button>
        </div>
      </div>

      <Table>
        {/* ... */}
        <TableBody>
          {data?.items.map(render => {
            const liveProgress = progresses.get(render.id);
            const displayProgress = liveProgress?.progress ?? render.progress;
            const displayStatus = liveProgress?.status ?? render.status;

            return (
              <TableRow key={render.id}>
                <TableCell>{render.postTitle}</TableCell>
                <TableCell><Badge>{render.format}</Badge></TableCell>
                <TableCell>
                  <RenderStatusCell status={displayStatus} progress={displayProgress} message={liveProgress?.message} />
                </TableCell>
                <TableCell>{render.durationMs ? `${(render.durationMs / 1000).toFixed(1)}s` : '—'}</TableCell>
                <TableCell>{render.fileSize ? formatBytes(render.fileSize) : '—'}</TableCell>
                <TableCell>{formatDate(render.createdAt)}</TableCell>
                <TableCell>
                  <RenderActions render={render} onPreview={() => setPreviewRender(render)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <NewRenderDialog open={showNewDialog} onClose={() => setShowNewDialog(false)} />
      <BatchRenderDialog open={showBatchDialog} onClose={() => setShowBatchDialog(false)} />
      <VideoPreviewDialog render={previewRender} onClose={() => setPreviewRender(null)} />
    </div>
  );
}
```

### Progress Bar Component

```typescript
function RenderStatusCell({ status, progress, message }: { status: string; progress: number; message?: string }) {
  if (status === 'completed') return <Badge className="bg-green-500">Completed</Badge>;
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'cancelled') return <Badge variant="secondary">Cancelled</Badge>;
  if (status === 'queued') return <Badge variant="outline">Queued</Badge>;

  // Rendering — show progress bar
  return (
    <div className="space-y-1 min-w-[200px]">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{message || 'Rendering...'}</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

### New Render Dialog

- Select a post (searchable dropdown, only shows "ready" posts)
- Select format (story, post, landscape)
- Submit → calls POST /api/renders
- Shows success toast with link to render detail

### Batch Render Dialog

- Multi-select posts (checkbox list with search, only "ready" posts)
- Multi-select formats (checkboxes: story, post, landscape)
- Shows count: "This will create X render jobs"
- Submit → calls POST /api/renders/batch
- Shows results summary (queued/errors)

### Video Preview Dialog

- Modal with video player for completed renders
- Load video from presigned URL (GET /api/renders/:id → downloadUrl)
- Standard HTML5 video controls (play/pause, seek, volume, fullscreen)
- Download button

### Render Actions Dropdown

- Preview (completed only) → opens VideoPreviewDialog
- Download (completed only) → opens presigned URL in new tab
- Retry (failed only) → POST /api/renders/:id/retry
- Cancel (queued/rendering) → POST /api/renders/:id/cancel

### TanStack Query Hooks (`apps/admin/src/hooks/use-renders.ts`)

```typescript
export function useRenders(filters: { status?: string; postId?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.postId) params.set('postId', filters.postId);
  params.set('page', String(filters.page || 1));

  return useQuery({
    queryKey: ['renders', filters],
    queryFn: () => api.get(`/renders?${params}`),
    refetchInterval: 10000, // Also poll as fallback to SSE
  });
}

export function useCreateRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { postId: string; format: string }) => api.post('/renders', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renders'] }),
  });
}

export function useBatchRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { postIds: string[]; formats: string[] }) => api.post('/renders/batch', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renders'] }),
  });
}

export function useRetryRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/renders/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renders'] }),
  });
}

export function useCancelRender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/renders/${id}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['renders'] }),
  });
}
```

### Route Registration

```typescript
<Route path="/renders" element={<RenderListPage />} />
```

## Verification

1. Render list shows all renders with correct status badges
2. Trigger a new render → progress bar appears and animates in real-time via SSE
3. Progress messages update: "Downloading audio..." → "Rendering video..." → "Complete"
4. Completed renders show download button → downloads video
5. Failed renders show retry button → re-queues successfully
6. Batch render creates multiple jobs and shows results
7. Video preview plays in modal for completed renders
8. Cancel button stops queued/rendering jobs
9. Page auto-refreshes when SSE events arrive
10. Works correctly when multiple renders are active simultaneously
