#!/usr/bin/env tsx
/**
 * Seed Quran Projects — Separate channels per language
 *
 *   1. Quran English — Arabic + English translation
 *   2. Quran Amharic — Arabic + Amharic translation
 *
 * Surahs longer than MAX_DURATION_MS (~5 min) are split into multiple posts.
 * Each part uses the same audio URL but with audioStartMs to seek into the
 * correct position. Scene timings are rebased to 0 for each part.
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/seed-quran.ts
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://renderforge:renderforge@localhost:5432/renderforge";
}

import { db, projects, projectSchedules, niches, posts, renders, eq, inArray } from "@renderforge/db";

const RECITER_ID = 7; // Mishary Al-Afasy
const TRANSLATION_EN = 20; // Sahih International
const TRANSLATION_AM = 87; // Sadiq and Sani (Amharic)

// Max ~5 minutes per video (300,000 ms)
const MAX_DURATION_MS = 300_000;

// ── Surah Selection ──────────────────────────────────────────────────────
const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 78 + i);

const POPULAR_SURAHS = [
  36, 55, 56, 67, 18, 32, 48, 49, 57, 71, 72, 73, 74, 75, 76, 77, 31, 44, 50,
];

const MEDIUM_SURAHS = [
  1, 13, 14, 19, 22, 24, 25, 29, 30, 34, 35, 39, 40, 41, 45, 46, 47,
  51, 53, 54, 58, 59, 60, 61, 62, 63, 64, 65, 66, 68, 69, 70,
];

const ALL_SURAHS = [...new Set([...JUZ_AMMA, ...POPULAR_SURAHS, ...MEDIUM_SURAHS])].sort((a, b) => a - b);

interface VerseTiming {
  verse_key: string;
  timestamp_from: number;
  timestamp_to: number;
  duration: number;
  segments: [number, number, number][];
}

interface QuranVerse {
  verse_key: string;
  text_uthmani: string;
  translations: { resource_id: number; text: string }[];
}

interface Scene {
  verseKey: string;
  arabicText: string;
  translation?: string;
  wordSegments: [number, number, number][];
  startMs: number;
  endMs: number;
}

async function fetchVerses(chapterNum: number, translationId: number): Promise<QuranVerse[]> {
  const allVerses: QuranVerse[] = [];
  let page = 1;
  while (true) {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${chapterNum}?language=en&translations=${translationId}&fields=text_uthmani&per_page=50&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();
    allVerses.push(...data.verses);
    if (data.pagination.next_page === null) break;
    page++;
    await new Promise(r => setTimeout(r, 100));
  }
  return allVerses;
}

async function fetchAudio(chapterNum: number): Promise<{ audioUrl: string; timings: VerseTiming[] }> {
  const url = `https://api.quran.com/api/v4/chapter_recitations/${RECITER_ID}/${chapterNum}?segments=true`;
  const res = await fetch(url);
  const data = await res.json();
  return { audioUrl: data.audio_file.audio_url, timings: data.audio_file.timestamps };
}

async function fetchChapter(chapterNum: number): Promise<{ name_simple: string; name_arabic: string; verses_count: number }> {
  const url = `https://api.quran.com/api/v4/chapters/${chapterNum}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.chapter;
}

function clean(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

interface ChannelConfig {
  slug: string;
  name: string;
  description: string;
  socialHandle: string;
  brandName: string;
  ctaText: string;
  translationId: number;
  nicheSlug: string;
  nicheName: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    slug: 'quran-english',
    name: 'Quran English',
    description: 'Daily Quran recitation with Arabic text and English translation. Word-by-word highlighting synced to Mishary Al-Afasy.',
    socialHandle: '@quran_english',
    brandName: 'Quran English',
    ctaText: 'Follow for daily Quran',
    translationId: TRANSLATION_EN,
    nicheSlug: 'quran-english',
    nicheName: 'Quran English Recitation',
  },
  {
    slug: 'quran-amharic',
    name: 'ቁርአን አማርኛ',
    description: 'የቀን ቁርአን ንባብ ከአረብኛ ጽሁፍ እና የአማርኛ ትርጉም ጋር። Daily Quran recitation with Amharic translation.',
    socialHandle: '@quran_amharic',
    brandName: 'ቁርአን አማርኛ',
    ctaText: 'ለዕለት ቁርአን ተከታተሉ',
    translationId: TRANSLATION_AM,
    nicheSlug: 'quran-amharic',
    nicheName: 'Quran Amharic Recitation',
  },
];

/**
 * Split scenes into parts where each part is ≤ MAX_DURATION_MS.
 * Returns array of { scenes, audioStartMs } — scenes are rebased to 0.
 */
