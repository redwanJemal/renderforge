import { db, niches, eq, ilike, count } from "@renderforge/db";

export const nicheService = {
  async list(page = 1, perPage = 20) {
    const offset = (page - 1) * perPage;
    const [items, [{ total }]] = await Promise.all([
      db.select().from(niches).limit(perPage).offset(offset).orderBy(niches.name),
      db.select({ total: count() }).from(niches),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / perPage) };
  },

  async getById(id: string) {
    const [niche] = await db.select().from(niches).where(eq(niches.id, id)).limit(1);
    return niche ?? null;
  },

  async getBySlug(slug: string) {
    const [niche] = await db.select().from(niches).where(eq(niches.slug, slug)).limit(1);
    return niche ?? null;
  },

  async create(data: {
    slug: string;
    name: string;
    defaultTemplateId?: string;
    voiceId?: string;
    languages?: string[];
    config?: Record<string, unknown>;
  }) {
    const [niche] = await db.insert(niches).values(data).returning();
    return niche;
  },

  async update(id: string, data: Partial<{
    slug: string;
    name: string;
    defaultTemplateId: string | null;
    voiceId: string | null;
    languages: string[];
    config: Record<string, unknown>;
  }>) {
    const [niche] = await db
      .update(niches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(niches.id, id))
      .returning();
    return niche ?? null;
  },

  async delete(id: string) {
    const [niche] = await db.delete(niches).where(eq(niches.id, id)).returning();
    return niche ?? null;
  },
};
