#!/usr/bin/env npx tsx
/**
 * Video Render Pipeline for "Your Last Dollar"
 *
 * Reads content-plan.json, checks what's already rendered,
 * and continues from where it left off.
 *
 * Usage:
 *   npx tsx content/render.ts              # render all remaining
 *   npx tsx content/render.ts --limit 10   # render next 10 posts
 *   npx tsx content/render.ts --post day01-post1  # render specific post
 *   npx tsx content/render.ts --format story      # only story format
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
}

interface Progress {
  completed: Record<string, boolean>; // "day01-post1-story" => true
  failed: Record<string, string>;      // "day01-post1-story" => error message
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
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { completed: {}, failed: {}, lastUpdated: new Date().toISOString() };
}

function saveProgress(progress: Progress): void {
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function jobKey(postId: string, format: string): string {
  return `${postId}-${format}`;
}

// ──────────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────────

function renderJob(job: RenderJob, props: Record<string, any>): { success: boolean; error?: string; duration?: number } {
  const propsJson = JSON.stringify(props);
  const compositionId = job.compositionId;

  // For non-story formats of slider, use specific composition.
  // For yld-intro, we override width/height since it only has one composition.
  let cmd: string;
  if (job.format === 'story') {
    cmd = `npx remotion render ${compositionId} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.outputPath}"`;
  } else {
    // For slider, use the format-specific composition
    // For yld-intro, use base composition with width/height override
    if (compositionId.startsWith('slider')) {
      cmd = `npx remotion render ${compositionId} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.outputPath}"`;
    } else {
      cmd = `npx remotion render ${compositionId} --width=${job.width} --height=${job.height} --props='${propsJson.replace(/'/g, "'\\''")}' "${job.outputPath}"`;
    }
  }

  const start = Date.now();
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 600_000 });
    const duration = Math.round((Date.now() - start) / 1000);
    return { success: true, duration };
  } catch (err: any) {
    const duration = Math.round((Date.now() - start) / 1000);
    const stderr = err.stderr?.toString().slice(-500) || err.message;
    return { success: false, error: stderr, duration };
  }
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  // Parse args
  const args = process.argv.slice(2);
  let limit = Infinity;
  let specificPost: string | null = null;
  let formatFilter: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    if (args[i] === '--post' && args[i + 1]) specificPost = args[i + 1];
    if (args[i] === '--format' && args[i + 1]) formatFilter = args[i + 1];
  }

  // Load plan
  if (!fs.existsSync(PLAN_FILE)) {
    console.error('❌ content-plan.json not found. Run generate-plan.ts first.');
    process.exit(1);
  }
  const plan: Post[] = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8'));

  // Ensure output dirs
  for (const fmt of Object.keys(FORMATS)) {
    fs.mkdirSync(path.join(OUTPUT_DIR, fmt), { recursive: true });
  }

  // Load progress
  const progress = loadProgress();
  const completedCount = Object.keys(progress.completed).length;
  const failedCount = Object.keys(progress.failed).length;

  // Build job queue
  const jobs: { post: Post; job: RenderJob }[] = [];

  const postsToProcess = specificPost
    ? plan.filter((p) => p.id === specificPost)
    : plan;

  const formats = formatFilter
    ? { [formatFilter]: FORMATS[formatFilter] }
    : FORMATS;

  for (const post of postsToProcess) {
    for (const [fmt, config] of Object.entries(formats)) {
      const key = jobKey(post.id, fmt);
      if (progress.completed[key]) continue; // skip already done

      let compositionId: string;
      if (post.template === 'slider') {
        compositionId = fmt === 'story' ? 'slider' : `slider-${fmt}`;
      } else {
        compositionId = 'yld-intro';
      }

      const outputPath = path.join(OUTPUT_DIR, fmt, `${post.id}.mp4`);

      jobs.push({
        post,
        job: {
          postId: post.id,
          format: fmt as any,
          compositionId,
          width: config.width,
          height: config.height,
          outputPath,
        },
      });
    }
  }

  // Apply limit
  const jobsToRun = jobs.slice(0, limit);
  const totalJobs = jobs.length;

  console.log('═══════════════════════════════════════════════');
  console.log('  YOUR LAST DOLLAR — Video Render Pipeline');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total posts in plan:  ${plan.length}`);
  console.log(`  Already completed:    ${completedCount}`);
  console.log(`  Previously failed:    ${failedCount}`);
  console.log(`  Remaining jobs:       ${totalJobs}`);
  console.log(`  Jobs this run:        ${jobsToRun.length}`);
  if (formatFilter) console.log(`  Format filter:        ${formatFilter}`);
  if (specificPost) console.log(`  Specific post:        ${specificPost}`);
  console.log('═══════════════════════════════════════════════\n');

  if (jobsToRun.length === 0) {
    console.log('✅ Nothing to render. All done!');
    return;
  }

  let rendered = 0;
  let succeeded = 0;
  let failed = 0;

  for (const { post, job } of jobsToRun) {
    rendered++;
    const key = jobKey(job.postId, job.format);
    const pct = Math.round((rendered / jobsToRun.length) * 100);

    console.log(`[${rendered}/${jobsToRun.length}] (${pct}%) Rendering ${job.postId} [${job.format}] — ${post.template}`);

    const result = renderJob(job, post.props);

    if (result.success) {
      succeeded++;
      progress.completed[key] = true;
      delete progress.failed[key]; // clear any previous failure
      const size = fs.existsSync(job.outputPath)
        ? (fs.statSync(job.outputPath).size / 1024 / 1024).toFixed(1)
        : '?';
      console.log(`   ✅ Done in ${result.duration}s — ${size} MB`);
    } else {
      failed++;
      progress.failed[key] = result.error || 'Unknown error';
      console.log(`   ❌ Failed after ${result.duration}s`);
      console.log(`      ${(result.error || '').slice(0, 200)}`);
    }

    // Save progress after each render
    saveProgress(progress);
  }

  // Final summary
  const totalCompleted = Object.keys(progress.completed).length;
  const totalFailed = Object.keys(progress.failed).length;
  const totalRemaining = plan.length * Object.keys(FORMATS).length - totalCompleted;

  console.log('\n═══════════════════════════════════════════════');
  console.log('  RENDER COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  This run:   ${succeeded} succeeded, ${failed} failed`);
  console.log(`  Overall:    ${totalCompleted} / ${plan.length * Object.keys(FORMATS).length} total videos`);
  console.log(`  Remaining:  ${totalRemaining}`);
  if (totalFailed > 0) console.log(`  Failed:     ${totalFailed} (re-run to retry)`);
  console.log('═══════════════════════════════════════════════');
}

main();
