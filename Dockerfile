# Stage 1: Build dashboard
FROM node:22-slim AS dashboard-builder
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

# Stage 2: Build main app
FROM node:22-slim AS app
WORKDIR /app

# Install Chrome dependencies for Remotion + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libasound2t64 libpango-1.0-0 libcairo2 libnspr4 libnss3 \
    libxshmfence1 libxfixes3 libx11-xcb1 libxext6 \
    ffmpeg fonts-noto fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer/Remotion where Chrome is
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Copy built dashboard
COPY --from=dashboard-builder /app/dashboard/dist ./dashboard/dist

# Create output directory
RUN mkdir -p output

EXPOSE 3100

ENV NODE_ENV=production
ENV PORT=3100

CMD ["npx", "tsx", "src/api/server.ts"]
