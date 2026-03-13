import { z } from 'zod';

export const announcementSchema = z.object({
  headline: z.string().default('Something Big Is Coming'),
  subtitle: z
    .string()
    .default('Get ready for a game-changing experience'),
  date: z.string().default('March 15, 2025'),
  details: z.string().default('Join us for the reveal'),
  ctaText: z.string().default('Learn More'),
  backgroundColors: z
    .array(z.string())
    .default(['#7C3AED', '#2563EB', '#0EA5E9']),
  backgroundImage: z.string().default(''),
  logoUrl: z.string().default(''),
  badge: z.string().default('NEW'),
});

export type AnnouncementProps = z.infer<typeof announcementSchema>;

export const defaultProps: AnnouncementProps = announcementSchema.parse({});
