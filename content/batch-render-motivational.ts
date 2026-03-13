#!/usr/bin/env npx tsx
/**
 * Batch Render Pipeline for Motivational Content
 *
 * Processes all posts after TTS audio is on MinIO.
 * Per-post: download → estimate timestamps → split → manifest → render → BGM → upload
 *
 * Reuses existing pipeline modules (storage, audio-split, audio-ingest, render-manifest, bgm-mix).
 *
 * Usage:
 *   npx tsx content/batch-render-motivational.ts                      # all
 *   npx tsx content/batch-render-motivational.ts --start 1 --end 50   # range (1-indexed)
 *   npx tsx content/batch-render-motivational.ts --post mot-042       # single post
 *   npx tsx content/batch-render-motivational.ts --resume              # skip already done
 *   npx tsx content/batch-render-motivational.ts --local               # skip MinIO download
 *   npx tsx content/batch-render-motivational.ts --skip-upload         # don't upload result
 *   npx tsx content/batch-render-motivational.ts --no-bgm              # skip BGM mixing
 *   npx tsx content/batch-render-motivational.ts --bgm-volume 0.25     # custom BGM volume
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { downloadFile, uploadFile } from './storage';
import { splitAudio } from './audio-split';
import { generateManifest } from './audio-ingest';
import { renderFromManifest } from './render-manifest';
import { mixBGM } from './bgm-mix';

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────

const CONTENT_DIR = __dirname;
const AUDIO_BASE = path.join(CONTENT_DIR, 'audio');
const BGM_DIR = path.join(AUDIO_BASE, 'bgm', 'motivational');
const SCRIPTS_FILE = path.join(CONTENT_DIR, 'scripts-motivational.json');
const PROGRESS_FILE = path.join(CONTENT_DIR, 'batch-progress.json');
const MINIO_PREFIX = 'motivational';
const NICHE_ID = 'motivational';
const TEMPLATE_ID = 'motivational-narration';
const FORMAT = 'story';

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
// PROGRESS TRACKING
// ──────────────────────────────────────────────

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {};
}

function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ──────────────────────────────────────────────
// AUDIO DURATION
// ──────────────────────────────────────────────

function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf-8' },
    ).trim();
    return parseFloat(result);
  } catch {
    return 0;
  }
}

// ──────────────────────────────────────────────
// TIMESTAMP ESTIMATION
// ──────────────────────────────────────────────

/**
 * Estimate segment timestamps from total audio duration,
 * distributing proportionally by word count per section.
 */
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

// ──────────────────────────────────────────────
// BGM ROTATION
// ──────────────────────────────────────────────

function getBGMFiles(): string[] {
  if (!fs.existsSync(BGM_DIR)) return [];
  return fs.readdirSync(BGM_DIR)
    .filter((f) => /\.(mp3|wav|aac|m4a)$/.test(f))
    .map((f) => path.join(BGM_DIR, f));
}

// ──────────────────────────────────────────────
// SINGLE POST PIPELINE
// ──────────────────────────────────────────────

