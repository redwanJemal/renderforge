#!/usr/bin/env npx tsx
/**
 * Universal Audio Ingestion
 *
 * Takes a directory of audio files, measures durations via ffprobe,
 * and produces a template-agnostic frame manifest (JSON).
 *
 * The frame manifest is the universal glue between TTS audio and
 * the video render pipeline — it works for any niche/template.
 *
 * Usage:
 *   npx tsx content/audio-ingest.ts --dir content/audio/alphabet-af
 *   npx tsx content/audio-ingest.ts --all                            # all subdirs
 *   npx tsx content/audio-ingest.ts --dir ./audio --fps 30
 *   npx tsx content/audio-ingest.ts --dir ./audio --pad-before 15 --pad-after 20
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

export interface ManifestSegment {
  key: string;
  file: string;
  audioDuration: number;   // seconds
  frames: number;          // ceil(duration * fps) + padBefore + padAfter
  startFrame: number;      // cumulative start position
  endFrame: number;        // startFrame + frames
}

export interface FrameManifest {
  version: 1;
  projectId: string;       // directory name
  sourceDir: string;
  createdAt: string;
  fps: number;
  padding: {
    before: number;
    after: number;
    transition: number;
  };
  segments: ManifestSegment[];
  totalAudioDuration: number;
  totalFrames: number;
}

// ──────────────────────────────────────────────
// AUDIO MEASUREMENT
// ──────────────────────────────────────────────

function getAudioDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf-8' }
    ).trim();
    return parseFloat(result);
  } catch {
    console.error(`  Failed to read duration: ${filePath}`);
    return 0;
  }
}

// ──────────────────────────────────────────────
// SEGMENT ORDERING
// ──────────────────────────────────────────────

/**
 * Universal segment sorter.
 * - "intro" always first
 * - "outro" always last
 * - Everything else sorted by prefix then numeric suffix
 */
function sortSegmentKeys(a: string, b: string): number {
  if (a === 'intro') return -1;
  if (b === 'intro') return 1;
  if (a === 'outro') return 1;
  if (b === 'outro') return -1;

  // Extract prefix and number
  const matchA = a.match(/^([a-z_]+?)(\d+)$/);
  const matchB = b.match(/^([a-z_]+?)(\d+)$/);

  if (matchA && matchB) {
    // Same prefix: sort by number
    if (matchA[1] === matchB[1]) {
      return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
    }
    // Different prefix: alphabetical
    return matchA[1].localeCompare(matchB[1]);
  }

  // Non-numbered segments: alphabetical
  return a.localeCompare(b);
}

// ──────────────────────────────────────────────
// MANIFEST GENERATION
// ──────────────────────────────────────────────

