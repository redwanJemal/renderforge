/**
 * Content Bank Interface
 *
 * Every niche content bank implements this interface.
 * Banks own the raw content (text, themes) and template-specific props (scenes, highlights).
 * The unified generator uses banks to produce scripts JSON + splits.json per post.
 */

export interface ContentSection {
  key: string;
  text: string;
}

export interface ContentPost {
  title: string;
  theme: string;
  /** Ordered sections matching the niche's segment pattern (intro, headline, etc.) */
  sections: ContentSection[];
  /** Full concatenated script for TTS */
  fullScript: string;
  /** Template-specific props to embed in splits.json (scenes, colors, etc.) */
  sceneProps: Record<string, any>;
}

export interface AccentColor {
  name: string;
  color: string;
  bg: [string, string, string];
}

export interface ContentBank {
  nicheId: string;
  /** All themes/categories within this niche */
  themes: { id: string; name: string }[];
  /** Total post count */
  totalPosts: number;
  /** Segment keys in order (e.g. ['intro', 'headline', 'subheader', 'badge', 'cta']) */
  segmentKeys: string[];
  /** Visual variety */
  accentColors: AccentColor[];
  entrances: readonly string[];
  /** Get all posts, optionally filtered */
  getPosts(opts?: { theme?: string; limit?: number }): ContentPost[];
}
