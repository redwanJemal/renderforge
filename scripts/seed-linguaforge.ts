#!/usr/bin/env tsx
/**
 * Seed LinguaForge Project + English Vocabulary Posts
 *
 * Creates:
 *   1. LinguaForge project (branding, color palette)
 *   2. vocab-english niche linked to project
 *   3. 120 vocabulary posts (status: ready) with sceneProps in metadata
 *
 * Run: npx tsx scripts/seed-linguaforge.ts
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://renderforge:renderforge@localhost:5432/renderforge";
}

import {
  db,
  projects, niches, posts, eq,
} from "@renderforge/db";

// Import the vocab bank
import { vocabEnglishBank } from "../content/banks/vocab-english";

async function seedLinguaForge() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  LinguaForge — Vocabulary Seed");
  console.log("═══════════════════════════════════════════════════\n");

  // ── Step 1: Create Project ──
  console.log("Step 1: Creating LinguaForge project...");

  // Check if project already exists
  const existing = await db.select().from(projects).where(eq(projects.slug, "linguaforge")).limit(1);
  let projectId: string;

  if (existing.length > 0) {
    projectId = existing[0].id;
    console.log(`  Project already exists (${projectId}), updating...`);
    await db.update(projects).set({
      name: "LinguaForge",
      description: "Daily language learning content — vocabulary flashcards, phrases, and pronunciation drills for 10+ languages.",
      colorPalette: {
        primary: "#6366F1",
        secondary: "#EC4899",
        accent: "#6366F1",
        background: "#0F0A1A",
      },
      socialHandles: {
        tiktok: "@linguaforge",
        youtube: "LinguaForge",
        instagram: "@linguaforge",
        telegram: "@linguaforge",
      },
      status: "active",
      updatedAt: new Date(),
    }).where(eq(projects.id, projectId));
  } else {
    const [project] = await db.insert(projects).values({
      name: "LinguaForge",
      slug: "linguaforge",
      description: "Daily language learning content — vocabulary flashcards, phrases, and pronunciation drills for 10+ languages.",
      colorPalette: {
        primary: "#6366F1",
        secondary: "#EC4899",
        accent: "#6366F1",
        background: "#0F0A1A",
      },
      socialHandles: {
        tiktok: "@linguaforge",
        youtube: "LinguaForge",
        instagram: "@linguaforge",
        telegram: "@linguaforge",
      },
      defaultVoiceId: "les-brown",
      status: "active",
    }).returning();
    projectId = project.id;
    console.log(`  Created project: ${projectId}`);
  }

  // ── Step 2: Create Niche ──
  console.log("\nStep 2: Creating vocab-english niche...");

  const existingNiche = await db.select().from(niches).where(eq(niches.slug, "vocab-english")).limit(1);
  let nicheId: string;

  if (existingNiche.length > 0) {
    nicheId = existingNiche[0].id;
    console.log(`  Niche already exists (${nicheId}), updating...`);
    await db.update(niches).set({
      projectId,
      name: "English Vocabulary",
      defaultTemplateId: "vocab-card",
      voiceId: "les-brown",
      languages: ["en"],
      config: { segmentPattern: ["word", "phonetic", "definition", "example-1", "example-2"] },
      updatedAt: new Date(),
    }).where(eq(niches.id, nicheId));
  } else {
    const [niche] = await db.insert(niches).values({
      projectId,
      slug: "vocab-english",
      name: "English Vocabulary",
      defaultTemplateId: "vocab-card",
      voiceId: "les-brown",
      languages: ["en"],
      config: { segmentPattern: ["word", "phonetic", "definition", "example-1", "example-2"] },
    }).returning();
    nicheId = niche.id;
    console.log(`  Created niche: ${nicheId}`);
  }

  // ── Step 3: Seed Posts ──
  console.log("\nStep 3: Creating vocabulary posts...");

  // Delete existing vocab posts for this niche (idempotent)
  const deleted = await db.delete(posts).where(eq(posts.nicheId, nicheId));
  console.log(`  Cleaned existing posts for niche.`);

  const vocabPosts = vocabEnglishBank.getPosts();
  const postValues = vocabPosts.map((p, i) => ({
    nicheId,
    projectId,
    title: p.title,
    status: "ready" as const,
    theme: p.theme,
    templateId: "vocab-card",
    format: "story",
    metadata: {
      sceneProps: p.sceneProps,
      brandName: "LinguaForge",
      ttsScript: p.fullScript,
      sections: p.sections,
    },
  }));

  // Insert in batches of 50
  for (let i = 0; i < postValues.length; i += 50) {
    const batch = postValues.slice(i, i + 50);
    await db.insert(posts).values(batch);
    console.log(`  Inserted posts ${i + 1}-${Math.min(i + 50, postValues.length)}`);
  }

  console.log(`\n✓ LinguaForge project seeded successfully!`);
  console.log(`  Project: LinguaForge (${projectId})`);
  console.log(`  Niche:   vocab-english (${nicheId})`);
  console.log(`  Posts:   ${postValues.length} vocabulary cards (status: ready)`);
  console.log(`\n  Open https://renderforge.endlessmaker.com to view and render.`);

  process.exit(0);
}

seedLinguaForge().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
