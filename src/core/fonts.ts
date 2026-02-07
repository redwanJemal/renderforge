import { staticFile, continueRender, delayRender } from 'remotion';

interface FontDefinition {
  family: string;
  src: string;
  weight?: string;
  style?: string;
}

const loadedFonts = new Set<string>();

/**
 * Load a custom font from the public/fonts directory or a URL.
 * Safe to call multiple times — fonts are only loaded once.
 */
export function loadFont(font: FontDefinition): void {
  const key = `${font.family}-${font.weight ?? 'normal'}-${font.style ?? 'normal'}`;

  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);

  if (typeof document === 'undefined') return;

  const handle = delayRender(`Loading font: ${font.family}`);

  const src = font.src.startsWith('http') ? font.src : staticFile(font.src);

  const fontFace = new FontFace(font.family, `url(${src})`, {
    weight: font.weight ?? 'normal',
    style: font.style ?? 'normal',
  });

  fontFace
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
      continueRender(handle);
    })
    .catch((err) => {
      console.error(`Failed to load font ${font.family}:`, err);
      continueRender(handle);
    });
}

/**
 * Load Google Fonts via the CSS API.
 * Example: loadGoogleFont('Inter', [400, 600, 700])
 */
export function loadGoogleFont(
  family: string,
  weights: number[] = [400, 700]
): void {
  const key = `google-${family}-${weights.join(',')}`;
  if (loadedFonts.has(key)) return;
  loadedFonts.add(key);

  if (typeof document === 'undefined') return;

  const handle = delayRender(`Loading Google Font: ${family}`);

  const weightStr = weights.join(';');
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weightStr}&display=swap`;

  const link = document.createElement('link');
  link.href = url;
  link.rel = 'stylesheet';

  link.onload = () => {
    // Wait a frame for fonts to actually be available
    setTimeout(() => continueRender(handle), 100);
  };
  link.onerror = () => {
    console.error(`Failed to load Google Font: ${family}`);
    continueRender(handle);
  };

  document.head.appendChild(link);
}

/** Default font stack used when no custom font is specified */
export const DEFAULT_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** Font stack with Amharic/Ethiopic support */
export const ETHIOPIC_FONT_STACK =
  '"Noto Sans Ethiopic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Load Noto Sans Ethiopic for Amharic text support.
 * Call this at the top level of templates that need Amharic.
 */
export function loadEthiopicFont(weights: number[] = [400, 600, 700, 900]): void {
  loadGoogleFont('Noto Sans Ethiopic', weights);
}
