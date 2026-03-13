import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import Redis from "ioredis";
import { config } from "../config.js";

const sse = new Hono();

sse.get("/renders/:id", async (c) => {
  const renderId = c.req.param("id");

  return streamSSE(c, async (stream) => {
    const subscriber = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    const channel = `render:progress:${renderId}`;
    await subscriber.subscribe(channel);

    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "heartbeat", data: "" });
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 15_000);

    subscriber.on("message", async (_ch, message) => {
      try {
        await stream.writeSSE({ event: "progress", data: message });
        const parsed = JSON.parse(message);
        if (parsed.status === "completed" || parsed.status === "failed") {
          clearInterval(heartbeatInterval);
          await subscriber.unsubscribe(channel);
          await subscriber.quit();
          await stream.close();
        }
      } catch {
        // Stream closed
      }
    });

    stream.onAbort(() => {
      clearInterval(heartbeatInterval);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    });

    // Keep stream open until completed/failed
    await new Promise(() => {});
  });
});

sse.get("/renders", async (c) => {
  return streamSSE(c, async (stream) => {
    const subscriber = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    await subscriber.psubscribe("render:progress:*");

    const heartbeatInterval = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "heartbeat", data: "" });
      } catch {
        clearInterval(heartbeatInterval);
      }
    }, 15_000);

    subscriber.on("pmessage", async (_pattern, _channel, message) => {
      try {
        await stream.writeSSE({ event: "progress", data: message });
      } catch {
        // Stream closed
      }
    });

    stream.onAbort(() => {
      clearInterval(heartbeatInterval);
      subscriber.punsubscribe("render:progress:*").catch(() => {});
      subscriber.quit().catch(() => {});
    });

    await new Promise(() => {});
  });
});

export { sse };
