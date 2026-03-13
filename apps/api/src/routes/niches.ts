import { Hono } from "hono";
import { z } from "zod";
import { nicheService } from "../services/niche.js";
import { authMiddleware } from "../middleware/auth.js";

const nichesRouter = new Hono();

nichesRouter.use("*", authMiddleware);

const createSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  defaultTemplateId: z.string().optional(),
  voiceId: z.string().optional(),
  languages: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

nichesRouter.get("/", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const perPage = Number(c.req.query("perPage") ?? 20);
  const result = await nicheService.list(page, perPage);
  return c.json(result);
});

nichesRouter.get("/:id", async (c) => {
  const niche = await nicheService.getById(c.req.param("id"));
  if (!niche) return c.json({ error: "Not found" }, 404);
  return c.json(niche);
});

nichesRouter.post("/", async (c) => {
  const body = createSchema.parse(await c.req.json());
  const niche = await nicheService.create(body);
  return c.json(niche, 201);
});

nichesRouter.put("/:id", async (c) => {
  const body = createSchema.partial().parse(await c.req.json());
  const niche = await nicheService.update(c.req.param("id"), body);
  if (!niche) return c.json({ error: "Not found" }, 404);
  return c.json(niche);
});

nichesRouter.delete("/:id", async (c) => {
  const niche = await nicheService.delete(c.req.param("id"));
  if (!niche) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export { nichesRouter };
