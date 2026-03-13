import { db, bgmTracks, eq, count } from "@renderforge/db";

export const bgmService = {
  async list(nicheId?: string) {
    if (nicheId) {
      return db.select().from(bgmTracks).where(eq(bgmTracks.nicheId, nicheId));
    }
    return db.select().from(bgmTracks);
  },

  async getById(id: string) {
    const [track] = await db.select().from(bgmTracks).where(eq(bgmTracks.id, id)).limit(1);
    return track ?? null;
  },

  async getByCategory(category: string) {
    return db.select().from(bgmTracks).where(eq(bgmTracks.category, category));
  },

  async create(data: {
    name: string;
    fileUrl: string;
    durationSeconds: string;
    category?: string;
    nicheId?: string;
  }) {
    const [track] = await db.insert(bgmTracks).values(data).returning();
    return track;
  },

  async delete(id: string) {
    const [track] = await db.delete(bgmTracks).where(eq(bgmTracks.id, id)).returning();
    return track ?? null;
  },
};
