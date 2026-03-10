#!/usr/bin/env npx tsx
/**
 * Video Render Pipeline for "Your Last Dollar"
 *
 * Reads content-plan.json, checks what's already rendered,
 * and continues from where it left off.
 * Generates both video (.mp4) and cover thumbnail (.png) for each post.
 *
 * Usage:
 *   npx tsx content/render.ts              # render all remaining
 *   npx tsx content/render.ts --limit 10   # render next 10 posts
 *   npx tsx content/render.ts --post day01-post1  # render specific post
 *   npx tsx content/render.ts --format story      # only story format
 *   npx tsx content/render.ts --thumbs-only       # only generate thumbnails for already-rendered videos
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PLAN_FILE = path.join(__dirname, 'content-plan.json');
const PROGRESS_FILE = path.join(__dirname, 'render-progress.json');
const OUTPUT_DIR = path.join(ROOT, 'output');

// Hero frame for thumbnails — the frame where content is most visible
// YLD Intro: frame 250 = header + subheader visible, badge appearing
// Slider:    frame 120 = intro logo + title fully visible
const HERO_FRAMES: Record<string, number> = {
  'yld-intro': 250,
  slider: 120,
};

interface Post {
  id: string;
  day: number;
  postNum: number;
  date: string;
  pillar: string;
  template: 'slider' | 'yld-intro';
  caption: string;
  props: Record<string, any>;
}

interface RenderJob {
  postId: string;
  format: 'story' | 'landscape' | 'square';
  compositionId: string;
  width: number;
  height: number;
  outputPath: string;
  thumbPath: string;
  template: string;
}

interface Progress {
  completed: Record<string, boolean>;   // "day01-post1-story" => true
  thumbs: Record<string, boolean>;      // "day01-post1-story-thumb" => true
  failed: Record<string, string>;       // "day01-post1-story" => error message
  lastUpdated: string;
}

const FORMATS: Record<string, { compositionSuffix: string; width: number; height: number }> = {
  story:     { compositionSuffix: '',           width: 1080, height: 1920 },
  landscape: { compositionSuffix: '-landscape', width: 1920, height: 1080 },
  square:    { compositionSuffix: '-square',    width: 1080, height: 1080 },
};

// ──────────────────────────────────────────────
// PROGRESS TRACKING
// ──────────────────────────────────────────────

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    // Migrate old progress files that don't have thumbs
    if (!data.thumbs) data.thumbs = {};
    return data;
  }
  return { completed: {}, thumbs: {}, failed: {}, lastUpdated: new Date().toISOString() };
}

function saveProgress(progress: Progress): void {
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function jobKey(postId: string, format: string): string {
  return `${postId}-${format}`;
}

function thumbKey(postId: string, format: string): string {
  return `${postId}-${format}-thumb`;
}

// ──────────────────────────────────────────────
// RENDER VIDEO
// ──────────────────────────────────────────────

function renderVideo(job: RenderJob, props: Record<string, any>): { success: boolean; error?: string; duration?: number } {
  const propsJson = JSON.stringify(props);
  const compositionId = job.compositionId;

  let cmd: string;
  if (job.format === 'story') {
    cmd = `npx remotion render ${compositionId} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.outputPath}"`;
  } else {
    if (compositionId.startsWith('slider')) {
      cmd = `npx remotion render ${compositionId} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.outputPath}"`;
    } else {
      cmd = `npx remotion render ${compositionId} --width=${job.width} --height=${job.height} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.outputPath}"`;
    }
  }

  const start = Date.now();
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 600_000 });
    return { success: true, duration: Math.round((Date.now() - start) / 1000) };
  } catch (err: any) {
    const stderr = err.stderr?.toString().slice(-500) || err.message;
    return { success: false, error: stderr, duration: Math.round((Date.now() - start) / 1000) };
  }
}

// ──────────────────────────────────────────────
// RENDER THUMBNAIL (still frame)
// ──────────────────────────────────────────────

function renderThumb(job: RenderJob, props: Record<string, any>): { success: boolean; error?: string; duration?: number } {
  const propsJson = JSON.stringify(props);
  const compositionId = job.compositionId;
  const heroFrame = HERO_FRAMES[job.template] || 120;

  let cmd: string;
  if (job.format === 'story') {
    cmd = `npx remotion still ${compositionId} --frame=${heroFrame} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.thumbPath}"`;
  } else {
    if (compositionId.startsWith('slider')) {
      cmd = `npx remotion still ${compositionId} --frame=${heroFrame} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.thumbPath}"`;
    } else {
      cmd = `npx remotion still ${compositionId} --frame=${heroFrame} --width=${job.width} --height=${job.height} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.thumbPath}"`;
    }
  }

  const start = Date.now();
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    return { success: true, duration: Math.round((Date.now() - start) / 1000) };
  } catch (err: any) {
    const stderr = err.stderr?.toString().slice(-500) || err.message;
    return { success: false, error: stderr, duration: Math.round((Date.now() - start) / 1000) };
  }
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let specificPost: string | null = null;
  let formatFilter: string | null = null;
  let thumbsOnly = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    if (args[i] === '--post' && args[i + 1]) specificPost = args[i + 1];
    if (args[i] === '--format' && args[i + 1]) formatFilter = args[i + 1];
    if (args[i] === '--thumbs-only') thumbsOnly = true;
  }

  if (!fs.existsSync(PLAN_FILE)) {
    console.error('❌ content-plan.json not found. Run generate-plan.ts first.');
    process.exit(1);
  }
  const plan: Post[] = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8'));

  // Ensure output dirs (video + thumbs per format)
  for (const fmt of Object.keys(FORMATS)) {
    fs.mkdirSync(path.join(OUTPUT_DIR, fmt), { recursive: true });
    fs.mkdirSync(path.join(OUTPUT_DIR, fmt, 'thumbs'), { recursive: true });
  }

  const progress = loadProgress();
  const completedCount = Object.keys(progress.completed).length;
  const thumbsCount = Object.keys(progress.thumbs).length;
  const failedCount = Object.keys(progress.failed).length;

  // Build job queue
  const jobs: { post: Post; job: RenderJob; needsVideo: boolean; needsThumb: boolean }[] = [];

  const postsToProcess = specificPost
    ? plan.filter((p) => p.id === specificPost)
    : plan;

  const formats = formatFilter
    ? { [formatFilter]: FORMATS[formatFilter] }
    : FORMATS;

  for (const post of postsToProcess) {
    for (const [fmt, config] of Object.entries(formats)) {
      const vKey = jobKey(post.id, fmt);
      const tKey = thumbKey(post.id, fmt);

      const needsVideo = !thumbsOnly && !progress.completed[vKey];
      const needsThumb = !progress.thumbs[tKey];

      if (!needsVideo && !needsThumb) continue;

      let compositionId: string;
      if (post.template === 'slider') {
        compositionId = fmt === 'story' ? 'slider' : `slider-${fmt}`;
      } else {
        compositionId = 'yld-intro';
      }

      jobs.push({
        post,
        job: {
          postId: post.id,
          format: fmt as any,
          compositionId,
          width: config.width,
          height: config.height,
          outputPath: path.join(OUTPUT_DIR, fmt, `${post.id}.mp4`),
          thumbPath: path.join(OUTPUT_DIR, fmt, 'thumbs', `${post.id}.png`),
          template: post.template,
        },
        needsVideo,
        needsThumb,
      });
    }
  }

  const jobsToRun = jobs.slice(0, limit);

  console.log('═══════════════════════════════════════════════');
  console.log('  YOUR LAST DOLLAR — Video Render Pipeline');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total posts in plan:  ${plan.length}`);
  console.log(`  Videos completed:     ${completedCount}`);
  console.log(`  Thumbs completed:     ${thumbsCount}`);
  console.log(`  Previously failed:    ${failedCount}`);
  console.log(`  Remaining jobs:       ${jobs.length}`);
  console.log(`  Jobs this run:        ${jobsToRun.length}`);
  if (thumbsOnly) console.log(`  Mode:                 thumbnails only`);
  if (formatFilter) console.log(`  Format filter:        ${formatFilter}`);
  if (specificPost) console.log(`  Specific post:        ${specificPost}`);
  console.log('═══════════════════════════════════════════════\n');

  if (jobsToRun.length === 0) {
    console.log('✅ Nothing to render. All done!');
    return;
  }

  let current = 0;
  let videoOk = 0;
  let videoFail = 0;
  let thumbOk = 0;
  let thumbFail = 0;

  for (const { post, job, needsVideo, needsThumb } of jobsToRun) {
    current++;
    const pct = Math.round((current / jobsToRun.length) * 100);

    // ── Render video ──
    if (needsVideo) {
      const vKey = jobKey(job.postId, job.format);
      console.log(`[${current}/${jobsToRun.length}] (${pct}%) 🎬 Video: ${job.postId} [${job.format}] — ${post.template}`);

      const result = renderVideo(job, post.props);
      if (result.success) {
        videoOk++;
        progress.completed[vKey] = true;
        delete progress.failed[vKey];
        const size = fs.existsSync(job.outputPath)
          ? (fs.statSync(job.outputPath).size / 1024 / 1024).toFixed(1)
          : '?';
        console.log(`   ✅ Video done in ${result.duration}s — ${size} MB`);
      } else {
        videoFail++;
        progress.failed[vKey] = result.error || 'Unknown error';
        console.log(`   ❌ Video failed after ${result.duration}s`);
        console.log(`      ${(result.error || '').slice(0, 200)}`);
      }
      saveProgress(progress);
    }

    // ── Render thumbnail ──
    if (needsThumb) {
      const tKey = thumbKey(job.postId, job.format);
      if (!needsVideo) {
        console.log(`[${current}/${jobsToRun.length}] (${pct}%) 🖼️  Thumb: ${job.postId} [${job.format}] — ${post.template}`);
      } else {
        process.stdout.write(`   🖼️  Generating thumbnail...`);
      }

      const result = renderThumb(job, post.props);
      if (result.success) {
        thumbOk++;
        progress.thumbs[tKey] = true;
        const size = fs.existsSync(job.thumbPath)
          ? (fs.statSync(job.thumbPath).size / 1024).toFixed(0)
          : '?';
        if (needsVideo) {
          console.log(` ✅ ${size} KB (${result.duration}s)`);
        } else {
          console.log(`   ✅ Thumb done in ${result.duration}s — ${size} KB`);
        }
      } else {
        thumbFail++;
        if (needsVideo) {
          console.log(` ❌ failed`);
        } else {
          console.log(`   ❌ Thumb failed after ${result.duration}s`);
        }
      }
      saveProgress(progress);
    }
  }

  // Final summary
  const totalVideos = Object.keys(progress.completed).length;
  const totalThumbs = Object.keys(progress.thumbs).length;
  const totalTarget = plan.length * Object.keys(FORMATS).length;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  RENDER COMPLETE');
  console.log('═══════════════════════════════════════════════');
  if (!thumbsOnly) console.log(`  Videos:     ${videoOk} ok, ${videoFail} failed (${totalVideos}/${totalTarget} total)`);
  console.log(`  Thumbs:     ${thumbOk} ok, ${thumbFail} failed (${totalThumbs}/${totalTarget} total)`);
  console.log(`  Remaining:  ${totalTarget - totalVideos} videos, ${totalTarget - totalThumbs} thumbs`);
  console.log('═══════════════════════════════════════════════');
}

main();
