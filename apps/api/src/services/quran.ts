/**
 * Quran Service — fetches data from quran.com API and builds
 * template-ready scene data for the quran-ayah template.
 */

const MAX_DURATION_MS = 300_000; // 5 minutes per video

// ── Color Themes ─────────────────────────────────────────────────────────
export const QURAN_THEMES = [
  { name: 'Classic Gold', accent: '#C9A84C', secondary: '#8B6914', highlight: '#F5D778', bg: ['#0A0A12', '#0F1028', '#08081A'] },
  { name: 'Emerald', accent: '#22C55E', secondary: '#166534', highlight: '#86EFAC', bg: ['#041A0E', '#0A2E1A', '#031208'] },
  { name: 'Sapphire Blue', accent: '#60A5FA', secondary: '#1E40AF', highlight: '#93C5FD', bg: ['#0A0F1A', '#0F1A30', '#080D18'] },
  { name: 'Royal Purple', accent: '#A78BFA', secondary: '#6D28D9', highlight: '#C4B5FD', bg: ['#0F0A1A', '#1A1035', '#0D0B14'] },
  { name: 'Rose', accent: '#F472B6', secondary: '#BE185D', highlight: '#FBCFE8', bg: ['#1A0A12', '#2E0F1A', '#140810'] },
  { name: 'Amber', accent: '#FB923C', secondary: '#C2410C', highlight: '#FED7AA', bg: ['#1A100A', '#2E1A0F', '#140D08'] },
  { name: 'Teal', accent: '#2DD4BF', secondary: '#0F766E', highlight: '#99F6E4', bg: ['#0A1A18', '#0F2E28', '#081410'] },
  { name: 'Silver', accent: '#E2E8F0', secondary: '#94A3B8', highlight: '#F8FAFC', bg: ['#0F1115', '#1A1E25', '#0B0E12'] },
];

export const RECITERS = [
  { id: 7, name: 'Mishary Rashid Al-Afasy' },
  { id: 1, name: 'Abdul Basit (Murattal)' },
  { id: 2, name: 'Abdul Basit (Mujawwad)' },
  { id: 5, name: 'Maher Al Muaiqly' },
  { id: 6, name: 'Mahmoud Khalil Al-Husary' },
  { id: 3, name: 'Abdur-Rahman as-Sudais' },
  { id: 4, name: 'Abu Bakr al-Shatri' },
  { id: 10, name: 'Saad Al-Ghamdi' },
];

export const TRANSLATIONS = [
  { id: 20, name: 'Sahih International', language: 'English' },
  { id: 87, name: 'Sadiq and Sani', language: 'Amharic' },
  { id: 131, name: 'Saheeh International', language: 'English (Alt)' },
  { id: 203, name: 'Al-Hilali & Khan', language: 'English' },
];

// ── Types ────────────────────────────────────────────────────────────────

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

export interface Scene {
  verseKey: string;
  arabicText: string;
  translation?: string;
  wordSegments: [number, number, number][];
  startMs: number;
  endMs: number;
}

export interface SurahPart {
  title: string;
  ayahRange: string;
  ayahCount: number;
  durationMs: number;
  audioStartMs: number;
  scenes: Scene[];
}

export interface QuranPreview {
  surahName: string;
  surahNameArabic: string;
  surahNumber: number;
  totalAyahs: number;
  totalDurationMs: number;
  audioUrl: string;
  reciterName: string;
  theme: typeof QURAN_THEMES[number];
  parts: Array<Omit<SurahPart, 'scenes'> & { sceneCount: number }>;
}

export interface QuranPostData {
  title: string;
  ayahRange: string;
  ayahCount: number;
  totalDurationMs: number;
  sceneProps: Record<string, unknown>;
  thumbnailMeta: {
    surahName: string;
    surahNameArabic: string;
    ayahRange: string;
    ayahCount: number;
  };
}

// ── API Fetch Functions ──────────────────────────────────────────────────

