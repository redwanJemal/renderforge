# Task 02: Database Schema & Migrations

## Overview

Create the full database schema using Drizzle ORM in `packages/db/`. Define all tables, enums, relations, and indexes. Generate the first migration and create a seed script for default data.

## Subtasks

1. [ ] Create Drizzle schema in `packages/db/src/schema/` — one file per table: users.ts, niches.ts, posts.ts, scenes.ts, bgm-tracks.ts, renders.ts, social-accounts.ts, scheduled-posts.ts, analytics.ts
2. [ ] Create `packages/db/src/schema/enums.ts` — all pgEnum definitions
3. [ ] Create `packages/db/src/schema/relations.ts` — all Drizzle relations between tables
4. [ ] Create `packages/db/src/index.ts` — database connection + Drizzle instance + export all schemas
5. [ ] Create `packages/db/drizzle.config.ts` + generate first migration
6. [ ] Create `packages/db/src/seed.ts` — seed default admin user + niches

## Details

### Enums (`packages/db/src/schema/enums.ts`)

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const postStatusEnum = pgEnum('post_status', [
  'draft',
  'audio_pending',
  'ready',
  'rendering',
  'rendered',
  'published',
]);

export const renderStatusEnum = pgEnum('render_status', [
  'queued',
  'rendering',
  'completed',
  'failed',
  'cancelled',
]);

export const socialProviderEnum = pgEnum('social_provider', [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'linkedin',
]);

export const scheduledPostStatusEnum = pgEnum('scheduled_post_status', [
  'scheduled',
  'publishing',
  'published',
  'failed',
]);

export const userRoleEnum = pgEnum('user_role', ['admin', 'editor']);
```

### Table Schemas

#### users.ts
```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('editor').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### niches.ts
```typescript
import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const niches = pgTable('niches', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  defaultTemplateId: varchar('default_template_id', { length: 100 }),
  voiceId: varchar('voice_id', { length: 100 }),
  languages: text('languages').array(),
  config: jsonb('config').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### posts.ts
```typescript
import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { postStatusEnum } from './enums';
import { niches } from './niches';

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  nicheId: uuid('niche_id').references(() => niches.id).notNull(),
  title: text('title').notNull(),
  status: postStatusEnum('status').default('draft').notNull(),
  theme: varchar('theme', { length: 50 }),
  templateId: varchar('template_id', { length: 100 }),
  format: varchar('format', { length: 20 }).default('story'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nicheIdIdx: index('posts_niche_id_idx').on(table.nicheId),
  statusIdx: index('posts_status_idx').on(table.status),
}));
```

#### scenes.ts
```typescript
import { pgTable, uuid, integer, varchar, text, numeric, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const scenes = pgTable('scenes', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  displayText: text('display_text').notNull(),
  narrationText: text('narration_text').notNull(),
  audioUrl: varchar('audio_url', { length: 500 }),
  durationSeconds: numeric('duration_seconds', { precision: 8, scale: 3 }),
  entrance: varchar('entrance', { length: 50 }).default('fade'),
  textSize: varchar('text_size', { length: 20 }).default('md'),
  extraProps: jsonb('extra_props').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  postIdSortIdx: index('scenes_post_id_sort_idx').on(table.postId, table.sortOrder),
}));
```

#### bgm-tracks.ts
```typescript
import { pgTable, uuid, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { niches } from './niches';

export const bgmTracks = pgTable('bgm_tracks', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  durationSeconds: numeric('duration_seconds', { precision: 8, scale: 3 }).notNull(),
  category: varchar('category', { length: 100 }),
  nicheId: uuid('niche_id').references(() => niches.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

#### renders.ts
```typescript
import { pgTable, uuid, varchar, integer, bigint, text, timestamp, index } from 'drizzle-orm/pg-core';
import { renderStatusEnum } from './enums';
import { posts } from './posts';

export const renders = pgTable('renders', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  format: varchar('format', { length: 20 }).notNull(),
  status: renderStatusEnum('status').default('queued').notNull(),
  progress: integer('progress').default(0),
  outputUrl: varchar('output_url', { length: 500 }),
  durationMs: integer('duration_ms'),
  fileSize: bigint('file_size', { mode: 'number' }),
  error: text('error'),
  jobId: varchar('job_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  postIdIdx: index('renders_post_id_idx').on(table.postId),
  statusIdx: index('renders_status_idx').on(table.status),
}));
```

#### social-accounts.ts
```typescript
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { socialProviderEnum } from './enums';
import { users } from './users';

export const socialAccounts = pgTable('social_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  provider: socialProviderEnum('provider').notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  accountName: varchar('account_name', { length: 255 }),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});
```

#### scheduled-posts.ts
```typescript
import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { scheduledPostStatusEnum } from './enums';
import { posts } from './posts';
import { renders } from './renders';
import { socialAccounts } from './social-accounts';

export const scheduledPosts = pgTable('scheduled_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  renderId: uuid('render_id').references(() => renders.id).notNull(),
  socialAccountId: uuid('social_account_id').references(() => socialAccounts.id).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  publishedAt: timestamp('published_at'),
  status: scheduledPostStatusEnum('status').default('scheduled').notNull(),
  platformPostId: varchar('platform_post_id', { length: 255 }),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  scheduledAtIdx: index('scheduled_posts_scheduled_at_idx').on(table.scheduledAt),
  statusIdx: index('scheduled_posts_status_idx').on(table.status),
}));
```

#### analytics.ts
```typescript
import { pgTable, uuid, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { scheduledPosts } from './scheduled-posts';

export const analytics = pgTable('analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduledPostId: uuid('scheduled_post_id').references(() => scheduledPosts.id).notNull(),
  views: integer('views').default(0),
  likes: integer('likes').default(0),
  shares: integer('shares').default(0),
  comments: integer('comments').default(0),
  engagementRate: numeric('engagement_rate', { precision: 5, scale: 2 }).default('0'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Relations (`packages/db/src/schema/relations.ts`)

Define relations using `drizzle-orm/relations`:
- users → socialAccounts (one-to-many)
- niches → posts (one-to-many), bgmTracks (one-to-many)
- posts → scenes (one-to-many), renders (one-to-many), scheduledPosts (one-to-many), niche (many-to-one)
- scenes → post (many-to-one)
- renders → post (many-to-one), scheduledPosts (one-to-many)
- socialAccounts → user (many-to-one), scheduledPosts (one-to-many)
- scheduledPosts → post, render, socialAccount (many-to-one), analytics (one-to-many)
- analytics → scheduledPost (many-to-one)

### Database Connection (`packages/db/src/index.ts`)

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export * from './schema';
export type Database = typeof db;
```

### Drizzle Config (`packages/db/drizzle.config.ts`)

```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Seed Script (`packages/db/src/seed.ts`)

- Hash password "admin123" with bcryptjs
- Insert admin user (admin@renderforge.com, admin, admin role)
- Insert 9 niches from existing `content/niches.ts` definitions (motivational, stoic, yld, etc.)
- Use `onConflictDoNothing()` for idempotent seeding

## Verification

1. `pnpm db:generate` creates migration SQL files in `packages/db/drizzle/`
2. `docker compose up postgres` starts PostgreSQL
3. `pnpm db:migrate` applies migrations without errors
4. `pnpm db:seed` creates admin user and niches
5. Connect to DB and verify all tables, enums, indexes exist
6. `drizzle-kit studio` shows schema correctly
