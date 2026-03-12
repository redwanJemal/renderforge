#!/usr/bin/env npx tsx
/**
 * Universal Manifest Renderer
 *
 * Reads a frame manifest (from audio-ingest.ts), maps audio segments
 * to template props using niche config, renders video, and merges audio.
 *
 * This replaces template-specific sync logic with a data-driven pipeline
 * that works for any niche/template combination.
 *
 * Usage:
 *   npx tsx content/render-manifest.ts --dir content/audio/alphabet-af --niche kids-education
 *   npx tsx content/render-manifest.ts --dir content/audio/alphabet-af --niche kids-education --template kids-alphabet-adventure
 *   npx tsx content/render-manifest.ts --dir content/audio/day01-post1 --niche motivational --format story
 *   npx tsx content/render-manifest.ts --dir ./audio --niche kids-bedtime --props '{"title":"My Custom Story"}'
 *   npx tsx content/render-manifest.ts --manifest path/to/manifest.json --niche news
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { FrameManifest, ManifestSegment } from './audio-ingest';
import { generateManifest } from './audio-ingest';
import { niches, getNicheTemplate, customTransforms, type NicheTemplate, type PropMapping } from './niches';

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output', 'rendered');
const FPS = 30;

const FORMATS: Record<string, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 },
};

// ──────────────────────────────────────────────
// PROP MAPPING ENGINE
// ──────────────────────────────────────────────

/**
 * Set a value on a nested object using dot-notation path.
 * Supports array index syntax: "sections[i].startFrame" where i is resolved from segmentIndex.
 */
function setNestedProp(obj: Record<string, any>, dotPath: string, value: any, segmentIndex?: number): void {
  const resolvedPath = dotPath.replace(/\[i\]/g, segmentIndex !== undefined ? `[${segmentIndex}]` : '[0]');

  const parts = resolvedPath.split(/\.|\[|\]/).filter(Boolean);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = /^\d+$/.test(parts[i]) ? parseInt(parts[i], 10) : parts[i];
    if (current[key] === undefined) {
      current[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    current = current[key];
  }

  const lastKey = /^\d+$/.test(parts[parts.length - 1])
    ? parseInt(parts[parts.length - 1], 10)
    : parts[parts.length - 1];
  current[lastKey] = value;
}

/**
 * Match a manifest segment key against a mapping pattern.
 * Patterns: "intro" (exact), "slide*" (prefix wildcard), "letter*", etc.
 * Returns the numeric index if pattern has wildcard, or undefined.
 */
function matchPattern(key: string, pattern: string): { match: boolean; index?: number } {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    if (key.startsWith(prefix)) {
      const numStr = key.slice(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        return { match: true, index: num - 1 }; // 0-indexed
      }
    }
    return { match: false };
  }
  return { match: key === pattern };
}

/**
 * Apply niche prop mappings to transform a manifest into template props.
 */
function applyMappings(
  manifest: FrameManifest,
  nicheTemplate: NicheTemplate,
  baseProps: Record<string, any>,
): { props: Record<string, any>; totalFrames: number } {
  const props = JSON.parse(JSON.stringify(baseProps));
  let currentFrame = 0;

  // Apply prop overrides from niche config
  if (nicheTemplate.propOverrides) {
    Object.assign(props, JSON.parse(JSON.stringify(nicheTemplate.propOverrides)));
  }

  for (const segment of manifest.segments) {
    // Find matching mapping
    let matched = false;

    for (const mapping of nicheTemplate.mappings) {
      const result = matchPattern(segment.key, mapping.segmentPattern);
      if (!result.match) continue;
      matched = true;

      if (mapping.customTransform) {
        const transform = customTransforms[mapping.customTransform];
        if (transform) {
          transform(segment.startFrame, segment.frames, props, result.index);
        } else {
          console.warn(`  Warning: custom transform '${mapping.customTransform}' not found`);
        }
      } else {
        // Standard mapping
        if (mapping.startFramePath) {
          setNestedProp(props, mapping.startFramePath, segment.startFrame, result.index);
        }
        if (mapping.durationFramesPath) {
          setNestedProp(props, mapping.durationFramesPath, segment.frames, result.index);
        }
        if (mapping.durationOnlyPath) {
          setNestedProp(props, mapping.durationOnlyPath, segment.frames);
        }
      }

      currentFrame = segment.endFrame;
      break;
    }

    if (!matched) {
      console.warn(`  Warning: no mapping for segment '${segment.key}'`);
      currentFrame = segment.endFrame;
    }
  }

  // Compute total frames
  let totalFrames: number;

  if (nicheTemplate.totalFramesStrategy === 'slider-formula') {
    const introFrames = props.intro?.durationFrames || 70;
    const numSlides = (props.slides || []).length;
    const slideFrames = numSlides * (props.framesPerSlide || 140);
    const transitionFrames = Math.max(0, numSlides - 1) * (props.transitionFrames || 25);
    const outroFrames = props.outro?.durationFrames || 80;
    totalFrames = introFrames + slideFrames - transitionFrames + outroFrames;
  } else {
    // sum-sequential
    totalFrames = currentFrame + nicheTemplate.trailingHoldFrames;
  }

  return { props, totalFrames };
}

