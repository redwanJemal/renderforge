import type { MiddlewareHandler } from "hono";
import { jwtVerify } from "jose";
import { config } from "../config.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const secret = new TextEncoder().encode(config.JWT_SECRET);

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, secret);
    c.set("user", payload as unknown as AuthUser);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
};
