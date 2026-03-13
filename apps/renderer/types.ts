import { z } from 'zod';
import type React from 'react';

// Supported output formats
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

// Theme system
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

// Template metadata
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

// Template registration
export interface TemplateDefinition<T = any> {
  meta: TemplateMeta;
  schema: z.ZodType<T>;
  component: React.FC<T & { theme: Theme; format: Format }>;
  defaultProps: T;
}

// Render request
export interface RenderRequest {
  templateId: string;
  props: Record<string, any>;
  theme?: string;
  format?: Format;
  outputFormat?: 'mp4' | 'webm' | 'gif';
}

// Render job status
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
