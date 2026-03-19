/**
 * Admin User Seeder
 *
 * Creates the default admin user (admin@renderforge.com / admin123).
 * Skips if a user with that email already exists.
 */
import bcrypt from "bcryptjs";
import { db, users, eq } from "@renderforge/db";

export async function seedAdmin() {
  console.log("\n── Admin User ──");

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "admin@renderforge.com"))
    .limit(1);

  if (existing.length > 0) {
    console.log("  Admin user already exists, skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@renderforge.com",
    passwordHash,
    name: "Admin",
    role: "admin",
  });
  console.log("  Created: admin@renderforge.com / admin123");
}
