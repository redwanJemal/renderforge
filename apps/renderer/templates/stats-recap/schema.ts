import { z } from 'zod';

const statItemSchema = z.object({
  value: z.number().default(0),
  label: z.string().default(''),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
});

export const statsRecapSchema = z.object({
  title: z.string().default('2024 Year in Review'),
  subtitle: z.string().default('Our journey in numbers'),
  stats: z
    .array(statItemSchema)
    .default([
      { value: 12500, label: 'Users Reached', prefix: '', suffix: '+' },
      { value: 98, label: 'Satisfaction Rate', prefix: '', suffix: '%' },
      { value: 350, label: 'Projects Delivered', prefix: '', suffix: '' },
      { value: 4.9, label: 'Average Rating', prefix: '', suffix: '★' },
    ]),
  backgroundColors: z
    .array(z.string())
    .default(['#1E293B', '#0F172A']),
});

export type StatsRecapProps = z.infer<typeof statsRecapSchema>;

export const defaultProps: StatsRecapProps = statsRecapSchema.parse({});
