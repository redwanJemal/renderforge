#!/usr/bin/env npx tsx
/**
 * Pipeline Orchestrator: MinIO → Split → Render → Upload
 *
 * End-to-end pipeline:
 * 1. Download audio from MinIO → content/audio/{projectId}/full.wav
 * 2. Split audio using splits.json → segment WAVs
 * 3. Generate manifest via audio-ingest
 * 4. Render synced video via render-manifest
 * 5. Mix background music (optional)
 * 6. Upload final MP4 back to MinIO
 *
 * Usage:
 *   npx tsx content/render-from-bucket.ts --key motivation1.wav --niche motivational
 *   npx tsx content/render-from-bucket.ts --local content/audio/motivation1 --niche motivational --skip-upload --no-bgm
 *   npx tsx content/render-from-bucket.ts --key motivation1.wav --niche motivational --template yld-intro --format story
 */

import * as fs from 'fs';
import * as path from 'path';
import { downloadFile, uploadFile } from './storage';
import { splitAudio } from './audio-split';
import { generateManifest } from './audio-ingest';
import { renderFromManifest } from './render-manifest';
import { mixBGM } from './bgm-mix';

const AUDIO_BASE = path.resolve(__dirname, 'audio');
const BGM_BASE = path.resolve(__dirname, 'audio', 'bgm');

interface PipelineOptions {
  key?: string;         // S3 key to download (e.g. "motivation1.wav")
  localDir?: string;    // Use local dir instead of downloading
  nicheId: string;
  templateId?: string;
  format?: string;
  propsOverride?: Record<string, any>;
  skipUpload?: boolean;
  noBgm?: boolean;
  bgmFile?: string;     // Override BGM file path
  bgmVolume?: number;
  syncOnly?: boolean;
}

