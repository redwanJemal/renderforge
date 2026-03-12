#!/usr/bin/env npx tsx
/**
 * Audio-Sync Pipeline
 *
 * Reads audio files from content/audio/{postId}/, measures their duration,
 * and generates audio-synced Remotion props with precise frame timings.
 *
 * Then renders the video and merges with audio using ffmpeg.
 *
 * Directory structure expected:
 *   content/audio/
 *   ├── day01-post1/
 *   │   ├── intro.wav
 *   │   ├── headline.wav     (YLD) or slide1.wav (Slider)
 *   │   ├── subheader.wav    (YLD) or slide2.wav (Slider)
 *   │   ├── badge.wav        (YLD) or slide3.wav (Slider)
 *   │   ├── cta.wav          (YLD) or slide4.wav (Slider)
 *   │   └── outro.wav        (Slider only)
 *   └── day01-post2/
 *       └── ...
 *
 * Usage:
 *   npx tsx content/audio-sync.ts --post day01-post1                # sync + render one post
 *   npx tsx content/audio-sync.ts --limit 5                         # sync + render first 5
 *   npx tsx content/audio-sync.ts --post day01-post1 --sync-only    # only generate synced props (no render)
 *   npx tsx content/audio-sync.ts --post day01-post1 --format story # specific format
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const PLAN_FILE = path.join(__dirname, 'content-plan.json');
const AUDIO_DIR = path.join(__dirname, 'audio');
const OUTPUT_DIR = path.join(ROOT, 'output');
const SYNCED_DIR = path.join(OUTPUT_DIR, 'synced');
const FPS = 30;

// Padding frames: extra frames before/after audio for smooth animation
const PAD_BEFORE = 15;  // 0.5s before audio starts
const PAD_AFTER = 20;   // ~0.67s after audio ends
const TRANSITION_PAD = 10; // extra frames between sections for transitions

interface Post {
  id: string;
  template: 'slider' | 'yld-intro' | 'kids-alphabet-adventure' | 'kids-counting-fun' | 'kids-icon-quiz' | 'kids-bedtime-story';
  title: string;
  props: Record<string, any>;
}

interface AudioSection {
  key: string;
  file: string;
  duration: number;  // seconds
  frames: number;    // duration * FPS + padding
}

interface SyncedPost {
  postId: string;
  template: string;
  sections: AudioSection[];
  totalDuration: number;  // seconds
  totalFrames: number;
  props: Record<string, any>;  // modified props with audio-synced timings
}

// ──────────────────────────────────────────────
// AUDIO DURATION (using ffprobe)
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

function discoverAudioSections(postId: string): AudioSection[] {
  const postAudioDir = path.join(AUDIO_DIR, postId);
  if (!fs.existsSync(postAudioDir)) return [];

  const files = fs.readdirSync(postAudioDir)
    .filter((f) => f.endsWith('.wav') || f.endsWith('.mp3') || f.endsWith('.ogg'))
    .filter((f) => f !== 'full.wav'); // skip full narration file

  // Sort: intro first, then slides/sections in order, outro last
  // Supports YLD, Slider, and Kids templates (letter1-26, number1-20, round1-20)
  const order = [
    'intro',
    'headline', 'subheader', 'badge', 'cta',
    'slide1', 'slide2', 'slide3', 'slide4', 'slide5', 'slide6',
    'letter1', 'letter2', 'letter3', 'letter4', 'letter5', 'letter6',
    'letter7', 'letter8', 'letter9', 'letter10', 'letter11', 'letter12',
    'letter13', 'letter14', 'letter15', 'letter16', 'letter17', 'letter18',
    'letter19', 'letter20', 'letter21', 'letter22', 'letter23', 'letter24',
    'letter25', 'letter26',
    'number1', 'number2', 'number3', 'number4', 'number5',
    'number6', 'number7', 'number8', 'number9', 'number10',
    'number11', 'number12', 'number13', 'number14', 'number15',
    'number16', 'number17', 'number18', 'number19', 'number20',
    'round1', 'round2', 'round3', 'round4', 'round5',
    'round6', 'round7', 'round8', 'round9', 'round10',
    'round11', 'round12', 'round13', 'round14', 'round15',
    'round16', 'round17', 'round18', 'round19', 'round20',
    'page1', 'page2', 'page3', 'page4', 'page5',
    'page6', 'page7', 'page8', 'page9', 'page10',
    'page11', 'page12', 'page13', 'page14', 'page15',
    'page16', 'page17', 'page18', 'page19', 'page20',
    'outro',
  ];
  files.sort((a, b) => {
    const keyA = path.basename(a, path.extname(a));
    const keyB = path.basename(b, path.extname(b));
    return (order.indexOf(keyA) === -1 ? 99 : order.indexOf(keyA)) -
           (order.indexOf(keyB) === -1 ? 99 : order.indexOf(keyB));
  });

  return files.map((f) => {
    const filePath = path.join(postAudioDir, f);
    const key = path.basename(f, path.extname(f));
    const duration = getAudioDuration(filePath);
    const frames = Math.ceil(duration * FPS) + PAD_BEFORE + PAD_AFTER;
    return { key, file: filePath, duration, frames };
  });
}

// ──────────────────────────────────────────────
// TIMING CALCULATORS
// ──────────────────────────────────────────────

function syncYLDTiming(post: Post, sections: AudioSection[]): { props: Record<string, any>; totalFrames: number } {
  const props = JSON.parse(JSON.stringify(post.props));
  let currentFrame = 0;

  // Map section keys to YLD timing props
  const sectionMap: Record<string, (startFrame: number, frames: number) => void> = {
    intro: (start, frames) => {
      props.timing.logoAppear = start + 10;
      props.timing.logoMoveUp = start + frames - 20;
      currentFrame = start + frames;
    },
    headline: (start, frames) => {
      props.timing.dividerAppear = start;
      props.timing.headerAppear = start + 10;
      currentFrame = start + frames;
    },
    subheader: (start, frames) => {
      props.timing.subheaderAppear = start;
      currentFrame = start + frames;
    },
    badge: (start, frames) => {
      props.timing.badgeAppear = start;
      currentFrame = start + frames;
    },
    cta: (start, frames) => {
      props.timing.ctaAppear = start;
      currentFrame = start + frames;
    },
  };

  for (const section of sections) {
    const handler = sectionMap[section.key];
    if (handler) {
      handler(currentFrame, section.frames);
      currentFrame += TRANSITION_PAD;
    }
  }

  // Add trailing hold frames
  const totalFrames = currentFrame + 30; // 1s hold at end

  return { props, totalFrames };
}

function syncSliderTiming(post: Post, sections: AudioSection[]): { props: Record<string, any>; totalFrames: number } {
  const props = JSON.parse(JSON.stringify(post.props));

  const introSection = sections.find((s) => s.key === 'intro');
  const outroSection = sections.find((s) => s.key === 'outro');
  const slideSections = sections.filter((s) => s.key.startsWith('slide'));

  // Set intro duration from audio
  if (introSection) {
    props.intro = { ...props.intro, durationFrames: introSection.frames };
  }

  // Set per-slide duration from audio
  // Remotion Slider uses framesPerSlide (uniform) — we'll use the max slide duration
  // to ensure all slides have enough time, OR we can set individual slide durations
  if (slideSections.length > 0) {
    // Use the longest slide's duration (with some padding) for uniform timing
    // This keeps it simple since the Slider component uses a single framesPerSlide
    const maxSlideFrames = Math.max(...slideSections.map((s) => s.frames));
    props.framesPerSlide = maxSlideFrames;
    props.transitionFrames = 25;
  }

  // Set outro duration from audio
  if (outroSection) {
    props.outro = { ...props.outro, durationFrames: outroSection.frames };
  }

  // Calculate total frames
  const introFrames = props.intro?.durationFrames || 70;
  const numSlides = (props.slides || []).length;
  const slideFrames = numSlides * (props.framesPerSlide || 140);
  const transitionFrames = Math.max(0, numSlides - 1) * (props.transitionFrames || 25);
  const outroFrames = props.outro?.durationFrames || 80;
  const totalFrames = introFrames + slideFrames - transitionFrames + outroFrames;

  return { props, totalFrames };
}

// ──────────────────────────────────────────────
// KIDS TEMPLATE TIMING
// ──────────────────────────────────────────────

/**
 * Generic kids template sync — works for alphabet, counting, and quiz.
 *
 * Audio directory structure:
 *   content/audio/{postId}/
 *     intro.wav
 *     letter1.wav / number1.wav / round1.wav   (section audio)
 *     letter2.wav / number2.wav / round2.wav
 *     ...
 *     outro.wav
 *
 * Maps each audio section to the corresponding template section's
 * startFrame and durationFrames props, so animations sync with narration.
 */
