import { TemplateMeta } from '../../types';

export const meta: TemplateMeta = {
  id: 'vocab-card',
  name: 'Vocabulary Card',
  description:
    'Animated vocabulary flashcard with word, phonetic pronunciation, definition, examples, and synonyms/antonyms. Designed for language learning reels.',
  category: 'education',
  tags: ['vocabulary', 'language', 'education', 'learning', 'english', 'flashcard'],
  supportedFormats: ['story', 'post', 'landscape'],
  durationInFrames: 450, // 15 seconds at 30fps
  fps: 30,
};
