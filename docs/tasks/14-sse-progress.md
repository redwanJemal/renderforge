# Task 14: SSE Progress Streaming

## Overview

Implement full Server-Sent Events (SSE) infrastructure for real-time render progress streaming. The render worker publishes progress events via Redis pub/sub, and the SSE endpoint streams them to connected clients.

## Subtasks

1. [ ] Redis pub/sub: render worker publishes progress events to channel `render:progress:{renderId}`
2. [ ] SSE endpoint: GET /api/sse/renders/:id — subscribe to specific render
3. [ ] Multi-render support: GET /api/sse/renders — subscribe to all active renders
4. [ ] Graceful disconnect: cleanup Redis subscriptions on client disconnect
5. [ ] Verify: start render, connect SSE, receive real-time progress updates, disconnect cleanly

## Details

### Progress Event Format

Published to Redis channel `render:progress:{renderId}`:

```json
{
  "renderId": "uuid",
  "progress": 45,
  "status": "rendering",
  "message": "Rendering video...",
  "timestamp": 1710288000000
}
```

Status values: `queued`, `rendering`, `completed`, `failed`, `cancelled`

### Render Worker Publishing

The render worker (Task 12) already calls `publishProgress()`. Ensure it publishes at these checkpoints:

| Progress | Message                  |
| -------- | ------------------------ |
| 0        | Starting render...       |
| 10       | Downloading audio...     |
| 20       | Concatenating audio...   |
| 30       | Applying prop mappings...|
| 35       | Rendering video...       |
| 50       | Rendering frames... 50%  |
| 65       | Rendering frames... 100% |
| 75       | Merging audio...         |
| 85       | Mixing BGM...            |
| 90       | Uploading...             |
| 100      | Render complete          |

Also publish on failure:
```json
{ "renderId": "...", "progress": 0, "status": "failed", "message": "Error: ..." }
```

### SSE Routes (`apps/api/src/routes/sse.ts`)

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createSubscriber } from '../lib/redis';
import { db, renders } from '@renderforge/db';
import { eq, inArray } from 'drizzle-orm';

const sseRoutes = new Hono();

// GET /api/sse/renders/:id — SSE stream for a specific render
sseRoutes.get('/renders/:id', async (c) => {
  const renderId = c.req.param('id');

  // Verify render exists
  const [render] = await db.select().from(renders).where(eq(renders.id, renderId));
  if (!render) return c.json({ error: 'Render not found' }, 404);

  // If already completed/failed, send final state immediately
  if (['completed', 'failed', 'cancelled'].includes(render.status)) {
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        event: 'progress',
        data: JSON.stringify({
          renderId,
          progress: render.progress,
          status: render.status,
          message: render.status === 'completed' ? 'Render complete' : render.error || 'Render failed',
          timestamp: Date.now(),
        }),
      });
    });
  }

  return streamSSE(c, async (stream) => {
    const subscriber = createSubscriber();
    const channel = `render:progress:${renderId}`;
    let closed = false;

    await subscriber.subscribe(channel);

    // Send current state immediately
    await stream.writeSSE({
      event: 'progress',
      data: JSON.stringify({
        renderId,
        progress: render.progress || 0,
        status: render.status,
        message: 'Connected',
        timestamp: Date.now(),
      }),
    });

    // Heartbeat every 15 seconds
    const heartbeat = setInterval(async () => {
      if (closed) return;
      try {
        await stream.writeSSE({ event: 'heartbeat', data: '' });
      } catch {
        closed = true;
      }
    }, 15000);

    // Forward Redis messages to SSE
    subscriber.on('message', async (_ch: string, message: string) => {
      if (closed) return;
      try {
        await stream.writeSSE({ event: 'progress', data: message });

        // Auto-close on terminal states
        const parsed = JSON.parse(message);
        if (['completed', 'failed', 'cancelled'].includes(parsed.status)) {
          closed = true;
          clearInterval(heartbeat);
          await subscriber.unsubscribe(channel);
          subscriber.disconnect();
        }
      } catch {
        // Ignore write errors (client disconnected)
      }
    });

    // Cleanup on client disconnect
    stream.onAbort(() => {
      closed = true;
      clearInterval(heartbeat);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.disconnect();
    });

    // Keep stream alive until closed
    while (!closed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});

// GET /api/sse/renders — SSE stream for all active renders
sseRoutes.get('/renders', async (c) => {
  return streamSSE(c, async (stream) => {
    const subscriber = createSubscriber();
    let closed = false;

    // Subscribe to all render progress channels using pattern
    await subscriber.psubscribe('render:progress:*');

    // Send initial state: all active renders
    const activeRenders = await db.select().from(renders)
      .where(inArray(renders.status, ['queued', 'rendering']));

    await stream.writeSSE({
      event: 'init',
      data: JSON.stringify({
        activeRenders: activeRenders.map(r => ({
          renderId: r.id,
          postId: r.postId,
          format: r.format,
          progress: r.progress,
          status: r.status,
        })),
      }),
    });

    // Heartbeat
    const heartbeat = setInterval(async () => {
      if (closed) return;
      try {
        await stream.writeSSE({ event: 'heartbeat', data: '' });
      } catch {
        closed = true;
      }
    }, 15000);

    // Forward all render progress events
    subscriber.on('pmessage', async (_pattern: string, _channel: string, message: string) => {
      if (closed) return;
      try {
        await stream.writeSSE({ event: 'progress', data: message });
      } catch {
        closed = true;
      }
    });

    // Cleanup
    stream.onAbort(() => {
      closed = true;
      clearInterval(heartbeat);
      subscriber.punsubscribe('render:progress:*').catch(() => {});
      subscriber.disconnect();
    });

    while (!closed) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});

export { sseRoutes };
```

### Client-Side Usage

The admin dashboard (Task 18) will use EventSource:

```typescript
// Example client-side usage
const eventSource = new EventSource('/api/sse/renders/uuid-here', {
  headers: { 'Authorization': `Bearer ${token}` },
});

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Render ${data.renderId}: ${data.progress}% — ${data.message}`);

  if (data.status === 'completed' || data.status === 'failed') {
    eventSource.close();
  }
});

eventSource.addEventListener('heartbeat', () => {
  // Connection alive
});

eventSource.onerror = () => {
  // Reconnect logic
};
```

Note: Since EventSource doesn't support custom headers natively, the admin will need to use a library like `event-source-polyfill` or pass the token as a query parameter:

```typescript
const eventSource = new EventSource(`/api/sse/renders/${renderId}?token=${token}`);
```

Update the SSE middleware to accept token from query param as fallback:

```typescript
// In auth middleware, also check query param
const token = authHeader?.slice(7) || c.req.query('token');
```

### Server Integration

```typescript
import { sseRoutes } from './routes/sse';

// SSE routes — allow token via query param for EventSource
app.route('/api/sse', sseRoutes);
```

## Verification

1. Start a render job via API
2. Connect to SSE endpoint in another terminal:
   ```bash
   curl -N -H "Authorization: Bearer <token>" \
     http://localhost:3100/api/sse/renders/<renderId>
   ```
3. Observe real-time progress events streaming:
   ```
   event: progress
   data: {"renderId":"...","progress":10,"status":"rendering","message":"Downloading audio..."}

   event: progress
   data: {"renderId":"...","progress":35,"status":"rendering","message":"Rendering video..."}
   ```
4. Receive heartbeat events every 15 seconds
5. Stream auto-closes on completion or failure
6. Multi-render endpoint (`/api/sse/renders`) shows all active render progress
7. Client disconnection properly cleans up Redis subscriptions
8. Reconnecting picks up current state immediately
