# RenderForge Studio — Coding Standards

Mandatory conventions for all RenderForge Studio code. Every contributor and automated tool must follow these rules without exception.

---

## TypeScript

### Compiler Settings

- Strict mode enabled (`"strict": true` in tsconfig).
- No use of `any`. Use `unknown` and narrow with type guards.
- No `@ts-ignore` or `@ts-expect-error` — fix the type instead.

### Type Declarations

- Use `type` for data shapes, unions, and intersections.
- Use `interface` only when a type must be extended or implemented by a class.

```typescript
// Correct
type RenderJob = {
  id: string;
  status: RenderStatus;
  templateId: string;
};

// Only when extension is needed
interface BaseTemplate {
  id: string;
  name: string;
}

interface NarrationTemplate extends BaseTemplate {
  audioUrl: string;
  splits: number[];
}
```

### Naming Conventions

| Element              | Convention             | Example                          |
| -------------------- | ---------------------- | -------------------------------- |
| Files & directories  | `kebab-case`           | `render-queue.ts`, `audio-sync/` |
| Types & interfaces   | `PascalCase`           | `RenderJob`, `TemplateConfig`    |
| React components     | `PascalCase`           | `TemplateGallery`, `AudioPlayer` |
| Functions & vars     | `camelCase`            | `startRender`, `jobCount`        |
| Constants            | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `API_BASE_URL`|
| Enum members         | `SCREAMING_SNAKE_CASE` | `RENDER_STATUS.COMPLETED`        |
| Boolean variables    | `is` / `has` / `should` prefix | `isRendering`, `hasAudio`, `shouldRetry` |

### Path Aliases

- `@renderforge/db` — shared database package (schemas, migrations, services).
- `@renderforge/shared` — shared types, utilities, and constants.
- `@/` — root-relative imports within an individual app (e.g., `@/features/scheduling`).

### Imports

- Prefer named exports over default exports.
- Group imports in this order, separated by blank lines:
  1. Node built-ins (`node:fs`, `node:path`)
  2. External packages (`react`, `hono`, `drizzle-orm`)
  3. Internal aliases (`@renderforge/db`, `@renderforge/shared`)
  4. Relative imports (`./components`, `../utils`)

---

## Database (Drizzle ORM + PostgreSQL)

### Table & Column Naming

- Tables: `snake_case`, plural (e.g., `social_accounts`, `scheduled_posts`, `render_jobs`).
- Columns: `snake_case` (e.g., `created_at`, `post_id`, `template_id`).
- Junction tables: both table names joined with `_` (e.g., `posts_tags`).

### Primary Keys

- All PKs are UUIDs generated via `crypto.randomUUID()`.
- Column name: `id`.

```typescript
id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
```

### Timestamps

- Always use timezone-aware timestamps.
- Every table must include `created_at`. Include `updated_at` where rows are mutable.

```typescript
createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
```

### Enums

- Use Drizzle `pgEnum` for all status and category fields.
- Define the enum in the same schema file as the table that first uses it.

```typescript
export const renderStatusEnum = pgEnum('render_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);
```

### Relations

- Define relations using Drizzle's `relations()` function alongside the table definition.
- Keep relation names descriptive (`posts`, `author`, `socialAccount`).

```typescript
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(scheduledPosts),
  socialAccounts: many(socialAccounts),
}));
```

### Data Access

- All database queries go through a **service layer** (`services/{resource}.ts`).
- Routes and handlers never import `db` directly — they call service functions.
- Service functions return plain objects, not Drizzle query builders.

```typescript
// services/render-jobs.ts
export async function getRenderJob(id: string): Promise<RenderJob | null> {
  const [job] = await db.select().from(renderJobs).where(eq(renderJobs.id, id));
  return job ?? null;
}
```

---

## API (Hono)

### Route Organization

- One file per resource: `routes/posts.ts`, `routes/renders.ts`, `routes/accounts.ts`.
- Mount all route groups in a central `routes/index.ts`.

### Input Validation

- Validate all request bodies and query parameters with Zod schemas.
- Use Hono's `zValidator` middleware.

```typescript
import { zValidator } from '@hono/zod-validator';

app.post('/renders', zValidator('json', createRenderSchema), async (c) => {
  const data = c.req.valid('json');
  // ...
});
```

### Response Format

- **Success responses**: return the data directly (no wrapping envelope).
- **Error responses**: always return `{ error: string, details?: unknown }`.

```typescript
// Success
return c.json(renderJob, 201);

// Error
return c.json({ error: 'Template not found', details: { templateId } }, 404);
```

### Status Codes

| Code | Usage                                       |
| ---- | ------------------------------------------- |
| 200  | Successful GET, PUT, PATCH, DELETE          |
| 201  | Successful POST that creates a resource     |
| 400  | Validation failure or malformed request     |
| 401  | Missing or invalid authentication           |
| 404  | Resource not found                          |
| 500  | Unhandled server error                      |

