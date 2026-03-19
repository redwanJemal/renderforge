/**
 * Kids Corner Seeder
 *
 * Creates:
 *   - Kids Corner project with child-friendly branding
 *   - 4 niches: kids-alphabet, kids-counting, kids-quiz, kids-bedtime
 *   - 11 posts: 6 alphabet, 2 counting, 3 quiz
 *
 * sceneProps match the actual Zod schemas in:
 *   - apps/renderer/templates/kids-alphabet-adventure/index.tsx
 *   - apps/renderer/templates/kids-counting-fun/index.tsx
 *   - apps/renderer/templates/kids-icon-quiz/index.tsx
 */
import {
  db,
  projects, niches, posts,
  eq,
} from "@renderforge/db";

// Icons available in KidsIcons.tsx
const ICON_NAMES = [
  "cat", "dog", "fish", "bird", "butterfly", "lion", "elephant",
  "apple", "banana", "star", "circle", "triangle", "square", "heart", "diamond",
  "trophy",
];

const KIDS_COLORS = [
  "#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#A78BFA",
  "#FFAFCC", "#FFB347", "#A2D2FF", "#FF8FA3", "#95E1D3",
];

// Letter → icon mapping (only icons that exist in KidsIcons.tsx)
const LETTER_DATA: Array<{ letter: string; word: string; icon: string; iconColor?: string }> = [
  { letter: "A", word: "Apple", icon: "apple", iconColor: "#FF6B6B" },
  { letter: "B", word: "Bird", icon: "bird", iconColor: "#6BCB77" },
  { letter: "C", word: "Cat", icon: "cat", iconColor: "#FF6B6B" },
  { letter: "D", word: "Dog", icon: "dog", iconColor: "#C4A35A" },
  { letter: "E", word: "Elephant", icon: "elephant", iconColor: "#A2D2FF" },
  { letter: "F", word: "Fish", icon: "fish", iconColor: "#4D96FF" },
  // G-Z: use available icons, cycling through
  { letter: "G", word: "Gold Star", icon: "star", iconColor: "#FFD93D" },
  { letter: "H", word: "Heart", icon: "heart", iconColor: "#FF6B6B" },
  { letter: "I", word: "Ice Diamond", icon: "diamond", iconColor: "#A2D2FF" },
  { letter: "J", word: "Jumping Cat", icon: "cat", iconColor: "#FFAFCC" },
  { letter: "K", word: "King Lion", icon: "lion", iconColor: "#FFB347" },
  { letter: "L", word: "Lion", icon: "lion", iconColor: "#FFB347" },
  { letter: "M", word: "Magic Star", icon: "star", iconColor: "#A78BFA" },
  { letter: "N", word: "Night Bird", icon: "bird", iconColor: "#4D96FF" },
  { letter: "O", word: "Orange", icon: "apple", iconColor: "#FFB347" },
  { letter: "P", word: "Pretty Butterfly", icon: "butterfly", iconColor: "#FFAFCC" },
  { letter: "Q", word: "Queen Fish", icon: "fish", iconColor: "#A78BFA" },
  { letter: "R", word: "Red Circle", icon: "circle", iconColor: "#FF6B6B" },
  { letter: "S", word: "Star", icon: "star", iconColor: "#FFD93D" },
  { letter: "T", word: "Triangle", icon: "triangle", iconColor: "#6BCB77" },
  { letter: "U", word: "Up Heart", icon: "heart", iconColor: "#FF8FA3" },
  { letter: "V", word: "Victory Trophy", icon: "trophy", iconColor: "#FFD93D" },
  { letter: "W", word: "Wild Dog", icon: "dog", iconColor: "#C4A35A" },
  { letter: "X", word: "X Diamond", icon: "diamond", iconColor: "#A78BFA" },
  { letter: "Y", word: "Yellow Banana", icon: "banana", iconColor: "#FFD93D" },
  { letter: "Z", word: "Zigzag Square", icon: "square", iconColor: "#4D96FF" },
];

