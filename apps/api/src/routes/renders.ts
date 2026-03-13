import { Hono } from "hono";
import { z } from "zod";
import { Queue } from "bullmq";
import { db, renders, posts, eq, count, desc, and } from "@renderforge/db";
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
  const status = c.req.query("status");
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (postId) conditions.push(eq(renders.postId, postId));
  if (status) conditions.push(eq(renders.status, status as typeof renders.status.enumValues[number]));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db.select({
      id: renders.id,
      postId: renders.postId,
      postTitle: posts.title,
      format: renders.format,
      status: renders.status,
      progress: renders.progress,
      outputUrl: renders.outputUrl,
      durationMs: renders.durationMs,
      fileSize: renders.fileSize,
      error: renders.error,
      jobId: renders.jobId,
      bgmTrackId: renders.bgmTrackId,
      createdAt: renders.createdAt,
    })
      .from(renders)
      .leftJoin(posts, eq(renders.postId, posts.id))
      .where(where)
      .limit(perPage)
      .offset(offset)
      .orderBy(desc(renders.createdAt)),
    db.select({ total: count() }).from(renders).where(where),
  ]);

  return c.json({ items, total, page, totalPages: Math.ceil(total / perPage) });
});

rendersRouter.get("/:id", async (c) => {
  const [render] = await db.select().from(renders).where(eq(renders.id, c.req.param("id"))).limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);
  return c.json(render);
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

// Delete a render
rendersRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [render] = await db.select().from(renders).where(eq(renders.id, id)).limit(1);
  if (!render) return c.json({ error: "Not found" }, 404);

  // If it has an output file in S3, delete it
  if (render.outputUrl) {
    try {
      const { storage } = await import("../services/storage.js");
      const key = `renders/${render.id}.mp4`;
      await storage.delete(key);
    } catch {
      // File may not exist, continue with DB deletion
    }
  }

  await db.delete(renders).where(eq(renders.id, id));
  return c.json({ success: true });
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

export { rendersRouter };
