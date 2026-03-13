import type { TemplateMeta } from '../../types';

export const meta: TemplateMeta = {
  id: 'motivational-narration',
  name: 'Motivational Narration',
  description: 'Scene-based template for audio-synced motivational narration. Each audio segment gets its own full-screen scene with cinematic transitions.',
  category: 'motivational',
  tags: ['motivational', 'narration', 'audio-sync', 'scenes'],
  supportedFormats: ['story', 'post', 'landscape'],
  durationInFrames: 5400, // 3 min max — actual controlled by --frames
  fps: 30,
};
