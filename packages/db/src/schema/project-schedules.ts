import { pgTable, uuid, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectSchedules = pgTable(
  "project_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    templateId: varchar("template_id", { length: 100 }).notNull(),
    format: varchar("format", { length: 20 }).notNull(),
    theme: varchar("theme", { length: 50 }),
    postsPerDay: integer("posts_per_day").notNull().default(1),
    daysOfWeek: integer("days_of_week").array().default([1, 2, 3, 4, 5]).notNull(),
    autoRender: boolean("auto_render").default(false).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("project_schedules_project_id_idx").on(table.projectId),
  ],
);
