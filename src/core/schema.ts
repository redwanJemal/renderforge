import { z } from 'zod';

/** Base schema fragments reusable across templates */

export const colorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
    message: 'Must be a valid hex color (e.g. #FF0000)',
  })
  .or(z.string().regex(/^rgba?\(/, { message: 'Must be a valid color' }));

export const urlSchema = z
  .string()
  .url()
  .or(z.string().startsWith('/'))
  .or(z.literal(''));

export const animationSchema = z.enum([
  'fadeIn',
  'slideUp',
  'slideLeft',
  'slideRight',
  'slideDown',
  'scaleIn',
  'typewriter',
]);

export const formatSchema = z.enum(['story', 'post', 'landscape']);

export const positionSchema = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
]);

export const renderRequestSchema = z.object({
  templateId: z.string().min(1),
  props: z.record(z.any()).default({}),
  theme: z.string().optional().default('default'),
  format: formatSchema.optional().default('landscape'),
  outputFormat: z.enum(['mp4', 'webm', 'gif']).optional().default('mp4'),
});

export type AnimationType = z.infer<typeof animationSchema>;
export type Position = z.infer<typeof positionSchema>;
