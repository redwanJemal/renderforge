# Task 28: Production Deployment

## Overview

Create production Docker configurations for all services, update docker-compose.yml for the full stack, add health checks, and update project documentation for the new monorepo structure.

## Subtasks

1. [ ] Create `apps/api/Dockerfile` — multi-stage build for API server
2. [ ] Create `apps/admin/Dockerfile` — multi-stage build with nginx for static serving
3. [ ] Update `docker-compose.yml` — full production stack
4. [ ] Health checks for all services, environment config documentation
5. [ ] Update root CLAUDE.md with new monorepo structure and commands
6. [ ] Verify: `docker compose up` starts all services, renders work end-to-end

## Details

### API Dockerfile (`apps/api/Dockerfile`)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api/ apps/api/
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/

# Build
RUN pnpm --filter @renderforge/api build

# Stage 2: Production
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install ffmpeg and ffprobe for audio processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy built files and node_modules
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/apps/api/ apps/api/
COPY --from=builder /app/packages/db/ packages/db/
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/apps/api/node_modules/ apps/api/node_modules/
COPY --from=builder /app/packages/db/node_modules/ packages/db/node_modules/

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
```

### Admin Dockerfile (`apps/admin/Dockerfile`)

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/admin/ apps/admin/
COPY packages/shared/ packages/shared/

# Build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @renderforge/admin build

# Stage 2: Serve with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
```

### Nginx Config (`apps/admin/nginx.conf`)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: route all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://api:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # SSE needs special proxy settings
    location /api/sse/ {
        proxy_pass http://api:3100;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
```

### Renderer Dockerfile Update

Update the existing Dockerfile for the renderer (or create `apps/renderer/Dockerfile`):

```dockerfile
FROM node:22-slim

# Install Chromium and ffmpeg
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/renderer/package.json apps/renderer/

RUN pnpm install --frozen-lockfile

COPY apps/renderer/ apps/renderer/

ENV CHROMIUM_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# The renderer is used by the API worker, not exposed directly
CMD ["echo", "Renderer ready for CLI use"]
```

### Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: renderforge_db
      POSTGRES_USER: renderforge
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-renderforge_secret}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U renderforge -d renderforge_db']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redisdata:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - '3100:3100'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      PORT: 3100
      DATABASE_URL: postgresql://renderforge:${POSTGRES_PASSWORD:-renderforge_secret}@postgres:5432/renderforge_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-change-me-in-production-please}
      S3_ENDPOINT: ${S3_ENDPOINT:-http://minio:9000}
      S3_ACCESS_KEY: ${S3_ACCESS_KEY:-minioadmin}
      S3_SECRET_KEY: ${S3_SECRET_KEY:-minioadmin}
      S3_BUCKET: ${S3_BUCKET:-renderforge}
      NODE_ENV: production
      # Social provider credentials (optional)
      FACEBOOK_APP_ID: ${FACEBOOK_APP_ID:-}
      FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET:-}
      YOUTUBE_CLIENT_ID: ${YOUTUBE_CLIENT_ID:-}
      YOUTUBE_CLIENT_SECRET: ${YOUTUBE_CLIENT_SECRET:-}
      TIKTOK_CLIENT_KEY: ${TIKTOK_CLIENT_KEY:-}
      TIKTOK_CLIENT_SECRET: ${TIKTOK_CLIENT_SECRET:-}
      LINKEDIN_CLIENT_ID: ${LINKEDIN_CLIENT_ID:-}
      LINKEDIN_CLIENT_SECRET: ${LINKEDIN_CLIENT_SECRET:-}
      OAUTH_REDIRECT_BASE: ${OAUTH_REDIRECT_BASE:-http://localhost:3100}
    restart: unless-stopped

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
      args:
        VITE_API_URL: /api
    ports:
      - '80:80'
    depends_on:
      - api
    restart: unless-stopped

  # MinIO (if not externally managed)
  minio:
    image: minio/minio:latest
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY:-minioadmin}
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ['CMD', 'mc', 'ready', 'local']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### Environment Configuration Documentation

Create `.env.example`:

```bash
# Database
POSTGRES_PASSWORD=renderforge_secret

# API
JWT_SECRET=generate-a-strong-secret-at-least-32-chars
NODE_ENV=production

# Storage (MinIO)
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=renderforge

# Social Providers (optional — only configure providers you want to use)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
OAUTH_REDIRECT_BASE=https://your-domain.com
```

### CLAUDE.md Updates

Update the root CLAUDE.md to reflect the new monorepo structure:

```markdown
## Quick Reference (Monorepo)

\`\`\`bash
pnpm dev:api          # Hono API → http://localhost:3100
pnpm dev:admin        # Admin Dashboard → http://localhost:5173
pnpm dev:renderer     # Remotion Studio → http://localhost:3000
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations
pnpm db:seed          # Seed default data
pnpm db:studio        # Drizzle Studio
docker compose up     # Full stack
\`\`\`

## Monorepo Structure

\`\`\`
apps/
  api/           # Hono API server (auth, CRUD, jobs, social)
  admin/         # React 19 admin dashboard (Vite, TW4, shadcn)
  renderer/      # Remotion rendering engine
packages/
  db/            # Drizzle ORM schema + migrations
  shared/        # Shared types and constants
\`\`\`
```

### Migration Script

Create a script to run initial setup:

```bash
#!/bin/bash
# scripts/setup.sh

echo "Setting up RenderForge Studio..."

# Start infrastructure
docker compose up -d postgres redis minio

# Wait for services
sleep 5

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Seed content (optional)
pnpm db:seed:content

echo "Setup complete!"
echo "Run 'pnpm dev:api' and 'pnpm dev:admin' to start development"
```

## Verification

1. `docker compose build` builds all images without errors
2. `docker compose up` starts all services:
   - PostgreSQL on 5432
   - Redis on 6379
   - MinIO on 9000/9001
   - API on 3100
   - Admin on 80
3. Health checks pass for all services
4. Admin dashboard accessible at http://localhost
5. Login with admin@renderforge.com / admin123
6. Create a post, upload audio, trigger render
7. Render completes and video is downloadable
8. Schedule a post to social media (if credentials configured)
9. Analytics worker fetches data periodically
10. All services restart automatically on failure (restart: unless-stopped)
11. Environment variables properly configure all services
12. Nginx correctly proxies API and SSE requests
