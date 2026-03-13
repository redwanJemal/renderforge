import { Hono } from "hono";
import { z } from "zod";
import { db, scheduledPosts, socialAccounts, renders, posts, eq, and, desc, count } from "@renderforge/db";
import { authMiddleware } from "../middleware/auth.js";

const publishingRouter = new Hono();

publishingRouter.use("*", authMiddleware);

// List all scheduled/published items for a post
publishingRouter.get("/post/:postId", async (c) => {
  const postId = c.req.param("postId");

  const items = await db
    .select({
      id: scheduledPosts.id,
      postId: scheduledPosts.postId,
      renderId: scheduledPosts.renderId,
      socialAccountId: scheduledPosts.socialAccountId,
      provider: socialAccounts.provider,
      accountName: socialAccounts.accountName,
      scheduledAt: scheduledPosts.scheduledAt,
      publishedAt: scheduledPosts.publishedAt,
      status: scheduledPosts.status,
      platformPostId: scheduledPosts.platformPostId,
      error: scheduledPosts.error,
    })
    .from(scheduledPosts)
    .leftJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
    .where(eq(scheduledPosts.postId, postId))
    .orderBy(desc(scheduledPosts.createdAt));

  return c.json(items);
});

// List all publishing activity
publishingRouter.get("/", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const perPage = Number(c.req.query("perPage") ?? 20);
  const status = c.req.query("status");
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (status) {
    conditions.push(eq(scheduledPosts.status, status as "scheduled" | "publishing" | "published" | "failed"));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: scheduledPosts.id,
        postId: scheduledPosts.postId,
        postTitle: posts.title,
        renderId: scheduledPosts.renderId,
        renderFormat: renders.format,
        socialAccountId: scheduledPosts.socialAccountId,
        provider: socialAccounts.provider,
        accountName: socialAccounts.accountName,
        scheduledAt: scheduledPosts.scheduledAt,
        publishedAt: scheduledPosts.publishedAt,
        status: scheduledPosts.status,
        platformPostId: scheduledPosts.platformPostId,
        error: scheduledPosts.error,
      })
      .from(scheduledPosts)
      .leftJoin(posts, eq(scheduledPosts.postId, posts.id))
      .leftJoin(renders, eq(scheduledPosts.renderId, renders.id))
      .leftJoin(socialAccounts, eq(scheduledPosts.socialAccountId, socialAccounts.id))
      .where(where)
      .limit(perPage)
      .offset(offset)
      .orderBy(desc(scheduledPosts.createdAt)),
    db.select({ total: count() }).from(scheduledPosts).where(where),
  ]);

  return c.json({ items, total, page, totalPages: Math.ceil(total / perPage) });
});

// Schedule a post to one or more platforms
publishingRouter.post("/", async (c) => {
  const schema = z.object({
    postId: z.string().uuid(),
    renderId: z.string().uuid(),
    socialAccountIds: z.array(z.string().uuid()).min(1),
    scheduledAt: z.string().datetime().optional(),
  });

  const body = schema.parse(await c.req.json());
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date();

  const created = [];
  for (const socialAccountId of body.socialAccountIds) {
    const [item] = await db.insert(scheduledPosts).values({
      postId: body.postId,
      renderId: body.renderId,
      socialAccountId,
      scheduledAt,
      status: "scheduled",
    }).returning();
    created.push(item);
  }

  return c.json({ items: created, count: created.length }, 201);
});

// Cancel a scheduled post (remove from a platform)
publishingRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [item] = await db
    .select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.id, id))
    .limit(1);

  if (!item) return c.json({ error: "Not found" }, 404);

  if (item.status === "published") {
    return c.json({ error: "Cannot remove an already published post. Use the platform directly." }, 400);
  }

  await db.delete(scheduledPosts).where(eq(scheduledPosts.id, id));
  return c.json({ success: true });
});

// Update scheduled post status (for manual status management)
publishingRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const { status, error } = z.object({
    status: z.enum(["scheduled", "publishing", "published", "failed"]),
    error: z.string().optional(),
  }).parse(await c.req.json());

  const updates: Record<string, unknown> = { status };
  if (status === "published") updates.publishedAt = new Date();
  if (error) updates.error = error;

  const [updated] = await db
    .update(scheduledPosts)
    .set(updates)
    .where(eq(scheduledPosts.id, id))
    .returning();

  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(updated);
});

export { publishingRouter };
