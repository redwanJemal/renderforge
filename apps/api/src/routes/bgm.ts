import { Hono } from "hono";
import { z } from "zod";
import { bgmService } from "../services/bgm.js";
import { storage } from "../services/storage.js";
import { authMiddleware } from "../middleware/auth.js";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const bgmRouter = new Hono();

bgmRouter.use("*", authMiddleware);

bgmRouter.get("/", async (c) => {
  const nicheId = c.req.query("nicheId");
  const tracks = await bgmService.list(nicheId);
  return c.json(tracks);
});

bgmRouter.get("/:id", async (c) => {
  const track = await bgmService.getById(c.req.param("id"));
  if (!track) return c.json({ error: "Not found" }, 404);
  return c.json(track);
});

bgmRouter.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const name = String(body["name"] ?? "");
  const category = body["category"] ? String(body["category"]) : undefined;
  const nicheId = body["nicheId"] ? String(body["nicheId"]) : undefined;

  if (!(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }
  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "mp3";
  const key = `bgm/${randomUUID()}.${ext}`;

  await storage.upload(key, buffer, file.type || "audio/mpeg");

  // Detect duration
  const tmpPath = join(tmpdir(), `bgm-${randomUUID()}.${ext}`);
  let durationSeconds = "0";
  try {
    await writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", tmpPath,
    ]);
    durationSeconds = stdout.trim();
  } finally {
    await unlink(tmpPath).catch(() => {});
  }

  const track = await bgmService.create({ name, fileUrl: key, durationSeconds, category, nicheId });
  return c.json(track, 201);
});

bgmRouter.delete("/:id", async (c) => {
  const track = await bgmService.delete(c.req.param("id"));
  if (!track) return c.json({ error: "Not found" }, 404);
  await storage.delete(track.fileUrl).catch(() => {});
  return c.json({ success: true });
});

export { bgmRouter };
