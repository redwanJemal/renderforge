# Stage 1: Install dependencies
FROM node:22-slim AS deps
RUN corepack enable pnpm
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/renderer/package.json apps/renderer/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-slim AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/renderer/node_modules ./apps/renderer/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY pnpm-workspace.yaml package.json ./
COPY apps/api/ apps/api/
COPY apps/renderer/ apps/renderer/
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY public/ public/

# Stage 3: Runtime
FROM node:22-slim AS runtime

# Install Chromium + ffmpeg + curl for Remotion rendering & healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    chromium \
    libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libasound2 libpango-1.0-0 libcairo2 libnspr4 libnss3 \
    libxshmfence1 libxfixes3 libx11-xcb1 libxext6 \
    ffmpeg fonts-noto fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium

RUN corepack enable pnpm
WORKDIR /app

COPY --from=builder /app ./

RUN mkdir -p output

COPY apps/api/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3100

ENV NODE_ENV=production
ENV PORT=3100

CMD ["/app/entrypoint.sh"]
