import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { registry } from '../../core/registry';
import { getTheme } from '../../themes';
import { RenderJob, Format } from '../../types';
import { renderRequestSchema } from '../../core/schema';

const router = Router();

// In-memory job store
const jobs = new Map<string, RenderJob>();

// Output directory
const outputDir = path.resolve(__dirname, '../../../output');

/**
 * POST /api/render — Submit a render job
 */
router.post('/api/render', async (req, res) => {
  try {
    const parsed = renderRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { templateId, props, theme: themeId, format, outputFormat } = parsed.data;

    const template = registry.get(templateId);
    if (!template) {
      res.status(404).json({
        error: 'Template not found',
        message: `No template "${templateId}". Available: ${registry.ids().join(', ')}`,
      });
      return;
    }

    const selectedFormat = format as Format;
    if (!template.meta.supportedFormats.includes(selectedFormat)) {
      res.status(400).json({
        error: 'Unsupported format',
        message: `Template "${templateId}" does not support format "${format}". Supported: ${template.meta.supportedFormats.join(', ')}`,
      });
      return;
    }

    const propsResult = template.schema.safeParse({
      ...template.defaultProps,
      ...props,
    });
    if (!propsResult.success) {
      res.status(400).json({
        error: 'Invalid props',
        details: propsResult.error.flatten(),
      });
      return;
    }

    const jobId = randomUUID();
    const job: RenderJob = {
      id: jobId,
      status: 'queued',
      templateId,
      format: selectedFormat,
      progress: 0,
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    renderInBackground(job, propsResult.data, themeId!, outputFormat!).catch(
      (err) => {
        console.error(`Render job ${jobId} failed:`, err);
        job.status = 'failed';
        job.error = err instanceof Error ? err.message : String(err);
      }
    );

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Render job submitted. Poll GET /api/render/:jobId for status.',
    });
  } catch (err) {
    console.error('Render endpoint error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/render/:jobId — Check render job status
 */
router.get('/api/render/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

/**
 * GET /api/render/:jobId/status — Alias for status check
 */
router.get('/api/render/:jobId/status', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

/**
 * GET /api/render/:jobId/download — Download completed render
 */
router.get('/api/render/:jobId/download', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status !== 'complete') {
    res.status(400).json({
      error: 'Not ready',
      message: `Job status is "${job.status}". Wait for completion.`,
    });
    return;
  }

  if (!job.outputPath || !fs.existsSync(job.outputPath)) {
    res.status(404).json({ error: 'Output file not found' });
    return;
  }

  const ext = path.extname(job.outputPath);
  const filename = `${job.templateId}-${job.format}${ext}`;
  res.download(job.outputPath, filename);
});

/**
 * Background render using @remotion/renderer.
 */
async function renderInBackground(
  job: RenderJob,
  validatedProps: Record<string, any>,
  themeId: string,
  outputFormat: string
): Promise<void> {
  job.status = 'rendering';

  try {
    const { bundle } = await import('@remotion/bundler' as string);
    const { renderMedia, selectComposition } = await import(
      '@remotion/renderer'
    );

    const theme = getTheme(themeId);
    const compositionId = `${job.templateId}-${job.format}`;

    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, '../../Root.tsx'),
      onProgress: (progress: number) => {
        job.progress = Math.round(progress * 30);
      },
    });

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: {
        ...validatedProps,
        theme,
        format: job.format,
      },
    });

    const ext = outputFormat === 'gif' ? 'gif' : outputFormat === 'webm' ? 'webm' : 'mp4';
    const outputPath = path.resolve(outputDir, `${job.id}.${ext}`);

    // Ensure output dir exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: outputFormat === 'gif' ? 'gif' : outputFormat === 'webm' ? 'vp8' : 'h264',
      outputLocation: outputPath,
      inputProps: {
        ...validatedProps,
        theme,
        format: job.format,
      },
      onProgress: ({ progress }) => {
        job.progress = 30 + Math.round(progress * 70);
      },
    });

    job.status = 'complete';
    job.progress = 100;
    job.outputPath = outputPath;
    job.completedAt = Date.now();
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    throw err;
  }
}

export default router;
