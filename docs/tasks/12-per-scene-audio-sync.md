# Task 12: Per-Scene Audio Sync (Render Worker)

## Overview

Implement the full render worker that fetches post data from the database, builds a frame manifest with exact scene durations, downloads per-scene audio from MinIO, executes Remotion rendering, merges audio with ffmpeg, and uploads the output to MinIO.

## Subtasks

1. [ ] Implement render worker: fetch post + scenes from DB, build manifest using manifest service
2. [ ] Download per-scene audio from MinIO to temp directory
3. [ ] Apply niche prop mappings via existing applyMappings() pattern from content/render-manifest.ts
4. [ ] Execute Remotion render CLI with computed props, then ffmpeg merge audio
5. [ ] Upload output to MinIO, update renders table (output_url, duration_ms, file_size, status)
6. [ ] Publish progress via Redis pub/sub for SSE streaming
7. [ ] Verify: submit render via API, worker processes with correct audio sync, output video has properly timed scenes

## Details

### Render Worker Flow

```
1. Receive job { renderId, postId, format }
2. Update render status → "rendering"
3. Fetch post + scenes from DB
4. Build FrameManifest (exact frame timings from scene durations)
5. Apply niche prop mappings (template-specific props from scene data)
6. Download per-scene audio files from MinIO → temp dir
7. Concatenate scene audio files with ffmpeg (silence gaps between scenes)
8. Execute Remotion bundle + render with computed inputProps
9. Merge narration audio + BGM into rendered video (ffmpeg)
10. Upload final video to MinIO
11. Update render record (output_url, duration_ms, file_size, status → "completed")
12. Update post status → "rendered"
```

### Full Worker Implementation (`apps/api/src/jobs/render-worker.ts`)