### Authentication

- JWT-based auth via `hono/jwt` middleware.
- Protect all routes except health checks and public endpoints.
- Extract user context from the token — never trust client-supplied user IDs.

### Pagination

All list endpoints return a consistent pagination envelope:

```typescript
type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
};
```

Query parameters: `?page=1&limit=20` (defaults: page 1, limit 20, max limit 100).

---

## Frontend (React 19 + shadcn/ui)

### Components

- Functional components only — no class components.
- Use shadcn/ui as the base component library. Do not introduce alternative UI libraries.
- Co-locate component-specific types, hooks, and utils alongside the component file.

### Styling

- Tailwind CSS 4 with the `oklch()` color system.
- No inline styles. No CSS modules. No styled-components.
- Use `cn()` utility (from `lib/utils.ts`) for conditional class merging.

```typescript
import { cn } from '@/lib/utils';

<div className={cn('rounded-lg p-4', isActive && 'ring-2 ring-primary')} />
```

### State Management

| State Type    | Tool                     |
| ------------- | ------------------------ |
| Auth / global | Zustand                  |
| Server data   | TanStack Query           |
| Form data     | Controlled components    |
| URL state     | Search params / router   |

- Do not use `useState` for server-fetched data — always use TanStack Query.
- Zustand stores are reserved for authentication state and truly global UI state.

### Forms

- Controlled components with Zod validation.
- Show inline validation errors below each field.
- Disable submit buttons while submitting and show loading indicators.

### Loading & Error States

- Always show skeleton loaders during initial data fetch (never a blank screen).
- Use `<Suspense>` boundaries with skeleton fallbacks.
- Wrap feature sections in error boundaries for graceful failure recovery.
- Display user-friendly error messages — never expose raw error objects.

### Folder Structure

Feature-based organization inside `src/features/`:

```
src/
  features/
    scheduling/
      components/
      hooks/
      api.ts
      types.ts
      index.ts
    rendering/
      components/
      hooks/
      api.ts
      types.ts
      index.ts
  components/    # Shared/global components
  hooks/         # Shared hooks
  lib/           # Utilities
```

---

## Rendering (Remotion)

### Package Versions

- All Remotion packages pinned to **4.0.415** via `overrides` in `package.json`.
- Never upgrade Remotion packages independently — they must all move together.

### Animations

- Use `interpolate()` for linear mappings and `spring()` for physics-based motion.
- All animations are **frame-based**, not time-based. Never use `setTimeout` or `requestAnimationFrame`.
- Derive timing from `useCurrentFrame()` and `useVideoConfig()`.

```typescript
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp',
});
```

### Template Registration

- Every template registers itself via `registry.register()` in its `index.tsx`.
- Props are validated with a Zod schema passed to the registry.
- Templates must declare `supportedFormats`, `durationInFrames`, and `fps` in their metadata.

### Audio Pipeline

- Use `ffprobe` for audio timing analysis.
- Merge audio with video via `ffmpeg` post-render (not during Remotion composition).
- Audio split metadata stored in `content/audio/{id}/splits.json`.

---

## Git

### Commit Messages

Format: `{type}(task-NN): description`

- `feat` — new feature or capability
- `fix` — bug fix
- `chore` — maintenance, dependencies, config
- `refactor` — code restructuring without behavior change
- `docs` — documentation only
- `test` — adding or updating tests

```
feat(task-12): add social account connection flow
fix(task-07): correct pagination offset in render history
chore(task-03): upgrade drizzle-orm to 0.35.x
```

### Branches

- Branch from `master`.
- Branch naming: `{type}/task-NN-short-description` (e.g., `feat/task-12-social-accounts`).

---

## General

### Logging

- No `console.log` in production code.
- Use a structured logger (e.g., `pino`) with levels: `debug`, `info`, `warn`, `error`.
- Include context in log entries (request ID, user ID, job ID).

### Environment Variables

- Validate all environment variables with Zod in a central `config.ts` file.
- Fail fast at startup if required variables are missing.
- Never hardcode secrets, API keys, or connection strings — always use env vars.

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const config = envSchema.parse(process.env);
```

### Docker

- Multi-stage builds: separate build and runtime stages.
- No dev dependencies in the production image.
- Use `node:22-slim` as the runtime base.
- Copy only the built output and production `node_modules`.

### Package Management

- Use **pnpm** exclusively. Do not use npm or yarn.
- Lock file (`pnpm-lock.yaml`) must be committed.
- Use `workspace:*` protocol for internal package references.

### Testing

- Write tests for service layer functions, API routes, and complex utilities.
- Use Vitest as the test runner.
- Co-locate test files next to the source (`render-jobs.test.ts` beside `render-jobs.ts`).
- Name test files with `.test.ts` suffix.

### Error Handling

- Use typed error classes for domain-specific errors.
- Never swallow errors silently — always log or re-throw.
- API errors must return structured JSON (see API section above).
