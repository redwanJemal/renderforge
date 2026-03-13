import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, users, niches } from "./index";

const NICHES = [
  { slug: "motivational", name: "Motivational", defaultTemplateId: "motivational-narration", voiceId: "les-brown", languages: ["en"], config: { segmentPattern: ["intro", "headline", "subheader", "badge", "cta"] } },
  { slug: "kids-education", name: "Kids Education", defaultTemplateId: "kids-alphabet-adventure", voiceId: "kids-cheerful", languages: ["en"], config: { segmentPattern: ["intro", "letter*", "outro"] } },
  { slug: "kids-bedtime", name: "Kids Bedtime Stories", defaultTemplateId: "kids-bedtime-story", voiceId: "gentle-storyteller", languages: ["en"], config: { segmentPattern: ["intro", "page*", "outro"] } },
  { slug: "news", name: "Breaking News", defaultTemplateId: "breaking-news", voiceId: "morgan-freeman", languages: ["en"], config: { segmentPattern: ["intro", "section*", "outro"] } },
  { slug: "how-to", name: "How-To Guides", defaultTemplateId: "slider", voiceId: "mel-robbins", languages: ["en"], config: { segmentPattern: ["intro", "slide*", "outro"] } },
  { slug: "luxury", name: "Dubai Luxury", defaultTemplateId: "dubai-luxury", voiceId: "denzel-washington", languages: ["en"], config: { segmentPattern: ["intro", "section*", "outro"] } },
  { slug: "sports", name: "Sports", defaultTemplateId: "match-fixture", voiceId: "eric-thomas", languages: ["en"], config: { segmentPattern: ["intro", "section*", "outro"] } },
  { slug: "jokes", name: "Jokes & Comedy", defaultTemplateId: "motivational-narration", voiceId: "les-brown", languages: ["en"], config: { segmentPattern: ["intro", "setup", "punchline", "callback", "cta"] } },
  { slug: "finance", name: "Finance & Business", defaultTemplateId: "motivational-narration", voiceId: "les-brown", languages: ["en", "am"], config: { segmentPattern: ["intro", "headline", "subheader", "badge", "cta"] } },
];

async function seed() {
  console.log("Seeding database...");

  // Seed admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  await db
    .insert(users)
    .values({
      email: "admin@renderforge.com",
      passwordHash,
      name: "Admin",
      role: "admin",
    })
    .onConflictDoNothing({ target: users.email });

  console.log("Admin user seeded: admin@renderforge.com / admin123");

  // Seed niches
  for (const niche of NICHES) {
    await db
      .insert(niches)
      .values(niche)
      .onConflictDoNothing({ target: niches.slug });
  }

  console.log(`${NICHES.length} niches seeded`);
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