```typescript
import { Worker, Job } from 'bullmq';
import { createRedisConnection, redis } from '../lib/redis';
import { db, renders, posts } from '@renderforge/db';
import { eq } from 'drizzle-orm';
import { manifestService, FrameManifest } from '../services/manifest';
import { storage } from '../services/storage';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const execFileAsync = promisify(execFile);

type RenderJobData = {
  renderId: string;
  postId: string;
  format: string;
};

async function publishProgress(renderId: string, progress: number, status: string, message: string) {
  await redis.publish(`render:progress:${renderId}`, JSON.stringify({
    renderId, progress, status, message, timestamp: Date.now(),
  }));
}

async function processRender(job: Job<RenderJobData>) {
  const { renderId, postId, format } = job.data;
  const tempDir = await mkdtemp(join(tmpdir(), `rf-render-${renderId}-`));

  try {
    // Step 1: Update status
    await db.update(renders).set({ status: 'rendering', progress: 0 }).where(eq(renders.id, renderId));
    await publishProgress(renderId, 0, 'rendering', 'Building manifest...');
    await job.updateProgress(5);

    // Step 2: Build manifest
    const manifest = await manifestService.buildManifest(postId);
    await publishProgress(renderId, 10, 'rendering', 'Downloading audio...');
    await job.updateProgress(10);

    // Step 3: Download scene audio files
    const audioDir = join(tempDir, 'audio');
    await mkdtemp(audioDir); // create audio subdirectory
    const audioFiles: Array<{ key: string; localPath: string; startFrame: number }> = [];

    for (const scene of manifest.scenes) {
      if (scene.audioUrl) {
        const localPath = join(audioDir, `${scene.key}.wav`);
        const stream = await storage.download(scene.audioUrl);
        const chunks: Uint8Array[] = [];
        const reader = stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        await writeFile(localPath, Buffer.concat(chunks));
        audioFiles.push({ key: scene.key, localPath, startFrame: scene.startFrame });
      }
    }

    await publishProgress(renderId, 20, 'rendering', 'Concatenating audio...');
    await job.updateProgress(20);

    // Step 4: Build combined audio track with proper timing
    const combinedAudioPath = join(tempDir, 'narration.wav');
    await buildCombinedAudio(manifest, audioFiles, combinedAudioPath);

    await publishProgress(renderId, 30, 'rendering', 'Applying prop mappings...');
    await job.updateProgress(30);

    // Step 5: Build Remotion input props from manifest
    const inputProps = buildInputProps(manifest);
    const propsPath = join(tempDir, 'props.json');
    await writeFile(propsPath, JSON.stringify(inputProps));

    await publishProgress(renderId, 35, 'rendering', 'Rendering video...');
    await job.updateProgress(35);

    // Step 6: Execute Remotion render
    const videoPath = join(tempDir, 'output.mp4');
    const compositionId = `${manifest.templateId}-${format}`;

    // Use the renderer package's bundle
    const rendererDir = join(__dirname, '../../../../renderer');

    await execFileAsync('npx', [
      'remotion', 'render',
      compositionId,
      videoPath,
      '--props', propsPath,
      '--frames', `0-${manifest.totalFrames - 1}`,
    ], {
      cwd: rendererDir,
      timeout: 300000, // 5 min timeout
      env: { ...process.env, REMOTION_FRAMES: String(manifest.totalFrames) },
    });

    await publishProgress(renderId, 75, 'rendering', 'Merging audio...');
    await job.updateProgress(75);

    // Step 7: Merge narration audio into video
    const finalPath = join(tempDir, 'final.mp4');
    await mergeAudio(videoPath, combinedAudioPath, finalPath);

    await publishProgress(renderId, 90, 'rendering', 'Uploading...');
    await job.updateProgress(90);

    // Step 8: Upload to MinIO
    const outputKey = `renders/${postId}/${renderId}.mp4`;
    const finalBuffer = await readFile(finalPath);
    await storage.upload(outputKey, finalBuffer, 'video/mp4');

    const fileStat = await stat(finalPath);

    // Step 9: Update render record
    const durationMs = Math.round(manifest.totalDurationSeconds * 1000);
    await db.update(renders).set({
      status: 'completed',
      progress: 100,
      outputUrl: outputKey,
      durationMs,
      fileSize: fileStat.size,
      updatedAt: new Date(),
    }).where(eq(renders.id, renderId));

    // Update post status to "rendered"
    await db.update(posts).set({ status: 'rendered', updatedAt: new Date() })
      .where(eq(posts.id, postId));

    await publishProgress(renderId, 100, 'completed', 'Render complete');
    await job.updateProgress(100);

    return { renderId, status: 'completed', outputKey };
  } catch (error: any) {
    // Mark render as failed
    await db.update(renders).set({
      status: 'failed',
      error: error.message,
      updatedAt: new Date(),
    }).where(eq(renders.id, renderId));

    // Reset post status to "ready" so it can be retried
    await db.update(posts).set({ status: 'ready', updatedAt: new Date() })
      .where(eq(posts.id, postId));

    await publishProgress(renderId, 0, 'failed', error.message);
    throw error;
  } finally {
    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

### Combined Audio Builder

Concatenate scene audio files with silence gaps matching the frame timing:

```typescript
async function buildCombinedAudio(
  manifest: FrameManifest,
  audioFiles: Array<{ key: string; localPath: string; startFrame: number }>,
  outputPath: string
) {
  if (audioFiles.length === 0) {
    // Generate silence for the full duration
    await execFileAsync('ffmpeg', [
      '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`,
      '-t', String(manifest.totalDurationSeconds),
      '-y', outputPath,
    ]);
    return;
  }

  // Build ffmpeg filter to place each audio at its correct timestamp
  const inputs: string[] = [];
  const filterParts: string[] = [];

  for (let i = 0; i < audioFiles.length; i++) {
    const af = audioFiles[i];
    const delayMs = Math.round((af.startFrame / manifest.fps) * 1000);
    inputs.push('-i', af.localPath);
    filterParts.push(`[${i}]adelay=${delayMs}|${delayMs}[d${i}]`);
  }

  const mixInputs = audioFiles.map((_, i) => `[d${i}]`).join('');
  const filter = filterParts.join(';') +
    `;${mixInputs}amix=inputs=${audioFiles.length}:normalize=0[out]`;

  await execFileAsync('ffmpeg', [
    ...inputs,
    '-filter_complex', filter,
    '-map', '[out]',
    '-t', String(manifest.totalDurationSeconds),
    '-y', outputPath,
  ]);
}
```

### Audio Merge (Video + Narration)

```typescript
async function mergeAudio(videoPath: string, audioPath: string, outputPath: string) {
  await execFileAsync('ffmpeg', [
    '-i', videoPath,
    '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    '-y', outputPath,
  ]);
}
```

### Input Props Builder

Transform the FrameManifest into Remotion inputProps matching the template's expected schema:

```typescript
function buildInputProps(manifest: FrameManifest): Record<string, unknown> {
  // Base props applicable to all templates
  const props: Record<string, unknown> = {
    theme: manifest.theme,
    title: manifest.title,
    fps: manifest.fps,
    durationInFrames: manifest.totalFrames,
  };

  // Build scene props using the existing applyMappings pattern
  // Each scene becomes a prop entry like: scene_hook, scene_point1, etc.
  for (const scene of manifest.scenes) {
    const sceneProps: Record<string, unknown> = {
      text: scene.displayText,
      startFrame: scene.startFrame,
      endFrame: scene.endFrame,
      entrance: scene.entrance,
      textSize: scene.textSize,
      ...(scene.extraProps || {}),
    };
    props[`scene_${scene.key}`] = sceneProps;
  }

  // Also provide scenes array for templates that use it
  props.scenes = manifest.scenes.map(s => ({
    key: s.key,
    text: s.displayText,
    startFrame: s.startFrame,
    endFrame: s.endFrame,
    durationFrames: s.durationFrames,
    entrance: s.entrance,
    textSize: s.textSize,
    ...(s.extraProps || {}),
  }));

  return props;
}
```

### Worker Registration

```typescript
export function startRenderWorker() {
  const worker = new Worker('render', processRender, {
    connection: createRedisConnection(),
    concurrency: 2, // Process 2 renders simultaneously
    limiter: {
      max: 4,
      duration: 60000, // Max 4 jobs per minute
    },
  });

  worker.on('completed', (job) => {
    console.log(`[render-worker] Job ${job.id} completed: ${job.returnvalue?.outputKey}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[render-worker] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
```

## Verification

1. Submit a render via API for a "ready" post with scene audio
2. Worker picks up the job and progresses through all steps
3. SSE endpoint streams real-time progress (0% → 100%)
4. Output video has correct scene timing:
   - Scene text appears at the correct frame
   - Audio plays in sync with scene transitions
   - Total duration matches the sum of scene durations + padding
5. Video uploaded to MinIO at `renders/{postId}/{renderId}.mp4`
6. Render record updated with outputUrl, durationMs, fileSize, status=completed
7. Post status transitions to "rendered"
8. Failed render: error stored in DB, post reverts to "ready", can be retried
9. Temp files cleaned up after render (success or failure)
