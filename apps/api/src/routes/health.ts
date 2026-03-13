import { Hono } from "hono";
import { db, sql } from "@renderforge/db";

const health = new Hono();

const startTime = Date.now();

health.get("/", async (c) => {
  let dbStatus = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "error";
  }

  return c.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export { health };
