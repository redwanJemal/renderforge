import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.js";

const templatesRouter = new Hono();

templatesRouter.use("*", authMiddleware);

// Static template registry — mirrors apps/renderer/templates/
const TEMPLATES = [
  { id: "motivational-narration", name: "Motivational Narration", category: "motivational", formats: ["story", "post", "landscape"] },
  { id: "breaking-news", name: "Breaking News", category: "news", formats: ["story", "post", "landscape"] },
  { id: "dubai-luxury", name: "Dubai Luxury", category: "luxury", formats: ["story", "post"] },
  { id: "slider", name: "Slider", category: "general", formats: ["story", "post", "landscape"] },
  { id: "kinetic-text", name: "Kinetic Text", category: "general", formats: ["story", "post", "landscape"] },
  { id: "quote-of-day", name: "Quote of the Day", category: "motivational", formats: ["story", "post"] },
  { id: "kids-alphabet-adventure", name: "Kids Alphabet Adventure", category: "kids", formats: ["story", "landscape"] },
  { id: "kids-bedtime-story", name: "Kids Bedtime Story", category: "kids", formats: ["story", "landscape"] },
  { id: "kids-counting-fun", name: "Kids Counting Fun", category: "kids", formats: ["story", "landscape"] },
  { id: "kids-icon-quiz", name: "Kids Icon Quiz", category: "kids", formats: ["story", "landscape"] },
  { id: "match-fixture", name: "Match Fixture", category: "sports", formats: ["story", "post"] },
  { id: "post-match", name: "Post Match", category: "sports", formats: ["story", "post"] },
  { id: "stats-recap", name: "Stats Recap", category: "sports", formats: ["story", "post", "landscape"] },
  { id: "announcement", name: "Announcement", category: "general", formats: ["story", "post"] },
  { id: "countdown", name: "Countdown", category: "general", formats: ["story", "post"] },
  { id: "cover", name: "Cover", category: "general", formats: ["story", "post", "landscape"] },
  { id: "glitch-text", name: "Glitch Text", category: "general", formats: ["story", "post"] },
  { id: "gold-reveal", name: "Gold Reveal", category: "luxury", formats: ["story", "post"] },
  { id: "neon-glow", name: "Neon Glow", category: "general", formats: ["story", "post"] },
  { id: "orbit", name: "Orbit", category: "general", formats: ["story", "post"] },
  { id: "parallax-layers", name: "Parallax Layers", category: "general", formats: ["story", "post", "landscape"] },
  { id: "product-launch", name: "Product Launch", category: "general", formats: ["story", "post"] },
  { id: "ramadan-greeting", name: "Ramadan Greeting", category: "general", formats: ["story", "post"] },
  { id: "showcase", name: "Showcase", category: "general", formats: ["story", "post", "landscape"] },
  { id: "split-reveal", name: "Split Reveal", category: "general", formats: ["story", "post"] },
  { id: "testimonial", name: "Testimonial", category: "general", formats: ["story", "post"] },
  { id: "yld-intro", name: "YLD Intro", category: "finance", formats: ["story", "landscape"] },
];

templatesRouter.get("/", (c) => {
  return c.json({ items: TEMPLATES, total: TEMPLATES.length });
});

const THEMES = [
  { id: "default", name: "Default" },
  { id: "dark", name: "Dark" },
  { id: "vibrant", name: "Vibrant" },
  { id: "minimal", name: "Minimal" },
  { id: "kids-playful", name: "Kids Playful" },
  { id: "kids-pastel", name: "Kids Pastel" },
];

templatesRouter.get("/themes", (c) => {
  return c.json({ items: THEMES, total: THEMES.length });
});

templatesRouter.get("/:id", (c) => {
  const template = TEMPLATES.find((t) => t.id === c.req.param("id"));
  if (!template) return c.json({ error: "Not found" }, 404);
  return c.json(template);
});

export { templatesRouter };
