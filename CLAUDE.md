# RenderForge Studio

Content automation platform powered by Remotion for programmatic social media video generation.

## Quick Reference

```bash
# Development
pnpm dev:api          # Hono API → http://localhost:3100
pnpm dev:admin        # Admin dashboard → http://localhost:5173
pnpm dev:renderer     # Remotion Studio → http://localhost:3000

# Database
pnpm db:push          # Push schema to database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:seed-all      # Full seed: admin + YLD project + 200 posts + niches + BGM
pnpm db:seed          # Seed admin user + niches only (legacy)
pnpm db:studio        # Drizzle Studio

# Infrastructure
docker compose up -d postgres redis   # Start PostgreSQL + Redis
pnpm render           # CLI render (tsx scripts/render-cli.ts)

# Full Setup (from scratch)
docker compose up -d postgres redis
pnpm db:push
pnpm db:seed-all
pnpm dev:api
pnpm dev:admin
```

## Architecture

- **API**: Hono on port 3100 (auth, posts, renders, projects, social, SSE)
- **Database**: PostgreSQL 16 + Drizzle ORM (13 tables)
- **Queue**: BullMQ + Redis (background renders, scheduled publishing, schedule worker)
- **Admin**: React 19 + Vite + shadcn/ui + Tailwind CSS 4
- **Renderer**: Remotion 4.0.415 (React → Chromium → ffmpeg → MP4)
- **Storage**: MinIO S3 (audio, rendered videos)
- **Auth**: JWT (bcryptjs + jose)

## Monorepo Structure (pnpm workspaces)

```
renderforge/
├── apps/
│   ├── api/              # Hono API server (port 3100)
│   │   └── src/
│   │       ├── server.ts
│   │       ├── config.ts       # Zod-validated env
│   │       ├── routes/         # auth, posts, renders, projects, niches, uploads, social, sse, dashboard
│   │       ├── services/       # Business logic layer (project.ts, post.ts, niche.ts, etc.)
│   │       ├── jobs/           # BullMQ workers (render, publish, schedule, analytics)
│   │       ├── social/         # ISocialProvider + platform providers
│   │       ├── middleware/     # auth, error-handler, logger
│   │       └── lib/            # redis, crypto
│   ├── admin/            # React admin dashboard (port 5173)
│   │   └── src/
│   │       ├── components/     # layout/, ui/ (shadcn)
│   │       ├── features/       # dashboard, projects, posts, renders, social, niches, calendar, analytics, settings
│   │       ├── stores/         # auth-store (Zustand)
│   │       ├── hooks/          # TanStack Query hooks
│   │       └── lib/            # api-client, utils
│   └── renderer/         # Remotion render engine
│       ├── templates/    # 27 video templates
│       ├── components/   # AnimatedText, Background, etc.
│       ├── core/         # Registry, schemas, fonts
│       └── Root.tsx
├── packages/
│   ├── db/               # Drizzle schema + migrations
│   │   └── src/schema/   # users, projects, niches, posts, scenes, renders, etc.
│   └── shared/           # Shared types, constants
├── content/              # Content pipeline (CLI, preserved for batch ops)
├── scripts/
│   ├── seed-all.ts       # Full seed script (admin + project + posts)
│   └── task-runner.sh    # Task orchestrator
├── docs/tasks/           # 28 task specs + progress.json + coding-standards.md
├── docker-compose.yml    # PostgreSQL + Redis + API
└── pnpm-workspace.yaml
```

## Database Schema (13 tables)

- **users** — admin auth (email, password_hash, role)
- **projects** — top-level organization (name, slug, logo, social handles, color palette, status)
- **project_schedules** — content production rules per project (template, format, postsPerDay, daysOfWeek)
- **project_social_accounts** — links projects to social accounts (many-to-many)
- **niches** — content categories (slug, template, voice, languages, config; optional projectId)
- **posts** — content items (title, status workflow, niche, template, format; optional projectId)
- **scenes** — per-post scenes (display_text, narration_text, audio_url, duration_seconds)
- **bgm_tracks** — background music library
- **renders** — render jobs (status, progress, output_url)
- **social_accounts** — OAuth2 connections (encrypted tokens)
- **scheduled_posts** — publishing schedule
- **analytics** — engagement metrics per published post
- **image_library** — icon/image assets for templates

## Projects

Projects are the top-level organizational unit. Each project can have:
- **Branding**: logo, color palette (primary/secondary/accent/background), social handles
- **Schedules**: content production rules (e.g., "2 story posts/day using yld-intro template")
- **Linked Social Accounts**: for publishing
- **Posts & Niches**: grouped by project (projectId is nullable for backward compat)

### Hierarchy
```
User → Projects → Niches (optional grouping)
                → Posts → Scenes → Renders → Publishing
                → Schedules (content calendar rules)
                → Social Accounts (linked per project)
```

### Project Config in Renders
When a post belongs to a project, the render worker automatically injects:
- Project logo (resolved from S3) as template logo
- Color palette as accent/gradient defaults
- Social handles into CTA text

## Key Patterns

### Template Registration
Every template in `apps/renderer/templates/{name}/index.tsx`:
```typescript
registry.register({
  meta: { id, name, description, category, tags, supportedFormats, durationInFrames, fps },
  schema: zodSchema,
  component: MyTemplate,
  defaultProps: {...}
});
```

### Post Status Workflow
`draft → audio_pending → ready → rendering → rendered → published`

### Output Formats
- **story**: 1080×1920 (9:16), **post**: 1080×1080 (1:1), **landscape**: 1920×1080 (16:9)

## Seeding

### Full Seed (recommended)
```bash
pnpm db:seed-all
```
Wipes all data and seeds:
- Admin user: `admin@renderforge.com` / `admin123`
- YLD project ("Your Last Dollar") with logo, social handles, color palette
- 2 schedules (story daily + landscape MWF)
- 9 niches (motivational + finance linked to YLD project)
- 200 posts (100 content × 2 formats: story + landscape), status: `ready`
- 5 BGM tracks

### Legacy Seeds
```bash
pnpm db:seed            # Admin user + niches only
pnpm db:seed-yld-100    # 200 YLD posts (requires niches to exist)
```

## Conventions

- pnpm for package management (monorepo workspaces)
- TypeScript strict mode, no `any`, no `@ts-ignore`
- Zod for all validation (API input, env config, template props)
- Animations: Remotion `interpolate()` / `spring()` (frame-based)
- Database queries through service layer, never in routes
- Git commits: `{type}: description`
- See `docs/tasks/coding-standards.md` for full conventions

## Environment Variables

```
DATABASE_URL=postgresql://renderforge:renderforge@localhost:5432/renderforge
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
S3_ENDPOINT=https://storage.endlessmaker.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=forgebase
PORT=3100
NODE_ENV=development
```

## System Dependencies

- Node.js 22+ with pnpm
- PostgreSQL 16 + Redis 7 (via Docker)
- Chromium (headless, for Remotion)
- ffmpeg + ffprobe (video/audio processing)

## Content Pipeline (CLI)

1. `generate-plan.ts` → content calendar
2. `generate-scripts.ts` → audio scripts
3. Colab notebook → Qwen3 TTS
4. `audio-sync.ts` → frame-synced video
5. `render.ts` → batch render
6. `add-metadata.ts` → inject metadata