function splitScenes(allScenes: Scene[]): Array<{ scenes: Scene[]; audioStartMs: number }> {
  if (allScenes.length === 0) return [];

  const totalMs = allScenes[allScenes.length - 1].endMs;
  if (totalMs <= MAX_DURATION_MS) {
    // No split needed
    return [{ scenes: allScenes, audioStartMs: 0 }];
  }

  const parts: Array<{ scenes: Scene[]; audioStartMs: number }> = [];
  let partScenes: Scene[] = [];
  let partStartMs = 0;

  for (const scene of allScenes) {
    const partDuration = scene.endMs - partStartMs;

    // If adding this scene would exceed max, start a new part
    // (but always include at least 1 scene per part)
    if (partDuration > MAX_DURATION_MS && partScenes.length > 0) {
      // Rebase current part
      parts.push({
        audioStartMs: partStartMs,
        scenes: rebaseScenes(partScenes, partStartMs),
      });
      partStartMs = scene.startMs;
      partScenes = [scene];
    } else {
      partScenes.push(scene);
    }
  }

  // Push remaining scenes
  if (partScenes.length > 0) {
    parts.push({
      audioStartMs: partStartMs,
      scenes: rebaseScenes(partScenes, partStartMs),
    });
  }

  return parts;
}

/** Rebase scene timings to start at 0 relative to audioStartMs */
function rebaseScenes(scenes: Scene[], baseMs: number): Scene[] {
  return scenes.map(s => ({
    ...s,
    startMs: s.startMs - baseMs,
    endMs: s.endMs - baseMs,
    wordSegments: s.wordSegments.map(([idx, start, end]) =>
      [idx, start - baseMs, end - baseMs] as [number, number, number]
    ),
  }));
}

async function buildSurahPosts(chapterNum: number, translationId: number, channel: ChannelConfig) {
  const [chapter, verses, audio] = await Promise.all([
    fetchChapter(chapterNum),
    fetchVerses(chapterNum, translationId),
    fetchAudio(chapterNum),
  ]);

  const allScenes: Scene[] = verses.map((v, i) => {
    const timing = audio.timings[i];
    const trans = v.translations?.[0]?.text;
    return {
      verseKey: v.verse_key,
      arabicText: v.text_uthmani.trim(),
      translation: trans ? clean(trans) : undefined,
      wordSegments: (timing?.segments ?? []) as [number, number, number][],
      startMs: timing?.timestamp_from ?? 0,
      endMs: timing?.timestamp_to ?? 5000,
    };
  });

  const parts = splitScenes(allScenes);

  return parts.map((part, partIndex) => {
    const lastScene = part.scenes[part.scenes.length - 1];
    const totalDurationMs = lastScene ? lastScene.endMs : 15000;
    const firstVerse = part.scenes[0].verseKey.split(':')[1];
    const lastVerse = part.scenes[part.scenes.length - 1].verseKey.split(':')[1];

    const partLabel = parts.length > 1 ? ` (${partIndex + 1}/${parts.length})` : '';
    const verseRange = `${firstVerse}-${lastVerse}`;

    return {
      title: `${chapter.name_simple} — ${chapter.name_arabic}${partLabel}`,
      surahName: chapter.name_simple,
      surahNameArabic: chapter.name_arabic,
      ayahCount: part.scenes.length,
      ayahRange: verseRange,
      totalDurationMs,
      sceneProps: {
        surahName: chapter.name_simple,
        surahNameArabic: chapter.name_arabic,
        surahNumber: chapterNum,
        scenes: part.scenes,
        reciterName: 'Mishary Rashid Al-Afasy',
        audioUrl: audio.audioUrl,
        audioStartMs: part.audioStartMs,
        brandName: channel.brandName,
        socialHandle: channel.socialHandle,
        ctaText: channel.ctaText,
        introHoldFrames: 75,
        outroHoldFrames: 90,
        accentColor: '#C9A84C',
        secondaryAccent: '#8B6914',
        bgGradient: ['#0A0A12', '#0F1028', '#08081A'],
        highlightColor: '#F5D778',
        ornamentOpacity: 0.15,
        transitionMs: 500,
      },
    };
  });
}

