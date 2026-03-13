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

  const publicDir = join(process.cwd(), "public");
  console.log(`[render-worker] Bundling Remotion project... (publicDir: ${publicDir})`);
  const bundlePath = await bundle({
    entryPoint,
    publicDir,
    onProgress: (progress: number) => {
      if (progress % 25 === 0) console.log(`[render-worker] Bundle progress: ${progress}%`);
    },
  });

  cachedBundlePath = bundlePath;
  console.log(`[render-worker] Bundle ready: ${bundlePath}`);
  return bundlePath;
}

// Check if template should use the premium yld-intro composition
function isYLDTemplate(templateId: string): boolean {
  return templateId === "motivational-narration" || templateId === "yld-intro";
}

// Build yld-intro props from DB scenes (intro, headline, subheader, badge, cta)
function buildYLDIntroProps(
  postScenes: Array<{ displayText: string | null; extraProps: unknown }>,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  // Map scenes by key (sortOrder: 0=intro, 1=headline, 2=subheader, 3=badge, 4=cta)
  const sceneMap: Record<string, { text: string; highlight?: string }> = {};
  const keys = ["intro", "headline", "subheader", "badge", "cta"];
  for (let i = 0; i < postScenes.length && i < keys.length; i++) {
    const s = postScenes[i];
    const extra = (s.extraProps ?? {}) as Record<string, unknown>;
    sceneMap[keys[i]] = {
      text: s.displayText || "",
      highlight: extra.highlight as string | undefined,
    };
  }

  // Pick accent color from metadata or default
  const accentColor = (metadata.accentColor as string) ?? "#22c55e";
  const bgGradient = (metadata.bgGradient as [string, string, string]) ?? ["#0a2e1a", "#071a10", "#020a05"];

  // Split intro text into two lines for header
  const introText = sceneMap.intro?.text ?? "";
  const headlineText = sceneMap.headline?.text ?? "";

  // Use intro as line1 (shorter), headline as line2 (big bold)
  // Truncate for visual fit — line1 max ~40 chars, line2 max ~30 chars
  const line1 = introText.length > 60 ? introText.slice(0, 57) + "..." : introText;
  const line2 = headlineText.length > 80
    ? headlineText.split(".")[0] || headlineText.slice(0, 77) + "..."
    : headlineText;

  // Subheader — use the subheader scene text, truncate if very long
  const subText = sceneMap.subheader?.text ?? "";
  const subheaderText = subText.length > 120 ? subText.slice(0, 117) + "..." : subText;

  return {
    logo: {
      file: "yld-logo-white.png",
      size: 480,
      glowEnabled: true,
      finalScale: 0.6,
      moveUpPx: 160,
      marginBottom: 15,
    },
    header: {
      line1,
      line1Size: 38,
      line1Animation: "charReveal",
      line2,
      line2Size: 52,
      line2Animation: "slideUp",
      highlight: sceneMap.headline?.highlight ?? sceneMap.intro?.highlight ?? "",
      marginBottom: 25,
    },
    subheader: {
      text: subheaderText,
      size: 28,
      animation: "typewriter",
      marginBottom: 45,
    },
    badge: {
      text: sceneMap.badge?.text ?? "The Journey Continues",
      enabled: true,
      marginBottom: 0,
    },
    cta: {
      text: sceneMap.cta?.text ?? "FOLLOW THE JOURNEY →",
      enabled: true,
      bottomOffset: 150,
    },
    divider: {
      enabled: true,
      marginBottom: 30,
    },
    theme: {
      accentColor,
      bgGradient,
      particlesEnabled: true,
      scanLineEnabled: true,
      gridEnabled: true,
      vignetteEnabled: true,
    },
    timing: {
      logoAppear: 20,
      logoMoveUp: 130,
      dividerAppear: 155,
      headerAppear: 165,
      subheaderAppear: 230,
      badgeAppear: 290,
      ctaAppear: 330,
    },
  };
}

