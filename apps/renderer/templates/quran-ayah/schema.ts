import { z } from 'zod';

const wordSegmentSchema = z.tuple([z.number(), z.number(), z.number()]);

const sceneSchema = z.object({
  verseKey: z.string(),
  arabicText: z.string(),
  translation: z.string().optional(),
  wordSegments: z.array(wordSegmentSchema).default([]),
  startMs: z.number(),
  endMs: z.number(),
});

export const quranAyahSchema = z.object({
  surahName: z.string().default('Al-Ikhlas'),
  surahNameArabic: z.string().default('الإخلاص'),
  surahNumber: z.number().default(112),
  scenes: z.array(sceneSchema).default([
    {
      verseKey: '112:1',
      arabicText: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
      translation: 'Say, "He is Allah, [who is] One,"',
      wordSegments: [[1, 0, 430], [2, 430, 700], [3, 700, 1680], [4, 1680, 2915]],
      startMs: 0,
      endMs: 6090,
    },
    {
      verseKey: '112:2',
      arabicText: 'ٱللَّهُ ٱلصَّمَدُ',
      translation: 'Allah, the Eternal Refuge.',
      wordSegments: [[1, 6025, 7025], [2, 7025, 11560]],
      startMs: 6090,
      endMs: 11680,
    },
    {
      verseKey: '112:3',
      arabicText: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      translation: 'He neither begets nor is born,',
      wordSegments: [[1, 11615, 12195], [2, 12195, 13155], [3, 13155, 14215], [4, 14215, 16740]],
      startMs: 11680,
      endMs: 16860,
    },
    {
      verseKey: '112:4',
      arabicText: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ',
      translation: 'Nor is there to Him any equivalent.',
      wordSegments: [[1, 16790, 17560], [2, 17560, 18500], [3, 18500, 19570], [4, 19570, 20850], [5, 20850, 23030]],
      startMs: 16860,
      endMs: 24000,
    },
  ]),
  reciterName: z.string().default('Mishary Rashid Al-Afasy'),
  audioUrl: z.string().optional(),
  // Intro/Outro
  introHoldFrames: z.number().default(75), // 2.5s logo intro
  outroHoldFrames: z.number().default(90), // 3s logo outro
  logoUrl: z.string().optional(),
  brandName: z.string().default('Quran Daily'),
  socialHandle: z.string().default('@quran_daily'),
  ctaText: z.string().default('Follow for daily Quran'),
  // Styling
  accentColor: z.string().default('#C9A84C'),
  secondaryAccent: z.string().default('#8B6914'),
  bgGradient: z.array(z.string()).default(['#0A0A12', '#0F1028', '#08081A']),
  highlightColor: z.string().default('#F5D778'),
  ornamentOpacity: z.number().default(0.15),
  transitionMs: z.number().default(500),
});

export type QuranAyahProps = z.infer<typeof quranAyahSchema>;

export const defaultProps: QuranAyahProps = quranAyahSchema.parse({});
