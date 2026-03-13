import { db, posts, scenes, renders, eq, and, ilike, count, desc, asc, inArray, sql } from "@renderforge/db";
import type { PostStatus } from "@renderforge/shared";
import { POST_STATUS_TRANSITIONS } from "@renderforge/shared";

export const postService = {
  async list(filters: {
    nicheId?: string;
    status?: string;
    search?: string;
    page?: number;
    perPage?: number;
  } = {}) {
    const { nicheId, status, search, page = 1, perPage = 20 } = filters;
    const offset = (page - 1) * perPage;

    const conditions = [];
    if (nicheId) conditions.push(eq(posts.nicheId, nicheId));
    if (status) conditions.push(eq(posts.status, status as PostStatus));
    if (search) conditions.push(ilike(posts.title, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(posts).where(where).limit(perPage).offset(offset).orderBy(desc(posts.createdAt)),
      db.select({ total: count() }).from(posts).where(where),
    ]);

    // Attach render counts per post
    if (items.length > 0) {
      const postIds = items.map((p) => p.id);
      const renderRows = await db
        .select({
          postId: renders.postId,
          status: renders.status,
          cnt: count(),
        })
        .from(renders)
        .where(inArray(renders.postId, postIds))
        .groupBy(renders.postId, renders.status);

      const countsMap = new Map<string, { total: number; completed: number; rendering: number; failed: number; queued: number }>();
      for (const row of renderRows) {
        if (!countsMap.has(row.postId)) {
          countsMap.set(row.postId, { total: 0, completed: 0, rendering: 0, failed: 0, queued: 0 });
        }
        const entry = countsMap.get(row.postId)!;
        const c = Number(row.cnt);
        entry.total += c;
        if (row.status === "completed") entry.completed += c;
        else if (row.status === "rendering") entry.rendering += c;
        else if (row.status === "failed") entry.failed += c;
        else if (row.status === "queued") entry.queued += c;
      }

      const itemsWithCounts = items.map((p) => ({
        ...p,
        renderCounts: countsMap.get(p.id) ?? { total: 0, completed: 0, rendering: 0, failed: 0, queued: 0 },
      }));
      return { items: itemsWithCounts, total, page, totalPages: Math.ceil(total / perPage) };
    }

    return { items, total, page, totalPages: Math.ceil(total / perPage) };
  },

  async getById(id: string) {
    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return null;

    const postScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.postId, id))
      .orderBy(asc(scenes.sortOrder));

    return { ...post, scenes: postScenes };
  },

  async create(data: {
    nicheId: string;
    title: string;
    theme?: string;
    templateId?: string;
    format?: string;
    metadata?: Record<string, unknown>;
    scenes?: Array<{
      sortOrder: number;
      key: string;
      displayText?: string;
      narrationText?: string;
      entrance?: string;
      textSize?: string;
      extraProps?: Record<string, unknown>;
    }>;
  }) {
    const { scenes: sceneData, ...postData } = data;

    const [post] = await db.insert(posts).values(postData).returning();

    if (sceneData?.length) {
      await db.insert(scenes).values(
        sceneData.map((s) => ({ ...s, postId: post.id })),
      );
    }

    return this.getById(post.id);
  },

  async update(id: string, data: Partial<{
    title: string;
    theme: string;
    templateId: string;
    format: string;
    metadata: Record<string, unknown>;
  }>) {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return post ?? null;
  },

  async updateStatus(id: string, newStatus: PostStatus) {
    const post = await this.getById(id);
    if (!post) return null;

    const currentStatus = post.status as PostStatus;
    const allowedTransitions = POST_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`);
    }

    const [updated] = await db
      .update(posts)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return updated;
  },

  async upsertScenes(postId: string, sceneData: Array<{
    id?: string;
    sortOrder: number;
    key: string;
    displayText?: string;
    narrationText?: string;
    audioUrl?: string;
    durationSeconds?: string;
    entrance?: string;
    textSize?: string;
    extraProps?: Record<string, unknown>;
  }>) {
    // Delete existing scenes and re-insert
    await db.delete(scenes).where(eq(scenes.postId, postId));

    if (sceneData.length > 0) {
      await db.insert(scenes).values(
        sceneData.map((s) => ({
          ...s,
          postId,
        })),
      );
    }

    return db
      .select()
      .from(scenes)
      .where(eq(scenes.postId, postId))
      .orderBy(asc(scenes.sortOrder));
  },

  async updateSceneAudio(sceneId: string, audioUrl: string, durationSeconds: string) {
    const [scene] = await db
      .update(scenes)
      .set({ audioUrl, durationSeconds })
      .where(eq(scenes.id, sceneId))
      .returning();
    return scene ?? null;
  },

  async delete(id: string) {
    const [post] = await db.delete(posts).where(eq(posts.id, id)).returning();
    return post ?? null;
  },

  async checkAllScenesHaveAudio(postId: string): Promise<boolean> {
    const postScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.postId, postId));

    return postScenes.length > 0 && postScenes.every((s) => s.audioUrl);
  },
};
