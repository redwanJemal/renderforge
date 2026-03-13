import { pgTable, uuid, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { niches } from "./niches";

export const bgmTracks = pgTable("bgm_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  durationSeconds: numeric("duration_seconds", { precision: 8, scale: 3 }).notNull(),
  category: varchar("category", { length: 100 }),
  nicheId: uuid("niche_id").references(() => niches.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
