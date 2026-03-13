import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";

const storageProxy = new Hono();

storageProxy.use("*", authMiddleware);

// Proxy S3 objects (thumbnails, etc.) to avoid CORS/presigned URL complexity
storageProxy.get("/*", async (c) => {
  const key = c.req.path.replace(/^\//, "");
  if (!key) return c.json({ error: "No key" }, 400);

  try {
    const { storage } = await import("../services/storage.js");
    const buffer = await storage.download(key);

    const ext = key.split(".").pop()?.toLowerCase();
    const contentType = ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "mp4"
          ? "video/mp4"
          : "application/octet-stream";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

export { storageProxy };
