import type { ErrorHandler } from "hono";
import { ZodError } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      { error: "Validation error", details: err.flatten() },
      400,
    );
  }

  if (err.message === "Unauthorized" || err.message === "Invalid token") {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (err.message === "Not found") {
    return c.json({ error: "Not found" }, 404);
  }

  console.error("Unhandled error:", err);

  return c.json(
    { error: c.env?.NODE_ENV === "production" ? "Internal server error" : err.message },
    500,
  );
};