async function runPipeline(opts: PipelineOptions): Promise<void> {
  console.log('═══════════════════════════════════════════════');
  console.log('  RENDERFORGE PIPELINE');
  console.log('═══════════════════════════════════════════════\n');

  // Step 1: Resolve audio directory
  let audioDir: string;

  if (opts.localDir) {
    audioDir = path.resolve(opts.localDir);
    console.log(`  Step 1: Using local directory → ${audioDir}`);
  } else if (opts.key) {
    const projectId = path.basename(opts.key, path.extname(opts.key));
    audioDir = path.join(AUDIO_BASE, projectId);
    const localPath = path.join(audioDir, 'full.wav');

    if (fs.existsSync(localPath)) {
      console.log(`  Step 1: Audio already downloaded → ${localPath}`);
    } else {
      console.log(`  Step 1: Downloading from MinIO → ${opts.key}`);
      await downloadFile(opts.key, localPath);
    }
  } else {
    throw new Error('Either --key or --local must be provided');
  }

  // Step 2: Split audio (if splits.json exists)
  const splitsPath = path.join(audioDir, 'splits.json');
  if (fs.existsSync(splitsPath)) {
    console.log('\n  Step 2: Splitting audio...');
    splitAudio(audioDir);
  } else {
    console.log('\n  Step 2: No splits.json found, skipping split (using individual audio files as-is)');
  }

  // Step 2b: Load content props from splits.json (if present)
  let contentProps: Record<string, any> = {};
  if (fs.existsSync(splitsPath)) {
    const splitsData = JSON.parse(fs.readFileSync(splitsPath, 'utf-8'));
    if (splitsData.props) {
      contentProps = splitsData.props;
      console.log(`    Loaded content props: ${Object.keys(contentProps).join(', ')}`);
    }
  }

  // Step 3: Generate manifest
  console.log('\n  Step 3: Generating frame manifest...');
  const manifestPath = path.join(audioDir, 'manifest.json');
  let manifest;

  if (fs.existsSync(manifestPath)) {
    // Re-generate to pick up newly split files
    console.log('    Regenerating manifest with split segments...');
  }
  manifest = generateManifest(audioDir);

  if (!manifest || manifest.segments.length === 0) {
    throw new Error('No audio segments found after split. Check your splits.json and audio files.');
  }

  console.log(`    ${manifest.segments.length} segments, ${manifest.totalAudioDuration.toFixed(1)}s total`);

  // Step 4: Render video
  // Merge content props from splits.json with any CLI props override
  const mergedProps = { ...contentProps, ...opts.propsOverride };
  console.log('\n  Step 4: Rendering video...');
  const renderResult = renderFromManifest({
    manifest,
    nicheId: opts.nicheId,
    templateId: opts.templateId,
    format: opts.format,
    propsOverride: Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
    syncOnly: opts.syncOnly,
  });

  if (!renderResult) {
    throw new Error('Render failed');
  }

  if (opts.syncOnly) {
    console.log('\n  Pipeline complete (sync-only mode).');
    return;
  }

  let finalOutput = renderResult.outputPath;

  // Step 5: Mix BGM (optional)
  if (!opts.noBgm) {
    const bgmFile = opts.bgmFile || findBGM(opts.nicheId);
    if (bgmFile) {
      console.log('\n  Step 5: Mixing background music...');
      finalOutput = mixBGM({
        videoPath: renderResult.outputPath,
        bgmPath: bgmFile,
        bgmVolume: opts.bgmVolume,
      });
    } else {
      console.log('\n  Step 5: No BGM file found, skipping');
    }
  } else {
    console.log('\n  Step 5: BGM disabled (--no-bgm)');
  }

  // Step 6: Upload to MinIO
  if (!opts.skipUpload) {
    console.log('\n  Step 6: Uploading to MinIO...');
    const uploadKey = `rendered/${path.basename(finalOutput)}`;
    await uploadFile(finalOutput, uploadKey);
  } else {
    console.log('\n  Step 6: Upload skipped (--skip-upload)');
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  PIPELINE COMPLETE');
  console.log(`  Output: ${finalOutput}`);
  console.log('═══════════════════════════════════════════════');
}

/**
 * Find a BGM file for a niche. Looks in content/audio/bgm/{nicheId}/.
 */
function findBGM(nicheId: string): string | null {
  const bgmDir = path.join(BGM_BASE, nicheId);
  if (!fs.existsSync(bgmDir)) return null;

  const files = fs.readdirSync(bgmDir).filter((f) => /\.(mp3|wav|aac|m4a)$/.test(f));
  if (files.length === 0) return null;

  return path.join(bgmDir, files[0]);
}

// ── CLI ──────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let key: string | null = null;
  let localDir: string | null = null;
  let nicheId: string | null = null;
  let templateId: string | null = null;
  let format: string | null = null;
  let propsOverride: string | null = null;
  let skipUpload = false;
  let noBgm = false;
  let bgmFile: string | null = null;
  let bgmVolume: number | undefined;
  let syncOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--key' && args[i + 1]) key = args[i + 1];
    if (args[i] === '--local' && args[i + 1]) localDir = args[i + 1];
    if (args[i] === '--niche' && args[i + 1]) nicheId = args[i + 1];
    if (args[i] === '--template' && args[i + 1]) templateId = args[i + 1];
    if (args[i] === '--format' && args[i + 1]) format = args[i + 1];
    if (args[i] === '--props' && args[i + 1]) propsOverride = args[i + 1];
    if (args[i] === '--bgm' && args[i + 1]) bgmFile = args[i + 1];
    if (args[i] === '--bgm-volume' && args[i + 1]) bgmVolume = parseFloat(args[i + 1]);
    if (args[i] === '--skip-upload') skipUpload = true;
    if (args[i] === '--no-bgm') noBgm = true;
    if (args[i] === '--sync-only') syncOnly = true;
  }

  if (!nicheId || (!key && !localDir)) {
    console.log('Usage:');
    console.log('  npx tsx content/render-from-bucket.ts --key <s3-key> --niche <niche-id>');
    console.log('  npx tsx content/render-from-bucket.ts --local <dir> --niche <niche-id>');
    console.log('');
    console.log('Options:');
    console.log('  --template <id>      Override template');
    console.log('  --format <fmt>       story | post | landscape');
    console.log('  --props \'{}\'         JSON props override');
    console.log('  --bgm <path>         Background music file');
    console.log('  --bgm-volume <0-1>   BGM volume (default: 0.06)');
    console.log('  --no-bgm             Skip background music');
    console.log('  --skip-upload        Don\'t upload result to MinIO');
    console.log('  --sync-only          Only generate synced props');
    process.exit(1);
  }

  let parsedProps: Record<string, any> | undefined;
  if (propsOverride) {
    try {
      parsedProps = JSON.parse(propsOverride);
    } catch {
      console.error('Invalid --props JSON');
      process.exit(1);
    }
  }

  await runPipeline({
    key: key || undefined,
    localDir: localDir || undefined,
    nicheId,
    templateId: templateId || undefined,
    format: format || undefined,
    propsOverride: parsedProps,
    skipUpload,
    noBgm,
    bgmFile: bgmFile || undefined,
    bgmVolume,
    syncOnly,
  });
}

main().catch((err) => {
  console.error(`\nPipeline error: ${err.message}`);
  process.exit(1);
});
