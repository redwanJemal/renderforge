// Stub - add content posts to enable generation

import type { ContentBank, ContentPost, AccentColor } from './types';

const accentColors: AccentColor[] = [
  { name: 'crimson', color: '#dc2626', bg: ['#2e0a0a', '#1a0505', '#0a0202'] },
  { name: 'blue', color: '#2563eb', bg: ['#0a142e', '#050a1a', '#02040a'] },
  { name: 'white', color: '#f8fafc', bg: ['#1a1a1e', '#101014', '#06060a'] },
  { name: 'amber', color: '#f59e0b', bg: ['#2a1a0a', '#180f05', '#0a0602'] },
  { name: 'slate', color: '#94a3b8', bg: ['#0f1218', '#0a0d12', '#050608'] },
  { name: 'cyan', color: '#06b6d4', bg: ['#0a1e2e', '#051218', '#020608'] },
  { name: 'gold', color: '#eab308', bg: ['#2a2000', '#1a1400', '#0a0a00'] },
  { name: 'steel', color: '#64748b', bg: ['#121620', '#0a0e16', '#04060a'] },
];

const ENTRANCES = ['scaleIn', 'slideUp', 'fadeIn', 'slideLeft', 'slam'] as const;

export const newsBank: ContentBank = {
  nicheId: 'news',
  themes: [
    { id: 'tech', name: 'Tech News' },
    { id: 'science', name: 'Science' },
    { id: 'world', name: 'World Events' },
    { id: 'business', name: 'Business' },
    { id: 'ai', name: 'AI & Future' },
  ],
  totalPosts: 0,
  segmentKeys: ['intro', 'headline', 'detail', 'context', 'cta'],
  accentColors,
  entrances: ENTRANCES,
  getPosts(_opts?: { theme?: string; limit?: number }): ContentPost[] {
    return [];
  },
};
