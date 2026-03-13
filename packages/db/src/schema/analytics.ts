import { pgTable, uuid, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { scheduledPosts } from "./scheduled-posts";

export const analytics = pgTable("analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduledPostId: uuid("scheduled_post_id").references(() => scheduledPosts.id).notNull(),
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  engagementRate: numeric("engagement_rate", { precision: 5, scale: 2 }).default("0"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
});
