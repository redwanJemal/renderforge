import { pgTable, uuid, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { postStatusEnum } from "./enums";
import { niches } from "./niches";
import { projects } from "./projects";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nicheId: uuid("niche_id").references(() => niches.id).notNull(),
    projectId: uuid("project_id").references(() => projects.id),
    title: varchar("title", { length: 500 }).notNull(),
    status: postStatusEnum("status").default("draft").notNull(),
    theme: varchar("theme", { length: 50 }).default("default"),
    templateId: varchar("template_id", { length: 100 }),
    format: varchar("format", { length: 20 }).default("story"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("posts_niche_id_idx").on(table.nicheId),
    index("posts_status_idx").on(table.status),
    index("posts_project_id_idx").on(table.projectId),
  ],
);
