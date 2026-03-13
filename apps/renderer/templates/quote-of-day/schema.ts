import { z } from 'zod';

export const quoteOfDaySchema = z.object({
  quote: z
    .string()
    .default(
      'The only way to do great work is to love what you do.'
    ),
  author: z.string().default('Steve Jobs'),
  authorTitle: z.string().default('Co-founder, Apple'),
  backgroundImage: z
    .string()
    .default(''),
  backgroundColors: z
    .array(z.string())
    .default(['#0F172A', '#1E293B', '#334155']),
  quoteIcon: z.boolean().default(true),
  accentLine: z.boolean().default(true),
});

export type QuoteOfDayProps = z.infer<typeof quoteOfDaySchema>;

export const defaultProps: QuoteOfDayProps = quoteOfDaySchema.parse({});