// ──────────────────────────────────────────────
// RENDER + MERGE
// ──────────────────────────────────────────────

function renderVideo(
  compositionId: string,
  syncedProps: Record<string, any>,
  totalFrames: number,
  format: string,
  outputPath: string,
): boolean {
  const propsJson = JSON.stringify(syncedProps);
  const { width, height } = FORMATS[format] || FORMATS.story;
  const frameRange = `0-${totalFrames - 1}`;
  const videoOnly = outputPath.replace(/\.mp4$/, '-video.mp4');

  const cmd = `npx remotion render ${compositionId} --frames=${frameRange} --width=${width} --height=${height} --props='${propsJson.replace(/'/g, "'\\''")}' "${videoOnly}"`;

  try {
    console.log(`    Rendering ${totalFrames} frames (${(totalFrames / FPS).toFixed(1)}s) → ${compositionId}...`);
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 600_000 });
    return true;
  } catch (err: any) {
    console.error(`    Render failed: ${err.stderr?.toString().slice(-300) || err.message}`);
    return false;
  }
}

function mergeAudio(
  manifest: FrameManifest,
  videoOutputPath: string,
  finalOutputPath: string,
): boolean {
  const videoOnly = videoOutputPath.replace(/\.mp4$/, '-video.mp4');

  // Check for full narration file
  const fullAudio = path.join(manifest.sourceDir, 'full.wav');
  let audioPath: string;

  if (fs.existsSync(fullAudio)) {
    audioPath = fullAudio;
  } else {
    // Concatenate segment audio
    const concatList = path.join(manifest.sourceDir, 'concat.txt');
    const lines = manifest.segments.map((s) => `file '${s.file}'`);
    fs.writeFileSync(concatList, lines.join('\n'));

    audioPath = path.join(manifest.sourceDir, 'combined.wav');
    try {
      execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${audioPath}"`, { stdio: 'pipe' });
    } catch (err: any) {
      console.error(`    Audio concat failed: ${err.stderr?.toString().slice(-200) || err.message}`);
      return false;
    }
  }

  try {
    // Pre-convert audio to 44.1kHz stereo AAC (Qwen TTS outputs 24kHz mono
    // which causes near-silent output with ffmpeg's native AAC encoder)
    const audioAAC = audioPath.replace(/\.\w+$/, '-resampled.m4a');
    console.log('    Converting audio to AAC...');
    execSync(
      `ffmpeg -y -i "${audioPath}" -ar 44100 -ac 2 -c:a aac -b:a 128k "${audioAAC}"`,
      { stdio: 'pipe', timeout: 60_000 },
    );

    console.log('    Merging audio + video...');
    execSync(
      `ffmpeg -y -i "${videoOnly}" -i "${audioAAC}" -c:v copy -c:a copy -shortest "${finalOutputPath}"`,
      { stdio: 'pipe', timeout: 120_000 },
    );
    // Cleanup temp AAC
    if (fs.existsSync(audioAAC)) fs.unlinkSync(audioAAC);
    // Cleanup temp video-only file
    if (fs.existsSync(videoOnly)) fs.unlinkSync(videoOnly);
    return true;
  } catch (err: any) {
    console.error(`    Merge failed: ${err.stderr?.toString().slice(-200) || err.message}`);
    return false;
  }
}

// ──────────────────────────────────────────────
// COMPOSITION ID RESOLUTION
// ──────────────────────────────────────────────

