import { Hono } from "hono";
import { z } from "zod";
import { db, users, eq } from "@renderforge/db";
import { authMiddleware } from "../middleware/auth.js";
import { config } from "../config.js";
import { bgmService } from "../services/bgm.js";
import { storage } from "../services/storage.js";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";

const execFileAsync = promisify(execFile);
const settingsRouter = new Hono();

settingsRouter.use("*", authMiddleware);

// Profile
settingsRouter.get("/profile", async (c) => {
  const user = c.get("user" as never) as { id: string };
  const [profile] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!profile) return c.json({ error: "Not found" }, 404);
  return c.json(profile);
});

settingsRouter.patch("/profile", async (c) => {
  const user = c.get("user" as never) as { id: string };
  const body = z
    .object({ name: z.string().optional(), email: z.string().email().optional() })
    .parse(await c.req.json());

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.email) updates.email = body.email;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  return c.json(updated);
});

// Password change
settingsRouter.post("/password", async (c) => {
  const user = c.get("user" as never) as { id: string };
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string(), newPassword: z.string().min(6) })
    .parse(await c.req.json());

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) return c.json({ error: "User not found" }, 404);

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) return c.json({ error: "Current password is incorrect" }, 400);

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));

  return c.json({ success: true });
});

// Storage info
settingsRouter.get("/storage", async (c) => {
  let connected = false;
  try {
    await storage.list("");
    connected = true;
  } catch {
    connected = false;
  }

  return c.json({
    endpoint: config.S3_ENDPOINT,
    bucket: config.S3_BUCKET,
    connected,
    usedBytes: 0,
    totalBytes: 0,
  });
});

// BGM library via settings
settingsRouter.get("/bgm", async (c) => {
  const tracks = await bgmService.list();
  return c.json(
    tracks.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      durationSeconds: t.durationSeconds ? parseFloat(t.durationSeconds) : 0,
      url: t.fileUrl,
    })),
  );
});

settingsRouter.post("/bgm", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  const name = String(body["name"] ?? "");
  const category = body["category"] ? String(body["category"]) : "general";

  if (!(file instanceof File)) return c.json({ error: "No file uploaded" }, 400);
  if (!name) return c.json({ error: "Name is required" }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "mp3";
  const key = `bgm/${randomUUID()}.${ext}`;

  await storage.upload(key, buffer, file.type || "audio/mpeg");

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

  const track = await bgmService.create({ name, fileUrl: key, durationSeconds, category });
  return c.json(track, 201);
});

settingsRouter.delete("/bgm/:id", async (c) => {
  const track = await bgmService.delete(c.req.param("id"));
  if (!track) return c.json({ error: "Not found" }, 404);
  await storage.delete(track.fileUrl).catch(() => {});
  return c.json({ success: true });
});

export { settingsRouter };