// Counting section data
const COUNTING_ICONS = [
  { icon: "star", iconColor: "#FFD93D", label: "Star" },
  { icon: "heart", iconColor: "#FF6B6B", label: "Heart" },
  { icon: "apple", iconColor: "#FF6B6B", label: "Apple" },
  { icon: "fish", iconColor: "#4D96FF", label: "Fish" },
  { icon: "cat", iconColor: "#FFAFCC", label: "Cat" },
  { icon: "bird", iconColor: "#6BCB77", label: "Bird" },
  { icon: "butterfly", iconColor: "#FFAFCC", label: "Butterfly" },
  { icon: "diamond", iconColor: "#A2D2FF", label: "Diamond" },
  { icon: "lion", iconColor: "#FFB347", label: "Lion" },
  { icon: "elephant", iconColor: "#A2D2FF", label: "Elephant" },
];

export async function seedKids() {
  console.log("\n── Kids Corner ──");

  const existing = await db.select().from(projects).where(eq(projects.slug, "kids-corner")).limit(1);
  if (existing.length > 0) {
    console.log("  Project already exists, skipping.");
    return;
  }

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
    { slug: "kids-alphabet", name: "Alphabet Adventure", defaultTemplateId: "kids-alphabet-adventure", voiceId: "kids-cheerful", languages: ["en"], config: { segmentPattern: ["intro", "letter*", "outro"] } },
    { slug: "kids-counting", name: "Counting Fun", defaultTemplateId: "kids-counting-fun", voiceId: "kids-cheerful", languages: ["en"], config: { segmentPattern: ["intro", "number*", "outro"] } },
    { slug: "kids-quiz", name: "Icon Quiz", defaultTemplateId: "kids-icon-quiz", voiceId: "kids-cheerful", languages: ["en"], config: { segmentPattern: ["intro", "round*", "outro"] } },
    { slug: "kids-bedtime", name: "Bedtime Stories", defaultTemplateId: "kids-bedtime-story", voiceId: "gentle-storyteller", languages: ["en"], config: { segmentPattern: ["intro", "page*", "outro"] } },
  ];

  const nicheMap = new Map<string, string>();
  for (const n of nicheData) {
    // Check if niche slug already exists (e.g. YLD seeder creates kids-bedtime)
    const existing = await db.select({ id: niches.id }).from(niches).where(eq(niches.slug, n.slug)).limit(1);
    if (existing.length > 0) {
      // Update to link to this project
      await db.update(niches).set({ projectId: project.id, name: n.name, defaultTemplateId: n.defaultTemplateId }).where(eq(niches.id, existing[0].id));
      nicheMap.set(n.slug, existing[0].id);
    } else {
      const [niche] = await db.insert(niches).values({ ...n, projectId: project.id }).returning();
      nicheMap.set(n.slug, niche.id);
    }
  }
  console.log(`  ${nicheData.length} niches created/linked`);

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

  // ══════════════════════════════════════════════════════
  // ALPHABET POSTS — matches kidsAlphabetSchema
  // ══════════════════════════════════════════════════════
  const alphabetNicheId = nicheMap.get("kids-alphabet")!;
  const lettersPerPost = 5;
  const bgColors = ["#1A1040", "#0F2840", "#2A1030", "#102820", "#201540", "#0F1A30"];

  for (let i = 0; i < LETTER_DATA.length; i += lettersPerPost) {
    const chunk = LETTER_DATA.slice(i, i + lettersPerPost);
    const postIdx = Math.floor(i / lettersPerPost);
    const rangeLabel = chunk.length > 1
      ? `${chunk[0].letter}-${chunk[chunk.length - 1].letter}`
      : chunk[0].letter;

    // Map to LetterSection schema: { letter, word, icon, iconColor?, bgColor? }
    const letters = chunk.map((item, idx) => ({
      letter: item.letter,
      word: item.word,
      icon: item.icon,
      iconColor: item.iconColor,
      bgColor: KIDS_COLORS[(postIdx * lettersPerPost + idx) % KIDS_COLORS.length],
    }));

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
          title: `ABC Adventure: ${rangeLabel}!`,
          subtitle: `Let's Learn ${rangeLabel}!`,
          letters,
          introDurationFrames: 120,
          letterRevealFrames: 30,
          wordShowFrames: 60,
          narrationGapFrames: 45,
          transitionFrames: 20,
          outroDurationFrames: 120,
          outroText: "Great Job!",
          letterBgColor: bgColors[postIdx % bgColors.length],
          transitionShape: (["circle", "star", "diamond"] as const)[postIdx % 3],
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════
  // COUNTING POSTS — matches kidsCountingSchema
  // ══════════════════════════════════════════════════════
  const countingNicheId = nicheMap.get("kids-counting")!;

  for (let batch = 0; batch < 2; batch++) {
    const start = batch * 5 + 1;
    // Map to CountingSection schema: { number, label, icon, iconColor?, bgColor? }
    const sections = Array.from({ length: 5 }, (_, i) => {
      const num = start + i;
      const iconData = COUNTING_ICONS[(num - 1) % COUNTING_ICONS.length];
      return {
        number: num,
        label: `${num} ${iconData.label}${num > 1 ? "s" : ""}!`,
        icon: iconData.icon,
        iconColor: iconData.iconColor,
        bgColor: KIDS_COLORS[(num - 1) % KIDS_COLORS.length],
      };
    });

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
          title: `Let's Count ${start} to ${start + 4}!`,
          subtitle: "Count Along With Me!",
          sections,
          introDurationFrames: 120,
          numberRevealFrames: 25,
          objectStaggerFrames: 18,
          holdAfterCountFrames: 45,
          transitionFrames: 20,
          outroDurationFrames: 120,
          outroText: "Amazing!",
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════
  // QUIZ POSTS — matches kidsQuizSchema
  // ══════════════════════════════════════════════════════
  const quizNicheId = nicheMap.get("kids-quiz")!;

  // Pre-built quiz data for 3 posts (deterministic, no random)
  const quizSets = [
    // Quiz 1: Animals
    {
      title: "Animal Quiz!",
      subtitle: "Can You Guess the Animal?",
      rounds: [
        { question: "Which one is a Cat?", choices: [
          { icon: "dog", label: "Dog", color: "#C4A35A" },
          { icon: "cat", label: "Cat", color: "#FF6B6B" },
          { icon: "fish", label: "Fish", color: "#4D96FF" },
        ], correctIndex: 1 },
        { question: "Which one is a Bird?", choices: [
          { icon: "bird", label: "Bird", color: "#6BCB77" },
          { icon: "butterfly", label: "Butterfly", color: "#FFAFCC" },
          { icon: "lion", label: "Lion", color: "#FFB347" },
        ], correctIndex: 0 },
        { question: "Which one is an Elephant?", choices: [
          { icon: "dog", label: "Dog", color: "#C4A35A" },
          { icon: "cat", label: "Cat", color: "#FF6B6B" },
          { icon: "elephant", label: "Elephant", color: "#A2D2FF" },
        ], correctIndex: 2 },
        { question: "Which one is a Lion?", choices: [
          { icon: "fish", label: "Fish", color: "#4D96FF" },
          { icon: "lion", label: "Lion", color: "#FFB347" },
          { icon: "bird", label: "Bird", color: "#6BCB77" },
        ], correctIndex: 1 },
        { question: "Which one is a Fish?", choices: [
          { icon: "butterfly", label: "Butterfly", color: "#FFAFCC" },
          { icon: "elephant", label: "Elephant", color: "#A2D2FF" },
          { icon: "fish", label: "Fish", color: "#4D96FF" },
        ], correctIndex: 2 },
      ],
    },
    // Quiz 2: Shapes
    {
      title: "Shape Quiz!",
      subtitle: "Can You Find the Shape?",
      rounds: [
        { question: "Which one is a Star?", choices: [
          { icon: "circle", label: "Circle", color: "#FF6B6B" },
          { icon: "star", label: "Star", color: "#FFD93D" },
          { icon: "triangle", label: "Triangle", color: "#6BCB77" },
        ], correctIndex: 1 },
        { question: "Which one is a Heart?", choices: [
          { icon: "heart", label: "Heart", color: "#FF6B6B" },
          { icon: "square", label: "Square", color: "#4D96FF" },
          { icon: "diamond", label: "Diamond", color: "#A2D2FF" },
        ], correctIndex: 0 },
        { question: "Which one is a Diamond?", choices: [
          { icon: "triangle", label: "Triangle", color: "#6BCB77" },
          { icon: "circle", label: "Circle", color: "#FF6B6B" },
          { icon: "diamond", label: "Diamond", color: "#A2D2FF" },
        ], correctIndex: 2 },
        { question: "Which one is a Circle?", choices: [
          { icon: "square", label: "Square", color: "#4D96FF" },
          { icon: "circle", label: "Circle", color: "#FF6B6B" },
          { icon: "star", label: "Star", color: "#FFD93D" },
        ], correctIndex: 1 },
        { question: "Which one is a Triangle?", choices: [
          { icon: "triangle", label: "Triangle", color: "#6BCB77" },
          { icon: "heart", label: "Heart", color: "#FF6B6B" },
          { icon: "diamond", label: "Diamond", color: "#A2D2FF" },
        ], correctIndex: 0 },
      ],
    },
    // Quiz 3: Mixed
    {
      title: "Big Quiz Challenge!",
      subtitle: "Test Everything You Know!",
      rounds: [
        { question: "Which one is a Butterfly?", choices: [
          { icon: "bird", label: "Bird", color: "#6BCB77" },
          { icon: "butterfly", label: "Butterfly", color: "#FFAFCC" },
          { icon: "fish", label: "Fish", color: "#4D96FF" },
        ], correctIndex: 1 },
        { question: "Which one is a Square?", choices: [
          { icon: "square", label: "Square", color: "#4D96FF" },
          { icon: "circle", label: "Circle", color: "#FF6B6B" },
          { icon: "triangle", label: "Triangle", color: "#6BCB77" },
        ], correctIndex: 0 },
        { question: "Which one is an Apple?", choices: [
          { icon: "banana", label: "Banana", color: "#FFD93D" },
          { icon: "star", label: "Star", color: "#FFD93D" },
          { icon: "apple", label: "Apple", color: "#FF6B6B" },
        ], correctIndex: 2 },
        { question: "Which one is a Dog?", choices: [
          { icon: "cat", label: "Cat", color: "#FF6B6B" },
          { icon: "dog", label: "Dog", color: "#C4A35A" },
          { icon: "lion", label: "Lion", color: "#FFB347" },
        ], correctIndex: 1 },
        { question: "Which one is a Trophy?", choices: [
          { icon: "star", label: "Star", color: "#FFD93D" },
          { icon: "diamond", label: "Diamond", color: "#A2D2FF" },
          { icon: "trophy", label: "Trophy", color: "#FFD93D" },
        ], correctIndex: 2 },
      ],
    },
  ];

  for (let q = 0; q < quizSets.length; q++) {
    const quiz = quizSets[q];
    allPosts.push({
      nicheId: quizNicheId,
      projectId: project.id,
      title: quiz.title,
      status: "ready",
      theme: "kids",
      templateId: "kids-icon-quiz",
      format: "story",
      metadata: {
        sceneProps: {
          title: quiz.title,
          subtitle: quiz.subtitle,
          rounds: quiz.rounds,
          introDurationFrames: 120,
          questionShowFrames: 25,
          choicesStaggerFrames: 15,
          thinkingGapFrames: 60,
          revealHoldFrames: 60,
          transitionFrames: 20,
          outroDurationFrames: 150,
          outroText: "You Got Them All!",
        },
      },
    });
  }

  // Insert all posts
  for (let i = 0; i < allPosts.length; i += 50) {
    const batch = allPosts.slice(i, i + 50);
    await db.insert(posts).values(batch);
  }

  const alphabetCount = Math.ceil(LETTER_DATA.length / lettersPerPost);
  console.log(`  ${allPosts.length} posts seeded (${alphabetCount} alphabet, 2 counting, 3 quiz)`);
}
