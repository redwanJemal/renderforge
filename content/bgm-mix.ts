#!/usr/bin/env npx tsx
/**
 * Background Music Mixer
 *
 * Adds looped background music at a low volume under existing video audio,
 * with a fade-out at the end.
 *
 * Usage:
 *   npx tsx content/bgm-mix.ts --video output/rendered/my-video.mp4 --bgm content/audio/bgm/motivational/chill.mp3
 *   npx tsx content/bgm-mix.ts --video output/rendered/my-video.mp4 --bgm bgm.mp3 --volume 0.08 --fade 3
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface MixBGMOptions {
  videoPath: string;
  bgmPath: string;
  outputPath?: string;  // defaults to videoPath with -bgm suffix
  bgmVolume?: number;   // 0-1 scale, default 0.06 (~-24dB)
  fadeOutDuration?: number; // seconds, default 3
}

/**
 * Get video duration in seconds via ffprobe.
 */
function getVideoDuration(videoPath: string): number {
  const result = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
    { encoding: 'utf-8' },
  ).trim();
  return parseFloat(result);
}

/**
 * Mix background music into a video.
 * BGM is looped to fill the video length and faded out at the end.
 * Original video audio is preserved at full volume.
 */
export function mixBGM(opts: MixBGMOptions): string {
  const { videoPath, bgmPath, bgmVolume = 0.06, fadeOutDuration = 3 } = opts;
  const outputPath = opts.outputPath || videoPath.replace(/\.mp4$/, '-bgm.mp4');

  if (!fs.existsSync(videoPath)) throw new Error(`Video not found: ${videoPath}`);
  if (!fs.existsSync(bgmPath)) throw new Error(`BGM not found: ${bgmPath}`);

  const duration = getVideoDuration(videoPath);
  const fadeStart = Math.max(0, duration - fadeOutDuration);

  // Filter chain:
  // 1. Loop BGM, set volume, trim to video length, fade out at end
  // 2. Mix with original audio
  const filterComplex = [
    `[1:a]aloop=loop=-1:size=2e+09,volume=${bgmVolume},atrim=0:${duration.toFixed(2)},afade=t=out:st=${fadeStart.toFixed(2)}:d=${fadeOutDuration}[bgm]`,
    `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
  ].join(';');

  const cmd = [
    'ffmpeg -y',
    `-i "${videoPath}"`,
    `-stream_loop -1 -i "${bgmPath}"`,
    `-filter_complex "${filterComplex}"`,
    '-map 0:v -map "[aout]"',
    '-c:v copy -c:a aac -ar 44100 -ac 2 -b:a 128k',
    `"${outputPath}"`,
  ].join(' ');

  console.log(`  Mixing BGM (vol=${bgmVolume}, fade=${fadeOutDuration}s)...`);
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 120_000 });
    const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
    console.log(`  BGM mixed: ${sizeMB} MB → ${outputPath}`);
    return outputPath;
  } catch (err: any) {
    throw new Error(`BGM mix failed: ${err.stderr?.toString().slice(-300) || err.message}`);
  }
}

// ── CLI ──────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let video: string | null = null;
  let bgm: string | null = null;
  let output: string | null = null;
  let volume = 0.06;
  let fade = 3;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--video' && args[i + 1]) video = args[i + 1];
    if (args[i] === '--bgm' && args[i + 1]) bgm = args[i + 1];
    if (args[i] === '--output' && args[i + 1]) output = args[i + 1];
    if (args[i] === '--volume' && args[i + 1]) volume = parseFloat(args[i + 1]);
    if (args[i] === '--fade' && args[i + 1]) fade = parseFloat(args[i + 1]);
  }

  if (!video || !bgm) {
    console.log('Usage: npx tsx content/bgm-mix.ts --video <path> --bgm <path> [--output <path>] [--volume 0.06] [--fade 3]');
    process.exit(1);
  }

  mixBGM({ videoPath: video, bgmPath: bgm, outputPath: output || undefined, bgmVolume: volume, fadeOutDuration: fade });
}

if (require.main === module) {
  main();
}
