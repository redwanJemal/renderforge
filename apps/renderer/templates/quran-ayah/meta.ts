import { TemplateMeta } from '../../types';

export const meta: TemplateMeta = {
  id: 'quran-ayah',
  name: 'Quran Ayah',
  description:
    'Elegant Quran verse display with Arabic text, word-by-word highlighting synced to recitation audio, and translation. Supports all 114 surahs.',
  category: 'islamic',
  tags: ['quran', 'islamic', 'arabic', 'recitation', 'ayah', 'verse'],
  supportedFormats: ['story', 'post', 'landscape'],
  durationInFrames: 900, // 30s at 30fps — overridden per surah based on audio duration
  fps: 30,
};
