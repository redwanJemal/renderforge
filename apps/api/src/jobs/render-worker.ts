import { Worker, type Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { db, renders, posts, scenes, bgmTracks, eq, asc } from "@renderforge/db";
import { existsSync, statSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

export type RenderJobData = {
  renderId: string;
  postId: string;
  format: string;
  bgmTrackId?: string;
};

// Cache the Remotion bundle path across renders
let cachedBundlePath: string | null = null;

async function publishProgress(renderId: string, progress: number, status: string, message: string) {
  const redis = getRedis();
  await redis.publish(
    `render:progress:${renderId}`,
    JSON.stringify({ renderId, progress, status, message }),
  );
  await redis.publish(
    "render:progress",
    JSON.stringify({ renderId, progress, status, message }),
  );
}

function getFormatDimensions(format: string): { width: number; height: number } {
  switch (format) {
    case "post": return { width: 1080, height: 1080 };
    case "landscape": return { width: 1920, height: 1080 };
    case "story":
    default: return { width: 1080, height: 1920 };
  }
}

async function bundleRemotionProject(): Promise<string> {
  if (cachedBundlePath && existsSync(cachedBundlePath)) {
    console.log("[render-worker] Using cached bundle");
    return cachedBundlePath;
  }

  const { bundle } = await import("@remotion/bundler");

  // The renderer entry point is relative to the monorepo root
  const entryPoint = join(process.cwd(), "apps/renderer/index.ts");

  console.log("[render-worker] Bundling Remotion project...");
  const bundlePath = await bundle({
    entryPoint,
    onProgress: (progress: number) => {
      if (progress % 25 === 0) console.log(`[render-worker] Bundle progress: ${progress}%`);
    },
  });

  cachedBundlePath = bundlePath;
  console.log(`[render-worker] Bundle ready: ${bundlePath}`);
  return bundlePath;
}

async function processRenderJob(job: Job<RenderJobData>) {
  const { renderId, postId, format, bgmTrackId } = job.data;
  console.log(`[render-worker] Starting render ${renderId} for post ${postId} (${format})`);

  const workDir = join(tmpdir(), `render-${renderId}`);
  mkdirSync(workDir, { recursive: true });

  try {
    // Update status to rendering
    await db.update(renders).set({ status: "rendering", progress: 0 }).where(eq(renders.id, renderId));
    await publishProgress(renderId, 0, "rendering", "Starting render...");

    // Step 1: Fetch post + scenes from DB
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) throw new Error(`Post ${postId} not found`);

    const postScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.postId, postId))
      .orderBy(asc(scenes.sortOrder));

    await publishProgress(renderId, 5, "rendering", "Fetched post data...");
    await job.updateProgress(5);

    // Step 2: Build template props from post metadata + scenes
    const metadata = (post.metadata ?? {}) as Record<string, unknown>;
    const templateId = post.templateId || "motivational-narration";
    const compositionId = `${templateId}-${format}`;

    // Build scene props for the template
    const ENTRANCES = ["scaleIn", "slideUp", "fadeIn", "slideLeft", "slam"] as const;
    const SCENE_KEYS = ["intro", "headline", "subheader", "badge", "cta"];
    const fps = 30;

    // If metadata has sceneProps, use those directly (from content bank seeding)
    let templateProps: Record<string, unknown>;
    if (metadata.sceneProps && typeof metadata.sceneProps === "object") {
      templateProps = metadata.sceneProps as Record<string, unknown>;
    } else {
      // Build from DB scenes — calculate frame timing
      const introHoldFrames = 45;
      const transitionFrames = 15;
      let currentFrame = introHoldFrames;

      const sceneProps = postScenes.map((s, i) => {
        const durationSec = s.durationSeconds ? parseFloat(String(s.durationSeconds)) : 4;
        const durationFrames = Math.round(durationSec * fps);
        const startFrame = currentFrame;
        currentFrame += durationFrames;

        const extraProps = (s.extraProps ?? {}) as Record<string, unknown>;

        return {
          text: s.displayText || "",
          subtext: extraProps.subtext as string | undefined,
          highlight: extraProps.highlight as string | undefined,
          entrance: s.entrance || ENTRANCES[i % ENTRANCES.length],
          textSize: extraProps.textSize ?? (i === 0 ? 52 : i === SCENE_KEYS.length - 1 ? 48 : 46),
          subtextSize: extraProps.subtextSize ?? 28,
          textAlign: (extraProps.textAlign as string) ?? "center",
          startFrame,
          durationFrames,
        };
      });

      templateProps = {
        scenes: sceneProps,
        title: metadata.title as string | undefined,
        accentColor: metadata.accentColor ?? "#f59e0b",
        bgGradient: metadata.bgGradient ?? ["#0f0f0f", "#1a1a2e", "#0f0f0f"],
        particlesEnabled: true,
        transitionFrames,
        introHoldFrames,
      };
    }

    // Calculate total duration in frames
    const sceneArray = templateProps.scenes as Array<{ startFrame: number; durationFrames: number }>;
    const lastScene = sceneArray[sceneArray.length - 1];
    const totalFrames = lastScene
      ? lastScene.startFrame + lastScene.durationFrames + 30 // 1s padding at end
      : 300; // 10s fallback

    await publishProgress(renderId, 10, "rendering", "Building template props...");
    await job.updateProgress(10);

    // Step 3: Bundle Remotion project
    await publishProgress(renderId, 15, "rendering", "Bundling Remotion project...");
    const bundlePath = await bundleRemotionProject();
    await publishProgress(renderId, 25, "rendering", "Bundle ready, starting render...");
    await job.updateProgress(25);

    // Step 4: Render video using Remotion
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const { width, height } = getFormatDimensions(format);

    const outputPath = join(workDir, `render-${renderId}.mp4`);

    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: compositionId,
      inputProps: templateProps,
    });

    // Override duration and dimensions
    const compositionWithOverrides = {
      ...composition,
      width,
      height,
      durationInFrames: totalFrames,
    };

    await renderMedia({
      composition: compositionWithOverrides,
      serveUrl: bundlePath,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: templateProps,
      chromiumOptions: {
        enableMultiProcessOnLinux: true,
      },
      onProgress: ({ progress }) => {
        // Map render progress to 25-85% range
        const mappedProgress = Math.round(25 + progress * 60);
        db.update(renders)
          .set({ progress: mappedProgress })
          .where(eq(renders.id, renderId))
          .then(() => publishProgress(renderId, mappedProgress, "rendering", `Rendering frames... ${Math.round(progress * 100)}%`))
          .catch(() => {});
        job.updateProgress(mappedProgress).catch(() => {});
      },
    });

    await publishProgress(renderId, 85, "rendering", "Video rendered, processing...");
    await job.updateProgress(85);

    // Step 5: Optional BGM mixing
    let finalOutputPath = outputPath;

    if (bgmTrackId) {
      await publishProgress(renderId, 87, "rendering", "Mixing background music...");

      const [bgmTrack] = await db
        .select()
        .from(bgmTracks)
        .where(eq(bgmTracks.id, bgmTrackId))
        .limit(1);

      if (bgmTrack) {
        try {
          // Download BGM from S3
          const { storage } = await import("../services/storage.js");
          const bgmBuffer = await storage.download(bgmTrack.fileUrl);
          const bgmExt = bgmTrack.fileUrl.split(".").pop() || "mp3";
          const bgmLocalPath = join(workDir, `bgm.${bgmExt}`);
          const { writeFileSync } = await import("node:fs");
          writeFileSync(bgmLocalPath, bgmBuffer);

          // Get video duration
          const durationResult = execFileSync("ffprobe", [
            "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", outputPath,
          ], { encoding: "utf-8" }).trim();
          const duration = parseFloat(durationResult);
          const fadeOutDuration = 3;
          const fadeStart = Math.max(0, duration - fadeOutDuration);

          // Mix BGM using ffmpeg
          const bgmOutputPath = join(workDir, `render-${renderId}-bgm.mp4`);
          const filterComplex = [
            `[1:a]volume=0.35,atrim=0:${duration.toFixed(2)},afade=t=out:st=${fadeStart.toFixed(2)}:d=${fadeOutDuration},asetpts=PTS-STARTPTS[bgm]`,
            `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
          ].join(";");

          execFileSync("ffmpeg", [
            "-y",
            "-i", outputPath,
            "-stream_loop", "-1", "-i", bgmLocalPath,
            "-filter_complex", filterComplex,
            "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
            bgmOutputPath,
          ], { timeout: 120_000 });

          finalOutputPath = bgmOutputPath;
          console.log("[render-worker] BGM mixed successfully");
        } catch (bgmErr) {
          console.warn("[render-worker] BGM mixing failed, using video without BGM:", bgmErr);
          // Continue with the video without BGM
        }
      }
    }

    await publishProgress(renderId, 90, "rendering", "Uploading to storage...");
    await job.updateProgress(90);

    // Step 6: Upload to S3
    const videoBuffer = readFileSync(finalOutputPath);
    const s3Key = `renders/${renderId}.mp4`;
    const { storage } = await import("../services/storage.js");
    await storage.upload(s3Key, videoBuffer, "video/mp4");

    const fileSizeBytes = statSync(finalOutputPath).size;

    // Get duration from rendered file
    let durationMs = Math.round((totalFrames / fps) * 1000);
    try {
      const dur = execFileSync("ffprobe", [
        "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", finalOutputPath,
      ], { encoding: "utf-8" }).trim();
      durationMs = Math.round(parseFloat(dur) * 1000);
    } catch {
      // Use calculated duration
    }

    // Step 7: Update DB with output info
    await db
      .update(renders)
      .set({
        status: "completed",
        progress: 100,
        outputUrl: s3Key,
        fileSize: fileSizeBytes,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(renders.id, renderId));

    await publishProgress(renderId, 100, "completed", "Render complete");
    console.log(`[render-worker] Completed render ${renderId} (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB)`);

    // Cleanup temp files
    try {
      const { rmSync } = await import("node:fs");
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[render-worker] Render ${renderId} failed:`, errorMsg);
    await db
      .update(renders)
      .set({ status: "failed", error: errorMsg, updatedAt: new Date() })
      .where(eq(renders.id, renderId));
    await publishProgress(renderId, 0, "failed", errorMsg);

    // Cleanup temp files on error
    try {
      const { rmSync } = await import("node:fs");
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // Best effort cleanup
    }

    throw error;
  }
}

export function createRenderWorker() {
  const redis = getRedis();

  const worker = new Worker<RenderJobData>("render", processRenderJob, {
    connection: redis,
    concurrency: 1,
  });

  worker.on("completed", (job) => {
    console.log(`[render-worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[render-worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
