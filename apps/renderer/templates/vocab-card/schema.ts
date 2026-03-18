import { z } from 'zod';

const exampleSchema = z.object({
  sentence: z.string(),
  highlight: z.string().optional(),
});

export const vocabCardSchema = z.object({
  word: z.string().default('Ephemeral'),
  phonetic: z.string().default('/ɪˈfɛm.ər.əl/'),
  partOfSpeech: z.string().default('adjective'),
  definition: z.string().default('Lasting for a very short time'),
  examples: z.array(exampleSchema).default([
    { sentence: 'The ephemeral beauty of cherry blossoms reminds us to appreciate the moment.', highlight: 'ephemeral' },
    { sentence: 'Social media fame is often ephemeral.', highlight: 'ephemeral' },
  ]),
  synonyms: z.array(z.string()).default(['fleeting', 'transient', 'momentary']),
  antonyms: z.array(z.string()).default(['permanent', 'enduring', 'eternal']),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).default('C1'),
  dayNumber: z.number().optional(),
  brandName: z.string().default('LinguaForge'),
  accentColor: z.string().default('#6366F1'),
  secondaryAccent: z.string().default('#EC4899'),
  bgGradient: z.array(z.string()).default(['#0F0A1A', '#1A1035', '#0D0B14']),
  audioUrl: z.string().optional(),
  // Intro/Outro
  introHoldFrames: z.number().default(60), // 2s logo intro
  outroHoldFrames: z.number().default(60), // 2s logo outro
  logoUrl: z.string().optional(),
  socialHandle: z.string().optional(),
  ctaText: z.string().default('Follow for daily vocabulary'),
});

export type VocabCardProps = z.infer<typeof vocabCardSchema>;

export const defaultProps: VocabCardProps = vocabCardSchema.parse({});
