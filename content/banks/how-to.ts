// Stub - add content posts to enable generation

import type { ContentBank, ContentPost, AccentColor } from './types';

const accentColors: AccentColor[] = [
  { name: 'blue', color: '#3b82f6', bg: ['#0a1a2e', '#050f1a', '#02060a'] },
  { name: 'green', color: '#22c55e', bg: ['#0a2e1a', '#071a10', '#020a05'] },
  { name: 'orange', color: '#f97316', bg: ['#2e1a0a', '#1a0f05', '#0a0602'] },
  { name: 'purple', color: '#8b5cf6', bg: ['#1a0a2e', '#0f051a', '#06020a'] },
  { name: 'teal', color: '#14b8a6', bg: ['#0a2e28', '#071a16', '#020a08'] },
  { name: 'indigo', color: '#6366f1', bg: ['#0a0a2e', '#06061a', '#02020a'] },
  { name: 'emerald', color: '#10b981', bg: ['#0a2e22', '#051a14', '#020a08'] },
  { name: 'sky', color: '#0ea5e9', bg: ['#0a1e2e', '#051218', '#020810'] },
];

const ENTRANCES = ['scaleIn', 'slideUp', 'fadeIn', 'slideLeft', 'slam'] as const;

export const howToBank: ContentBank = {
  nicheId: 'how-to',
  themes: [
    { id: 'productivity', name: 'Productivity' },
    { id: 'tech', name: 'Tech Tips' },
    { id: 'money', name: 'Money Hacks' },
    { id: 'health', name: 'Health Tips' },
    { id: 'social-media', name: 'Social Media' },
  ],
  totalPosts: 0,
  segmentKeys: ['intro', 'step1', 'step2', 'step3', 'cta'],
  accentColors,
  entrances: ENTRANCES,
  getPosts(_opts?: { theme?: string; limit?: number }): ContentPost[] {
    return [];
  },
};
