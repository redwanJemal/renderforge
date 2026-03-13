import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { scheduledPostStatusEnum } from "./enums";
import { posts } from "./posts";
import { renders } from "./renders";
import { socialAccounts } from "./social-accounts";

export const scheduledPosts = pgTable(
  "scheduled_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => posts.id).notNull(),
    renderId: uuid("render_id").references(() => renders.id).notNull(),
    socialAccountId: uuid("social_account_id").references(() => socialAccounts.id).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    status: scheduledPostStatusEnum("status").default("scheduled").notNull(),
    platformPostId: varchar("platform_post_id", { length: 255 }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scheduled_posts_scheduled_at_idx").on(table.scheduledAt),
    index("scheduled_posts_status_idx").on(table.status),
  ],
);