function syncKidsTiming(
  post: Post,
  sections: AudioSection[],
): { props: Record<string, any>; totalFrames: number } {
  const props = JSON.parse(JSON.stringify(post.props));
  let currentFrame = 0;

  const introSection = sections.find((s) => s.key === 'intro');
  const outroSection = sections.find((s) => s.key === 'outro');

  // Determine section prefix based on template
  let sectionPrefix: string;
  let propsArrayKey: string;
  if (post.template === 'kids-alphabet-adventure') {
    sectionPrefix = 'letter';
    propsArrayKey = 'letters';
  } else if (post.template === 'kids-counting-fun') {
    sectionPrefix = 'number';
    propsArrayKey = 'sections';
  } else if (post.template === 'kids-bedtime-story') {
    sectionPrefix = 'page';
    propsArrayKey = 'pages';
  } else {
    // kids-icon-quiz
    sectionPrefix = 'round';
    propsArrayKey = 'rounds';
  }

  const contentSections = sections.filter((s) =>
    s.key.startsWith(sectionPrefix) && /\d+$/.test(s.key)
  );

  // Sort by numeric suffix
  contentSections.sort((a, b) => {
    const numA = parseInt(a.key.replace(sectionPrefix, ''), 10);
    const numB = parseInt(b.key.replace(sectionPrefix, ''), 10);
    return numA - numB;
  });

  // Intro
  if (introSection) {
    props.introDurationFrames = introSection.frames;
    currentFrame = introSection.frames;
  } else {
    currentFrame = props.introDurationFrames || 120;
  }

  // Content sections — set startFrame and durationFrames on each
  const propsArray = props[propsArrayKey] || [];
  for (let i = 0; i < contentSections.length && i < propsArray.length; i++) {
    const audioSection = contentSections[i];

    propsArray[i].startFrame = currentFrame;
    propsArray[i].durationFrames = audioSection.frames;

    // For quiz template, set revealFrame at 60% through the section
    if (post.template === 'kids-icon-quiz') {
      propsArray[i].revealFrame = Math.floor(audioSection.frames * 0.6);
    }

    currentFrame += audioSection.frames + TRANSITION_PAD;
  }

  // Outro
  if (outroSection) {
    props.outroDurationFrames = outroSection.frames;
  }

  const totalFrames = currentFrame + (props.outroDurationFrames || 120) + 30; // 1s trailing hold

  return { props, totalFrames };
}

