#!/usr/bin/env tsx
/**
 * Seed Quran Projects — Separate channels per language
 *
 *   1. Quran English — Arabic + English translation
 *   2. Quran Amharic — Arabic + Amharic translation
 *
 * Each surah = 1 post (no splitting). Audio and word-timing synced from quran.com API.
 *
 * Content Strategy:
 *   Phase 1: Juz' Amma (Surahs 78-114) — 37 short surahs, ideal for short-form video
 *   Phase 2: Popular mid-length surahs (Ya-Sin, Ar-Rahman, Al-Mulk, etc.)
 *   Phase 3: Medium surahs for extended content
 *
 * Posting Schedule (3 posts/day):
 *   05:30 EAT — Pre-Fajr (dawn prayer prep)
 *   12:30 EAT — Dhuhr break (midday engagement)
 *   20:00 EAT — Post-Isha (peak evening engagement)
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

// ── Surah Selection ──────────────────────────────────────────────────────
// Phase 1: Juz' Amma (surahs 78-114) — all 37 short surahs
const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 78 + i);

// Phase 2: Popular mid-length surahs that people love and search for
const POPULAR_SURAHS = [
  36,  // Ya-Sin (83 ayahs) — "Heart of the Quran"
  55,  // Ar-Rahman (78 ayahs) — most beautiful recitation
  56,  // Al-Waqi'ah (96 ayahs) — wealth/protection
  67,  // Al-Mulk (30 ayahs) — protection from grave punishment
  18,  // Al-Kahf (110 ayahs) — Friday surah
  32,  // As-Sajdah (30 ayahs) — Friday morning
  48,  // Al-Fath (29 ayahs) — victory
  49,  // Al-Hujurat (18 ayahs) — manners/ethics
  57,  // Al-Hadid (29 ayahs) — iron
  71,  // Nuh (28 ayahs) — Prophet Nuh
  72,  // Al-Jinn (28 ayahs) — the Jinn
  73,  // Al-Muzzammil (20 ayahs) — night prayer
  74,  // Al-Muddaththir (56 ayahs) — wrapped one
  75,  // Al-Qiyamah (40 ayahs) — resurrection
  76,  // Al-Insan (31 ayahs) — mankind
  77,  // Al-Mursalat (50 ayahs) — sent forth
  31,  // Luqman (34 ayahs) — wisdom
  44,  // Ad-Dukhan (59 ayahs) — smoke
  50,  // Qaf (45 ayahs) — letter Qaf
];

// Phase 3: Medium surahs for extended content
const MEDIUM_SURAHS = [
  1,   // Al-Fatihah (7 ayahs)
  13,  // Ar-Ra'd (43 ayahs)
  14,  // Ibrahim (52 ayahs)
  19,  // Maryam (98 ayahs)
  22,  // Al-Hajj (78 ayahs)
  24,  // An-Nur (64 ayahs)
  25,  // Al-Furqan (77 ayahs)
  29,  // Al-'Ankabut (69 ayahs)
  30,  // Ar-Rum (60 ayahs)
  34,  // Saba (54 ayahs)
  35,  // Fatir (45 ayahs)
  39,  // Az-Zumar (75 ayahs)
  40,  // Ghafir (85 ayahs)
  41,  // Fussilat (54 ayahs)
  45,  // Al-Jathiyah (37 ayahs)
  46,  // Al-Ahqaf (35 ayahs)
  47,  // Muhammad (38 ayahs)
  51,  // Adh-Dhariyat (60 ayahs)
  53,  // An-Najm (62 ayahs)
  54,  // Al-Qamar (55 ayahs)
  58,  // Al-Mujadila (22 ayahs)
  59,  // Al-Hashr (24 ayahs)
  60,  // Al-Mumtahanah (13 ayahs)
  61,  // As-Saf (14 ayahs)
  62,  // Al-Jumu'ah (11 ayahs)
  63,  // Al-Munafiqun (11 ayahs)
  64,  // At-Taghabun (18 ayahs)
  65,  // At-Talaq (12 ayahs)
  66,  // At-Tahrim (12 ayahs)
  68,  // Al-Qalam (52 ayahs)
  69,  // Al-Haqqah (52 ayahs)
  70,  // Al-Ma'arij (44 ayahs)
];

// Combine all — deduplicate and sort
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

async function buildSurahPost(chapterNum: number, translationId: number, channel: ChannelConfig) {
  const [chapter, verses, audio] = await Promise.all([
    fetchChapter(chapterNum),
    fetchVerses(chapterNum, translationId),
    fetchAudio(chapterNum),
  ]);

  const scenes = verses.map((v, i) => {
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

  const lastTiming = audio.timings[audio.timings.length - 1];
  const totalDurationMs = lastTiming ? lastTiming.timestamp_to : 15000;
  const firstVerse = scenes[0]?.verseKey.split(':')[1] ?? '1';
  const lastVerse = scenes[scenes.length - 1]?.verseKey.split(':')[1] ?? '1';

  return {
    title: `${chapter.name_simple} — ${chapter.name_arabic}`,
    surahName: chapter.name_simple,
    surahNameArabic: chapter.name_arabic,
    ayahCount: scenes.length,
    ayahRange: `${firstVerse}-${lastVerse}`,
    sceneProps: {
      surahName: chapter.name_simple,
      surahNameArabic: chapter.name_arabic,
      surahNumber: chapterNum,
      scenes,
      reciterName: 'Mishary Rashid Al-Afasy',
      audioUrl: audio.audioUrl,
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
    totalDurationMs,
  };
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

  // Clean existing posts
  const existingPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.nicheId, nicheId));
  if (existingPosts.length > 0) {
    await db.delete(renders).where(inArray(renders.postId, existingPosts.map(p => p.id)));
    await db.delete(posts).where(eq(posts.nicheId, nicheId));
    console.log(`  Cleaned ${existingPosts.length} existing posts`);
  }

  // Clean existing schedules
  await db.delete(projectSchedules).where(eq(projectSchedules.projectId, projectId));

  // Create posting schedule — 3 posts/day, every day
  await db.insert(projectSchedules).values({
    projectId,
    templateId: 'quran-ayah',
    format: 'story',
    postsPerDay: 3,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    autoRender: true,
    enabled: true,
  });
  console.log(`  Schedule: 3 posts/day, every day (story format)`);

  // Fetch and seed all surahs — 1 surah = 1 post (no splitting)
  console.log(`\n  Fetching ${ALL_SURAHS.length} surahs...\n`);
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
      const post = await buildSurahPost(chapterNum, channel.translationId, channel);
      const durationMin = (post.totalDurationMs / 60000).toFixed(1);
      console.log(`    ${post.title} — ${post.ayahCount} ayahs, ${durationMin}m`);
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
          // Thumbnail metadata — used by render worker
          thumbnailMeta: {
            surahName: post.surahName,
            surahNameArabic: post.surahNameArabic,
            ayahRange: post.ayahRange,
            ayahCount: post.ayahCount,
          },
        },
      });

      // Rate limit API calls
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`    Failed surah ${chapterNum}:`, err);
    }
  }

  // Insert in batches of 50
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
  console.log(`  Surahs: ${ALL_SURAHS.length} (1 post per surah, no splitting)`);
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
  console.log("");
  console.log("  Recommended posting schedule (EAT/Addis Ababa):");
  console.log("    05:30 — Pre-Fajr (dawn prayer prep)");
  console.log("    12:30 — Dhuhr break (midday engagement)");
  console.log("    20:00 — Post-Isha (peak evening engagement)");
  console.log("═══════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch(err => { console.error("Seed failed:", err); process.exit(1); });
