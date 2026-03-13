# Stage 1: Build
FROM node:22-slim AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/admin/package.json apps/admin/

RUN pnpm install --frozen-lockfile --filter @renderforge/admin

COPY apps/admin/ apps/admin/

WORKDIR /app/apps/admin
RUN npx vite build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Install curl for healthcheck
RUN apk add --no-cache curl

# SPA routing + API proxy + SSE support
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://api:3100; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_buffering off; \
        proxy_cache off; \
        proxy_read_timeout 86400s; \
    } \
    location /health { \
        proxy_pass http://api:3100; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
