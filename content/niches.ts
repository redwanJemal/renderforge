/**
 * Niche Definitions
 *
 * Maps content niches to templates, voices, and segment naming conventions.
 * The universal render pipeline uses these to map audio segments to template props.
 */

export interface SegmentPattern {
  intro: boolean;
  outro: boolean;
  /** Prefix for content segments: "slide", "letter", "number", "round", "page", "section" */
  contentPrefix: string;
  /** [min, max] number of content segments */
  contentCountRange: [number, number];
}

export interface PropMapping {
  /** Segment key pattern: "intro", "outro", or prefix with wildcard e.g. "slide*" */
  segmentPattern: string;
  /** Dot-notation path into template props, use [i] for array index from segment number */
  startFramePath?: string;
  durationFramesPath?: string;
  /** For special props like introDurationFrames where duration is set on a single field */
  durationOnlyPath?: string;
  /** Custom transform function name (for complex logic like YLD timing offsets) */
  customTransform?: string;
}

export interface NicheTemplate {
  templateId: string;
  /** How to compute totalFrames */
  totalFramesStrategy: 'sum-sequential' | 'slider-formula';
  /** Extra frames at end */
  trailingHoldFrames: number;
  /** Prop mappings from segment keys to template props */
  mappings: PropMapping[];
  /** Default props to override on the template */
  propOverrides?: Record<string, any>;
}

export interface NicheDefinition {
  id: string;
  name: string;
  description: string;
  /** Template configs — one niche can use multiple templates */
  templates: NicheTemplate[];
  /** Default template ID (first one used if not specified) */
  defaultTemplateId: string;
  /** Default format */
  defaultFormat: 'story' | 'post' | 'landscape';
  /** Voice ID from voices.json */
  voiceId: string;
  /** Segment naming pattern */
  segmentPattern: SegmentPattern;
  /** Supported languages (ISO 639-1). Qwen3 TTS: en, zh, ja, ko, de, fr, ru, pt, es, it */
  languages: string[];
  /** Default language */
  defaultLanguage: string;
  /** MinIO prefix for audio files (e.g. 'audio' → audio/mot-001.wav) */
  storagePrefix: string;
  /** Post ID prefix (e.g. 'mot' → mot-001) */
  postIdPrefix: string;
}

// ──────────────────────────────────────────────
// CUSTOM TRANSFORMS
// ──────────────────────────────────────────────

/**
 * Custom transform functions for template-specific timing logic.
 * Called when a PropMapping has customTransform set.
 */
export const customTransforms: Record<
  string,
  (startFrame: number, durationFrames: number, props: Record<string, any>, segmentIndex?: number) => void
> = {
  'yld-intro': (start, frames, props) => {
    if (!props.timing) props.timing = {};
    props.timing.logoAppear = start + 10;
    props.timing.logoMoveUp = start + frames - 20;
  },
  'yld-headline': (start, frames, props) => {
    if (!props.timing) props.timing = {};
    props.timing.dividerAppear = start;
    props.timing.headerAppear = start + 10;
  },
  'yld-subheader': (start, _frames, props) => {
    if (!props.timing) props.timing = {};
    props.timing.subheaderAppear = start;
  },
  'yld-badge': (start, _frames, props) => {
    if (!props.timing) props.timing = {};
    props.timing.badgeAppear = start;
  },
  'yld-cta': (start, _frames, props) => {
    if (!props.timing) props.timing = {};
    props.timing.ctaAppear = start;
  },
  'slider-slides': (_start, frames, props) => {
    // Slider uses uniform framesPerSlide = max across all slides
    const current = props.framesPerSlide || 0;
    if (frames > current) {
      props.framesPerSlide = frames;
    }
    props.transitionFrames = 25;
  },
  'quiz-round': (start, frames, props, index) => {
    if (index !== undefined && props.rounds?.[index]) {
      props.rounds[index].startFrame = start;
      props.rounds[index].durationFrames = frames;
      props.rounds[index].revealFrame = Math.floor(frames * 0.6);
    }
  },
  'narration-scene': (start, frames, props) => {
    // Build/merge scenes array from audio segments.
    // If splits.json provides scenes with text content, merge timing into them.
    // Otherwise create placeholder scenes.
    if (!props.scenes) props.scenes = [];
    if (!props._sceneIndex) props._sceneIndex = 0;
    const i = props._sceneIndex++;
    const entrances = ['scaleIn', 'slideUp', 'fadeIn', 'slideLeft', 'slam'] as const;

    if (i < props.scenes.length) {
      // Merge timing into existing scene (text content from splits.json)
      props.scenes[i].startFrame = start;
      props.scenes[i].durationFrames = frames;
      // Fill defaults for missing fields
      if (!props.scenes[i].entrance) props.scenes[i].entrance = entrances[i % entrances.length];
      if (!props.scenes[i].textSize) props.scenes[i].textSize = 52;
      if (!props.scenes[i].subtextSize) props.scenes[i].subtextSize = 28;
      if (!props.scenes[i].textAlign) props.scenes[i].textAlign = 'center';
    } else {
      // No content provided — create placeholder
      props.scenes.push({
        text: `Scene ${i + 1}`,
        startFrame: start,
        durationFrames: frames,
        entrance: entrances[i % entrances.length],
        textSize: 52,
        subtextSize: 28,
        textAlign: 'center',
      });
    }
  },
};

