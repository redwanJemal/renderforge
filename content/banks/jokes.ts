// Stub - add content posts to enable generation

import type { ContentBank, ContentPost, AccentColor } from './types';

const accentColors: AccentColor[] = [
  { name: 'electric-yellow', color: '#facc15', bg: ['#2a2500', '#1a1700', '#0a0b00'] },
  { name: 'hot-pink', color: '#ec4899', bg: ['#2e0a1e', '#1a0510', '#0a0208'] },
  { name: 'lime', color: '#84cc16', bg: ['#1a2a0a', '#101a05', '#060a02'] },
  { name: 'orange', color: '#f97316', bg: ['#2e1a0a', '#1a0f05', '#0a0602'] },
  { name: 'sky', color: '#38bdf8', bg: ['#0a1e2e', '#051218', '#020810'] },
  { name: 'magenta', color: '#d946ef', bg: ['#2a0a2e', '#180518', '#0a0208'] },
  { name: 'coral', color: '#fb7185', bg: ['#2e0a10', '#1a0508', '#0a0204'] },
  { name: 'mint', color: '#34d399', bg: ['#0a2e20', '#051a12', '#020a08'] },
];

const ENTRANCES = ['scaleIn', 'slideUp', 'fadeIn', 'slideLeft', 'slam'] as const;

export const jokesBank: ContentBank = {
  nicheId: 'jokes',
  themes: [
    { id: 'observational', name: 'Observational' },
    { id: 'one-liners', name: 'One-Liners' },
    { id: 'dark-humor', name: 'Dark Humor' },
    { id: 'wordplay', name: 'Wordplay' },
    { id: 'relatable', name: 'Relatable' },
  ],
  totalPosts: 0,
  segmentKeys: ['intro', 'setup', 'punchline', 'callback', 'cta'],
  accentColors,
  entrances: ENTRANCES,
  getPosts(_opts?: { theme?: string; limit?: number }): ContentPost[] {
    return [];
  },
};
