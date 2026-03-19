import { Hono } from "hono";
import { z } from "zod";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { db, users, count } from "@renderforge/db";
import { config } from "../config.js";

function seederPath(name: string): string {
  return join(process.cwd(), "scripts", "seeders", `${name}.ts`);
}

const setupRouter = new Hono();

const secret = new TextEncoder().encode(config.JWT_SECRET);

const AVAILABLE_PROJECTS = [
  {
    id: "yld",
    name: "Your Last Dollar",
    description: "Ethiopian/Amharic financial literacy & motivational content. 200 posts with scenes + BGM tracks.",
    icon: "DollarSign",
  },
  {
    id: "quran",
    name: "Quran (English + Amharic)",
    description: "Daily Quran recitation — Arabic text with translations. Word-by-word audio sync from Quran.com API.",
    icon: "BookOpen",
  },
  {
    id: "linguaforge",
    name: "LinguaForge",
    description: "Daily vocabulary flashcards — 120 English word posts with definitions, examples, and phonetics.",
    icon: "Languages",
  },
  {
    id: "kids",
    name: "Kids Corner",
    description: "Alphabet adventures, counting games, and icon quizzes for children. ~10 posts across 4 niches.",
    icon: "Baby",
  },
];

// GET /api/setup/status — check if setup is needed (public)
setupRouter.get("/status", async (c) => {
  const [result] = await db.select({ value: count() }).from(users);
  const needsSetup = result.value === 0;
  return c.json({
    needsSetup,
    availableProjects: needsSetup ? AVAILABLE_PROJECTS : [],
  });
});

const initSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  projects: z.array(z.string()),
});

// POST /api/setup/init — create admin + trigger seed (public, one-time)
setupRouter.post("/init", async (c) => {
  // Guard: only works if no users exist
  const [result] = await db.select({ value: count() }).from(users);
  if (result.value > 0) {
    return c.json({ error: "Setup already completed" }, 400);
  }

  const body = await c.req.json();
  const { name, email, password, projects: selectedProjects } = initSchema.parse(body);

  // Create admin user
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name,
      role: "admin",
    })
    .returning();

  // Create JWT token so the user is logged in immediately
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

  // Trigger seed in background (don't block the response)
  if (selectedProjects.length > 0) {
    seedProjectsInBackground(selectedProjects).catch((err) => {
      console.error("[setup] Background seed error:", err);
    });
  }

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    seedingProjects: selectedProjects,
  });
});

// GET /api/setup/seed-status — check if background seed is running
setupRouter.get("/seed-status", async (c) => {
  return c.json({
    seeding: isSeedRunning,
    completed: seedCompleted,
    error: seedError,
    logs: seedLogs.slice(-50),
  });
});

// ── Background seed state ──
let isSeedRunning = false;
let seedCompleted = false;
let seedError: string | null = null;
let seedLogs: string[] = [];

async function seedProjectsInBackground(selectedProjects: string[]) {
  isSeedRunning = true;
  seedCompleted = false;
  seedError = null;
  seedLogs = [];

  const log = (msg: string) => {
    seedLogs.push(msg);
    console.log(`[seed] ${msg}`);
  };

  try {
    for (const projectId of selectedProjects) {
      log(`Seeding ${projectId}...`);
      try {
        switch (projectId) {
          case "yld": {
            const { seedYLD } = await import(seederPath("yld"));
            await seedYLD();
            break;
          }
          case "quran": {
            const { seedQuran } = await import(seederPath("quran"));
            await seedQuran();
            break;
          }
          case "linguaforge": {
            const { seedLinguaForge } = await import(seederPath("linguaforge"));
            await seedLinguaForge();
            break;
          }
          case "kids": {
            const { seedKids } = await import(seederPath("kids"));
            await seedKids();
            break;
          }
          default:
            log(`Unknown project: ${projectId}`);
        }
        log(`${projectId} complete`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`${projectId} failed: ${msg}`);
      }
    }
    log("All seeding complete!");
    seedCompleted = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    seedError = msg;
    log(`Seed failed: ${msg}`);
  } finally {
    isSeedRunning = false;
  }
}

export { setupRouter };
