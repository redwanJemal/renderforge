#!/usr/bin/env tsx
/**
 * RenderForge — Full Seed Script
 *
 * Wipes all data, then seeds:
 *   1. Admin user (admin@renderforge.com / admin123)
 *   2. YLD project (Your Last Dollar — Ethiopian/Amharic financial literacy)
 *   3. Niches (9 niches, motivational + finance linked to YLD project)
 *   4. 200 posts (100 content × 2 formats: story + landscape) under YLD project
 *   5. BGM tracks
 *
 * Run: pnpm db:seed-all
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://renderforge:renderforge@localhost:5432/renderforge";
}

import bcrypt from "bcryptjs";
import {
  db, sql,
  users, niches, posts, scenes, renders, bgmTracks,
  scheduledPosts, analytics, socialAccounts,
  projects, projectSchedules, projectSocialAccounts,
  eq,
} from "@renderforge/db";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// ── Content Bank Import ──
import { THEMES } from "../content/banks/motivational";

// ── Constants ──

interface AccentColor {
  name: string;
  color: string;
  bg: [string, string, string];
}

const ACCENT_COLORS: AccentColor[] = [
  { name: "emerald", color: "#22c55e", bg: ["#0a2e1a", "#071a10", "#020a05"] },
  { name: "gold", color: "#D4AF37", bg: ["#1a1500", "#0f0d00", "#050400"] },
  { name: "crimson", color: "#ef4444", bg: ["#2a0a0a", "#180505", "#0a0202"] },
  { name: "violet", color: "#a855f7", bg: ["#1a0a2e", "#0f0518", "#050208"] },
  { name: "cyan", color: "#06b6d4", bg: ["#0a1e2e", "#051218", "#020608"] },
  { name: "rose", color: "#f43f5e", bg: ["#2a0a14", "#18050a", "#0a0204"] },
  { name: "amber", color: "#f59e0b", bg: ["#2a1a0a", "#180f05", "#0a0602"] },
  { name: "teal", color: "#14b8a6", bg: ["#0a2e28", "#071a16", "#020a08"] },
];

const TEXT_ANIMATIONS = ["charReveal", "slideUp", "wordReveal", "fadeIn", "glitch"] as const;

const NICHES = [
  { slug: "motivational", name: "Motivational", defaultTemplateId: "motivational-narration", voiceId: "les-brown", languages: ["en"], config: { segmentPattern: ["intro", "headline", "subheader", "badge", "cta"] }, linkToProject: true },
  { slug: "kids-education", name: "Kids Education", defaultTemplateId: "kids-alphabet-adventure", voiceId: "kids-cheerful", languages: ["en"], config: { segmentPattern: ["intro", "letter*", "outro"] } },
  { slug: "kids-bedtime", name: "Kids Bedtime Stories", defaultTemplateId: "kids-bedtime-story", voiceId: "gentle-storyteller", languages: ["en"], config: { segmentPattern: ["intro", "page*", "outro"] } },
  { slug: "news", name: "Breaking News", defaultTemplateId: "breaking-news", voiceId: "morgan-freeman", languages: ["en"], config: { segmentPattern: ["intro", "section*", "outro"] } },
  { slug: "how-to", name: "How-To Guides", defaultTemplateId: "slider", voiceId: "mel-robbins", languages: ["en"], config: { segmentPattern: ["intro", "slide*", "outro"] } },
  { slug: "luxury", name: "Dubai Luxury", defaultTemplateId: "dubai-luxury", voiceId: "denzel-washington", languages: ["en"], config: { segmentPattern: ["intro", "section*", "outro"] } },
  { slug: "sports", name: "Sports", defaultTemplateId: "match-fixture", voiceId: "eric-thomas", languages: ["en"], config: { segmentPattern: ["intro", "section*", "outro"] } },
  { slug: "jokes", name: "Jokes & Comedy", defaultTemplateId: "motivational-narration", voiceId: "les-brown", languages: ["en"], config: { segmentPattern: ["intro", "setup", "punchline", "callback", "cta"] } },
  { slug: "finance", name: "Finance & Business", defaultTemplateId: "motivational-narration", voiceId: "les-brown", languages: ["en", "am"], config: { segmentPattern: ["intro", "headline", "subheader", "badge", "cta"] }, linkToProject: true },
];

const BGM_FILES = [
  { name: "Optimistic", file: "optimistic.mp3", category: "upbeat" },
  { name: "Inspirational Corporate", file: "inspirational-corporate.mp3", category: "corporate" },
  { name: "Cinematic Documentary", file: "cinematic-documentary.mp3", category: "cinematic" },
  { name: "Cinematic Piano & Strings", file: "cinematic-piano-strings.mp3", category: "cinematic" },
  { name: "Serious Documentary", file: "serious-documentary.mp3", category: "documentary" },
];

// ── Text helpers ──

function extractDisplayText(fullText: string, highlight?: string, maxWords = 10): string {
  if (highlight) return highlight.toUpperCase();
  const firstSentence = fullText.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(/\s+/);
  if (words.length <= maxWords) return firstSentence.toUpperCase();
  return words.slice(0, maxWords).join(" ").toUpperCase();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

function buildYLDIntroProps(
  p: {
    intro: string;
    headline: string;
    subheader: string;
    badge: string;
    cta: string;
    introHighlight?: string;
    headlineHighlight?: string;
    subheaderHighlight?: string;
    badgeHighlight?: string;
  },
  accent: AccentColor,
  animIdx: number,
) {
  const line1 = truncate(extractDisplayText(p.intro, p.introHighlight), 60);
  const line2 = truncate(extractDisplayText(p.headline, p.headlineHighlight), 80);
  const subheaderText = truncate(p.subheader.split(/[.!?]/)[0].trim(), 120);
  const badgeText = truncate(extractDisplayText(p.badge, p.badgeHighlight), 60);
  const ctaText = truncate(extractDisplayText(p.cta, undefined, 6), 40);

  return {
    logo: { file: "yld-logo-white.png", size: 480, glowEnabled: true, finalScale: 0.6, moveUpPx: 160, marginBottom: 15 },
    header: {
      line1, line1Size: 38, line1Animation: TEXT_ANIMATIONS[animIdx % TEXT_ANIMATIONS.length],
      line2, line2Size: 52, line2Animation: TEXT_ANIMATIONS[(animIdx + 1) % TEXT_ANIMATIONS.length],
      highlight: (p.headlineHighlight ?? p.introHighlight ?? "").toUpperCase(), marginBottom: 25,
    },
    subheader: { text: subheaderText, size: 28, animation: "typewriter", marginBottom: 45 },
    badge: { text: badgeText, enabled: true, marginBottom: 0 },
    cta: { text: ctaText, enabled: true, bottomOffset: 150 },
    divider: { enabled: true, marginBottom: 30 },
    theme: { accentColor: accent.color, bgGradient: accent.bg, particlesEnabled: true, scanLineEnabled: true, gridEnabled: true, vignetteEnabled: true },
    timing: { logoAppear: 20, logoMoveUp: 130, dividerAppear: 155, headerAppear: 165, subheaderAppear: 230, badgeAppear: 290, ctaAppear: 330 },
  };
}

function getAudioDuration(filePath: string): string {
  try {
    return execFileSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", filePath], { encoding: "utf-8" }).trim();
  } catch {
    return "120.000";
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════

async function seedAll() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  RenderForge — Full Seed");
  console.log("═══════════════════════════════════════════════════\n");

  // ── Step 1: Clean all data ──
  console.log("Step 1: Cleaning all data...");
  // Delete in FK order
  await db.delete(analytics);
  await db.delete(scheduledPosts);
  await db.delete(renders);
  await db.delete(scenes);
  await db.delete(posts);
  await db.delete(bgmTracks);
  await db.delete(projectSocialAccounts);
  await db.delete(projectSchedules);
  await db.delete(socialAccounts);
  await db.delete(niches);
  await db.delete(projects);
  await db.delete(users);
  console.log("  All tables cleared.\n");

  // ── Step 2: Admin user ──
  console.log("Step 2: Creating admin user...");
  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@renderforge.com",
    passwordHash,
    name: "Admin",
    role: "admin",
  });
  console.log("  admin@renderforge.com / admin123\n");

  // ── Step 3: YLD Project ──
  console.log("Step 3: Creating YLD project...");
  const [yldProject] = await db.insert(projects).values({
    name: "Your Last Dollar",
    slug: "yld",
    description: "Ethiopian/Amharic financial literacy & motivational content channel. Short-form videos for TikTok, YouTube Shorts, and Instagram Reels.",
    logoUrl: "yld-logo-white.png",
    socialHandles: {
      tiktok: "@yld_eth",
      youtube: "@YourLastDollar",
      instagram: "@yld_eth",
      telegram: "@yld_eth",
    },
    colorPalette: {
      primary: "#0a2e1a",
      secondary: "#071a10",
      accent: "#22c55e",
      background: "#020a05",
    },
    defaultVoiceId: "les-brown",
    status: "active",
  }).returning();
  console.log(`  Project: ${yldProject.name} (${yldProject.id})\n`);

  // ── Step 3b: YLD Schedules ──
  console.log("  Creating default schedules...");
  await db.insert(projectSchedules).values([
    {
      projectId: yldProject.id,
      templateId: "yld-intro",
      format: "story",
      postsPerDay: 2,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // every day
      autoRender: false,
      enabled: true,
    },
    {
      projectId: yldProject.id,
      templateId: "yld-intro",
      format: "landscape",
      postsPerDay: 1,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      autoRender: false,
      enabled: true,
    },
  ]);
  console.log("  2 schedules created (story daily + landscape MWF)\n");

  // ── Step 4: Niches ──
  console.log("Step 4: Seeding niches...");
  const nicheMap = new Map<string, string>(); // slug → id

  for (const niche of NICHES) {
    const { linkToProject, ...nicheData } = niche;
    const [inserted] = await db.insert(niches).values({
      ...nicheData,
      projectId: linkToProject ? yldProject.id : undefined,
    }).returning();
    nicheMap.set(niche.slug, inserted.id);
    const linked = linkToProject ? ` → YLD project` : "";
    console.log(`  ${niche.name} (${niche.slug})${linked}`);
  }
  console.log(`  ${NICHES.length} niches seeded.\n`);

  // ── Step 5: YLD Posts (100 content × 2 formats) ──
  console.log("Step 5: Seeding YLD posts (100 content × 2 formats)...");
  const motivationalNicheId = nicheMap.get("motivational")!;
  const formats = ["story", "landscape"] as const;
  let postCount = 0;
  let sceneCount = 0;
  let globalIdx = 0;

  for (const theme of THEMES) {
    process.stdout.write(`  ${theme.name}: `);

    for (const p of theme.posts) {
      const accent = ACCENT_COLORS[globalIdx % ACCENT_COLORS.length];

      for (const format of formats) {
        const templateProps = buildYLDIntroProps(p, accent, globalIdx);

        const [post] = await db.insert(posts).values({
          nicheId: motivationalNicheId,
          projectId: yldProject.id,
          title: p.title,
          status: "ready",
          theme: theme.id,
          templateId: "yld-intro",
          format,
          metadata: {
            sceneProps: templateProps,
            accentColor: accent.color,
            bgGradient: accent.bg,
          },
        }).returning();

        postCount++;

        // Insert 5 scenes
        const sectionDefs = [
          { key: "intro", text: p.intro, highlight: p.introHighlight, textSize: 64 },
          { key: "headline", text: p.headline, highlight: p.headlineHighlight, textSize: 56 },
          { key: "subheader", text: p.subheader, highlight: p.subheaderHighlight, textSize: 56 },
          { key: "badge", text: p.badge, highlight: p.badgeHighlight, textSize: 60 },
          { key: "cta", text: p.cta, highlight: undefined, textSize: 48 },
        ];

        for (let si = 0; si < sectionDefs.length; si++) {
          const sec = sectionDefs[si];
          await db.insert(scenes).values({
            postId: post.id,
            sortOrder: si,
            key: sec.key,
            displayText: extractDisplayText(sec.text, sec.highlight, sec.key === "cta" ? 6 : 10),
            narrationText: sec.text,
            durationSeconds: "4",
            entrance: "fadeIn",
            textSize: String(sec.textSize),
            extraProps: { highlight: sec.highlight },
          });
          sceneCount++;
        }
      }

      globalIdx++;
    }

    console.log(`${theme.posts.length} posts`);
  }
  console.log(`  Total: ${postCount} posts (${postCount / 2} content × 2 formats), ${sceneCount} scenes\n`);

  // ── Step 6: BGM Tracks ──
  console.log("Step 6: Seeding BGM tracks...");
  const bgmDir = join(process.cwd(), "content/audio/bgm/motivational");
  let bgmCount = 0;

  for (const bgm of BGM_FILES) {
    const filePath = join(bgmDir, bgm.file);
    let fileUrl = `bgm/${bgm.file}`;
    let durationSeconds = "120.000";

    if (existsSync(filePath)) {
      durationSeconds = getAudioDuration(filePath);

      // Try S3 upload
      try {
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = new S3Client({
          endpoint: process.env.S3_ENDPOINT || "https://storage.endlessmaker.com",
          region: "us-east-1",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY || "",
            secretAccessKey: process.env.S3_SECRET_KEY || "",
          },
          forcePathStyle: true,
        });

        const buffer = readFileSync(filePath);
        await s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || "forgebase",
          Key: fileUrl,
          Body: buffer,
          ContentType: "audio/mpeg",
        }));
        console.log(`  Uploaded ${bgm.file} to S3`);
      } catch {
        console.log(`  S3 upload skipped for ${bgm.file} (no credentials)`);
      }
    } else {
      console.log(`  ${bgm.file} not found locally, using placeholder URL`);
    }

    await db.insert(bgmTracks).values({
      name: bgm.name,
      fileUrl,
      durationSeconds,
      category: bgm.category,
      nicheId: motivationalNicheId,
    });
    bgmCount++;
  }
  console.log(`  ${bgmCount} BGM tracks seeded.\n`);

  // ── Done ──
  console.log("═══════════════════════════════════════════════════");
  console.log("  Seed complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`
  Admin:     admin@renderforge.com / admin123
  Project:   Your Last Dollar (yld)
  Posts:     ${postCount} (${postCount / 2} × story + landscape)
  Niches:    ${NICHES.length}
  BGM:       ${bgmCount} tracks
  Schedules: 2 (story daily, landscape MWF)

  Next: pnpm dev:api && pnpm dev:admin
  `);

  process.exit(0);
}

seedAll().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
