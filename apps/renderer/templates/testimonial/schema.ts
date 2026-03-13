import { z } from 'zod';

export const testimonialSchema = z.object({
  quote: z
    .string()
    .default(
      'This product completely transformed our workflow. The team is more productive than ever, and the results speak for themselves.'
    ),
  authorName: z.string().default('Sarah Johnson'),
  authorRole: z.string().default('Head of Product'),
  authorCompany: z.string().default('TechCorp Inc.'),
  authorImage: z
    .string()
    .default('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200'),
  companyLogo: z.string().default(''),
  rating: z.number().min(0).max(5).default(5),
  backgroundColors: z
    .array(z.string())
    .default(['#F8FAFC', '#EFF6FF']),
});

export type TestimonialProps = z.infer<typeof testimonialSchema>;

export const defaultProps: TestimonialProps = testimonialSchema.parse({});
