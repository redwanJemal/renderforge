import { pgTable, uuid, varchar, integer, bigint, text, timestamp, index } from "drizzle-orm/pg-core";
import { renderStatusEnum } from "./enums";
import { posts } from "./posts";
import { bgmTracks } from "./bgm-tracks";

export const renders = pgTable(
  "renders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id).notNull(),
    format: varchar("format", { length: 20 }).notNull(),
    status: renderStatusEnum("status").default("queued").notNull(),
    progress: integer("progress").default(0).notNull(),
    outputUrl: varchar("output_url", { length: 500 }),
    durationMs: integer("duration_ms"),
    fileSize: bigint("file_size", { mode: "number" }),
    error: text("error"),
    jobId: varchar("job_id", { length: 100 }),
    bgmTrackId: uuid("bgm_track_id").references(() => bgmTracks.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("renders_post_id_idx").on(table.postId),
    index("renders_status_idx").on(table.status),
  ],
);
