import { db, imageLibrary, eq, ilike, desc, and, sql, count } from "@renderforge/db";

export const imageLibraryService = {
  async list(filters?: { category?: string; tags?: string[]; search?: string; page?: number; perPage?: number }) {
    const conditions = [];

    if (filters?.category) {
      conditions.push(eq(imageLibrary.category, filters.category));
    }

    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(sql`${imageLibrary.tags} @> ${filters.tags}`);
    }

    if (filters?.search) {
      conditions.push(
        sql`(${ilike(imageLibrary.filename, `%${filters.search}%`)} OR ${ilike(imageLibrary.description, `%${filters.search}%`)})`,
      );
    }

    const page = filters?.page ?? 1;
    const perPage = filters?.perPage ?? 24;
    const offset = (page - 1) * perPage;
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ total: totalCount }]] = await Promise.all([
      whereClause
        ? db.select().from(imageLibrary).where(whereClause).orderBy(desc(imageLibrary.createdAt)).limit(perPage).offset(offset)
        : db.select().from(imageLibrary).orderBy(desc(imageLibrary.createdAt)).limit(perPage).offset(offset),
      whereClause
        ? db.select({ total: count() }).from(imageLibrary).where(whereClause)
        : db.select({ total: count() }).from(imageLibrary),
    ]);

    return {
      items,
      total: Number(totalCount),
      page,
      totalPages: Math.ceil(Number(totalCount) / perPage),
    };
  },

  async getById(id: string) {
    const [image] = await db.select().from(imageLibrary).where(eq(imageLibrary.id, id)).limit(1);
    return image ?? null;
  },

  async create(data: {
    filename: string;
    s3Key: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    tags?: string[];
    category?: string;
    description?: string;
  }) {
    const [image] = await db.insert(imageLibrary).values(data).returning();
    return image;
  },

  async update(id: string, data: { tags?: string[]; category?: string; description?: string }) {
    const [image] = await db
      .update(imageLibrary)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(imageLibrary.id, id))
      .returning();
    return image ?? null;
  },

  async delete(id: string) {
    const [image] = await db.delete(imageLibrary).where(eq(imageLibrary.id, id)).returning();
    return image ?? null;
  },
};
