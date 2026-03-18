import { Hono } from "hono";
import { imageLibraryService } from "../services/image-library.js";
import { storage } from "../services/storage.js";
import { authMiddleware } from "../middleware/auth.js";
import { randomUUID } from "node:crypto";

const imagesRouter = new Hono();

imagesRouter.use("*", authMiddleware);

// List images with optional filters and pagination
imagesRouter.get("/", async (c) => {
  const category = c.req.query("category");
  const tagsParam = c.req.query("tags");
  const search = c.req.query("search");
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = parseInt(c.req.query("perPage") || "24", 10);

  const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()) : undefined;

  const result = await imageLibraryService.list({ category, tags, search, page, perPage });

  // Attach presigned URLs
  const imagesWithUrls = await Promise.all(
    result.items.map(async (img) => ({
      ...img,
      url: await storage.getPresignedUrl(img.s3Key),
    })),
  );

  return c.json({
    items: imagesWithUrls,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });
});

// Get single image
imagesRouter.get("/:id", async (c) => {
  const image = await imageLibraryService.getById(c.req.param("id"));
  if (!image) return c.json({ error: "Not found" }, 404);

  const url = await storage.getPresignedUrl(image.s3Key);
  return c.json({ ...image, url });
});

// Upload image
imagesRouter.post("/", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: png, jpeg, webp, gif" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const s3Key = `images/${randomUUID()}.${ext}`;

  await storage.upload(s3Key, buffer, file.type);

  const tagsParam = body["tags"];
  const tags = typeof tagsParam === "string" && tagsParam
    ? tagsParam.split(",").map((t) => t.trim())
    : undefined;

  const image = await imageLibraryService.create({
    filename: file.name,
    s3Key,
    mimeType: file.type,
    fileSize: buffer.length,
    tags,
    category: body["category"] ? String(body["category"]) : undefined,
    description: body["description"] ? String(body["description"]) : undefined,
  });

  const url = await storage.getPresignedUrl(s3Key);
  return c.json({ ...image, url }, 201);
});

// Update image metadata
imagesRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await imageLibraryService.getById(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  const update: { tags?: string[]; category?: string; description?: string } = {};

  if (body.tags !== undefined) update.tags = body.tags;
  if (body.category !== undefined) update.category = body.category;
  if (body.description !== undefined) update.description = body.description;

  const image = await imageLibraryService.update(id, update);
  return c.json(image);
});

// Delete image
imagesRouter.delete("/:id", async (c) => {
  const image = await imageLibraryService.delete(c.req.param("id"));
  if (!image) return c.json({ error: "Not found" }, 404);

  await storage.delete(image.s3Key).catch(() => {});
  return c.json({ success: true });
});

export { imagesRouter };