// ──────────────────────────────────────────────
// NICHE DEFINITIONS
// ──────────────────────────────────────────────

export const niches: Record<string, NicheDefinition> = {
  'kids-education': {
    id: 'kids-education',
    name: 'Kids Education',
    description: 'Alphabet, counting, and quiz videos for children',
    defaultTemplateId: 'kids-alphabet-adventure',
    defaultFormat: 'landscape',
    voiceId: 'kids-cheerful',
    languages: ['en'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'kids',
    segmentPattern: {
      intro: true,
      outro: true,
      contentPrefix: 'letter',
      contentCountRange: [4, 26],
    },
    templates: [
      {
        templateId: 'kids-alphabet-adventure',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'letter*', startFramePath: 'letters[i].startFrame', durationFramesPath: 'letters[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
      {
        templateId: 'kids-counting-fun',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'number*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
      {
        templateId: 'kids-icon-quiz',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'round*', customTransform: 'quiz-round' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
    ],
  },

  'kids-bedtime': {
    id: 'kids-bedtime',
    name: 'Kids Bedtime Stories',
    description: 'Long-form bedtime stories with gentle narration',
    defaultTemplateId: 'kids-bedtime-story',
    defaultFormat: 'landscape',
    voiceId: 'gentle-storyteller',
    languages: ['en'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'bed',
    segmentPattern: {
      intro: true,
      outro: true,
      contentPrefix: 'page',
      contentCountRange: [5, 20],
    },
    templates: [
      {
        templateId: 'kids-bedtime-story',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'page*', startFramePath: 'pages[i].startFrame', durationFramesPath: 'pages[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
    ],
  },

  'motivational': {
    id: 'motivational',
    name: 'Motivational / Finance',
    description: 'YLD-style motivational and financial literacy content',
    defaultTemplateId: 'motivational-narration',
    defaultFormat: 'story',
    voiceId: 'les-brown',
    languages: ['en', 'es', 'pt', 'fr', 'de'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'mot',
    segmentPattern: {
      intro: true,
      outro: false,
      contentPrefix: 'section',
      contentCountRange: [2, 5],
    },
    templates: [
      {
        templateId: 'motivational-narration',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', customTransform: 'narration-scene' },
          { segmentPattern: 'headline', customTransform: 'narration-scene' },
          { segmentPattern: 'subheader', customTransform: 'narration-scene' },
          { segmentPattern: 'badge', customTransform: 'narration-scene' },
          { segmentPattern: 'cta', customTransform: 'narration-scene' },
        ],
      },
      {
        templateId: 'yld-intro',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', customTransform: 'yld-intro' },
          { segmentPattern: 'headline', customTransform: 'yld-headline' },
          { segmentPattern: 'subheader', customTransform: 'yld-subheader' },
          { segmentPattern: 'badge', customTransform: 'yld-badge' },
          { segmentPattern: 'cta', customTransform: 'yld-cta' },
        ],
      },
      {
        templateId: 'slider',
        totalFramesStrategy: 'slider-formula',
        trailingHoldFrames: 0,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'intro.durationFrames' },
          { segmentPattern: 'slide*', customTransform: 'slider-slides' },
          { segmentPattern: 'outro', durationOnlyPath: 'outro.durationFrames' },
        ],
      },
    ],
  },

  'news': {
    id: 'news',
    name: 'News / Facts',
    description: 'Breaking news, daily facts, trending topics',
    defaultTemplateId: 'breaking-news',
    defaultFormat: 'story',
    voiceId: 'morgan-freeman',
    languages: ['en', 'es', 'pt', 'fr', 'de', 'it'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'news',
    segmentPattern: {
      intro: true,
      outro: true,
      contentPrefix: 'section',
      contentCountRange: [3, 8],
    },
    templates: [
      {
        templateId: 'breaking-news',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
      {
        templateId: 'kinetic-text',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
    ],
  },

  'how-to': {
    id: 'how-to',
    name: 'How-To / Tutorial',
    description: 'Step-by-step tutorials and instructional content',
    defaultTemplateId: 'slider',
    defaultFormat: 'landscape',
    voiceId: 'mel-robbins',
    languages: ['en', 'es', 'de', 'fr'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'howto',
    segmentPattern: {
      intro: true,
      outro: true,
      contentPrefix: 'slide',
      contentCountRange: [3, 10],
    },
    templates: [
      {
        templateId: 'slider',
        totalFramesStrategy: 'slider-formula',
        trailingHoldFrames: 0,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'intro.durationFrames' },
          { segmentPattern: 'slide*', customTransform: 'slider-slides' },
          { segmentPattern: 'outro', durationOnlyPath: 'outro.durationFrames' },
        ],
      },
      {
        templateId: 'split-reveal',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'slide*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
    ],
  },

  'luxury': {
    id: 'luxury',
    name: 'Luxury / Lifestyle',
    description: 'Dubai luxury, lifestyle showcases, premium content',
    defaultTemplateId: 'dubai-luxury',
    defaultFormat: 'story',
    voiceId: 'denzel-washington',
    languages: ['en', 'es', 'fr', 'it', 'pt'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'lux',
    segmentPattern: {
      intro: true,
      outro: true,
      contentPrefix: 'section',
      contentCountRange: [3, 6],
    },
    templates: [
      {
        templateId: 'dubai-luxury',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
      {
        templateId: 'showcase',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
      {
        templateId: 'gold-reveal',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
    ],
  },

  'sports': {
    id: 'sports',
    name: 'Sports',
    description: 'Match fixtures, post-match results, sports highlights',
    defaultTemplateId: 'match-fixture',
    defaultFormat: 'story',
    voiceId: 'eric-thomas',
    languages: ['en', 'es', 'pt', 'fr'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'sport',
    segmentPattern: {
      intro: true,
      outro: true,
      contentPrefix: 'section',
      contentCountRange: [2, 6],
    },
    templates: [
      {
        templateId: 'match-fixture',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
      {
        templateId: 'post-match',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', durationOnlyPath: 'introDurationFrames' },
          { segmentPattern: 'section*', startFramePath: 'sections[i].startFrame', durationFramesPath: 'sections[i].durationFrames' },
          { segmentPattern: 'outro', durationOnlyPath: 'outroDurationFrames' },
        ],
      },
    ],
  },

  'jokes': {
    id: 'jokes',
    name: 'Jokes / Comedy',
    description: 'Short-form comedy, one-liners, observational humor',
    defaultTemplateId: 'motivational-narration',
    defaultFormat: 'story',
    voiceId: 'les-brown',
    languages: ['en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'ru', 'zh'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'joke',
    segmentPattern: {
      intro: true,
      outro: false,
      contentPrefix: 'section',
      contentCountRange: [3, 5],
    },
    templates: [
      {
        templateId: 'motivational-narration',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', customTransform: 'narration-scene' },
          { segmentPattern: 'setup', customTransform: 'narration-scene' },
          { segmentPattern: 'punchline', customTransform: 'narration-scene' },
          { segmentPattern: 'callback', customTransform: 'narration-scene' },
          { segmentPattern: 'cta', customTransform: 'narration-scene' },
        ],
      },
    ],
  },

  'vocab-english': {
    id: 'vocab-english',
    name: 'English Vocabulary',
    description: 'Daily vocabulary flashcards with pronunciation, examples, and synonyms',
    defaultTemplateId: 'vocab-card',
    defaultFormat: 'story',
    voiceId: 'les-brown',
    languages: ['en'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'vocab',
    segmentPattern: {
      intro: false,
      outro: false,
      contentPrefix: 'word',
      contentCountRange: [1, 1],
    },
    templates: [
      {
        templateId: 'vocab-card',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 0,
        mappings: [],
        propOverrides: {
          brandName: 'LinguaForge',
        },
      },
    ],
  },

  'finance': {
    id: 'finance',
    name: 'Finance / Crypto',
    description: 'Financial tips, crypto updates, wealth building',
    defaultTemplateId: 'motivational-narration',
    defaultFormat: 'story',
    voiceId: 'les-brown',
    languages: ['en', 'es', 'pt', 'fr', 'de'],
    defaultLanguage: 'en',
    storagePrefix: 'audio',
    postIdPrefix: 'fin',
    segmentPattern: {
      intro: true,
      outro: false,
      contentPrefix: 'section',
      contentCountRange: [3, 5],
    },
    templates: [
      {
        templateId: 'motivational-narration',
        totalFramesStrategy: 'sum-sequential',
        trailingHoldFrames: 30,
        mappings: [
          { segmentPattern: 'intro', customTransform: 'narration-scene' },
          { segmentPattern: 'headline', customTransform: 'narration-scene' },
          { segmentPattern: 'subheader', customTransform: 'narration-scene' },
          { segmentPattern: 'badge', customTransform: 'narration-scene' },
          { segmentPattern: 'cta', customTransform: 'narration-scene' },
        ],
      },
    ],
  },
};

/** Get a niche definition by ID */
export function getNiche(id: string): NicheDefinition | undefined {
  return niches[id];
}

/** Get all niche IDs */
export function getNicheIds(): string[] {
  return Object.keys(niches);
}

/** Find the right NicheTemplate config for a given niche + template combo */
export function getNicheTemplate(nicheId: string, templateId: string): NicheTemplate | undefined {
  const niche = niches[nicheId];
  if (!niche) return undefined;
  return niche.templates.find((t) => t.templateId === templateId);
}
