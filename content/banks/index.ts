/**
 * Content Bank Registry
 *
 * Central registry for all niche content banks.
 * Import and register new banks here as they are created.
 */

import type { ContentBank } from './types';
import { motivationalBank } from './motivational';
import { jokesBank } from './jokes';
import { howToBank } from './how-to';
import { newsBank } from './news';

export type { ContentBank, ContentPost, ContentSection, AccentColor } from './types';

export const banks: Record<string, ContentBank> = {
  motivational: motivationalBank,
  jokes: jokesBank,
  'how-to': howToBank,
  news: newsBank,
};

export function getBank(nicheId: string): ContentBank | undefined {
  return banks[nicheId];
}

export function listBanks(): { nicheId: string; totalPosts: number; themes: number }[] {
  return Object.values(banks).map((bank) => ({
    nicheId: bank.nicheId,
    totalPosts: bank.totalPosts,
    themes: bank.themes.length,
  }));
}
