import { pgTable, uuid, varchar, text, integer, numeric, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    displayText: text("display_text").default(""),
    narrationText: text("narration_text").default(""),
    audioUrl: varchar("audio_url", { length: 500 }),
    durationSeconds: numeric("duration_seconds", { precision: 8, scale: 3 }),
    entrance: varchar("entrance", { length: 50 }).default("fade"),
    textSize: varchar("text_size", { length: 20 }).default("md"),
    extraProps: jsonb("extra_props").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scenes_post_id_sort_idx").on(table.postId, table.sortOrder),
  ],
);
