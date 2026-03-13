# Task 01: Project Scaffolding & Monorepo

## Overview

Set up pnpm workspaces monorepo structure, move existing Remotion code into `apps/renderer/`, scaffold new `apps/api/`, `apps/admin/`, `packages/db/`, and `packages/shared/` packages, and configure Docker Compose for PostgreSQL + Redis.

## Subtasks

1. [ ] Set up pnpm workspace with `pnpm-workspace.yaml`
2. [ ] Move existing Remotion code (src/templates, src/components, src/core, src/Root.tsx, src/types.ts, remotion.config.ts) into `apps/renderer/`
3. [ ] Scaffold `apps/api/` — Hono server with TypeScript, package.json with all deps
4. [ ] Scaffold `apps/admin/` — React 19 + Vite + Tailwind CSS 4 + shadcn/ui
5. [ ] Scaffold `packages/db/` — Drizzle ORM package with drizzle-kit, pg driver
6. [ ] Scaffold `packages/shared/` — shared types and constants
7. [ ] Update root `package.json` with workspace scripts, update `docker-compose.yml`
8. [ ] Verify: `pnpm install` succeeds, all apps have correct structure

## Details

### 1. pnpm-workspace.yaml

Create at project root:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 2. Move Renderer

Move the existing Remotion source into `apps/renderer/`:

```
apps/renderer/
├── src/
│   ├── templates/      # existing 23 templates
│   ├── components/     # existing shared components
│   ├── core/           # registry, schemas, fonts, format configs
│   ├── themes/         # default, dark, vibrant, minimal
│   ├── Root.tsx         # Remotion composition entry
│   └── types.ts         # Theme, TemplateMeta, Format, RenderJob
├── remotion.config.ts
├── package.json         # existing package.json with Remotion deps
└── tsconfig.json
```

- The existing `package.json` stays with `apps/renderer/`, but update the `name` field to `@renderforge/renderer`
- Keep all existing Remotion dependencies and overrides
- Update any import paths if needed
- Keep `scripts/render-cli.ts` and `content/` at the root level (they orchestrate across apps)

### 3. Scaffold apps/api

```
apps/api/
├── src/
│   ├── config.ts        # env config (stub)
│   ├── server.ts        # Hono app entry (stub)
│   ├── middleware/       # (empty, ready for task 03)
│   ├── routes/          # (empty, ready for task 03)
│   ├── services/        # (empty)
│   ├── jobs/            # (empty, ready for task 04)
│   ├── social/          # (empty, ready for task 21)
│   └── lib/             # (empty)
├── package.json
└── tsconfig.json
```

**package.json:**
```json
{
  "name": "@renderforge/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "hono": "^4.7",
    "@hono/node-server": "^1.13",
    "drizzle-orm": "^0.38",
    "pg": "^8.13",
    "bullmq": "^5.31",
    "ioredis": "^5.4",
    "bcryptjs": "^2.4",
    "jose": "^5.9",
    "zod": "^3.24",
    "dotenv": "^16.4",
    "@aws-sdk/client-s3": "^3.700",
    "@aws-sdk/s3-request-presigner": "^3.700",
    "@renderforge/db": "workspace:*",
    "@renderforge/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/node": "^22",
    "@types/pg": "^8.11",
    "@types/bcryptjs": "^2.4"
  }
}
```

**src/server.ts (stub):**
```typescript
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const port = parseInt(process.env.PORT || '3100');
console.log(`API server starting on port ${port}`);
serve({ fetch: app.fetch, port });
```

### 4. Scaffold apps/admin

```
apps/admin/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── ui/          # shadcn/ui components (installed later in task 15)
│   │   └── layout/      # (empty, ready for task 15)
│   ├── features/        # (empty, ready for tasks 16-20)
│   ├── hooks/           # (empty)
│   ├── stores/          # (empty)
│   └── lib/
│       └── utils.ts     # cn() helper for shadcn
├── index.html
├── vite.config.ts
├── tailwind.config.ts   # (or CSS-based config for TW4)
├── components.json      # shadcn/ui config
├── package.json
├── tsconfig.json
└── tsconfig.app.json
```

**package.json:**
```json
{
  "name": "@renderforge/admin",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0",
    "react-dom": "^19.0",
    "react-router-dom": "^7.1",
    "@tanstack/react-query": "^5.62",
    "zustand": "^5.0",
    "class-variance-authority": "^0.7",
    "clsx": "^2.1",
    "tailwind-merge": "^2.6",
    "lucide-react": "^0.468",
    "@renderforge/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vite": "^6.0",
    "@vitejs/plugin-react": "^4.3",
    "tailwindcss": "^4.0",
    "@tailwindcss/vite": "^4.0",
    "@types/react": "^19.0",
    "@types/react-dom": "^19.0"
  }
}
```

### 5. Scaffold packages/db

```
packages/db/
├── src/
│   ├── index.ts          # DB connection + exports (stub)
│   ├── schema/           # (empty, ready for task 02)
│   └── seed.ts           # (empty, ready for task 02)
├── drizzle.config.ts     # (stub)
├── package.json
└── tsconfig.json
```

**package.json:**
```json
{
  "name": "@renderforge/db",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "drizzle-kit migrate",
    "seed": "tsx src/seed.ts",
    "studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.38",
    "pg": "^8.13",
    "dotenv": "^16.4"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30",
    "typescript": "^5.7",
    "tsx": "^4.19",
    "@types/pg": "^8.11"
  }
}
```

### 6. Scaffold packages/shared

```
packages/shared/
├── src/
│   ├── index.ts          # re-export all
│   ├── types.ts          # shared type definitions (stub)
│   └── constants.ts      # shared constants (stub)
├── package.json
└── tsconfig.json
```

**package.json:**
```json
{
  "name": "@renderforge/shared",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

### 7. Root Configuration

**Root package.json scripts to add:**
```json
{
  "scripts": {
    "dev:api": "pnpm --filter @renderforge/api dev",
    "dev:admin": "pnpm --filter @renderforge/admin dev",
    "dev:renderer": "pnpm --filter @renderforge/renderer dev",
    "db:generate": "pnpm --filter @renderforge/db generate",
    "db:migrate": "pnpm --filter @renderforge/db migrate",
    "db:seed": "pnpm --filter @renderforge/db seed",
    "db:studio": "pnpm --filter @renderforge/db studio"
  }
}
```

**docker-compose.yml additions:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: renderforge_db
      POSTGRES_USER: renderforge
      POSTGRES_PASSWORD: renderforge_secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redisdata:/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - '3100:3100'
    depends_on:
      - postgres
      - redis
    env_file: .env

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    ports:
      - '5173:80'
    depends_on:
      - api

volumes:
  pgdata:
  redisdata:
```

**Root .env template (.env.example):**
```
PORT=3100
DATABASE_URL=postgresql://renderforge:renderforge_secret@localhost:5432/renderforge_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=renderforge
NODE_ENV=development
```

## Verification

1. `pnpm install` completes without errors
2. `pnpm dev:api` starts the Hono stub server on port 3100
3. `curl http://localhost:3100/health` returns `{"status":"ok"}`
4. `pnpm dev:admin` starts the Vite dev server
5. `pnpm dev:renderer` starts Remotion Studio
6. `docker compose up postgres redis` starts database and cache
7. All packages resolve workspace dependencies correctly
