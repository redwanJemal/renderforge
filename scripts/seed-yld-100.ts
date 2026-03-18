/**
 * YLD Content Seeder — Full 100 Posts (yld-intro template)
 *
 * Seeds all 100 motivational posts (10 themes × 10 posts) in BOTH story and landscape formats
 * using the yld-intro template with full layer-based props (logo, header, subheader, badge, cta).
 * Status is set to "ready" so they can be rendered immediately from the admin dashboard.
 *
 * Run: pnpm db:seed-yld-100
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://renderforge:renderforge@localhost:5432/renderforge";
}

import { db, niches, posts, scenes, eq, and, sql } from "@renderforge/db";
import { THEMES } from "../content/banks/motivational";

// ── Visual variety ──

interface AccentColor {
  name: string;
  color: string;
  bg: [string, string, string];
}

const ACCENT_COLORS: AccentColor[] = [
  { name: "emerald", color: "#22c55e", bg: ["#0a2e1a", "#071a10", "#020a05"] },
  { name: "gold", color: "#D4AF37", bg: ["#1a1500", "#0f0d00", "#050400"] },
  { name: "crimson", color: "#ef4444", bg: ["#2a0a0a", "#180505", "#0a0202"] },
  { name: "violet", color: "#a855f7", bg: ["#1a0a2e", "#0f0518", "#050208"] },
  { name: "cyan", color: "#06b6d4", bg: ["#0a1e2e", "#051218", "#020608"] },
  { name: "rose", color: "#f43f5e", bg: ["#2a0a14", "#18050a", "#0a0204"] },
  { name: "amber", color: "#f59e0b", bg: ["#2a1a0a", "#180f05", "#0a0602"] },
  { name: "teal", color: "#14b8a6", bg: ["#0a2e28", "#071a16", "#020a08"] },
];

const TEXT_ANIMATIONS = ["charReveal", "slideUp", "wordReveal", "fadeIn", "glitch"] as const;

// ── Text helpers ──

function extractDisplayText(fullText: string, highlight?: string, maxWords = 10): string {
  if (highlight) return highlight.toUpperCase();
  const firstSentence = fullText.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(/\s+/);
  if (words.length <= maxWords) return firstSentence.toUpperCase();
  return words.slice(0, maxWords).join(" ").toUpperCase();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

// ── Build YLD Intro props ──

function buildYLDIntroProps(
  p: {
    intro: string;
    headline: string;
    subheader: string;
    badge: string;
    cta: string;
    introHighlight?: string;
    headlineHighlight?: string;
    subheaderHighlight?: string;
    badgeHighlight?: string;
  },
  accent: AccentColor,
  animIdx: number,
) {
  // line1 = intro display text (short punchy), line2 = headline display text (bold)
  const line1 = truncate(extractDisplayText(p.intro, p.introHighlight), 60);
  const line2 = truncate(extractDisplayText(p.headline, p.headlineHighlight), 80);
  const subheaderText = truncate(p.subheader.split(/[.!?]/)[0].trim(), 120);
  const badgeText = truncate(extractDisplayText(p.badge, p.badgeHighlight), 60);
  const ctaText = truncate(extractDisplayText(p.cta, undefined, 6), 40);

  return {
    logo: {
      file: "yld-logo-white.png",
      size: 480,
      glowEnabled: true,
      finalScale: 0.6,
      moveUpPx: 160,
      marginBottom: 15,
    },
    header: {
      line1,
      line1Size: 38,
      line1Animation: TEXT_ANIMATIONS[animIdx % TEXT_ANIMATIONS.length],
      line2,
      line2Size: 52,
      line2Animation: TEXT_ANIMATIONS[(animIdx + 1) % TEXT_ANIMATIONS.length],
      highlight: (p.headlineHighlight ?? p.introHighlight ?? "").toUpperCase(),
      marginBottom: 25,
    },
    subheader: {
      text: subheaderText,
      size: 28,
      animation: "typewriter",
      marginBottom: 45,
    },
    badge: {
      text: badgeText,
      enabled: true,
      marginBottom: 0,
    },
    cta: {
      text: ctaText,
      enabled: true,
      bottomOffset: 150,
    },
    divider: {
      enabled: true,
      marginBottom: 30,
    },
    theme: {
      accentColor: accent.color,
      bgGradient: accent.bg,
      particlesEnabled: true,
      scanLineEnabled: true,
      gridEnabled: true,
      vignetteEnabled: true,
    },
    timing: {
      logoAppear: 20,
      logoMoveUp: 130,
      dividerAppear: 155,
      headerAppear: 165,
      subheaderAppear: 230,
      badgeAppear: 290,
      ctaAppear: 330,
    },
  };
}

// ── Seed ──

async function seedYLD100() {
  console.log("Seeding all 100 YLD posts (yld-intro template, story + landscape)...\n");

  // Find the motivational niche
  const [niche] = await db
    .select()
    .from(niches)
    .where(eq(niches.slug, "motivational"))
    .limit(1);

  if (!niche) {
    console.error("Motivational niche not found. Run pnpm db:seed first.");
    process.exit(1);
  }

  console.log(`Using niche: ${niche.name} (${niche.id})`);

  // ── Clean up old seeded posts (motivational-narration OR yld-intro with status ready) ──
  // Delete scenes first (FK), then posts
  const oldPosts = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.nicheId, niche.id),
        eq(posts.status, "ready"),
        sql`${posts.templateId} IN ('motivational-narration', 'yld-intro')`,
      ),
    );

  if (oldPosts.length > 0) {
    const oldIds = oldPosts.map((p) => p.id);
    console.log(`Cleaning up ${oldIds.length} old seeded posts...`);

    // Delete scenes for these posts
    for (const id of oldIds) {
      await db.delete(scenes).where(eq(scenes.postId, id));
    }
    // Delete posts
    for (const id of oldIds) {
      await db.delete(posts).where(eq(posts.id, id));
    }
    console.log(`Deleted ${oldIds.length} old posts and their scenes.\n`);
  }

  // ── Seed new posts ──
  const formats = ["story", "landscape"] as const;
  let postCount = 0;
  let sceneCount = 0;
  let globalIdx = 0;

  for (const theme of THEMES) {
    console.log(`\n── ${theme.name} (${theme.posts.length} posts) ──`);

    for (const p of theme.posts) {
      const accent = ACCENT_COLORS[globalIdx % ACCENT_COLORS.length];

      for (const format of formats) {
        // Build yld-intro template props
        const templateProps = buildYLDIntroProps(p, accent, globalIdx);

        // Insert post with yld-intro template
        const [post] = await db
          .insert(posts)
          .values({
            nicheId: niche.id,
            title: p.title,
            status: "ready",
            theme: theme.id,
            templateId: "yld-intro",
            format,
            metadata: {
              sceneProps: templateProps,
              accentColor: accent.color,
              bgGradient: accent.bg,
            },
          })
          .returning();

        postCount++;

        // Insert 5 scenes (still needed for TTS pipeline and render worker fallback)
        const sectionDefs = [
          { key: "intro", text: p.intro, highlight: p.introHighlight, textSize: 64 },
          { key: "headline", text: p.headline, highlight: p.headlineHighlight, textSize: 56 },
          { key: "subheader", text: p.subheader, highlight: p.subheaderHighlight, textSize: 56 },
          { key: "badge", text: p.badge, highlight: p.badgeHighlight, textSize: 60 },
          { key: "cta", text: p.cta, highlight: undefined, textSize: 48 },
        ];

        for (let si = 0; si < sectionDefs.length; si++) {
          const sec = sectionDefs[si];
          await db.insert(scenes).values({
            postId: post.id,
            sortOrder: si,
            key: sec.key,
            displayText: extractDisplayText(sec.text, sec.highlight, sec.key === "cta" ? 6 : 10),
            narrationText: sec.text,
            durationSeconds: "4",
            entrance: "fadeIn",
            textSize: String(sec.textSize),
            extraProps: {
              highlight: sec.highlight,
            },
          });
          sceneCount++;
        }
      }

      const idx = globalIdx + 1;
      const pad = String(idx).padStart(3, " ");
      console.log(`  [${pad}/100] ${p.title} (${theme.id}, ${accent.name}) — story + landscape`);
      globalIdx++;
    }
  }

  console.log(`\nSeeded ${postCount} posts (${postCount / 2} content × 2 formats) with ${sceneCount} scenes.`);
  console.log("Template: yld-intro | Status: ready | Render from admin dashboard!\n");
  process.exit(0);
}

seedYLD100().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
