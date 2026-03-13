import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db, users, eq } from "@renderforge/db";
import { config } from "../config.js";
import { authMiddleware } from "../middleware/auth.js";

const auth = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const secret = new TextEncoder().encode(config.JWT_SECRET);

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const { email, password } = loginSchema.parse(body);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

auth.get("/me", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json(user);
});

export { auth };
