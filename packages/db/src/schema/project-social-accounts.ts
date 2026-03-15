import { pgTable, uuid, unique, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { socialAccounts } from "./social-accounts";

export const projectSocialAccounts = pgTable(
  "project_social_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    socialAccountId: uuid("social_account_id").references(() => socialAccounts.id, { onDelete: "cascade" }).notNull(),
  },
  (table) => [
    unique("project_social_accounts_unique").on(table.projectId, table.socialAccountId),
    index("project_social_accounts_project_id_idx").on(table.projectId),
  ],
);