// ──────────────────────────────────────────────
// RENDER + MERGE
// ──────────────────────────────────────────────

function renderSyncedVideo(
  post: Post,
  syncedProps: Record<string, any>,
  totalFrames: number,
  format: string,
  outputPath: string,
): boolean {
  const propsJson = JSON.stringify(syncedProps);

  let compositionId: string;
  if (post.template === 'slider') {
    compositionId = format === 'story' ? 'slider' : `slider-${format}`;
  } else if (post.template === 'yld-intro') {
    compositionId = 'yld-intro';
  } else {
    // Kids templates use registry format: {templateId}-{format}
    compositionId = `${post.template}-${format}`;
  }

  const FORMATS: Record<string, { width: number; height: number }> = {
    story: { width: 1080, height: 1920 },
    landscape: { width: 1920, height: 1080 },
    square: { width: 1080, height: 1080 },
  };
  const { width, height } = FORMATS[format] || FORMATS.story;

  // Render video (no audio)
  // Use --frames=0-N to control duration (composition has fixed durationInFrames,
  // but we only render up to the frame count we need from audio sync)
  const videoOnly = outputPath.replace(/\.mp4$/, '-video.mp4');
  const frameRange = `0-${totalFrames - 1}`;
  let cmd: string;
  if (post.template === 'slider' || format === 'story') {
    cmd = `npx remotion render ${compositionId} --frames=${frameRange} --props='${propsJson.replace(/'/g, "'\\''")}' "${videoOnly}"`;
  } else {
    cmd = `npx remotion render ${compositionId} --frames=${frameRange} --width=${width} --height=${height} --props='${propsJson.replace(/'/g, "'\\''")}' "${videoOnly}"`;
  }

  try {
    console.log(`    Rendering video (${totalFrames} frames = ${(totalFrames / FPS).toFixed(1)}s)...`);
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 600_000 });
  } catch (err: any) {
    console.error(`    Render failed: ${err.stderr?.toString().slice(-300) || err.message}`);
    return false;
  }

  return true;
}