function resolveCompositionId(templateId: string, format: string): string {
  // Special cases for legacy templates
  if (templateId === 'slider') {
    if (format === 'story') return 'slider';
    if (format === 'landscape') return 'slider-landscape';
    return 'slider-square';
  }
  if (templateId === 'yld-intro') return 'yld-intro';

  // Registry templates use: {templateId}-{format}
  return `${templateId}-${format}`;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let dir: string | null = null;
  let manifestPath: string | null = null;
  let nicheId: string | null = null;
  let templateId: string | null = null;
  let format: string | null = null;
  let propsOverride: string | null = null;
  let syncOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) dir = args[i + 1];
    if (args[i] === '--manifest' && args[i + 1]) manifestPath = args[i + 1];
    if (args[i] === '--niche' && args[i + 1]) nicheId = args[i + 1];
    if (args[i] === '--template' && args[i + 1]) templateId = args[i + 1];
    if (args[i] === '--format' && args[i + 1]) format = args[i + 1];
    if (args[i] === '--props' && args[i + 1]) propsOverride = args[i + 1];
    if (args[i] === '--sync-only') syncOnly = true;
  }

  if (!nicheId) {
    console.log('Usage:');
    console.log('  npx tsx content/render-manifest.ts --dir <audio-dir> --niche <niche-id>');
    console.log('  npx tsx content/render-manifest.ts --manifest <path> --niche <niche-id>');
    console.log('');
    console.log('Options:');
    console.log('  --template <id>    Override template (default: niche default)');
    console.log('  --format <fmt>     story | post | landscape (default: niche default)');
    console.log('  --props \'{}\'       JSON props to merge on top of defaults');
    console.log('  --sync-only        Only generate synced props, skip render');
    console.log('');
    console.log('Available niches:');
    for (const [id, niche] of Object.entries(niches)) {
      const templates = niche.templates.map((t) => t.templateId).join(', ');
      console.log(`  ${id.padEnd(20)} ${niche.name} (${templates})`);
    }
    process.exit(1);
  }

  const niche = niches[nicheId];
  if (!niche) {
    console.error(`Unknown niche: ${nicheId}`);
    console.error(`Available: ${Object.keys(niches).join(', ')}`);
    process.exit(1);
  }

  // Resolve template
  const effectiveTemplateId = templateId || niche.defaultTemplateId;
  const nicheTemplate = getNicheTemplate(nicheId, effectiveTemplateId);
  if (!nicheTemplate) {
    console.error(`Template '${effectiveTemplateId}' not configured for niche '${nicheId}'`);
    console.error(`Available: ${niche.templates.map((t) => t.templateId).join(', ')}`);
    process.exit(1);
  }

  const effectiveFormat = format || niche.defaultFormat;

  // Load or generate manifest
  let manifest: FrameManifest | null = null;

  if (manifestPath) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } else if (dir) {
    // Check for existing manifest
    const existingManifest = path.join(dir, 'manifest.json');
    if (fs.existsSync(existingManifest)) {
      manifest = JSON.parse(fs.readFileSync(existingManifest, 'utf-8'));
      console.log('  Using existing manifest.json');
    } else {
      console.log('  Generating manifest...');
      manifest = generateManifest(dir);
    }
  }

  if (!manifest || manifest.segments.length === 0) {
    console.error('No audio segments found. Run audio-ingest.ts first or provide --dir with audio files.');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  UNIVERSAL MANIFEST RENDERER');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Project:  ${manifest.projectId}`);
  console.log(`  Niche:    ${niche.name} (${nicheId})`);
  console.log(`  Template: ${effectiveTemplateId}`);
  console.log(`  Format:   ${effectiveFormat}`);
  console.log(`  Voice:    ${niche.voiceId}`);
  console.log(`  Segments: ${manifest.segments.length}`);
  console.log(`  Audio:    ${manifest.totalAudioDuration.toFixed(1)}s`);
  console.log(`  Mode:     ${syncOnly ? 'sync-only' : 'sync + render + merge'}`);
  console.log('═══════════════════════════════════════════════\n');

  // Show segments
  for (const seg of manifest.segments) {
    console.log(`  ${seg.key}: ${seg.audioDuration.toFixed(2)}s → ${seg.frames}f (${seg.startFrame}-${seg.endFrame})`);
  }

  // Get template default props (we import dynamically since templates self-register)
  // For now, use an empty props base — the render will use composition defaults
  let baseProps: Record<string, any> = {};

  // Merge user props override
  if (propsOverride) {
    try {
      const override = JSON.parse(propsOverride);
      Object.assign(baseProps, override);
    } catch {
      console.error('Invalid --props JSON');
      process.exit(1);
    }
  }

  // Apply prop mappings
  console.log('\n  Applying prop mappings...');
  const { props: syncedProps, totalFrames } = applyMappings(manifest, nicheTemplate, baseProps);

  console.log(`  Total frames: ${totalFrames} (${(totalFrames / FPS).toFixed(1)}s video)`);

  // Save synced props
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const syncedPath = path.join(OUTPUT_DIR, `${manifest.projectId}-synced.json`);
  fs.writeFileSync(syncedPath, JSON.stringify({
    manifest,
    niche: nicheId,
    template: effectiveTemplateId,
    format: effectiveFormat,
    syncedProps,
    totalFrames,
  }, null, 2));
  console.log(`  Synced props → ${syncedPath}`);

  if (syncOnly) {
    console.log('\n  Sync-only mode — skipping render.');
    return;
  }

  // Render
  const compositionId = resolveCompositionId(effectiveTemplateId, effectiveFormat);
  const outputPath = path.join(OUTPUT_DIR, `${manifest.projectId}-${effectiveFormat}.mp4`);

  const renderOk = renderVideo(compositionId, syncedProps, totalFrames, effectiveFormat, outputPath);
  if (!renderOk) {
    console.error('\n  Render failed!');
    process.exit(1);
  }

  // Merge audio
  const mergeOk = mergeAudio(manifest, outputPath, outputPath);
  if (mergeOk) {
    const size = fs.existsSync(outputPath)
      ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)
      : '?';
    console.log(`\n  Done! ${size} MB → ${outputPath}`);
  } else {
    console.error('\n  Audio merge failed!');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  RENDER COMPLETE');
  console.log('═══════════════════════════════════════════════');
}

main();
