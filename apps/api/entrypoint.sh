#!/bin/sh
set -e

echo "[entrypoint] Running database schema push..."
cd /app/packages/db
npx drizzle-kit push 2>&1 || echo "[entrypoint] Schema push failed (non-fatal, tables may already exist)"
cd /app

# Headless seed: if SEED_PROJECTS is set AND AUTO_SEED=true, seed without setup wizard
if [ "$AUTO_SEED" = "true" ] && [ -n "$SEED_PROJECTS" ]; then
  echo "[entrypoint] Auto-seed enabled (projects: $SEED_PROJECTS)..."
  npx tsx scripts/seed-init.ts || echo "[entrypoint] Seed failed (non-fatal)"
fi

echo "[entrypoint] Starting RenderForge API..."
exec npx tsx apps/api/src/server.ts
