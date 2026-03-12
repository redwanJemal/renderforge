#!/usr/bin/env npx tsx
/**
 * Audio Splitter
 *
 * Takes a full.wav + splits.json → ffmpeg splits into named segment WAVs.
 * Template-agnostic: segment keys can match any niche's expected sections.
 *
 * Usage:
 *   npx tsx content/audio-split.ts --dir content/audio/motivation1
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SplitSegment {
  key: string;
  start: number;
  end: number;
}

export interface SplitsConfig {
  segments: SplitSegment[];
}

export function splitAudio(audioDir: string): string[] {
  const splitsPath = path.join(audioDir, 'splits.json');
  const fullAudio = path.join(audioDir, 'full.wav');

  if (!fs.existsSync(splitsPath)) {
    throw new Error(`No splits.json found in ${audioDir}`);
  }
  if (!fs.existsSync(fullAudio)) {
    throw new Error(`No full.wav found in ${audioDir}`);
  }

  const config: SplitsConfig = JSON.parse(fs.readFileSync(splitsPath, 'utf-8'));
  const outputFiles: string[] = [];

  console.log(`  Splitting ${path.basename(audioDir)}/full.wav into ${config.segments.length} segments...`);

  for (const seg of config.segments) {
    const outputPath = path.join(audioDir, `${seg.key}.wav`);
    const cmd = `ffmpeg -y -i "${fullAudio}" -ss ${seg.start} -to ${seg.end} -c copy "${outputPath}"`;

    try {
      execSync(cmd, { stdio: 'pipe' });
      const duration = seg.end - seg.start;
      console.log(`    ${seg.key}.wav (${duration.toFixed(1)}s)`);
      outputFiles.push(outputPath);
    } catch (err: any) {
      console.error(`    Failed to split ${seg.key}: ${err.stderr?.toString().slice(-200) || err.message}`);
    }
  }

  console.log(`  Split complete: ${outputFiles.length}/${config.segments.length} segments`);
  return outputFiles;
}

// ── CLI ──────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let dir: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) dir = args[i + 1];
  }

  if (!dir) {
    console.log('Usage: npx tsx content/audio-split.ts --dir <audio-directory>');
    console.log('');
    console.log('Expects:');
    console.log('  <dir>/full.wav     — Full narration audio');
    console.log('  <dir>/splits.json  — Segment definitions { segments: [{ key, start, end }] }');
    process.exit(1);
  }

  splitAudio(dir);
}

if (require.main === module) {
  main();
}
