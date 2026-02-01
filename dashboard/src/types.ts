// Mirror of core types from the main project

export type Format = 'story' | 'post' | 'landscape';

export interface FormatConfig {
  width: number;
  height: number;
  label: string;
}

export const FORMATS: Record<Format, FormatConfig> = {
  story: { width: 1080, height: 1920, label: 'Story (9:16)' },
  post: { width: 1080, height: 1080, label: 'Post (1:1)' },
  landscape: { width: 1920, height: 1080, label: 'Landscape (16:9)' },
};

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: number;
  shadow: string;
  animationStyle: 'smooth' | 'bouncy' | 'sharp';
}

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  supportedFormats: Format[];
  durationInFrames: number;
  fps: number;
}

export interface TemplateInfo extends TemplateMeta {
  defaultProps: Record<string, any>;
  schema: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'url' | 'array' | 'object';
  label: string;
  default: any;
  required: boolean;
  description?: string;
  options?: string[]; // for enums
  items?: SchemaField; // for arrays
  fields?: SchemaField[]; // for objects
  min?: number;
  max?: number;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'rendering' | 'complete' | 'failed';
  templateId: string;
  format: Format;
  progress: number;
  outputPath?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}