async function processRenderJob(job: Job<RenderJobData>) {
  const { renderId, postId, format } = job.data;
  let { bgmTrackId } = job.data;
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
    const fps = 30;

    // Determine if we should use the premium yld-intro template
    const useYLDIntro = isYLDTemplate(templateId);
    const compositionId = useYLDIntro ? "yld-intro" : `${templateId}-${format}`;
    console.log(`[render-worker] Using composition: ${compositionId} (template: ${templateId})`);

    let templateProps: Record<string, unknown>;
    let totalFrames: number;

    if (useYLDIntro) {
      // Build yld-intro props from scenes or metadata
      if (metadata.sceneProps && typeof metadata.sceneProps === "object") {
        // If metadata already has yld-intro formatted props (logo, header, etc.), use directly
        const sp = metadata.sceneProps as Record<string, unknown>;
        if (sp.logo && sp.header && sp.theme) {
          templateProps = sp;
        } else {
          // sceneProps is in motivational-narration format, build from scenes instead
          templateProps = buildYLDIntroProps(postScenes, metadata);
        }
      } else {
        templateProps = buildYLDIntroProps(postScenes, metadata);
      }
      // yld-intro has a fixed animation timeline, ~12 seconds is ideal
      totalFrames = 400; // ~13.3s at 30fps — enough for all animations + fade out
    } else {
      // Original motivational-narration or other template logic
      const ENTRANCES = ["scaleIn", "slideUp", "fadeIn", "slideLeft", "slam"] as const;
      const SCENE_KEYS = ["intro", "headline", "subheader", "badge", "cta"];

      if (metadata.sceneProps && typeof metadata.sceneProps === "object") {
        templateProps = metadata.sceneProps as Record<string, unknown>;
        if (!templateProps.logo) {
          templateProps.logo = "yld-logo-white.png";
          templateProps.logoSize = 120;
        }
      } else {
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
          logo: metadata.logo as string | undefined ?? "yld-logo-white.png",
          logoSize: metadata.logoSize as number | undefined ?? 120,
          accentColor: metadata.accentColor ?? "#f59e0b",
          bgGradient: metadata.bgGradient ?? ["#0f0f0f", "#1a1a2e", "#0f0f0f"],
          particlesEnabled: true,
          transitionFrames,
          introHoldFrames,
        };
      }

      const sceneArray = templateProps.scenes as Array<{ startFrame: number; durationFrames: number }>;
      const lastScene = sceneArray?.[sceneArray.length - 1];
      totalFrames = lastScene
        ? lastScene.startFrame + lastScene.durationFrames + 30
        : 300;
    }

    // Auto-select BGM if none specified — pick the first available track
    if (!bgmTrackId) {
      const availableBgm = await db.select().from(bgmTracks).limit(1);
      if (availableBgm.length > 0) {
        bgmTrackId = availableBgm[0].id;
        console.log(`[render-worker] Auto-selected BGM: ${availableBgm[0].name} (${bgmTrackId})`);
      }
    }

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

          // Check if video has an audio stream
          let hasAudio = false;
          try {
            const audioCheck = execFileSync("ffprobe", [
              "-v", "quiet", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", outputPath,
            ], { encoding: "utf-8" }).trim();
            hasAudio = audioCheck.length > 0;
          } catch {
            hasAudio = false;
          }

          const bgmOutputPath = join(workDir, `render-${renderId}-bgm.mp4`);

          if (hasAudio) {
            // Mix BGM with existing audio
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
          } else {
            // Video-only: add BGM as the sole audio track (input 1 = bgm file)
            const filterComplex =
              `[1:a]volume=0.35,atrim=0:${duration.toFixed(2)},afade=t=out:st=${fadeStart.toFixed(2)}:d=${fadeOutDuration},asetpts=PTS-STARTPTS[bgm]`;

            execFileSync("ffmpeg", [
              "-y",
              "-i", outputPath,
              "-stream_loop", "-1", "-i", bgmLocalPath,
              "-filter_complex", filterComplex,
              "-map", "0:v", "-map", "[bgm]",
              "-c:v", "copy", "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
              bgmOutputPath,
            ], { timeout: 120_000 });
          }

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
