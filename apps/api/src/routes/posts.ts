import { Hono } from "hono";
import { z } from "zod";
import { postService } from "../services/post.js";
import { authMiddleware } from "../middleware/auth.js";
import type { PostStatus } from "@renderforge/shared";

const postsRouter = new Hono();

postsRouter.use("*", authMiddleware);

const createSchema = z.object({
  nicheId: z.string().uuid(),
  title: z.string().min(1),
  theme: z.string().optional(),
  templateId: z.string().optional(),
  format: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  scenes: z.array(z.object({
    sortOrder: z.number(),
    key: z.string(),
    displayText: z.string().optional(),
    narrationText: z.string().optional(),
    entrance: z.string().optional(),
    textSize: z.string().optional(),
    extraProps: z.record(z.unknown()).optional(),
  })).optional(),
});

const scenesSchema = z.array(z.object({
  id: z.string().optional(),
  sortOrder: z.number(),
  key: z.string(),
  displayText: z.string().optional(),
  narrationText: z.string().optional(),
  audioUrl: z.string().optional(),
  durationSeconds: z.string().optional(),
  entrance: z.string().optional(),
  textSize: z.string().optional(),
  extraProps: z.record(z.unknown()).optional(),
}));

postsRouter.get("/", async (c) => {
  const result = await postService.list({
    nicheId: c.req.query("nicheId"),
    status: c.req.query("status"),
    search: c.req.query("search"),
    page: Number(c.req.query("page") ?? 1),
    perPage: Number(c.req.query("perPage") ?? 20),
  });
  return c.json(result);
});

postsRouter.get("/:id", async (c) => {
  const post = await postService.getById(c.req.param("id"));
  if (!post) return c.json({ error: "Not found" }, 404);
  return c.json(post);
});

postsRouter.post("/", async (c) => {
  const body = createSchema.parse(await c.req.json());
  const post = await postService.create(body);
  return c.json(post, 201);
});

postsRouter.put("/:id", async (c) => {
  const body = createSchema.partial().omit({ scenes: true }).parse(await c.req.json());
  const post = await postService.update(c.req.param("id"), body);
  if (!post) return c.json({ error: "Not found" }, 404);
  return c.json(post);
});

postsRouter.patch("/:id/status", async (c) => {
  const { status } = z.object({ status: z.string() }).parse(await c.req.json());
  try {
    const post = await postService.updateStatus(c.req.param("id"), status as PostStatus);
    if (!post) return c.json({ error: "Not found" }, 404);
    return c.json(post);
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

postsRouter.put("/:id/scenes", async (c) => {
  const body = scenesSchema.parse(await c.req.json());
  const result = await postService.upsertScenes(c.req.param("id"), body);
  return c.json(result);
});

postsRouter.delete("/:id", async (c) => {
  const post = await postService.delete(c.req.param("id"));
  if (!post) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// Task 08: Per-scene audio upload
postsRouter.post("/:id/scenes/:sceneId/audio", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  // Import storage dynamically to avoid circular deps
  const { storage } = await import("../services/storage.js");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { writeFile, unlink } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { randomUUID } = await import("node:crypto");

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "wav";
  const key = `audio/scenes/${c.req.param("sceneId")}.${ext}`;

  await storage.upload(key, buffer, file.type || "audio/wav");

  // Detect duration via ffprobe
  const execFileAsync = promisify(execFile);
  const tmpPath = join(tmpdir(), `audio-${randomUUID()}.${ext}`);
  let durationSeconds = "0";
  try {
    await writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      tmpPath,
    ]);
    durationSeconds = stdout.trim();
  } finally {
    await unlink(tmpPath).catch(() => {});
  }

  const scene = await postService.updateSceneAudio(
    c.req.param("sceneId"),
    key,
    durationSeconds,
  );

  if (!scene) return c.json({ error: "Scene not found" }, 404);

  // Auto-transition to ready if all scenes have audio
  const allHaveAudio = await postService.checkAllScenesHaveAudio(c.req.param("id"));
  if (allHaveAudio) {
    try {
      await postService.updateStatus(c.req.param("id"), "ready");
    } catch {
      // May not be in audio_pending status, that's ok
    }
  }

  return c.json({
    scene,
    duration_seconds: parseFloat(durationSeconds),
    all_scenes_have_audio: allHaveAudio,
  });
});

// Task 08: Manifest endpoint
postsRouter.get("/:id/manifest", async (c) => {
  const post = await postService.getById(c.req.param("id"));
  if (!post) return c.json({ error: "Not found" }, 404);

  const fps = 30;
  const manifest = post.scenes.map((scene) => ({
    key: scene.key,
    displayText: scene.displayText,
    narrationText: scene.narrationText,
    audioUrl: scene.audioUrl,
    durationSeconds: scene.durationSeconds ? parseFloat(scene.durationSeconds) : 0,
    frames: scene.durationSeconds ? Math.ceil(parseFloat(scene.durationSeconds) * fps) : 90,
    entrance: scene.entrance,
    textSize: scene.textSize,
    extraProps: scene.extraProps,
  }));

  const totalFrames = manifest.reduce((sum, s) => sum + s.frames, 0);

  return c.json({
    postId: post.id,
    title: post.title,
    templateId: post.templateId,
    format: post.format,
    theme: post.theme,
    fps,
    totalFrames,
    scenes: manifest,
  });
});

// Task 08: TTS script export
postsRouter.get("/:id/tts-script", async (c) => {
  const post = await postService.getById(c.req.param("id"));
  if (!post) return c.json({ error: "Not found" }, 404);

  // Generate slug from title for filename prefix
  const slug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const scripts = post.scenes
    .filter((s) => s.narrationText)
    .map((scene, index) => ({
      key: scene.key,
      text: scene.narrationText,
      sortOrder: scene.sortOrder,
      // Filename the TTS notebook should save as: e.g. "power-of-persistence_00_intro.wav"
      filename: `${slug}_${String(index).padStart(2, "0")}_${scene.key}.wav`,
    }));

  return c.json({
    postId: post.id,
    title: post.title,
    slug,
    totalScenes: scripts.length,
    scenes: scripts,
    // Python code hint for the TTS notebook
    usage: `# In your TTS notebook, iterate scenes and save each with scene['filename']`,
  });
});

export { postsRouter };
