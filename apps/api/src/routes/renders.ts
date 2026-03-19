import { Hono } from "hono";
import { z } from "zod";
import { Queue } from "bullmq";
import { db, renders, posts, scheduledPosts, eq, count, desc, and, inArray } from "@renderforge/db";
import { authMiddleware } from "../middleware/auth.js";
import { getRedis } from "../lib/redis.js";
import type { RenderJobData } from "../jobs/render-worker.js";

const rendersRouter = new Hono();

rendersRouter.use("*", authMiddleware);

function getRenderQueue() {
  return new Queue<RenderJobData>("render", { connection: getRedis() });
}

const createSchema = z.object({
  postId: z.string().uuid(),
  format: z.string().default("story"),
  bgmTrackId: z.string().uuid().optional(),
});

const batchSchema = z.object({
  postIds: z.array(z.string().uuid()),
  formats: z.array(z.string()).default(["story"]),
  bgmTrackId: z.string().uuid().optional(),
});

rendersRouter.get("/", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const perPage = Number(c.req.query("perPage") ?? 20);
  const postId = c.req.query("postId");
  const projectId = c.req.query("projectId");
  const status = c.req.query("status");
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (postId) conditions.push(eq(renders.postId, postId));
  if (projectId) conditions.push(eq(posts.projectId, projectId));
  if (status) conditions.push(eq(renders.status, status as typeof renders.status.enumValues[number]));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Always join posts (needed for projectId filter and postTitle)
  const baseQuery = db.select({
    id: renders.id,
    postId: renders.postId,
    postTitle: posts.title,
    format: renders.format,
    status: renders.status,
    progress: renders.progress,
    outputUrl: renders.outputUrl,
    thumbnailUrl: renders.thumbnailUrl,
    durationMs: renders.durationMs,
    fileSize: renders.fileSize,
    error: renders.error,
    jobId: renders.jobId,
    bgmTrackId: renders.bgmTrackId,
    createdAt: renders.createdAt,
  })
    .from(renders)
    .leftJoin(posts, eq(renders.postId, posts.id));

  // For count query with projectId, we also need the join
  const countQuery = projectId
    ? db.select({ total: count() }).from(renders).leftJoin(posts, eq(renders.postId, posts.id))
    : db.select({ total: count() }).from(renders);

  const [items, [{ total }]] = await Promise.all([
    baseQuery.where(where).limit(perPage).offset(offset).orderBy(desc(renders.createdAt)),
    countQuery.where(where),
  ]);

  // Resolve S3 keys to presigned URLs for thumbnails and output videos
  const { storage } = await import("../services/storage.js");
  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      let thumbnailUrl = item.thumbnailUrl;
      let outputUrl = item.outputUrl;
      try {
        if (thumbnailUrl) thumbnailUrl = await storage.getPresignedUrl(thumbnailUrl, 3600);
      } catch { thumbnailUrl = null; }
      try {
        if (outputUrl) outputUrl = await storage.getPresignedUrl(outputUrl, 3600);
      } catch { /* keep original */ }
      return { ...item, thumbnailUrl, outputUrl };
    }),
  );

  return c.json({ items: resolvedItems, total, page, totalPages: Math.ceil(total / perPage) });
});

rendersRouter.get("/:id", async (c) => {
  const [render] = await db
    .select({
      id: renders.id,
      postId: renders.postId,
      postTitle: posts.title,
      format: renders.format,
      status: renders.status,
      progress: renders.progress,
      outputUrl: renders.outputUrl,
      thumbnailUrl: renders.thumbnailUrl,
      durationMs: renders.durationMs,
      fileSize: renders.fileSize,
      error: renders.error,
      jobId: renders.jobId,
      bgmTrackId: renders.bgmTrackId,
      createdAt: renders.createdAt,
    })
    .from(renders)
    .leftJoin(posts, eq(renders.postId, posts.id))
    .where(eq(renders.id, c.req.param("id")))
    .limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);

  const { storage } = await import("../services/storage.js");
  let thumbnailUrl = render.thumbnailUrl;
  let outputUrl = render.outputUrl;
  try {
    if (thumbnailUrl) thumbnailUrl = await storage.getPresignedUrl(thumbnailUrl, 3600);
  } catch { thumbnailUrl = null; }
  try {
    if (outputUrl) outputUrl = await storage.getPresignedUrl(outputUrl, 3600);
  } catch { /* keep original */ }

  return c.json({ ...render, thumbnailUrl, outputUrl });
});

