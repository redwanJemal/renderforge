import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";
import { logger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { health } from "./routes/health.js";
import { auth } from "./routes/auth.js";
import { sse } from "./routes/sse.js";
import { uploads } from "./routes/uploads.js";
import { nichesRouter } from "./routes/niches.js";
import { postsRouter } from "./routes/posts.js";
import { rendersRouter } from "./routes/renders.js";
import { bgmRouter } from "./routes/bgm.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { socialRouter } from "./routes/social.js";
import { analyticsRouter } from "./routes/analytics.js";
import { templatesRouter } from "./routes/templates.js";
import { settingsRouter } from "./routes/settings.js";
import { publishingRouter } from "./routes/publishing.js";
import { storageProxy } from "./routes/storage-proxy.js";
import { imagesRouter } from "./routes/images.js";
import { projectsRouter } from "./routes/projects.js";
import { quranRouter } from "./routes/quran.js";
import { setupRouter } from "./routes/setup.js";
import { createRenderWorker } from "./jobs/render-worker.js";
import { createPublishWorker } from "./jobs/publish-worker.js";
import { createScheduleWorker } from "./jobs/schedule-worker.js";
import { closeRedis } from "./lib/redis.js";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger);
app.onError(errorHandler);

// Public routes
app.route("/health", health);
app.route("/api/auth", auth);
app.route("/api/setup", setupRouter);
app.route("/api/sse", sse);

// Protected routes
app.route("/api/niches", nichesRouter);
app.route("/api/posts", postsRouter);
app.route("/api/renders", rendersRouter);
app.route("/api/bgm", bgmRouter);
app.route("/api/uploads", uploads);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/social", socialRouter);
app.route("/api/analytics", analyticsRouter);
app.route("/api/templates", templatesRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/publishing", publishingRouter);
app.route("/api/images", imagesRouter);
app.route("/api/projects", projectsRouter);
app.route("/api/quran", quranRouter);
app.route("/api/storage", storageProxy);

// Root
app.get("/", (c) => {
  return c.json({ name: "RenderForge Studio API", version: "0.1.0" });
});

// Start workers
const renderWorker = createRenderWorker();
const publishWorker = createPublishWorker();
const scheduleWorker = createScheduleWorker();

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down...");
  await renderWorker.close();
  await publishWorker.close();
  await scheduleWorker.close();
  await closeRedis();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`RenderForge API starting on port ${config.PORT}...`);

serve({
  fetch: app.fetch,
  port: config.PORT,
});

console.log(`RenderForge API running at http://localhost:${config.PORT}`);

export { app };
