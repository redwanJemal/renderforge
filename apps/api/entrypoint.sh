#!/bin/sh
set -e

echo "[entrypoint] Running database schema push..."
cd /app/packages/db
npx drizzle-kit push 2>&1 || echo "[entrypoint] Schema push failed (non-fatal, tables may already exist)"
cd /app

echo "[entrypoint] Starting RenderForge API..."
exec npx tsx apps/api/src/server.ts
