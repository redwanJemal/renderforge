import { z } from 'zod';

export const productLaunchSchema = z.object({
  productName: z.string().default('Premium Wireless Headphones'),
  tagline: z.string().default('Experience Pure Sound'),
  productImage: z
    .string()
    .default('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'),
  price: z.string().default('$299'),
  originalPrice: z.string().default('$399'),
  discount: z.string().default('25% OFF'),
  features: z
    .array(z.string())
    .default([
      '40h Battery Life',
      'Active Noise Cancelling',
      'Premium Hi-Fi Audio',
    ]),
  ctaText: z.string().default('Shop Now'),
  logoUrl: z.string().default(''),
  brandName: z.string().default('AudioPro'),
});

export type ProductLaunchProps = z.infer<typeof productLaunchSchema>;

export const defaultProps: ProductLaunchProps = productLaunchSchema.parse({});
