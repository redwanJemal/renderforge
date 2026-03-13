import { Hono } from "hono";
import { dashboardService } from "../services/dashboard.js";
import { authMiddleware } from "../middleware/auth.js";

const dashboardRouter = new Hono();

dashboardRouter.use("*", authMiddleware);

dashboardRouter.get("/stats", async (c) => {
  const stats = await dashboardService.getStats();
  return c.json(stats);
});

export { dashboardRouter };