function mergeAudioVideo(
  postId: string,
  videoPath: string,
  outputPath: string,
  sections: AudioSection[],
): boolean {
  const videoOnly = videoPath.replace(/\.mp4$/, '-video.mp4');

  // Check for full narration file first
  const fullAudio = path.join(AUDIO_DIR, postId, 'full.wav');
  let audioPath: string;

  if (fs.existsSync(fullAudio)) {
    audioPath = fullAudio;
  } else {
    // Concatenate section audio files using ffmpeg
    const concatList = path.join(AUDIO_DIR, postId, 'concat.txt');
    const lines = sections.map((s) => `file '${s.file}'`);
    // Add silence between sections for transition padding
    fs.writeFileSync(concatList, lines.join('\n'));

    audioPath = path.join(AUDIO_DIR, postId, 'combined.wav');
    try {
      execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${audioPath}"`, {
        stdio: 'pipe',
      });
    } catch (err: any) {
      console.error(`    Audio concat failed: ${err.stderr?.toString().slice(-200) || err.message}`);
      return false;
    }
  }

  // Merge video + audio
  // Pre-convert to 44.1kHz stereo AAC (Qwen TTS outputs 24kHz mono
  // which causes near-silent output with ffmpeg's native AAC encoder)
  const audioAAC = audioPath.replace(/\.\w+$/, '-resampled.m4a');
  try {
    execSync(
      `ffmpeg -y -i "${audioPath}" -ar 44100 -ac 2 -c:a aac -b:a 128k "${audioAAC}"`,
      { stdio: 'pipe', timeout: 60_000 }
    );

    console.log(`    Merging audio + video...`);
    execSync(
      `ffmpeg -y -i "${videoOnly}" -i "${audioAAC}" -c:v copy -c:a copy -shortest "${outputPath}"`,
      { stdio: 'pipe', timeout: 120_000 }
    );

    // Clean up temp files
    if (fs.existsSync(videoOnly)) fs.unlinkSync(videoOnly);
    if (fs.existsSync(audioAAC)) fs.unlinkSync(audioAAC);

    return true;
  } catch (err: any) {
    console.error(`    Merge failed: ${err.stderr?.toString().slice(-200) || err.message}`);
    return false;
  }
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let specificPost: string | null = null;
  let syncOnly = false;
  let formatFilter = 'story';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    if (args[i] === '--post' && args[i + 1]) specificPost = args[i + 1];
    if (args[i] === '--sync-only') syncOnly = true;
    if (args[i] === '--format' && args[i + 1]) formatFilter = args[i + 1];
  }

  if (!fs.existsSync(PLAN_FILE)) {
    console.error('content-plan.json not found. Run generate-plan.ts first.');
    process.exit(1);
  }

  if (!fs.existsSync(AUDIO_DIR)) {
    console.error(`Audio directory not found: ${AUDIO_DIR}`);
    console.error('Generate audio using Colab first, then place files in content/audio/{postId}/');
    process.exit(1);
  }

  const plan: Post[] = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8'));
  let posts = specificPost ? plan.filter((p) => p.id === specificPost) : plan;
  posts = posts.slice(0, limit);

  // Find posts that have audio files
  const postsWithAudio = posts.filter((p) => {
    const audioDir = path.join(AUDIO_DIR, p.id);
    return fs.existsSync(audioDir) && fs.readdirSync(audioDir).some(
      (f) => f.endsWith('.wav') || f.endsWith('.mp3')
    );
  });

  if (postsWithAudio.length === 0) {
    console.error('No posts found with audio files.');
    console.error(`Expected audio in: ${AUDIO_DIR}/{postId}/*.wav`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  AUDIO-SYNCED RENDER PIPELINE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Posts with audio: ${postsWithAudio.length}`);
  console.log(`  Format:           ${formatFilter}`);
  console.log(`  Mode:             ${syncOnly ? 'sync-only (props)' : 'sync + render + merge'}`);
  console.log('═══════════════════════════════════════════════\n');

  // Ensure output dirs
  fs.mkdirSync(SYNCED_DIR, { recursive: true });
  fs.mkdirSync(path.join(SYNCED_DIR, formatFilter), { recursive: true });

  const results: SyncedPost[] = [];
  let okCount = 0;
  let failCount = 0;

  for (const post of postsWithAudio) {
    console.log(`\n[${post.id}] ${post.template} — "${post.title}"`);

    // 1. Discover and measure audio sections
    const sections = discoverAudioSections(post.id);
    if (sections.length === 0) {
      console.log('  No audio sections found, skipping.');
      continue;
    }

    console.log(`  Audio sections: ${sections.length}`);
    for (const s of sections) {
      console.log(`    ${s.key}: ${s.duration.toFixed(2)}s (${s.frames} frames) — ${path.basename(s.file)}`);
    }

    const totalAudioDuration = sections.reduce((sum, s) => sum + s.duration, 0);
    console.log(`  Total audio: ${totalAudioDuration.toFixed(2)}s`);

    // 2. Calculate synced timing
    let syncResult: { props: Record<string, any>; totalFrames: number };
    if (post.template === 'yld-intro') {
      syncResult = syncYLDTiming(post, sections);
    } else if (post.template === 'slider') {
      syncResult = syncSliderTiming(post, sections);
    } else {
      // Kids templates: kids-alphabet-adventure, kids-counting-fun, kids-icon-quiz
      syncResult = syncKidsTiming(post, sections);
    }
    const { props: syncedProps, totalFrames } = syncResult;

    console.log(`  Synced video: ${totalFrames} frames (${(totalFrames / FPS).toFixed(1)}s)`);

    const synced: SyncedPost = {
      postId: post.id,
      template: post.template,
      sections,
      totalDuration: totalFrames / FPS,
      totalFrames,
      props: syncedProps,
    };
    results.push(synced);

    if (syncOnly) continue;

    // 3. Render video
    const outputPath = path.join(SYNCED_DIR, formatFilter, `${post.id}.mp4`);
    const videoOk = renderSyncedVideo(post, syncedProps, totalFrames, formatFilter, outputPath);
    if (!videoOk) {
      failCount++;
      continue;
    }

    // 4. Merge audio + video
    const mergeOk = mergeAudioVideo(post.id, outputPath, outputPath, sections);
    if (mergeOk) {
      const size = fs.existsSync(outputPath)
        ? (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)
        : '?';
      console.log(`  Done! ${size} MB → ${outputPath}`);
      okCount++;
    } else {
      failCount++;
    }
  }

  // Save synced props for reference
  const syncedFile = path.join(__dirname, 'synced-props.json');
  fs.writeFileSync(syncedFile, JSON.stringify(results, null, 2));

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SYNC COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Synced:  ${results.length} posts`);
  if (!syncOnly) {
    console.log(`  Rendered: ${okCount} ok, ${failCount} failed`);
    console.log(`  Output:   ${SYNCED_DIR}/${formatFilter}/`);
  }
  console.log(`  Props:   ${syncedFile}`);
  console.log('═══════════════════════════════════════════════');
}

main();