rendersRouter.post("/", async (c) => {
  const { postId, format, bgmTrackId } = createSchema.parse(await c.req.json());

  const [render] = await db.insert(renders).values({
    postId,
    format,
    bgmTrackId: bgmTrackId ?? null,
    status: "queued",
    progress: 0,
  }).returning();

  const queue = getRenderQueue();
  const job = await queue.add("render", {
    renderId: render.id,
    postId,
    format,
    bgmTrackId,
  });

  await db.update(renders).set({ jobId: job.id }).where(eq(renders.id, render.id));

  return c.json({ ...render, jobId: job.id }, 201);
});

rendersRouter.post("/batch", async (c) => {
  const { postIds, formats, bgmTrackId } = batchSchema.parse(await c.req.json());
  const queue = getRenderQueue();
  const created = [];

  for (const postId of postIds) {
    for (const format of formats) {
      const [render] = await db.insert(renders).values({
        postId,
        format,
        bgmTrackId: bgmTrackId ?? null,
        status: "queued",
        progress: 0,
      }).returning();

      const job = await queue.add("render", {
        renderId: render.id,
        postId,
        format,
        bgmTrackId,
      });

      await db.update(renders).set({ jobId: job.id }).where(eq(renders.id, render.id));
      created.push({ ...render, jobId: job.id });
    }
  }

  return c.json({ renders: created, count: created.length }, 201);
});

// ── Helper: cancel a BullMQ job by jobId ──
async function cancelJob(jobId: string | null): Promise<boolean> {
  if (!jobId) return false;
  const queue = getRenderQueue();
  try {
    const job = await queue.getJob(jobId);
    if (!job) return false;
    const state = await job.getState();
    if (state === "waiting" || state === "delayed") {
      await job.remove();
      return true;
    }
    if (state === "active") {
      await job.moveToFailed(new Error("Cancelled by user"), "0", true);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Cancel a render (stop queued/active job)
rendersRouter.post("/:id/cancel", async (c) => {
  const id = c.req.param("id");
  const [render] = await db.select().from(renders).where(eq(renders.id, id)).limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);

  if (render.status === "completed" || render.status === "cancelled") {
    return c.json({ error: `Render is already ${render.status}` }, 400);
  }

  // Cancel the BullMQ job
  await cancelJob(render.jobId);

  // Update DB status
  await db.update(renders).set({
    status: "cancelled",
    error: "Cancelled by user",
    updatedAt: new Date(),
  }).where(eq(renders.id, id));

  return c.json({ success: true, id, status: "cancelled" });
});

// Bulk cancel renders
rendersRouter.post("/bulk-cancel", async (c) => {
  const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(await c.req.json());
  if (ids.length === 0) return c.json({ cancelled: 0 });

  const items = await db.select().from(renders).where(inArray(renders.id, ids));
  let cancelled = 0;

  for (const render of items) {
    if (render.status === "completed" || render.status === "cancelled") continue;
    await cancelJob(render.jobId);
    await db.update(renders).set({
      status: "cancelled", error: "Cancelled by user", updatedAt: new Date(),
    }).where(eq(renders.id, render.id));
    cancelled++;
  }

  return c.json({ cancelled });
});

// Drain queue — cancel ALL queued/waiting jobs
rendersRouter.post("/drain", async (c) => {
  const queue = getRenderQueue();

  // Get all waiting jobs and remove them
  const waiting = await queue.getJobs(["waiting", "delayed"]);
  let drained = 0;

  for (const job of waiting) {
    try {
      const renderId = job.data?.renderId;
      await job.remove();
      if (renderId) {
        await db.update(renders).set({
          status: "cancelled", error: "Queue drained", updatedAt: new Date(),
        }).where(eq(renders.id, renderId));
      }
      drained++;
    } catch {
      // Job may have already been processed
    }
  }

  return c.json({ drained, message: `${drained} queued jobs removed` });
});

// Delete a render (also cancels the job)
rendersRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [render] = await db.select().from(renders).where(eq(renders.id, id)).limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);

  // Cancel BullMQ job if still running/queued
  await cancelJob(render.jobId);

  // Delete S3 files
  if (render.outputUrl) {
    try {
      const { storage } = await import("../services/storage.js");
      await storage.delete(`renders/${render.id}.mp4`);
      await storage.delete(`thumbnails/${render.id}.jpg`);
    } catch {
      // File may not exist
    }
  }

  await db.delete(renders).where(eq(renders.id, id));
  return c.json({ success: true });
});

