import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { registry } from '../../core/registry';
import { getTheme } from '../../themes';
import { FORMATS, Format } from '../../types';

const router = Router();

// Cache directory for preview stills
const cacheDir = path.resolve(__dirname, '../../../output/.preview-cache');

// Ensure cache dir exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// Simple in-memory lock to prevent concurrent renders of the same preview
const renderLocks = new Map<string, Promise<string>>();

/**
 * GET /api/preview — Render a single frame as PNG
 *
 * Query params:
 *   template - template id
 *   format   - story|post|landscape
 *   theme    - theme id
 *   props    - JSON-encoded props
 *   frame    - frame number (default 0)
 */
router.get('/api/preview', async (req, res) => {
  try {
    const {
      template: templateId,
      format = 'landscape',
      theme: themeId = 'default',
      props: propsJson = '{}',
      frame: frameStr = '0',
    } = req.query as Record<string, string>;

    if (!templateId) {
      res.status(400).json({ error: 'Missing template parameter' });
      return;
    }

    const template = registry.get(templateId);
    if (!template) {
      res.status(404).json({ error: `Template "${templateId}" not found` });
      return;
    }

    const selectedFormat = format as Format;
    if (!FORMATS[selectedFormat]) {
      res.status(400).json({ error: `Invalid format "${format}"` });
      return;
    }

    let userProps: Record<string, any>;
    try {
      userProps = JSON.parse(propsJson);
    } catch {
      res.status(400).json({ error: 'Invalid props JSON' });
      return;
    }

    const frame = Math.max(0, Math.min(parseInt(frameStr) || 0, template.meta.durationInFrames - 1));

    // Merge with defaults
    const mergedProps = { ...template.defaultProps, ...userProps };
    const theme = getTheme(themeId);

    // Create a cache key based on all parameters
    const cacheKey = crypto
      .createHash('md5')
      .update(JSON.stringify({ templateId, selectedFormat, themeId, mergedProps, frame }))
      .digest('hex');

    const cachedPath = path.join(cacheDir, `${cacheKey}.png`);

    // Return cached version if available
    if (fs.existsSync(cachedPath)) {
      res.type('image/png');
      res.sendFile(cachedPath);
      return;
    }

    // Check if this preview is already being rendered
    let renderPromise = renderLocks.get(cacheKey);
    if (!renderPromise) {
      renderPromise = renderPreviewFrame(
        templateId,
        selectedFormat,
        theme,
        mergedProps,
        frame,
        cachedPath
      );
      renderLocks.set(cacheKey, renderPromise);
      renderPromise.finally(() => renderLocks.delete(cacheKey));
    }

    const outputPath = await renderPromise;

    if (fs.existsSync(outputPath)) {
      res.type('image/png');
      res.sendFile(outputPath);
    } else {
      res.status(500).json({ error: 'Preview generation failed' });
    }
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({
      error: 'Preview generation failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

async function renderPreviewFrame(
  templateId: string,
  format: Format,
  theme: any,
  props: Record<string, any>,
  frame: number,
  outputPath: string
): Promise<string> {
  const { bundle } = await import('@remotion/bundler' as string);
  const { renderStill, selectComposition } = await import('@remotion/renderer');

  const compositionId = `${templateId}-${format}`;

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../../Root.tsx'),
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: {
      ...props,
      theme,
      format,
    },
  });

  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: outputPath,
    frame,
    inputProps: {
      ...props,
      theme,
      format,
    },
    imageFormat: 'png',
  });

  return outputPath;
}

// Cleanup preview cache — remove files older than 30 minutes
setInterval(() => {
  try {
    if (!fs.existsSync(cacheDir)) return;
    const files = fs.readdirSync(cacheDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 30 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // ignore cleanup errors
  }
}, 5 * 60 * 1000);

export default router;