function clean(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

export async function fetchChapters(): Promise<Array<{
  id: number;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation_place: string;
}>> {
  const res = await fetch('https://api.quran.com/api/v4/chapters');
  if (!res.ok) throw new Error(`Failed to fetch chapters: ${res.status}`);
  const data = await res.json();
  return data.chapters;
}

export async function fetchChapter(chapterNum: number) {
  const res = await fetch(`https://api.quran.com/api/v4/chapters/${chapterNum}`);
  if (!res.ok) throw new Error(`Failed to fetch chapter ${chapterNum}: ${res.status}`);
  const data = await res.json();
  return data.chapter as { name_simple: string; name_arabic: string; verses_count: number };
}

export async function fetchVerses(chapterNum: number, translationId: number): Promise<QuranVerse[]> {
  const allVerses: QuranVerse[] = [];
  let page = 1;
  while (true) {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${chapterNum}?language=en&translations=${translationId}&fields=text_uthmani&per_page=50&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch verses: ${res.status}`);
    const data = await res.json();
    allVerses.push(...data.verses);
    if (data.pagination.next_page === null) break;
    page++;
  }
  return allVerses;
}

export async function fetchAudio(chapterNum: number, reciterId: number) {
  const url = `https://api.quran.com/api/v4/chapter_recitations/${reciterId}/${chapterNum}?segments=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch audio for chapter ${chapterNum}, reciter ${reciterId}: ${res.status}`);
  const data = await res.json();
  return {
    audioUrl: data.audio_file.audio_url as string,
    timings: data.audio_file.timestamps as VerseTiming[],
  };
}

// ── Scene Building ───────────────────────────────────────────────────────

function buildScenes(
  verses: QuranVerse[],
  timings: VerseTiming[],
  ayahStart?: number,
  ayahEnd?: number,
): Scene[] {
  // Filter to the requested ayah range
  let filtered = verses;
  if (ayahStart || ayahEnd) {
    filtered = verses.filter((v) => {
      const verseNum = parseInt(v.verse_key.split(':')[1]);
      if (ayahStart && verseNum < ayahStart) return false;
      if (ayahEnd && verseNum > ayahEnd) return false;
      return true;
    });
  }

  return filtered.map((v, i) => {
    // Find matching timing — match by verse_key or index
    const verseNum = parseInt(v.verse_key.split(':')[1]);
    const timing = timings[verseNum - 1]; // timings are 0-indexed, verses are 1-indexed
    const trans = v.translations?.[0]?.text;

    return {
      verseKey: v.verse_key,
      arabicText: v.text_uthmani.trim(),
      translation: trans ? clean(trans) : undefined,
      wordSegments: (timing?.segments ?? []) as [number, number, number][],
      startMs: timing?.timestamp_from ?? i * 5000,
      endMs: timing?.timestamp_to ?? (i + 1) * 5000,
    };
  });
}

function rebaseScenes(scenes: Scene[], baseMs: number): Scene[] {
  return scenes.map((s) => ({
    ...s,
    startMs: s.startMs - baseMs,
    endMs: s.endMs - baseMs,
    wordSegments: s.wordSegments.map(([idx, start, end]) =>
      [idx, start - baseMs, end - baseMs] as [number, number, number],
    ),
  }));
}

function splitScenes(allScenes: Scene[]): Array<{ scenes: Scene[]; audioStartMs: number }> {
  if (allScenes.length === 0) return [];

  const totalMs = allScenes[allScenes.length - 1].endMs - allScenes[0].startMs;
  const baseOffset = allScenes[0].startMs;

  // Rebase all scenes first so they start from 0
  const rebased = rebaseScenes(allScenes, baseOffset);

  if (totalMs <= MAX_DURATION_MS) {
    return [{ scenes: rebased, audioStartMs: baseOffset }];
  }

  const parts: Array<{ scenes: Scene[]; audioStartMs: number }> = [];
  let partScenes: Scene[] = [];
  let partStartMs = 0;

  for (const scene of rebased) {
    const partDuration = scene.endMs - partStartMs;

    if (partDuration > MAX_DURATION_MS && partScenes.length > 0) {
      parts.push({
        audioStartMs: baseOffset + partStartMs,
        scenes: rebaseScenes(partScenes, partStartMs),
      });
      partStartMs = scene.startMs;
      partScenes = [scene];
    } else {
      partScenes.push(scene);
    }
  }

  if (partScenes.length > 0) {
    parts.push({
      audioStartMs: baseOffset + partStartMs,
      scenes: rebaseScenes(partScenes, partStartMs),
    });
  }

  return parts;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function previewQuranContent(params: {
  surahNumber: number;
  reciterId: number;
  translationId: number;
  ayahStart?: number;
  ayahEnd?: number;
  themeIndex: number;
}): Promise<QuranPreview> {
  const { surahNumber, reciterId, translationId, ayahStart, ayahEnd, themeIndex } = params;

  const [chapter, verses, audio] = await Promise.all([
    fetchChapter(surahNumber),
    fetchVerses(surahNumber, translationId),
    fetchAudio(surahNumber, reciterId),
  ]);

  // Validate ayah range
  if (ayahStart && ayahStart > chapter.verses_count) {
    throw new Error(`Ayah start (${ayahStart}) exceeds total verses (${chapter.verses_count})`);
  }
  if (ayahEnd && ayahEnd > chapter.verses_count) {
    throw new Error(`Ayah end (${ayahEnd}) exceeds total verses (${chapter.verses_count})`);
  }

  const scenes = buildScenes(verses, audio.timings, ayahStart, ayahEnd);
  const parts = splitScenes(scenes);
  const theme = QURAN_THEMES[themeIndex % QURAN_THEMES.length];
  const reciterName = RECITERS.find((r) => r.id === reciterId)?.name ?? `Reciter ${reciterId}`;

  const totalDurationMs = scenes.length > 0
    ? scenes[scenes.length - 1].endMs - scenes[0].startMs
    : 0;

  return {
    surahName: chapter.name_simple,
    surahNameArabic: chapter.name_arabic,
    surahNumber,
    totalAyahs: scenes.length,
    totalDurationMs,
    audioUrl: audio.audioUrl,
    reciterName,
    theme,
    parts: parts.map((part, i) => {
      const lastScene = part.scenes[part.scenes.length - 1];
      const firstVerse = part.scenes[0].verseKey.split(':')[1];
      const lastVerse = lastScene.verseKey.split(':')[1];
      const partLabel = parts.length > 1 ? ` (${i + 1}/${parts.length})` : '';

      return {
        title: `${chapter.name_simple} — ${chapter.name_arabic}${partLabel}`,
        ayahRange: `${firstVerse}-${lastVerse}`,
        ayahCount: part.scenes.length,
        durationMs: lastScene.endMs,
        audioStartMs: part.audioStartMs,
        sceneCount: part.scenes.length,
      };
    }),
  };
}

export async function buildQuranPosts(params: {
  surahNumber: number;
  reciterId: number;
  translationId: number;
  ayahStart?: number;
  ayahEnd?: number;
  themeIndex: number;
  brandName: string;
  socialHandle: string;
  ctaText: string;
}): Promise<QuranPostData[]> {
  const { surahNumber, reciterId, translationId, ayahStart, ayahEnd, themeIndex, brandName, socialHandle, ctaText } = params;

  const [chapter, verses, audio] = await Promise.all([
    fetchChapter(surahNumber),
    fetchVerses(surahNumber, translationId),
    fetchAudio(surahNumber, reciterId),
  ]);

  const scenes = buildScenes(verses, audio.timings, ayahStart, ayahEnd);
  const parts = splitScenes(scenes);
  const theme = QURAN_THEMES[themeIndex % QURAN_THEMES.length];
  const reciterName = RECITERS.find((r) => r.id === reciterId)?.name ?? `Reciter ${reciterId}`;

  return parts.map((part, i) => {
    const lastScene = part.scenes[part.scenes.length - 1];
    const firstVerse = part.scenes[0].verseKey.split(':')[1];
    const lastVerse = lastScene.verseKey.split(':')[1];
    const partLabel = parts.length > 1 ? ` (${i + 1}/${parts.length})` : '';
    const partTheme = QURAN_THEMES[(themeIndex + i) % QURAN_THEMES.length];
    const ayahRange = `${firstVerse}-${lastVerse}`;

    return {
      title: `${chapter.name_simple} — ${chapter.name_arabic}${partLabel}`,
      ayahRange,
      ayahCount: part.scenes.length,
      totalDurationMs: lastScene.endMs,
      sceneProps: {
        surahName: chapter.name_simple,
        surahNameArabic: chapter.name_arabic,
        surahNumber,
        scenes: part.scenes,
        reciterName,
        audioUrl: audio.audioUrl,
        audioStartMs: part.audioStartMs,
        brandName,
        socialHandle,
        ctaText,
        introHoldFrames: 75,
        outroHoldFrames: 90,
        accentColor: partTheme.accent,
        secondaryAccent: partTheme.secondary,
        bgGradient: partTheme.bg,
        highlightColor: partTheme.highlight,
        ornamentOpacity: 0.15,
        transitionMs: 500,
      },
      thumbnailMeta: {
        surahName: chapter.name_simple,
        surahNameArabic: chapter.name_arabic,
        ayahRange,
        ayahCount: part.scenes.length,
      },
    };
  });
}
