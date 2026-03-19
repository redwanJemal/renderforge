/**
 * Kids Corner Seeder
 *
 * Creates:
 *   - Kids Corner project with child-friendly branding
 *   - 4 niches: kids-alphabet, kids-counting, kids-quiz, kids-bedtime
 *   - ~10 posts: 5 alphabet (5 letters each), 2 counting, 3 quiz
 */
import {
  db,
  projects, niches, posts,
  eq,
} from "@renderforge/db";

// Icon names from KidsIcons.tsx (used for quiz rounds)
const QUIZ_ICONS = [
  "cat", "dog", "fish", "bird", "butterfly", "lion", "elephant",
  "apple", "banana", "star", "circle", "triangle", "square", "heart", "diamond",
  "trophy",
];

// Color palette for kids — bright, playful
const KIDS_COLORS = [
  "#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#A78BFA",
  "#FFAFCC", "#FFB347", "#A2D2FF", "#FF8FA3", "#95E1D3",
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export async function seedKids() {
  console.log("\n── Kids Corner ──");

  // Check if project exists
  const existing = await db.select().from(projects).where(eq(projects.slug, "kids-corner")).limit(1);
  if (existing.length > 0) {
    console.log("  Project already exists, skipping.");
    return;
  }

  // Create project
  const [project] = await db.insert(projects).values({
    name: "Kids Corner",
    slug: "kids-corner",
    description: "Fun, educational content for children — alphabet adventures, counting games, icon quizzes, and bedtime stories.",
    colorPalette: {
      primary: "#FF6B6B",
      secondary: "#4D96FF",
      accent: "#FFD93D",
      background: "#1A1040",
    },
    socialHandles: {
      tiktok: "@kidscorner",
      youtube: "KidsCorner",
      instagram: "@kidscorner",
    },
    defaultVoiceId: "kids-cheerful",
    status: "active",
  }).returning();
  console.log(`  Project: Kids Corner (${project.id})`);

  // Create niches
  const nicheData = [
    {
      slug: "kids-alphabet",
      name: "Alphabet Adventure",
      defaultTemplateId: "kids-alphabet-adventure",
      voiceId: "kids-cheerful",
      languages: ["en"],
      config: { segmentPattern: ["intro", "letter*", "outro"] },
    },
    {
      slug: "kids-counting",
      name: "Counting Fun",
      defaultTemplateId: "kids-counting-fun",
      voiceId: "kids-cheerful",
      languages: ["en"],
      config: { segmentPattern: ["intro", "number*", "outro"] },
    },
    {
      slug: "kids-quiz",
      name: "Icon Quiz",
      defaultTemplateId: "kids-icon-quiz",
      voiceId: "kids-cheerful",
      languages: ["en"],
      config: { segmentPattern: ["intro", "round*", "outro"] },
    },
    {
      slug: "kids-bedtime",
      name: "Bedtime Stories",
      defaultTemplateId: "kids-bedtime-story",
      voiceId: "gentle-storyteller",
      languages: ["en"],
      config: { segmentPattern: ["intro", "page*", "outro"] },
    },
  ];

  const nicheMap = new Map<string, string>();
  for (const n of nicheData) {
    const [niche] = await db.insert(niches).values({
      ...n,
      projectId: project.id,
    }).returning();
    nicheMap.set(n.slug, niche.id);
  }
  console.log(`  ${nicheData.length} niches created`);

  const allPosts: Array<{
    nicheId: string;
    projectId: string;
    title: string;
    status: "ready";
    theme: string;
    templateId: string;
    format: string;
    metadata: Record<string, unknown>;
  }> = [];

  // ── Alphabet Posts (5 posts, ~5 letters each = 26 letters) ──
  const alphabetNicheId = nicheMap.get("kids-alphabet")!;
  const lettersPerPost = 5;
  for (let i = 0; i < ALPHABET.length; i += lettersPerPost) {
    const chunk = ALPHABET.slice(i, i + lettersPerPost);
    const rangeLabel = chunk.length > 1 ? `${chunk[0]}-${chunk[chunk.length - 1]}` : chunk[0];

    const letters = chunk.map((letter, idx) => {
      const words: Record<string, string> = {
        A: "Apple", B: "Ball", C: "Cat", D: "Dog", E: "Elephant",
        F: "Fish", G: "Giraffe", H: "Heart", I: "Ice Cream", J: "Jellyfish",
        K: "Kite", L: "Lion", M: "Moon", N: "Nest", O: "Orange",
        P: "Penguin", Q: "Queen", R: "Rainbow", S: "Star", T: "Tiger",
        U: "Umbrella", V: "Violin", W: "Whale", X: "Xylophone", Y: "Yak",
        Z: "Zebra",
      };
      return {
        letter,
        word: words[letter] || letter,
        color: KIDS_COLORS[(i + idx) % KIDS_COLORS.length],
      };
    });

    allPosts.push({
      nicheId: alphabetNicheId,
      projectId: project.id,
      title: `Alphabet Adventure: ${rangeLabel}`,
      status: "ready",
      theme: "kids",
      templateId: "kids-alphabet-adventure",
      format: "story",
      metadata: {
        sceneProps: {
          letters,
          bgColor: "#1A1040",
          titleText: `Let's Learn ${rangeLabel}!`,
        },
      },
    });
  }

  // ── Counting Posts (2 posts, 5 numbers each) ──
  const countingNicheId = nicheMap.get("kids-counting")!;
  for (let batch = 0; batch < 2; batch++) {
    const start = batch * 5 + 1;
    const numbers = Array.from({ length: 5 }, (_, i) => ({
      number: start + i,
      color: KIDS_COLORS[(start + i) % KIDS_COLORS.length],
      objects: start + i, // e.g. 3 = show 3 objects
    }));

    allPosts.push({
      nicheId: countingNicheId,
      projectId: project.id,
      title: `Counting Fun: ${start} to ${start + 4}`,
      status: "ready",
      theme: "kids",
      templateId: "kids-counting-fun",
      format: "story",
      metadata: {
        sceneProps: {
          numbers,
          bgColor: "#0F1A30",
          titleText: `Let's Count ${start} to ${start + 4}!`,
        },
      },
    });
  }

  // ── Quiz Posts (3 posts, 5 rounds each) ──
  const quizNicheId = nicheMap.get("kids-quiz")!;
  const shuffledIcons = [...QUIZ_ICONS].sort(() => Math.random() - 0.5);

  for (let q = 0; q < 3; q++) {
    const rounds = Array.from({ length: 5 }, (_, i) => {
      const correctIdx = (q * 5 + i) % shuffledIcons.length;
      const correctIcon = shuffledIcons[correctIdx];

      // Pick 3 wrong options
      const wrongOptions = shuffledIcons
        .filter((_, idx) => idx !== correctIdx)
        .slice(0, 3);

      const options = [correctIcon, ...wrongOptions].sort(() => Math.random() - 0.5);

      return {
        correctIcon,
        options,
        questionText: `Which one is the ${correctIcon}?`,
      };
    });

    allPosts.push({
      nicheId: quizNicheId,
      projectId: project.id,
      title: `Icon Quiz: Round ${q + 1}`,
      status: "ready",
      theme: "kids",
      templateId: "kids-icon-quiz",
      format: "story",
      metadata: {
        sceneProps: {
          rounds,
          bgColor: "#1A0A2E",
          titleText: `Quiz Time! Round ${q + 1}`,
        },
      },
    });
  }

  // Insert all posts
  for (let i = 0; i < allPosts.length; i += 50) {
    const batch = allPosts.slice(i, i + 50);
    await db.insert(posts).values(batch);
  }

  console.log(`  ${allPosts.length} posts seeded (${Math.ceil(ALPHABET.length / lettersPerPost)} alphabet, 2 counting, 3 quiz)`);
}
