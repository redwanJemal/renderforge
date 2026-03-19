#!/usr/bin/env tsx
/**
 * RenderForge — Unified Initial Seed
 *
 * Orchestrates all project seeders based on SEED_PROJECTS env var.
 * Skips if DB already has users (idempotent).
 *
 * Usage:
 *   SEED_PROJECTS=yld,quran,linguaforge,kids npx tsx scripts/seed-init.ts
 *   pnpm db:seed-init
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://renderforge:renderforge@localhost:5432/renderforge";
}

import { db, users } from "@renderforge/db";
import { seedAdmin } from "./seeders/admin";
import { seedYLD } from "./seeders/yld";
import { seedQuran } from "./seeders/quran";
import { seedLinguaForge } from "./seeders/linguaforge";
import { seedKids } from "./seeders/kids";

const SEEDERS: Record<string, () => Promise<void>> = {
  yld: seedYLD,
  quran: seedQuran,
  linguaforge: seedLinguaForge,
  kids: seedKids,
};

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  RenderForge — Unified Seed");
  console.log("═══════════════════════════════════════════════════\n");

  // Check if already seeded
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already has users — skipping seed.\n");
    process.exit(0);
  }

  // Always seed admin first
  await seedAdmin();

  // Parse SEED_PROJECTS
  const seedProjects = (process.env.SEED_PROJECTS || "yld,quran,linguaforge,kids")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  console.log(`\nProjects to seed: ${seedProjects.join(", ")}`);

  for (const project of seedProjects) {
    const seeder = SEEDERS[project];
    if (!seeder) {
      console.warn(`\n  Unknown project "${project}", skipping.`);
      continue;
    }

    try {
      await seeder();
    } catch (err) {
      console.error(`\n  Failed to seed "${project}":`, err);
      // Continue with other seeders
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Seed complete!");
  console.log("═══════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
