import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as users from "./schema/users";
import * as niches from "./schema/niches";
import * as posts from "./schema/posts";
import * as scenes from "./schema/scenes";
import * as bgmTracks from "./schema/bgm-tracks";
import * as renders from "./schema/renders";
import * as socialAccounts from "./schema/social-accounts";
import * as scheduledPosts from "./schema/scheduled-posts";
import * as analytics from "./schema/analytics";
import * as enums from "./schema/enums";
import * as relations from "./schema/relations";

export const schema = {
  ...users,
  ...niches,
  ...posts,
  ...scenes,
  ...bgmTracks,
  ...renders,
  ...socialAccounts,
  ...scheduledPosts,
  ...analytics,
  ...enums,
  ...relations,
};

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;

// Re-export drizzle-orm utilities
export { sql, eq, ne, gt, gte, lt, lte, and, or, like, ilike, desc, asc, count, inArray, notInArray } from "drizzle-orm";

// Re-export all schemas
export * from "./schema/enums";
export * from "./schema/users";
export * from "./schema/niches";
export * from "./schema/posts";
export * from "./schema/scenes";
export * from "./schema/bgm-tracks";
export * from "./schema/renders";
export * from "./schema/social-accounts";
export * from "./schema/scheduled-posts";
export * from "./schema/analytics";
export * from "./schema/relations";
