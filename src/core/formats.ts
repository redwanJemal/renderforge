import { Format, FormatConfig, FORMATS } from '../types';

/**
 * Get format configuration by name.
 * Falls back to 'landscape' for unknown formats.
 */
export function getFormat(format: Format): FormatConfig {
  return FORMATS[format] ?? FORMATS.landscape;
}

/**
 * Get all available formats.
 */
export function getAllFormats(): Record<Format, FormatConfig> {
  return { ...FORMATS };
}

/**
 * Get responsive font size based on format.
 * Story format gets larger text (taller viewport), landscape gets standard.
 */
export function responsiveFontSize(
  base: number,
  format: Format,
  scale: 'heading' | 'body' | 'caption' = 'body'
): number {
  const multipliers: Record<Format, Record<string, number>> = {
    story: { heading: 1.3, body: 1.15, caption: 1.1 },
    post: { heading: 1.1, body: 1.05, caption: 1.0 },
    landscape: { heading: 1.0, body: 1.0, caption: 1.0 },
  };

  return Math.round(base * (multipliers[format]?.[scale] ?? 1));
}

/**
 * Get responsive padding based on format.
 */
export function responsivePadding(base: number, format: Format): number {
  const multipliers: Record<Format, number> = {
    story: 1.2,
    post: 1.0,
    landscape: 0.9,
  };

  return Math.round(base * (multipliers[format] ?? 1));
}

/**
 * Check if a format is portrait-oriented.
 */
export function isPortrait(format: Format): boolean {
  const config = getFormat(format);
  return config.height > config.width;
}

/**
 * Get the aspect ratio string for a format.
 */
export function getAspectRatio(format: Format): string {
  const config = getFormat(format);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(config.width, config.height);
  return `${config.width / d}:${config.height / d}`;
}
