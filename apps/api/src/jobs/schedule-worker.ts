import { Worker, Queue } from "bullmq";
import { getRedis } from "../lib/redis.js";
import {
  db, projects, projectSchedules, posts, renders,
  eq, and, count,
} from "@renderforge/db";
import type { RenderJobData } from "./render-worker.js";

/**
 * Run schedule for a specific project — finds ready posts matching schedule rules
 * and creates render jobs for them.
 */
export async function runScheduleForProject(projectId: string): Promise<number> {
  const redis = getRedis();
  const renderQueue = new Queue<RenderJobData>("render", { connection: redis });

  const schedules = await db.select().from(projectSchedules)
    .where(and(
      eq(projectSchedules.projectId, projectId),
      eq(projectSchedules.enabled, true),
    ));

  const today = new Date();
  const dayOfWeek = today.getDay();

  let rendersCreated = 0;

  for (const schedule of schedules) {
    // Check if today matches the schedule's days of week
    if (!schedule.daysOfWeek.includes(dayOfWeek)) continue;

    // Find ready posts matching this schedule's template/format
    const conditions = [
      eq(posts.projectId, projectId),
      eq(posts.status, "ready"),
    ];
    if (schedule.templateId) conditions.push(eq(posts.templateId, schedule.templateId));
    if (schedule.format) conditions.push(eq(posts.format, schedule.format));

    const readyPosts = await db.select()
      .from(posts)
      .where(and(...conditions))
      .limit(schedule.postsPerDay);

    for (const post of readyPosts) {
      // Check if this post already has a completed or queued render
      const existingRenders = await db.select({ cnt: count() })
        .from(renders)
        .where(and(
          eq(renders.postId, post.id),
          eq(renders.format, schedule.format),
        ));

      if (Number(existingRenders[0]?.cnt ?? 0) > 0) continue;

      // Create render record
      const [render] = await db.insert(renders).values({
        postId: post.id,
        format: schedule.format,
        status: "queued",
      }).returning();

      // Queue render job
      await renderQueue.add("render", {
        renderId: render.id,
        postId: post.id,
        format: schedule.format,
      });

      rendersCreated++;
      console.log(`[schedule-worker] Queued render for post ${post.id} (${schedule.templateId}/${schedule.format})`);
    }
  }

  await renderQueue.close();
  return rendersCreated;
}

/**
 * Run schedule check for all active projects with autoRender enabled.
 */
async function processSchedules() {
  console.log("[schedule-worker] Running daily schedule check...");

  // Find all active projects that have at least one autoRender schedule
  const activeSchedules = await db.select({
    projectId: projectSchedules.projectId,
  })
    .from(projectSchedules)
    .innerJoin(projects, eq(projectSchedules.projectId, projects.id))
    .where(and(
      eq(projectSchedules.enabled, true),
      eq(projectSchedules.autoRender, true),
      eq(projects.status, "active"),
    ))
    .groupBy(projectSchedules.projectId);

  let totalRendersCreated = 0;

  for (const { projectId } of activeSchedules) {
    try {
      const created = await runScheduleForProject(projectId);
      totalRendersCreated += created;
    } catch (err) {
      console.error(`[schedule-worker] Error processing project ${projectId}:`, err);
    }
  }

  console.log(`[schedule-worker] Done. Created ${totalRendersCreated} render(s).`);
}

export function createScheduleWorker() {
  const redis = getRedis();

  // Create a repeating job that runs daily at 6:00 AM
  const scheduleQueue = new Queue("schedule", { connection: redis });
  scheduleQueue.add("daily-schedule", {}, {
    repeat: {
      pattern: "0 6 * * *", // 6 AM daily
    },
  }).catch((err) => {
    console.warn("[schedule-worker] Failed to register repeating job:", err);
  });

  const worker = new Worker("schedule", async () => {
    await processSchedules();
  }, {
    connection: redis,
    concurrency: 1,
  });

  worker.on("completed", (job) => {
    console.log(`[schedule-worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[schedule-worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
