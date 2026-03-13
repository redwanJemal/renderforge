#!/usr/bin/env npx tsx
/**
 * Unified Batch Render Pipeline
 *
 * Renders videos for any niche. Replaces render-from-bucket.ts (single) and
 * batch-render-motivational.ts (batch) with one pipeline that works for all niches.
 *
 * Per-post: download → estimate timestamps → split → manifest → render → BGM → upload
 *
 * Usage:
 *   # Batch mode (from scripts JSON)
 *   npx tsx content/batch-render.ts --niche motivational
 *   npx tsx content/batch-render.ts --niche motivational --start 1 --end 50
 *   npx tsx content/batch-render.ts --niche motivational --post mot-042
 *   npx tsx content/batch-render.ts --niche jokes --resume
 *
 *   # Single-post mode (replaces render-from-bucket.ts)
 *   npx tsx content/batch-render.ts --niche motivational --key audio/motivation1.wav
 *   npx tsx content/batch-render.ts --niche motivational --local content/audio/mot-001
 *
 *   # Common options
 *   --template <id>       Override template
 *   --format <fmt>        story | post | landscape
 *   --resume              Skip already-done posts
 *   --local               Skip MinIO download (batch) or use local dir (single)
 *   --skip-upload         Don't upload results
 *   --no-bgm              Skip background music
 *   --bgm-volume <0-1>    BGM volume (default 0.35)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { downloadFile, uploadFile } from './storage';
import { splitAudio } from './audio-split';
import { generateManifest } from './audio-ingest';
import { renderFromManifest } from './render-manifest';
import { mixBGM } from './bgm-mix';
import { niches } from './niches';

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────

const CONTENT_DIR = __dirname;
const AUDIO_BASE = path.join(CONTENT_DIR, 'audio');
const BGM_BASE = path.join(AUDIO_BASE, 'bgm');

interface ScriptPost {
  postId: string;
  template: string;
  theme: string;
  title: string;
  sections: { key: string; text: string; audioFile: string }[];
  fullScript: string;
  audioDir: string;
}

interface ProgressEntry {
  status: 'pending' | 'done' | 'failed';
  outputPath?: string;
  error?: string;
  timestamp?: string;
}

type Progress = Record<string, ProgressEntry>;

// ──────────────────────────────────────────────
// PROGRESS
// ──────────────────────────────────────────────

function progressFile(nicheId: string): string {
  return path.join(CONTENT_DIR, `batch-progress-${nicheId}.json`);
}

function loadProgress(nicheId: string): Progress {
  const f = progressFile(nicheId);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  return {};
}

function saveProgress(nicheId: string, progress: Progress): void {
  fs.writeFileSync(progressFile(nicheId), JSON.stringify(progress, null, 2));
}

// ──────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────

function getAudioDuration(filePath: string): number {
  try {
    return parseFloat(
      execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`, { encoding: 'utf-8' }).trim(),
    );
  } catch {
    return 0;
  }
}

function estimateTimestamps(
  sections: { key: string; text: string }[],
  totalDuration: number,
): { key: string; start: number; end: number }[] {
  const wordCounts = sections.map((s) => s.text.split(/\s+/).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  let cursor = 0;
  return sections.map((sec, i) => {
    const duration = (wordCounts[i] / totalWords) * totalDuration;
    const seg = { key: sec.key, start: cursor, end: cursor + duration };
    cursor += duration;
    return seg;
  });
}

function getBGMFiles(nicheId: string): string[] {
  const bgmDir = path.join(BGM_BASE, nicheId);
  if (!fs.existsSync(bgmDir)) {
    // Fall back to motivational BGM if niche-specific doesn't exist
    const fallback = path.join(BGM_BASE, 'motivational');
    if (!fs.existsSync(fallback)) return [];
    return fs.readdirSync(fallback).filter((f) => /\.(mp3|wav|aac|m4a)$/.test(f)).map((f) => path.join(fallback, f));
  }
  return fs.readdirSync(bgmDir).filter((f) => /\.(mp3|wav|aac|m4a)$/.test(f)).map((f) => path.join(bgmDir, f));
}

// ──────────────────────────────────────────────
// SINGLE POST PIPELINE
// ──────────────────────────────────────────────

async function processPost(
  script: ScriptPost,
  opts: {
    nicheId: string;
    templateId: string;
    format: string;
    local: boolean;
    skipUpload: boolean;
    noBgm: boolean;
    bgmVolume: number;
    bgmFiles: string[];
    postIndex: number;
    storagePrefix: string;
  },
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  const audioDir = path.join(AUDIO_BASE, script.postId);
  const fullWavPath = path.join(audioDir, 'full.wav');
  const splitsPath = path.join(audioDir, 'splits.json');

  // Step 1: Download audio if needed
  if (!opts.local) {
    const minioKey = `${opts.storagePrefix}/${script.postId}.wav`;
    if (!fs.existsSync(fullWavPath)) {
      console.log(`    Downloading: ${minioKey}`);
      try {
        await downloadFile(minioKey, fullWavPath);
      } catch (err: any) {
        return { success: false, error: `Download failed: ${err.message}` };
      }
    }
  }

  if (!fs.existsSync(fullWavPath)) {
    return { success: false, error: `No full.wav at ${fullWavPath}` };
  }

  // Step 2: Estimate timestamps if needed
  if (!fs.existsSync(splitsPath)) {
    return { success: false, error: `No splits.json at ${splitsPath}` };
  }

  const splitsData = JSON.parse(fs.readFileSync(splitsPath, 'utf-8'));
  const totalDuration = getAudioDuration(fullWavPath);
  if (totalDuration <= 0) {
    return { success: false, error: 'Could not read audio duration' };
  }

  console.log(`    Audio: ${totalDuration.toFixed(1)}s`);

  const needsEstimation = splitsData.segments.every(
    (s: { start: number; end: number }) => s.start === 0 && s.end === 0,
  );

  if (needsEstimation) {
    const timestampsPath = path.join(audioDir, 'timestamps.json');
    if (fs.existsSync(timestampsPath)) {
      splitsData.segments = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      console.log('    Using timestamps.json');
    } else {
      splitsData.segments = estimateTimestamps(script.sections, totalDuration);
      console.log('    Estimated timestamps from word counts');
    }
    fs.writeFileSync(splitsPath, JSON.stringify(splitsData, null, 2));
  }

  // Step 3: Split audio
  console.log('    Splitting audio...');
  try {
    splitAudio(audioDir);
  } catch (err: any) {
    return { success: false, error: `Split failed: ${err.message}` };
  }

  // Step 4: Generate manifest
  console.log('    Generating manifest...');
  const manifest = generateManifest(audioDir);
  if (!manifest || manifest.segments.length === 0) {
    return { success: false, error: 'No segments in manifest' };
  }

  console.log(`    ${manifest.segments.length} segments, ${manifest.totalFrames} frames (${(manifest.totalFrames / 30).toFixed(1)}s)`);

  // Step 5: Render
  console.log('    Rendering...');
  const contentProps = splitsData.props || {};
  const renderResult = renderFromManifest({
    manifest,
    nicheId: opts.nicheId,
    templateId: opts.templateId,
    format: opts.format,
    propsOverride: contentProps,
  });

  if (!renderResult) {
    return { success: false, error: 'Render failed' };
  }

  let finalOutput = renderResult.outputPath;

  // Step 6: BGM
  if (!opts.noBgm && opts.bgmFiles.length > 0) {
    const bgmFile = opts.bgmFiles[opts.postIndex % opts.bgmFiles.length];
    console.log(`    BGM: ${path.basename(bgmFile)}`);
    try {
      finalOutput = mixBGM({
        videoPath: renderResult.outputPath,
        bgmPath: bgmFile,
        bgmVolume: opts.bgmVolume,
      });
    } catch (err: any) {
      console.error(`    BGM failed: ${err.message} (continuing without)`);
    }
  }

  // Step 7: Upload
  if (!opts.skipUpload) {
    const uploadKey = `rendered/${opts.nicheId}/${script.postId}.mp4`;
    console.log(`    Uploading: ${uploadKey}`);
    try {
      await uploadFile(finalOutput, uploadKey);
    } catch (err: any) {
      console.error(`    Upload failed: ${err.message}`);
    }
  }

  return { success: true, outputPath: finalOutput };
}

// ──────────────────────────────────────────────
// SINGLE-POST MODE (replaces render-from-bucket.ts)
// ──────────────────────────────────────────────

async function runSinglePost(opts: {
  nicheId: string;
  key?: string;
  localDir?: string;
  templateId?: string;
  format?: string;
  skipUpload: boolean;
  noBgm: boolean;
  bgmVolume: number;
}): Promise<void> {
  const niche = niches[opts.nicheId];

  let audioDir: string;
  if (opts.localDir) {
    audioDir = path.resolve(opts.localDir);
    console.log(`  Using local: ${audioDir}`);
  } else if (opts.key) {
    const projectId = path.basename(opts.key, path.extname(opts.key));
    audioDir = path.join(AUDIO_BASE, projectId);
    const localPath = path.join(audioDir, 'full.wav');
    if (!fs.existsSync(localPath)) {
      console.log(`  Downloading: ${opts.key}`);
      await downloadFile(opts.key, localPath);
    }
  } else {
    throw new Error('Either --key or --local required for single-post mode');
  }

  // Split if splits.json exists
  const splitsPath = path.join(audioDir, 'splits.json');
  if (fs.existsSync(splitsPath)) {
    splitAudio(audioDir);
  }

  // Load content props
  let contentProps: Record<string, any> = {};
  if (fs.existsSync(splitsPath)) {
    const splitsData = JSON.parse(fs.readFileSync(splitsPath, 'utf-8'));
    if (splitsData.props) contentProps = splitsData.props;
  }

  // Generate manifest
  const manifest = generateManifest(audioDir);
  if (!manifest || manifest.segments.length === 0) {
    throw new Error('No audio segments found');
  }

  // Render
  const templateId = opts.templateId || niche.defaultTemplateId;
  const format = opts.format || niche.defaultFormat;

  const renderResult = renderFromManifest({
    manifest,
    nicheId: opts.nicheId,
    templateId,
    format,
    propsOverride: contentProps,
  });

  if (!renderResult) throw new Error('Render failed');

  let finalOutput = renderResult.outputPath;

  // BGM
  if (!opts.noBgm) {
    const bgmFiles = getBGMFiles(opts.nicheId);
    if (bgmFiles.length > 0) {
      finalOutput = mixBGM({
        videoPath: renderResult.outputPath,
        bgmPath: bgmFiles[0],
        bgmVolume: opts.bgmVolume,
      });
    }
  }

  // Upload
  if (!opts.skipUpload) {
    const uploadKey = `rendered/${path.basename(finalOutput)}`;
    await uploadFile(finalOutput, uploadKey);
  }

  console.log(`\n  Done: ${finalOutput}`);
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let nicheId: string | null = null;
  let start = 0;
  let end = Infinity;
  let specificPost: string | null = null;
  let resume = false;
  let local = false;
  let skipUpload = false;
  let noBgm = false;
  let bgmVolume = 0.35;
  let templateId: string | null = null;
  let format: string | null = null;
  let key: string | null = null;
  let localDir: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--niche' && args[i + 1]) nicheId = args[i + 1];
    if (args[i] === '--start' && args[i + 1]) start = parseInt(args[i + 1], 10) - 1;
    if (args[i] === '--end' && args[i + 1]) end = parseInt(args[i + 1], 10);
    if (args[i] === '--post' && args[i + 1]) specificPost = args[i + 1];
    if (args[i] === '--resume') resume = true;
    if (args[i] === '--local') {
      local = true;
      // Check if next arg is a path (not another flag)
      if (args[i + 1] && !args[i + 1].startsWith('--')) localDir = args[i + 1];
    }
    if (args[i] === '--skip-upload') skipUpload = true;
    if (args[i] === '--no-bgm') noBgm = true;
    if (args[i] === '--bgm-volume' && args[i + 1]) bgmVolume = parseFloat(args[i + 1]);
    if (args[i] === '--template' && args[i + 1]) templateId = args[i + 1];
    if (args[i] === '--format' && args[i + 1]) format = args[i + 1];
    if (args[i] === '--key' && args[i + 1]) key = args[i + 1];
  }

  if (!nicheId) {
    console.log('Usage:');
    console.log('  npx tsx content/batch-render.ts --niche <niche-id>              # batch');
    console.log('  npx tsx content/batch-render.ts --niche <id> --key <s3-key>     # single');
    console.log('  npx tsx content/batch-render.ts --niche <id> --local <dir>      # single local');
    console.log('');
    console.log('Batch options:');
    console.log('  --start N / --end N    Range (1-indexed)');
    console.log('  --post <id>            Single post by ID');
    console.log('  --resume               Skip already-done posts');
    console.log('  --local                Skip MinIO download');
    console.log('');
    console.log('Common options:');
    console.log('  --template <id>        Override template');
    console.log('  --format <fmt>         story | post | landscape');
    console.log('  --skip-upload          Don\'t upload to MinIO');
    console.log('  --no-bgm              Skip background music');
    console.log('  --bgm-volume <0-1>     BGM volume (default 0.35)');
    console.log('');
    console.log('Available niches:');
    for (const [id, niche] of Object.entries(niches)) {
      console.log(`  ${id.padEnd(20)} ${niche.name} [${niche.languages.join(',')}]`);
    }
    process.exit(1);
  }

  const niche = niches[nicheId];
  if (!niche) {
    console.error(`Unknown niche: ${nicheId}`);
    process.exit(1);
  }

  // Single-post mode
  if (key || localDir) {
    await runSinglePost({
      nicheId,
      key: key || undefined,
      localDir: localDir || undefined,
      templateId: templateId || undefined,
      format: format || undefined,
      skipUpload,
      noBgm,
      bgmVolume,
    });
    return;
  }

  // Batch mode — load scripts file
  const scriptsFile = path.join(CONTENT_DIR, `scripts-${nicheId}.json`);
  if (!fs.existsSync(scriptsFile)) {
    console.error(`Scripts file not found: ${scriptsFile}`);
    console.error(`Run: npx tsx content/generate-content.ts --niche ${nicheId}`);
    process.exit(1);
  }

  const allScripts: ScriptPost[] = JSON.parse(fs.readFileSync(scriptsFile, 'utf-8'));
  const progress = loadProgress(nicheId);
  const bgmFiles = getBGMFiles(nicheId);
  const effectiveTemplate = templateId || niche.defaultTemplateId;
  const effectiveFormat = format || niche.defaultFormat;

  // Filter
  let scripts: ScriptPost[];
  if (specificPost) {
    scripts = allScripts.filter((s) => s.postId === specificPost);
    if (scripts.length === 0) {
      console.error(`Post not found: ${specificPost}`);
      process.exit(1);
    }
  } else {
    scripts = allScripts.slice(start, end);
  }

  if (resume) {
    scripts = scripts.filter((s) => progress[s.postId]?.status !== 'done');
  }

  const doneCount = Object.values(progress).filter((p) => p.status === 'done').length;
  const failedCount = Object.values(progress).filter((p) => p.status === 'failed').length;

  console.log('═══════════════════════════════════════════════');
  console.log('  BATCH RENDER PIPELINE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Niche:        ${niche.name} (${nicheId})`);
  console.log(`  Template:     ${effectiveTemplate}`);
  console.log(`  Format:       ${effectiveFormat}`);
  console.log(`  Total:        ${allScripts.length}`);
  console.log(`  Done:         ${doneCount}`);
  console.log(`  Failed:       ${failedCount}`);
  console.log(`  To process:   ${scripts.length}`);
  console.log(`  BGM:          ${bgmFiles.length} tracks (vol=${bgmVolume})`);
  console.log(`  Mode:         ${local ? 'local' : 'MinIO'} | ${skipUpload ? 'no upload' : 'upload'} | ${noBgm ? 'no BGM' : 'BGM'}`);
  console.log('═══════════════════════════════════════════════\n');

  if (scripts.length === 0) {
    console.log('Nothing to process!');
    return;
  }

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    const pct = Math.round(((i + 1) / scripts.length) * 100);
    console.log(`\n[${i + 1}/${scripts.length}] (${pct}%) ${script.postId} — "${script.title}" [${script.theme}]`);

    const result = await processPost(script, {
      nicheId,
      templateId: effectiveTemplate,
      format: effectiveFormat,
      local,
      skipUpload,
      noBgm,
      bgmVolume,
      bgmFiles,
      postIndex: i,
      storagePrefix: niche.storagePrefix,
    });

    if (result.success) {
      okCount++;
      progress[script.postId] = { status: 'done', outputPath: result.outputPath, timestamp: new Date().toISOString() };
      const size = result.outputPath && fs.existsSync(result.outputPath)
        ? (fs.statSync(result.outputPath).size / 1024 / 1024).toFixed(1) : '?';
      console.log(`    Done! ${size} MB → ${result.outputPath}`);
    } else {
      failCount++;
      progress[script.postId] = { status: 'failed', error: result.error, timestamp: new Date().toISOString() };
      console.error(`    FAILED: ${result.error}`);
    }

    saveProgress(nicheId, progress);
  }

  // Summary
  const totalDone = Object.values(progress).filter((p) => p.status === 'done').length;
  const totalFailed = Object.values(progress).filter((p) => p.status === 'failed').length;
  const totalPending = allScripts.length - totalDone - totalFailed;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  BATCH COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  This run:  ${okCount} ok, ${failCount} failed`);
  console.log(`  Overall:   ${totalDone} done, ${totalFailed} failed, ${totalPending} pending`);
  console.log(`  Progress:  ${progressFile(nicheId)}`);
  if (totalFailed > 0) {
    console.log('\n  Failed:');
    for (const [id, entry] of Object.entries(progress)) {
      if (entry.status === 'failed') console.log(`    ${id}: ${entry.error}`);
    }
    console.log(`\n  Retry: npx tsx content/batch-render.ts --niche ${nicheId} --resume`);
  }
  console.log('═══════════════════════════════════════════════');
}

main().catch((err) => {
  console.error(`\nPipeline error: ${err.message}`);
  process.exit(1);
});
