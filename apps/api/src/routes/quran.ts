import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import {
  fetchChapters,
  previewQuranContent,
  buildQuranPosts,
  QURAN_THEMES,
  RECITERS,
  TRANSLATIONS,
} from "../services/quran.js";
import { db, posts } from "@renderforge/db";
import { projectService } from "../services/project.js";

const quranRouter = new Hono();
quranRouter.use("*", authMiddleware);

// Static reference data
quranRouter.get("/meta", (c) => {
  return c.json({ themes: QURAN_THEMES, reciters: RECITERS, translations: TRANSLATIONS });
});

// List all 114 surahs
quranRouter.get("/surahs", async (c) => {
  try {
    const chapters = await fetchChapters();
    return c.json(chapters);
  } catch (err) {
    return c.json({ error: "Failed to fetch surahs from quran.com" }, 502);
  }
});

// Preview — fetches from quran.com without creating posts
const previewSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  reciterId: z.number().int().default(7),
  ayahStart: z.number().int().min(1).optional(),
  ayahEnd: z.number().int().min(1).optional(),
  translationId: z.number().int().default(20),
  themeIndex: z.number().int().min(0).max(7).default(0),
});

quranRouter.post("/preview", async (c) => {
  const body = previewSchema.parse(await c.req.json());

  try {
    const preview = await previewQuranContent(body);
    return c.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    if (message.includes("exceeds total verses")) {
      return c.json({ error: message }, 422);
    }
    return c.json({ error: message }, 502);
  }
});

// Create posts from Quran content
const createSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  reciterId: z.number().int().default(7),
  ayahStart: z.number().int().min(1).optional(),
  ayahEnd: z.number().int().min(1).optional(),
  translationId: z.number().int().default(20),
  themeIndex: z.number().int().min(0).max(7).default(0),
  projectId: z.string().uuid(),
  nicheId: z.string().uuid(),
  format: z.enum(["story", "post", "landscape"]).default("story"),
  brandName: z.string().optional(),
  socialHandle: z.string().optional(),
  ctaText: z.string().optional(),
});

quranRouter.post("/create", async (c) => {
  const body = createSchema.parse(await c.req.json());

  // Get project config for branding defaults
  const projectConfig = await projectService.getProjectConfig(body.projectId);
  const project = await projectService.getById(body.projectId);

  const brandName = body.brandName || project?.name || "Quran Daily";
  const socialHandle = body.socialHandle
    || (projectConfig?.socialHandles as Record<string, string>)?.tiktok
    || "@quran_daily";
  const ctaText = body.ctaText || "Follow for daily Quran";

  try {
    const postDataList = await buildQuranPosts({
      surahNumber: body.surahNumber,
      reciterId: body.reciterId,
      translationId: body.translationId,
      ayahStart: body.ayahStart,
      ayahEnd: body.ayahEnd,
      themeIndex: body.themeIndex,
      brandName,
      socialHandle,
      ctaText,
    });

    // Insert all posts
    const createdPosts = [];
    for (const postData of postDataList) {
      const [created] = await db
        .insert(posts)
        .values({
          nicheId: body.nicheId,
          projectId: body.projectId,
          title: postData.title,
          status: "ready",
          theme: "default",
          templateId: "quran-ayah",
          format: body.format,
          metadata: {
            sceneProps: postData.sceneProps,
            totalDurationMs: postData.totalDurationMs,
            thumbnailMeta: postData.thumbnailMeta,
          },
        })
        .returning();

      createdPosts.push({
        id: created.id,
        title: created.title,
        ayahRange: postData.ayahRange,
        ayahCount: postData.ayahCount,
        durationMs: postData.totalDurationMs,
      });
    }

    return c.json({
      created: createdPosts.length,
      posts: createdPosts,
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Creation failed";
    if (message.includes("exceeds total verses")) {
      return c.json({ error: message }, 422);
    }
    return c.json({ error: message }, 502);
  }
});

export { quranRouter };