export function generateManifest(
  audioDir: string,
  opts: { fps?: number; padBefore?: number; padAfter?: number; transitionPad?: number } = {},
): FrameManifest | null {
  const fps = opts.fps ?? 30;
  const padBefore = opts.padBefore ?? 15;
  const padAfter = opts.padAfter ?? 20;
  const transitionPad = opts.transitionPad ?? 10;

  if (!fs.existsSync(audioDir)) {
    console.error(`Directory not found: ${audioDir}`);
    return null;
  }

  const files = fs.readdirSync(audioDir)
    .filter((f) => /\.(wav|mp3|ogg|m4a|flac)$/i.test(f))
    .filter((f) => !['full.wav', 'combined.wav', 'concat.txt'].includes(f));

  if (files.length === 0) {
    return null;
  }

  // Extract keys
  const fileMap = new Map<string, string>();
  for (const f of files) {
    const key = path.basename(f, path.extname(f));
    fileMap.set(key, path.resolve(audioDir, f));
  }

  // Use splits.json order if available, fall back to alphabetical sort
  let sortedKeys: string[];
  const splitsPath = path.join(audioDir, 'splits.json');
  if (fs.existsSync(splitsPath)) {
    try {
      const splits = JSON.parse(fs.readFileSync(splitsPath, 'utf-8'));
      if (Array.isArray(splits.segments)) {
        const splitsOrder = splits.segments.map((s: { key: string }) => s.key);
        // Use splits order for keys that exist, append any extras alphabetically
        sortedKeys = splitsOrder.filter((k: string) => fileMap.has(k));
        const extras = Array.from(fileMap.keys()).filter((k) => !splitsOrder.includes(k)).sort(sortSegmentKeys);
        sortedKeys.push(...extras);
      } else {
        sortedKeys = Array.from(fileMap.keys()).sort(sortSegmentKeys);
      }
    } catch {
      sortedKeys = Array.from(fileMap.keys()).sort(sortSegmentKeys);
    }
  } else {
    sortedKeys = Array.from(fileMap.keys()).sort(sortSegmentKeys);
  }

  // Build segments with timing
  const segments: ManifestSegment[] = [];
  let cursor = 0;
  let totalAudioDuration = 0;

  for (const key of sortedKeys) {
    const file = fileMap.get(key)!;
    const audioDuration = getAudioDuration(file);
    const frames = Math.ceil(audioDuration * fps) + padBefore + padAfter;

    segments.push({
      key,
      file,
      audioDuration,
      frames,
      startFrame: cursor,
      endFrame: cursor + frames,
    });

    totalAudioDuration += audioDuration;
    cursor += frames + transitionPad;
  }

  const projectId = path.basename(audioDir);
  const totalFrames = cursor + 30; // trailing hold

  const manifest: FrameManifest = {
    version: 1,
    projectId,
    sourceDir: path.resolve(audioDir),
    createdAt: new Date().toISOString(),
    fps,
    padding: {
      before: padBefore,
      after: padAfter,
      transition: transitionPad,
    },
    segments,
    totalAudioDuration,
    totalFrames,
  };

  return manifest;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let dir: string | null = null;
  let all = false;
  let fps = 30;
  let padBefore = 15;
  let padAfter = 20;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) dir = args[i + 1];
    if (args[i] === '--all') all = true;
    if (args[i] === '--fps' && args[i + 1]) fps = parseInt(args[i + 1], 10);
    if (args[i] === '--pad-before' && args[i + 1]) padBefore = parseInt(args[i + 1], 10);
    if (args[i] === '--pad-after' && args[i + 1]) padAfter = parseInt(args[i + 1], 10);
  }

  if (!dir && !all) {
    console.log('Usage:');
    console.log('  npx tsx content/audio-ingest.ts --dir <audio-directory>');
    console.log('  npx tsx content/audio-ingest.ts --all');
    console.log('');
    console.log('Options:');
    console.log('  --fps N            Frame rate (default: 30)');
    console.log('  --pad-before N     Frames before audio (default: 15)');
    console.log('  --pad-after N      Frames after audio (default: 20)');
    process.exit(1);
  }

  const dirs: string[] = [];

  if (all) {
    const audioRoot = path.join(__dirname, 'audio');
    if (!fs.existsSync(audioRoot)) {
      console.error(`Audio directory not found: ${audioRoot}`);
      process.exit(1);
    }
    const entries = fs.readdirSync(audioRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'voices') {
        dirs.push(path.join(audioRoot, entry.name));
      }
    }
  } else {
    dirs.push(path.resolve(dir!));
  }

  if (dirs.length === 0) {
    console.error('No audio directories found.');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  AUDIO INGESTION — Frame Manifest Generator');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Directories: ${dirs.length}`);
  console.log(`  FPS: ${fps}  Pad: ${padBefore}f before, ${padAfter}f after`);
  console.log('═══════════════════════════════════════════════\n');

  let total = 0;

  for (const audioDir of dirs) {
    const manifest = generateManifest(audioDir, { fps, padBefore, padAfter });

    if (!manifest) {
      console.log(`  [${path.basename(audioDir)}] No audio files found, skipping.`);
      continue;
    }

    // Write manifest
    const manifestPath = path.join(audioDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`  [${manifest.projectId}] ${manifest.segments.length} segments, ${manifest.totalAudioDuration.toFixed(1)}s audio, ${manifest.totalFrames} frames (${(manifest.totalFrames / fps).toFixed(1)}s video)`);
    for (const seg of manifest.segments) {
      console.log(`    ${seg.key}: ${seg.audioDuration.toFixed(2)}s → ${seg.frames}f (${seg.startFrame}-${seg.endFrame})`);
    }

    total++;
  }

  console.log(`\n  Manifests generated: ${total}`);
  console.log('═══════════════════════════════════════════════');
}

// Only run main when executed directly (not imported)
const isDirectRun = process.argv[1]?.includes('audio-ingest');
if (isDirectRun) {
  main();
}
