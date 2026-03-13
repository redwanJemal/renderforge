import { Hono } from "hono";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { storage } from "../services/storage.js";
import { authMiddleware } from "../middleware/auth.js";

const execFileAsync = promisify(execFile);

const uploads = new Hono();

uploads.use("*", authMiddleware);

async function detectAudioDuration(buffer: Buffer): Promise<number> {
  const tmpPath = join(tmpdir(), `audio-${randomUUID()}.wav`);
  try {
    await writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      tmpPath,
    ]);
    return parseFloat(stdout.trim());
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

uploads.post("/audio", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "wav";
  const key = `audio/${randomUUID()}.${ext}`;

  const [, durationSeconds] = await Promise.all([
    storage.upload(key, buffer, file.type || "audio/wav"),
    detectAudioDuration(buffer),
  ]);

  const url = await storage.getPresignedUrl(key);

  return c.json({
    key,
    url,
    duration_seconds: durationSeconds,
    size: buffer.length,
  }, 201);
});

uploads.get("/files/:key{.+}", async (c) => {
  const key = c.req.param("key");
  try {
    const url = await storage.getPresignedUrl(key);
    return c.redirect(url);
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

export { uploads };
