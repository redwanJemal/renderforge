# RenderForge Studio

Content automation platform powered by [Remotion](https://remotion.dev) for programmatic social media video generation.

## Features

- **27 Video Templates** — Motivational, kids education, sports, luxury, news, and more
- **Project Management** — Organize content by brand/channel with branding, schedules, and social handles
- **Multi-format Output** — Story (1080x1920), Post (1080x1080), Landscape (1920x1080)
- **Audio Pipeline** — Per-scene TTS narration with auto-sync, BGM mixing
- **Content Calendar** — Schedule-based content planning with fill rate tracking
- **Auto-rendering** — BullMQ schedule worker for automated render jobs
- **Admin Dashboard** — React 19 + shadcn/ui for managing projects, posts, renders, and publishing

---

## Architecture

| Service | Stack | Port |
|---------|-------|------|
| **API** | Hono + Node.js 22 | 3100 |
| **Admin** | React 19 + Vite + shadcn/ui | 80 (nginx) |
| **Renderer** | Remotion 4.0.415 (Chromium + ffmpeg) | — |
| **Database** | PostgreSQL 16 | 5432 |
| **Queue** | BullMQ + Redis 7 | 6379 |
| **Storage** | MinIO S3 | — |

### Database Schema (13 tables)

`users` · `projects` · `project_schedules` · `project_social_accounts` · `niches` · `posts` · `scenes` · `bgm_tracks` · `renders` · `social_accounts` · `scheduled_posts` · `analytics` · `image_library`

---

## Local Development

### Prerequisites

- Node.js 22+ with pnpm
- Docker + Docker Compose
- Chromium (for Remotion)
- ffmpeg + ffprobe

### Setup

```bash
# Start infrastructure
docker compose up -d postgres redis

# Push database schema
pnpm db:push

# Seed all data (admin user + YLD project + 200 posts + niches + BGM)
pnpm db:seed-all

# Start API server
pnpm dev:api

# Start admin dashboard (separate terminal)
pnpm dev:admin

# Start Remotion Studio (separate terminal)
pnpm dev:renderer
```

### URLs

| Service | URL |
|---------|-----|
| Admin Dashboard | http://localhost:5173 |
| API | http://localhost:3100 |
| Remotion Studio | http://localhost:3000 |
| Drizzle Studio | `pnpm db:studio` |

### Default Credentials

```
Email:    admin@renderforge.com
Password: admin123
```

---

## Production Deployment (Coolify)

RenderForge deploys to production using `docker-compose.coolify.yml` via Coolify on the VPS.

### Compose File

The Coolify compose (`docker-compose.coolify.yml`) defines 4 services:

| Service | Container | Description |
|---------|-----------|-------------|
| `api` | `renderforge-api` | Hono API + render/schedule workers |
| `admin` | `renderforge-admin` | nginx serving the Vite build, proxying `/api` to the API |
| `db` | `renderforge-db` | PostgreSQL 16 |
| `redis` | `renderforge-redis` | Redis 7 |

### Auto-Migration

The API container runs `drizzle-kit push` on startup via `apps/api/entrypoint.sh`. This automatically creates or updates database tables — no manual migration step needed.

### Deploy Steps

**1. Push code to `master`**

Coolify is configured to watch the `master` branch. Pushing triggers a rebuild:

```bash
git push origin master
```

**2. Or manually rebuild from the VPS**

SSH into the VPS and run:

```bash
cd ~/renderforge
docker compose -f docker-compose.coolify.yml build api admin
docker compose -f docker-compose.coolify.yml up -d --force-recreate api admin
```

**3. Seed data (first deploy or reset)**

After the containers are up and the API has auto-migrated the schema:

```bash
# Get the DB container IP
DB_IP=$(docker inspect renderforge-db --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

# Full seed (YLD project + 200 posts + niches + BGM)
DATABASE_URL="postgresql://renderforge:renderforge@${DB_IP}:5432/renderforge" pnpm db:seed-all

# Quran content (88 surahs × 2 channels = 372 posts)
DATABASE_URL="postgresql://renderforge:renderforge@${DB_IP}:5432/renderforge" npx tsx scripts/seed-quran.ts

# LinguaForge vocabulary (120 vocab cards)
DATABASE_URL="postgresql://renderforge:renderforge@${DB_IP}:5432/renderforge" npx tsx scripts/seed-linguaforge.ts
```

### Required Environment Variables

Set these in Coolify's environment configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `JWT_SECRET` | Yes | JWT signing secret |
| `S3_ACCESS_KEY` | Yes | MinIO/S3 access key |
| `S3_SECRET_KEY` | Yes | MinIO/S3 secret key |
| `S3_ENDPOINT` | No | Defaults to `https://storage.endlessmaker.com` |
| `S3_BUCKET` | No | Defaults to `forgebase` |
| `CORS_ORIGINS` | No | Defaults to `https://renderforge.endlessmaker.com` |
| `POSTGRES_USER` | No | Defaults to `renderforge` |
| `POSTGRES_DB` | No | Defaults to `renderforge` |

### Networking

- Services communicate over the `renderforge-internal` bridge network
- The `coolify` external network provides reverse proxy access
- Traefik labels are disabled (`traefik.enable=false`) — Coolify handles routing
- The admin nginx proxies `/api` requests to `http://api:3100`

### Health Checks

| Service | Endpoint | Interval |
|---------|----------|----------|
| API | `GET http://localhost:3100/health` | 30s (60s start period) |
| Admin | `GET http://localhost:80` | 30s (10s start period) |
| DB | `pg_isready` | 30s |
| Redis | `redis-cli ping` | 10s |

### Resource Limits

The API container (which runs Chromium for rendering) is limited to 4GB RAM with 1GB reserved.

---

## Seeding

### Full Seed (recommended)

```bash
pnpm db:seed-all
```

Wipes all data and creates:
- Admin user (`admin@renderforge.com` / `admin123`)
- YLD project ("Your Last Dollar") with logo, social handles, color palette
- 2 schedules (story daily + landscape MWF)
- 9 niches (motivational + finance linked to YLD project)
- 200 posts (100 content x 2 formats), status: `ready`
- 5 BGM tracks

### Quran Content Seed

```bash
# Seed 88 surahs × 2 channels (English + Amharic) = 372 posts
DATABASE_URL="postgresql://renderforge:renderforge@<db-host>:5432/renderforge" \
  npx tsx scripts/seed-quran.ts
```

Creates:
- **Quran English** project — Arabic + Sahih International translation
- **ቁርአን አማርኛ** project — Arabic + Amharic (Sadiq & Sani) translation
- 186 posts per channel (long surahs split into 20-ayah parts)
- 2,891 total ayahs across 88 surahs
- ~62 days of content at 3 posts/day
- Schedule: 3 posts/day, every day (auto-render enabled)
- Reciter: Mishary Rashid Al-Afasy with word-by-word timing

### LinguaForge Vocabulary Seed

```bash
npx tsx scripts/seed-linguaforge.ts
```

Creates 120 English vocabulary flashcard posts using the vocab-card template.

### Legacy Seeds

```bash
pnpm db:seed            # Admin user + niches only
pnpm db:seed-yld-100    # 200 YLD posts (requires niches to exist)
```

---

## Project Structure

```
renderforge/
├── apps/
│   ├── api/              # Hono API server
│   │   ├── Dockerfile
│   │   ├── entrypoint.sh # Auto-migration on startup
│   │   └── src/
│   │       ├── server.ts
│   │       ├── routes/   # auth, posts, renders, projects, niches, ...
│   │       ├── services/ # Business logic (project, post, niche, ...)
│   │       └── jobs/     # render-worker, schedule-worker, publish-worker
│   ├── admin/            # React admin dashboard
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── features/ # dashboard, projects, posts, renders, calendar, ...
│   │       └── hooks/    # TanStack Query hooks
│   └── renderer/         # Remotion render engine
│       └── templates/    # 27 video templates
├── packages/
│   ├── db/               # Drizzle ORM schema (13 tables)
│   └── shared/           # Shared types and constants
├── scripts/
│   └── seed-all.ts       # Full seed script
├── docker-compose.yml          # Local development
└── docker-compose.coolify.yml  # Production (Coolify)
```

---

## Available Templates

| Category | Templates |
|----------|-----------|
| **Motivational** | motivational-narration, yld-intro |
| **Kids** | kids-counting-fun, kids-alphabet-adventure, kids-icon-quiz, kids-bedtime-story |
| **Premium** | showcase, countdown, kinetic-text, split-reveal, orbit, glitch-text, neon-glow, parallax-layers, gold-reveal, slider |
| **Sports** | match-fixture, post-match, breaking-news |
| **Quran** | quran-ayah (word-by-word highlight, multi-language) |
| **Language** | vocab-card (vocabulary flashcards) |
| **Special** | dubai-luxury, ramadan-greeting |

---

## License

MIT
