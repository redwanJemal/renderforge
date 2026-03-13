# Task 00: RenderForge Studio — Project Overview

## Overview

RenderForge Studio is a 28-task expansion plan that transforms RenderForge from a CLI-driven video template engine into a full content automation platform with a web admin dashboard, background job processing, social media publishing, and analytics.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   RenderForge Studio                 │
├──────────┬──────────┬──────────┬────────────────────┤
│ apps/    │ apps/    │ apps/    │ packages/          │
│ admin    │ api      │ renderer │ db, shared         │
│ React 19 │ Hono     │ Remotion │ Drizzle, types     │
│ Vite 6   │ BullMQ   │ 4.0.415  │                    │
│ TW CSS 4 │ Redis    │ Chromium │                    │
│ shadcn   │ Postgres │ ffmpeg   │                    │
└──────────┴──────────┴──────────┴────────────────────┘
```

## Tech Stack

| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| Monorepo     | pnpm workspaces                                 |
| API          | Hono (Node.js), Zod validation                  |
| Auth         | JWT (jose), bcryptjs                             |
| Database     | PostgreSQL 16, Drizzle ORM                       |
| Job Queue    | BullMQ + Redis 7                                 |
| Rendering    | Remotion 4.0.415 + Chromium + ffmpeg             |
| Storage      | MinIO (S3-compatible)                            |
| Admin UI     | React 19, Vite 6, Tailwind CSS 4, shadcn/ui     |
| State        | Zustand 5, TanStack Query 5                      |
| Social APIs  | Facebook Graph API, YouTube Data API, TikTok Content Posting API, LinkedIn Marketing API |
| Deployment   | Docker Compose                                   |

## Phases & Tasks

### Phase 1: Foundation (Tasks 01–05)
Infrastructure, database, API server, job queue, and storage.

| Task | Title                              | Dependencies |
| ---- | ---------------------------------- | ------------ |
| 01   | Project Scaffolding & Monorepo     | —            |
| 02   | Database Schema & Migrations       | 01           |
| 03   | Hono API Server with Auth          | 01, 02       |
| 04   | Background Job System (BullMQ)     | 03           |
| 05   | Storage Service (MinIO)            | 03           |

### Phase 2: Content Management (Tasks 06–10)
Niche, post, and scene management with audio pipeline.

| Task | Title                              | Dependencies |
| ---- | ---------------------------------- | ------------ |
| 06   | Niche Management API               | 03           |
| 07   | Post Management API                | 06           |
| 08   | Per-Scene Audio System             | 05, 07       |
| 09   | Content Seeding                    | 07, 08       |
| 10   | TTS Script Export & Import         | 08           |

### Phase 3: Render Pipeline (Tasks 11–14)
Full render workflow with real-time progress.

| Task | Title                              | Dependencies |
| ---- | ---------------------------------- | ------------ |
| 11   | Render Job Queue via API           | 04, 08       |
| 12   | Per-Scene Audio Sync (Worker)      | 11           |
| 13   | Automated BGM Mixing               | 12           |
| 14   | SSE Progress Streaming             | 11           |

### Phase 4: Admin Dashboard (Tasks 15–20)
Web admin interface for all operations.

| Task | Title                              | Dependencies |
| ---- | ---------------------------------- | ------------ |
| 15   | Admin Shell & Auth                 | 03           |
| 16   | Dashboard Overview Page            | 15           |
| 17   | Content Management UI              | 15, 07       |
| 18   | Render Management UI               | 15, 11, 14   |
| 19   | Niche & Template Management UI     | 15, 06       |
| 20   | Settings Page                      | 15, 13       |

### Phase 5: Social Publishing (Tasks 21–25)
Multi-platform social media integration.

| Task | Title                              | Dependencies |
| ---- | ---------------------------------- | ------------ |
| 21   | Social Provider Framework          | 03           |
| 22   | Facebook & Instagram Provider      | 21           |
| 23   | YouTube Provider                   | 21           |
| 24   | TikTok Provider                    | 21           |
| 25   | LinkedIn Provider                  | 21           |

### Phase 6: Scheduling & Analytics (Tasks 26–28)
Content calendar, automated publishing, and performance analytics.

| Task | Title                              | Dependencies |
| ---- | ---------------------------------- | ------------ |
| 26   | Content Calendar & Scheduling      | 15, 21       |
| 27   | Analytics Dashboard                | 15, 21       |
| 28   | Production Deployment              | All          |

## Key Design Decisions

1. **Monorepo with pnpm workspaces** — shared types, single lockfile, efficient installs
2. **Hono over Express** — lightweight, Web Standard APIs, better TypeScript support
3. **Drizzle ORM** — type-safe SQL, lightweight, excellent migration tooling
4. **BullMQ** — reliable job queue with delayed jobs, retries, progress tracking
5. **Per-scene audio** — exact timing from ffprobe, no word-count estimation
6. **ISocialProvider interface** — pluggable social media providers
7. **SSE for progress** — real-time render progress without WebSocket complexity
8. **oklch() color system** — modern CSS color system with hue-based theming

## File Structure (Target)

```
renderforge/
├── apps/
│   ├── api/           # Hono API server
│   ├── admin/         # React admin dashboard
│   └── renderer/      # Remotion rendering engine (existing code moved here)
├── packages/
│   ├── db/            # Drizzle ORM schema + migrations
│   └── shared/        # Shared types and constants
├── docs/
│   └── tasks/         # Task specifications (this directory)
├── docker-compose.yml # Full stack deployment
├── pnpm-workspace.yaml
└── package.json       # Root workspace config
```
