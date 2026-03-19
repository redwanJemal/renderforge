/**
 * LinguaForge Seeder — Wrapper around seed-linguaforge.ts logic
 *
 * Creates:
 *   - LinguaForge project with branding
 *   - vocab-english niche
 *   - 120 vocabulary posts (status: ready)
 */
import {
  db,
  projects, niches, posts,
  eq,
} from "@renderforge/db";
import { vocabEnglishBank } from "../../content/banks/vocab-english";

export async function seedLinguaForge() {
  console.log("\n── LinguaForge ──");

  // Check if project exists
  const existing = await db.select().from(projects).where(eq(projects.slug, "linguaforge")).limit(1);
  if (existing.length > 0) {
    console.log("  Project already exists, skipping.");
    return;
  }

  // Create project
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
  console.log(`  Project: LinguaForge (${project.id})`);

  // Create niche
  const [niche] = await db.insert(niches).values({
    projectId: project.id,
    slug: "vocab-english",
    name: "English Vocabulary",
    defaultTemplateId: "vocab-card",
    voiceId: "les-brown",
    languages: ["en"],
    config: { segmentPattern: ["word", "phonetic", "definition", "example-1", "example-2"] },
  }).returning();
  console.log(`  Niche: vocab-english (${niche.id})`);

  // Seed posts
  const vocabPosts = vocabEnglishBank.getPosts();
  const postValues = vocabPosts.map((p) => ({
    nicheId: niche.id,
    projectId: project.id,
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

  for (let i = 0; i < postValues.length; i += 50) {
    const batch = postValues.slice(i, i + 50);
    await db.insert(posts).values(batch);
  }

  console.log(`  ${postValues.length} vocabulary posts seeded`);
}
