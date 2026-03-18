import { Hono } from "hono";
import { z } from "zod";
import { projectService } from "../services/project.js";
import { authMiddleware } from "../middleware/auth.js";

const projectsRouter = new Hono();

projectsRouter.use("*", authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  socialHandles: z.record(z.string()).optional(),
  colorPalette: z.record(z.string()).optional(),
  defaultVoiceId: z.string().nullable().optional(),
  enableIntro: z.boolean().optional(),
  enableOutro: z.boolean().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
});

const scheduleSchema = z.object({
  templateId: z.string().min(1),
  format: z.string().min(1),
  theme: z.string().nullable().optional(),
  postsPerDay: z.number().int().min(1).max(50).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  autoRender: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

// CRUD
projectsRouter.get("/", async (c) => {
  const result = await projectService.list({
    status: c.req.query("status"),
    page: Number(c.req.query("page") ?? 1),
    perPage: Number(c.req.query("perPage") ?? 20),
  });
  return c.json(result);
});

projectsRouter.get("/:id", async (c) => {
  const project = await projectService.getById(c.req.param("id"));
  if (!project) return c.json({ error: "Not found" }, 404);
  return c.json(project);
});

projectsRouter.post("/", async (c) => {
  const body = createSchema.parse(await c.req.json());
  const project = await projectService.create(body);
  return c.json(project, 201);
});

projectsRouter.put("/:id", async (c) => {
  const body = createSchema.partial().parse(await c.req.json());
  const project = await projectService.update(c.req.param("id"), body);
  if (!project) return c.json({ error: "Not found" }, 404);
  return c.json(project);
});

projectsRouter.delete("/:id", async (c) => {
  const project = await projectService.delete(c.req.param("id"));
  if (!project) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// Schedules
projectsRouter.get("/:id/schedules", async (c) => {
  const schedules = await projectService.getSchedules(c.req.param("id"));
  return c.json(schedules);
});

projectsRouter.post("/:id/schedules", async (c) => {
  const body = scheduleSchema.parse(await c.req.json());
  const schedule = await projectService.createSchedule({
    ...body,
    projectId: c.req.param("id"),
  });
  return c.json(schedule, 201);
});

projectsRouter.put("/:id/schedules/:scheduleId", async (c) => {
  const body = scheduleSchema.partial().parse(await c.req.json());
  const schedule = await projectService.updateSchedule(c.req.param("scheduleId"), body);
  if (!schedule) return c.json({ error: "Not found" }, 404);
  return c.json(schedule);
});

projectsRouter.delete("/:id/schedules/:scheduleId", async (c) => {
  const schedule = await projectService.deleteSchedule(c.req.param("scheduleId"));
  if (!schedule) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// Social Account Links
projectsRouter.post("/:id/social-accounts", async (c) => {
  const { socialAccountId } = z.object({ socialAccountId: z.string().uuid() }).parse(await c.req.json());
  const link = await projectService.linkSocialAccount(c.req.param("id"), socialAccountId);
  return c.json(link, 201);
});

projectsRouter.delete("/:id/social-accounts/:saId", async (c) => {
  const result = await projectService.unlinkSocialAccount(c.req.param("id"), c.req.param("saId"));
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// Calendar
projectsRouter.get("/:id/calendar", async (c) => {
  const month = Number(c.req.query("month") ?? new Date().getMonth() + 1);
  const year = Number(c.req.query("year") ?? new Date().getFullYear());
  const data = await projectService.getCalendarData(c.req.param("id"), month, year);
  return c.json(data);
});

// Manual schedule trigger
projectsRouter.post("/:id/run-schedule", async (c) => {
  // Import dynamically to avoid circular deps
  const { runScheduleForProject } = await import("../jobs/schedule-worker.js");
  const count = await runScheduleForProject(c.req.param("id"));
  return c.json({ success: true, rendersCreated: count });
});

export { projectsRouter };