// Bulk delete renders (also cancels jobs)
rendersRouter.post("/bulk-delete", async (c) => {
  const { ids } = z.object({ ids: z.array(z.string().uuid()) }).parse(await c.req.json());
  if (ids.length === 0) return c.json({ deleted: 0 });

  const items = await db.select().from(renders).where(inArray(renders.id, ids));

  for (const render of items) {
    // Cancel job
    await cancelJob(render.jobId);
    // Delete S3 files
    try {
      const { storage } = await import("../services/storage.js");
      await storage.delete(`renders/${render.id}.mp4`);
      await storage.delete(`thumbnails/${render.id}.jpg`);
    } catch { /* continue */ }
  }

  await db.delete(renders).where(inArray(renders.id, ids));
  return c.json({ deleted: ids.length });
});

// Publish render to social account (creates scheduled post + immediately publishes)
rendersRouter.post("/:id/publish", async (c) => {
  const renderId = c.req.param("id");
  const { socialAccountIds } = z.object({
    socialAccountIds: z.array(z.string().uuid()),
  }).parse(await c.req.json());

  const [render] = await db.select().from(renders).where(eq(renders.id, renderId)).limit(1);
  if (!render) return c.json({ error: "Render not found" }, 404);
  if (render.status !== "completed") return c.json({ error: "Render is not completed" }, 400);

  const queue = new Queue<import("../jobs/publish-worker.js").PublishJobData>("publish", { connection: getRedis() });
  const results = [];

  for (const socialAccountId of socialAccountIds) {
    // Create a scheduled post entry for tracking
    const [sp] = await db.insert(scheduledPosts).values({
      postId: render.postId,
      renderId,
      socialAccountId,
      scheduledAt: new Date(),
      status: "scheduled",
    }).returning();

    // Queue publish job
    await queue.add("publish", {
      scheduledPostId: sp.id,
      postId: render.postId,
      renderId,
      socialAccountId,
    });

    results.push(sp);
  }

  return c.json({ published: results.length, items: results }, 201);
});

// Download render output — stream from S3 to avoid redirect issues
rendersRouter.get("/:id/download", async (c) => {
  const [render] = await db
    .select({ id: renders.id, outputUrl: renders.outputUrl, postId: renders.postId })
    .from(renders)
    .where(eq(renders.id, c.req.param("id")))
    .limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);
  if (!render.outputUrl) return c.json({ error: "No output file available" }, 404);

  try {
    const { storage } = await import("../services/storage.js");
    const key = render.outputUrl.startsWith("renders/") ? render.outputUrl : `renders/${render.id}.mp4`;

    // Get post title for filename
    const [post] = await db.select({ title: posts.title }).from(posts).where(eq(posts.id, render.postId)).limit(1);
    const safeTitle = (post?.title ?? "render").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const filename = `${safeTitle}-${render.id.slice(0, 8)}.mp4`;

    const buffer = await storage.download(key);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return c.json({ error: "File not found in storage" }, 404);
  }
});

// Download render thumbnail
rendersRouter.get("/:id/thumbnail", async (c) => {
  const [render] = await db
    .select({ id: renders.id, thumbnailUrl: renders.thumbnailUrl, postId: renders.postId })
    .from(renders)
    .where(eq(renders.id, c.req.param("id")))
    .limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);
  if (!render.thumbnailUrl) return c.json({ error: "No thumbnail available" }, 404);

  try {
    const { storage } = await import("../services/storage.js");
    const key = render.thumbnailUrl;

    // Get post title for filename
    const [post] = await db.select({ title: posts.title }).from(posts).where(eq(posts.id, render.postId)).limit(1);
    const safeTitle = (post?.title ?? "thumbnail").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const filename = `${safeTitle}-thumb.jpg`;

    const buffer = await storage.download(key);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return c.json({ error: "Thumbnail not found in storage" }, 404);
  }
});

export { rendersRouter };