async function processPost(
  script: ScriptPost,
  opts: {
    local: boolean;
    skipUpload: boolean;
    noBgm: boolean;
    bgmVolume: number;
    bgmFiles: string[];
    postIndex: number;
  },
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  const audioDir = path.join(AUDIO_BASE, script.postId);
  const fullWavPath = path.join(audioDir, 'full.wav');
  const splitsPath = path.join(audioDir, 'splits.json');

  // Step 1: Ensure audio is available
  if (!opts.local) {
    const minioKey = `${MINIO_PREFIX}/${script.postId}/full.wav`;
    if (!fs.existsSync(fullWavPath)) {
      console.log(`    Downloading from MinIO: ${minioKey}`);
      try {
        await downloadFile(minioKey, fullWavPath);
      } catch (err: any) {
        return { success: false, error: `Download failed: ${err.message}` };
      }
    }
  }

  if (!fs.existsSync(fullWavPath)) {
    return { success: false, error: `No full.wav found at ${fullWavPath}` };
  }

  // Step 2: Estimate timestamps and update splits.json
  if (!fs.existsSync(splitsPath)) {
    return { success: false, error: `No splits.json found at ${splitsPath}` };
  }

  const splitsData = JSON.parse(fs.readFileSync(splitsPath, 'utf-8'));
  const totalDuration = getAudioDuration(fullWavPath);

  if (totalDuration <= 0) {
    return { success: false, error: 'Could not read audio duration' };
  }

  console.log(`    Audio: ${totalDuration.toFixed(1)}s`);

  // Check if timestamps are all zeros (need estimation)
  const needsEstimation = splitsData.segments.every(
    (s: { start: number; end: number }) => s.start === 0 && s.end === 0,
  );

  if (needsEstimation) {
    // Check for optional timestamps.json from Colab
    const timestampsPath = path.join(audioDir, 'timestamps.json');
    if (fs.existsSync(timestampsPath)) {
      const timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      splitsData.segments = timestamps;
      console.log('    Using timestamps.json from Colab');
    } else {
      // Estimate from word counts
      const estimated = estimateTimestamps(script.sections, totalDuration);
      splitsData.segments = estimated;
      console.log('    Estimated timestamps from word counts');
    }

    // Write updated splits.json
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
    return { success: false, error: 'No segments in manifest after split' };
  }

  console.log(`    ${manifest.segments.length} segments, ${manifest.totalFrames} frames (${(manifest.totalFrames / 30).toFixed(1)}s)`);

  // Step 5: Render video
  console.log('    Rendering video...');
  const contentProps = splitsData.props || {};
  const renderResult = renderFromManifest({
    manifest,
    nicheId: NICHE_ID,
    templateId: TEMPLATE_ID,
    format: FORMAT,
    propsOverride: contentProps,
  });

  if (!renderResult) {
    return { success: false, error: 'Render failed' };
  }

  let finalOutput = renderResult.outputPath;

  // Step 6: Mix BGM
  if (!opts.noBgm && opts.bgmFiles.length > 0) {
    const bgmFile = opts.bgmFiles[opts.postIndex % opts.bgmFiles.length];
    console.log(`    Mixing BGM: ${path.basename(bgmFile)}`);
    try {
      finalOutput = mixBGM({
        videoPath: renderResult.outputPath,
        bgmPath: bgmFile,
        bgmVolume: opts.bgmVolume,
      });
    } catch (err: any) {
      console.error(`    BGM mix failed: ${err.message} (continuing without BGM)`);
    }
  }

  // Step 7: Upload to MinIO
  if (!opts.skipUpload) {
    const uploadKey = `rendered/motivational/${script.postId}.mp4`;
    console.log(`    Uploading: ${uploadKey}`);
    try {
      await uploadFile(finalOutput, uploadKey);
    } catch (err: any) {
      console.error(`    Upload failed: ${err.message} (video saved locally)`);
    }
  }

  return { success: true, outputPath: finalOutput };
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let start = 0;
  let end = Infinity;
  let specificPost: string | null = null;
  let resume = false;
  let local = false;
  let skipUpload = false;
  let noBgm = false;
  let bgmVolume = 0.35;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) start = parseInt(args[i + 1], 10) - 1; // 1-indexed to 0-indexed
    if (args[i] === '--end' && args[i + 1]) end = parseInt(args[i + 1], 10);
    if (args[i] === '--post' && args[i + 1]) specificPost = args[i + 1];
    if (args[i] === '--resume') resume = true;
    if (args[i] === '--local') local = true;
    if (args[i] === '--skip-upload') skipUpload = true;
    if (args[i] === '--no-bgm') noBgm = true;
    if (args[i] === '--bgm-volume' && args[i + 1]) bgmVolume = parseFloat(args[i + 1]);
  }

  // Load scripts
  if (!fs.existsSync(SCRIPTS_FILE)) {
    console.error(`Scripts file not found: ${SCRIPTS_FILE}`);
    console.error('Run generate-motivational.ts first.');
    process.exit(1);
  }

  const allScripts: ScriptPost[] = JSON.parse(fs.readFileSync(SCRIPTS_FILE, 'utf-8'));
  const progress = loadProgress();
  const bgmFiles = getBGMFiles();

  // Filter posts
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

  // Apply resume filter
  if (resume) {
    scripts = scripts.filter((s) => progress[s.postId]?.status !== 'done');
  }

  // Stats
  const doneCount = Object.values(progress).filter((p) => p.status === 'done').length;
  const failedCount = Object.values(progress).filter((p) => p.status === 'failed').length;

  console.log('═══════════════════════════════════════════════');
  console.log('  MOTIVATIONAL BATCH RENDER PIPELINE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total scripts:    ${allScripts.length}`);
  console.log(`  Already done:     ${doneCount}`);
  console.log(`  Previously failed: ${failedCount}`);
  console.log(`  To process:       ${scripts.length}`);
  console.log(`  BGM tracks:       ${bgmFiles.length} (vol=${bgmVolume})`);
  console.log(`  Mode:             ${local ? 'local' : 'MinIO download'} | ${skipUpload ? 'no upload' : 'upload'} | ${noBgm ? 'no BGM' : 'BGM enabled'}`);
  console.log('═══════════════════════════════════════════════\n');

  if (scripts.length === 0) {
    console.log('Nothing to process. All done!');
    return;
  }

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    const pct = Math.round(((i + 1) / scripts.length) * 100);

    console.log(`\n[${i + 1}/${scripts.length}] (${pct}%) ${script.postId} — "${script.title}" [${script.theme}]`);

    const result = await processPost(script, {
      local,
      skipUpload,
      noBgm,
      bgmVolume,
      bgmFiles,
      postIndex: i,
    });

    if (result.success) {
      okCount++;
      progress[script.postId] = {
        status: 'done',
        outputPath: result.outputPath,
        timestamp: new Date().toISOString(),
      };

      const size = result.outputPath && fs.existsSync(result.outputPath)
        ? (fs.statSync(result.outputPath).size / 1024 / 1024).toFixed(1)
        : '?';
      console.log(`    Done! ${size} MB → ${result.outputPath}`);
    } else {
      failCount++;
      progress[script.postId] = {
        status: 'failed',
        error: result.error,
        timestamp: new Date().toISOString(),
      };
      console.error(`    FAILED: ${result.error}`);
    }

    saveProgress(progress);
  }

  // Final summary
  const totalDone = Object.values(progress).filter((p) => p.status === 'done').length;
  const totalFailed = Object.values(progress).filter((p) => p.status === 'failed').length;
  const totalPending = allScripts.length - totalDone - totalFailed;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  BATCH RENDER COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  This run:   ${okCount} ok, ${failCount} failed`);
  console.log(`  Overall:    ${totalDone} done, ${totalFailed} failed, ${totalPending} pending`);
  console.log(`  Progress:   ${PROGRESS_FILE}`);
  if (totalFailed > 0) {
    console.log('\n  Failed posts:');
    for (const [id, entry] of Object.entries(progress)) {
      if (entry.status === 'failed') {
        console.log(`    ${id}: ${entry.error}`);
      }
    }
    console.log('\n  Retry failed: npx tsx content/batch-render-motivational.ts --resume');
  }
  console.log('═══════════════════════════════════════════════');
}

main().catch((err) => {
  console.error(`\nPipeline error: ${err.message}`);
  process.exit(1);
});