async function seedChannel(channel: ChannelConfig) {
  console.log(`\n══ ${channel.name} (${channel.slug}) ══\n`);

  // Project
  const existing = await db.select().from(projects).where(eq(projects.slug, channel.slug)).limit(1);
  let projectId: string;

  if (existing.length > 0) {
    projectId = existing[0].id;
    await db.update(projects).set({
      name: channel.name,
      description: channel.description,
      socialHandles: {
        tiktok: channel.socialHandle,
        youtube: channel.name.replace(/\s/g, ''),
        instagram: channel.socialHandle,
        telegram: channel.socialHandle,
      },
      colorPalette: { primary: '#C9A84C', secondary: '#8B6914', accent: '#C9A84C', background: '#0A0A12' },
      status: 'active',
      updatedAt: new Date(),
    }).where(eq(projects.id, projectId));
    console.log(`  Project updated (${projectId})`);
  } else {
    const [project] = await db.insert(projects).values({
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      colorPalette: { primary: '#C9A84C', secondary: '#8B6914', accent: '#C9A84C', background: '#0A0A12' },
      socialHandles: {
        tiktok: channel.socialHandle,
        youtube: channel.name.replace(/\s/g, ''),
        instagram: channel.socialHandle,
        telegram: channel.socialHandle,
      },
      defaultVoiceId: 'mishari-al-afasy',
      status: 'active',
    }).returning();
    projectId = project.id;
    console.log(`  Project created (${projectId})`);
  }

  // Niche
  const existingNiche = await db.select().from(niches).where(eq(niches.slug, channel.nicheSlug)).limit(1);
  let nicheId: string;

  if (existingNiche.length > 0) {
    nicheId = existingNiche[0].id;
    await db.update(niches).set({ projectId, name: channel.nicheName, updatedAt: new Date() }).where(eq(niches.id, nicheId));
    console.log(`  Niche updated (${nicheId})`);
  } else {
    const [niche] = await db.insert(niches).values({
      projectId, slug: channel.nicheSlug, name: channel.nicheName,
      defaultTemplateId: 'quran-ayah', voiceId: 'mishari-al-afasy',
      languages: ['ar'], config: { reciterId: RECITER_ID, translationId: channel.translationId },
    }).returning();
    nicheId = niche.id;
    console.log(`  Niche created (${nicheId})`);
  }

  // Clean existing
  const existingPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.nicheId, nicheId));
  if (existingPosts.length > 0) {
    await db.delete(renders).where(inArray(renders.postId, existingPosts.map(p => p.id)));
    await db.delete(posts).where(eq(posts.nicheId, nicheId));
    console.log(`  Cleaned ${existingPosts.length} existing posts`);
  }

  // Clean existing schedules
  await db.delete(projectSchedules).where(eq(projectSchedules.projectId, projectId));

  // Create posting schedule
  await db.insert(projectSchedules).values({
    projectId,
    templateId: 'quran-ayah',
    format: 'story',
    postsPerDay: 3,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    autoRender: true,
    enabled: true,
  });
  console.log(`  Schedule: 3 posts/day, every day`);

  // Fetch and seed
  console.log(`\n  Fetching ${ALL_SURAHS.length} surahs (max ${MAX_DURATION_MS / 1000}s per video)...\n`);
  const postValues: Array<{
    nicheId: string;
    projectId: string;
    title: string;
    status: 'ready';
    theme: string;
    templateId: string;
    format: string;
    metadata: Record<string, unknown>;
  }> = [];
  let totalAyahs = 0;

  for (const chapterNum of ALL_SURAHS) {
    try {
      const surahPosts = await buildSurahPosts(chapterNum, channel.translationId, channel);

      for (const post of surahPosts) {
        const durationMin = (post.totalDurationMs / 60000).toFixed(1);
        const audioOffsetLabel = post.sceneProps.audioStartMs > 0
          ? ` [audio@${(post.sceneProps.audioStartMs / 1000).toFixed(0)}s]`
          : '';
        console.log(`    ${post.title} — ${post.ayahCount} ayahs, ${durationMin}m${audioOffsetLabel}`);
        totalAyahs += post.ayahCount;

        postValues.push({
          nicheId, projectId,
          title: post.title,
          status: 'ready' as const,
          theme: 'default',
          templateId: 'quran-ayah',
          format: 'story',
          metadata: {
            sceneProps: post.sceneProps,
            totalDurationMs: post.totalDurationMs,
            thumbnailMeta: {
              surahName: post.surahName,
              surahNameArabic: post.surahNameArabic,
              ayahRange: post.ayahRange,
              ayahCount: post.ayahCount,
            },
          },
        });
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`    Failed surah ${chapterNum}:`, err);
    }
  }

  // Insert in batches
  for (let i = 0; i < postValues.length; i += 50) {
    const batch = postValues.slice(i, i + 50);
    await db.insert(posts).values(batch);
    console.log(`  Inserted posts ${i + 1}-${Math.min(i + 50, postValues.length)}`);
  }

  const daysOfContent = Math.ceil(postValues.length / 3);
  console.log(`\n  ✓ ${postValues.length} posts seeded for ${channel.name}`);
  console.log(`    ${totalAyahs} total ayahs across ${ALL_SURAHS.length} surahs`);
  console.log(`    ~${daysOfContent} days of content at 3 posts/day`);
  return { projectId, nicheId, count: postValues.length };
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Quran — Multi-Channel Seed");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Surahs: ${ALL_SURAHS.length}`);
  console.log(`  Max per video: ${MAX_DURATION_MS / 1000}s (${(MAX_DURATION_MS / 60000).toFixed(0)}m)`);
  console.log(`  Channels: ${CHANNELS.length} (English + Amharic)`);
  console.log(`  Schedule: 3 posts/day, 7 days/week`);
  console.log("═══════════════════════════════════════════════════");

  const results = [];
  for (const channel of CHANNELS) {
    const result = await seedChannel(channel);
    results.push(result);
  }

  const totalPosts = results.reduce((sum, r) => sum + r.count, 0);
  const daysPerChannel = Math.ceil(results[0].count / 3);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✓ All channels seeded!");
  console.log(`    Total posts: ${totalPosts} (${results[0].count} per channel)`);
  console.log(`    Content runway: ~${daysPerChannel} days per channel`);
  console.log("═══════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(err => { console.error("Seed failed:", err); process.exit(1); });
