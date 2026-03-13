/**
 * YLD Content Seeder
 *
 * Seeds 10 motivational posts (1 per theme) + 5 BGM tracks from the content bank.
 * Run: pnpm --filter @renderforge/db tsx src/seed-yld.ts
 */
import "dotenv/config";
import { db, niches, posts, scenes, bgmTracks, eq } from "./index";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// ── Content Bank Data (inlined from content/banks/motivational.ts to avoid TS import issues) ──

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

const ENTRANCES = ["scaleIn", "slideUp", "fadeIn", "slideLeft", "slam"] as const;

// 10 posts — 1 per theme (first post of each theme from the content bank)
const SEED_POSTS = [
  {
    theme: "mindset",
    title: "Your Mind Is A Control Room",
    intro: "Your mind is a control room. And right now, someone else is pressing the buttons.",
    headline: "Every single day, thousands of thoughts pass through your head. Most of them are not even yours. They come from social media, from people who gave up on their dreams, from a world that profits when you stay small. The question is, who is running your mind?",
    subheader: "Imagine inside your head there are two operators. One runs fear. The other runs faith. Whichever one you feed the most gets to sit in the big chair.",
    badge: "You are not your thoughts. You are the one who chooses which thoughts to believe.",
    cta: "If this hit different, save it. Share it with someone who needs to hear it. Follow for daily mindset shifts.",
    introHighlight: "control room",
    headlineHighlight: "who is running your mind",
    subheaderHighlight: "faith",
    badgeHighlight: "chooses",
  },
  {
    theme: "discipline",
    title: "Discipline Beats Motivation Every Time",
    intro: "Motivation gets you started. Discipline keeps you going.",
    headline: "Everyone waits for motivation to strike. Like it is lightning. Like it is magic. But motivation is a feeling, and feelings fade. Discipline is a decision. A decision you make every single morning to do what needs to be done whether you feel like it or not.",
    subheader: "Think of discipline as a muscle. The more you use it, the stronger it gets. Start small. Make your bed. Show up on time. Keep one promise to yourself today. Stack those wins.",
    badge: "You do not need motivation. You need discipline. The person who shows up every day will always beat the person who shows up only when inspired.",
    cta: "Save this for the days you do not feel like showing up. Follow for daily discipline fuel.",
    introHighlight: "Discipline",
    headlineHighlight: "a decision",
    subheaderHighlight: "a muscle",
    badgeHighlight: "shows up every day",
  },
  {
    theme: "confidence",
    title: "Confidence Is Not Born, It Is Built",
    intro: "Nobody is born confident. Confidence is a skill. And you can build it starting today.",
    headline: "People see someone confident and think they were born that way. Wrong. Confidence is built through reps. Every time you do something scary and survive, your confidence grows. Every time you keep a promise to yourself, your self-trust increases. It is a compound effect.",
    subheader: "Start with micro-wins. Speak up in one meeting. Make one cold call. Post one piece of content. Each small act of courage rewires your brain to believe you can handle more.",
    badge: "Confidence is not thinking you are better than everyone. It is knowing you will be fine no matter what happens.",
    cta: "What is one brave thing you did recently? Share below. Follow for confidence building.",
    introHighlight: "a skill",
    headlineHighlight: "compound effect",
    subheaderHighlight: "micro-wins",
    badgeHighlight: "you will be fine",
  },
  {
    theme: "success",
    title: "Success Leaves Clues",
    intro: "Success is not random. It leaves clues. And the clues are everywhere if you pay attention.",
    headline: "Study anyone who has achieved greatness. Bezos, Oprah, Musk, Kobe. They all share the same patterns. Obsessive focus. Relentless work ethic. A willingness to fail publicly. And the patience to play the long game when everyone else wants instant results.",
    subheader: "The fastest shortcut to success is to find someone who has what you want and do what they did. Not their exact path, but their principles. Their habits. Their mindset. Model excellence.",
    badge: "Success is not about being the smartest. It is about being the most consistent.",
    cta: "Who do you study for success clues? Drop their name below. Follow for success principles.",
    introHighlight: "leaves clues",
    headlineHighlight: "same patterns",
    subheaderHighlight: "Model excellence",
    badgeHighlight: "most consistent",
  },
  {
    theme: "fear",
    title: "Fear Is A Compass, Not A Stop Sign",
    intro: "Everything you want is on the other side of fear. Everything.",
    headline: "Fear is not your enemy. It is your compass. It points directly at the thing you need to do most. The presentation that scares you? That is your next level. The conversation you are avoiding? That is your breakthrough. Fear is a signal that growth is waiting.",
    subheader: "The only way to beat fear is to walk through it. Not around it. Not over it. Through it. Every time you face a fear, it gets smaller. Every time you run, it gets bigger.",
    badge: "Courage is not the absence of fear. It is action in the presence of fear.",
    cta: "What fear are you facing right now? Share it below. Follow for courage content.",
    introHighlight: "other side of fear",
    headlineHighlight: "your compass",
    subheaderHighlight: "walk through it",
    badgeHighlight: "action in the presence of fear",
  },
  {
    theme: "hustle",
    title: "While You Sleep, Someone Is Working",
    intro: "Somewhere right now, someone with less talent than you is outworking you.",
    headline: "The hustle is not about grinding until you break. It is about working with intensity and purpose when you are on, so you can rest without guilt when you are off. Most people work eight hours at fifty percent. Champions work six hours at one hundred percent. It is not about time. It is about energy and focus.",
    subheader: "Your competition is not resting. They are reading, building, learning, connecting. Every hour you waste is an hour someone else invests. The gap between where you are and where you want to be is filled with the work you are not doing.",
    badge: "Outwork your excuses. Outwork your competition. Outwork your old self. That is the formula.",
    cta: "What are you building right now? Share below. Follow for hustle motivation.",
    introHighlight: "outworking you",
    headlineHighlight: "energy and focus",
    subheaderHighlight: "every hour",
    badgeHighlight: "Outwork",
  },
  {
    theme: "leadership",
    title: "Leaders Eat Last",
    intro: "Real leadership is not about being in charge. It is about taking care of those in your charge.",
    headline: "The best leaders do not demand respect. They earn it. They are the first to arrive and the last to leave. They take the blame when things go wrong and give credit when things go right. Leadership is not a title. It is a daily practice of putting others first.",
    subheader: "Ask yourself this question every day. How can I make my team better today? Not how can my team make me look good. That single shift in mindset separates managers from leaders.",
    badge: "A leader is great not because of their power, but because of their ability to empower others.",
    cta: "Who is the best leader you have ever worked with? Tag them. Follow for leadership insights.",
    introHighlight: "taking care",
    headlineHighlight: "daily practice",
    subheaderHighlight: "make my team better",
    badgeHighlight: "empower others",
  },
  {
    theme: "resilience",
    title: "You Have Survived 100 Percent",
    intro: "Every single bad day you have ever had, you survived. Your track record is flawless.",
    headline: "Think about every hardship you have faced. Every heartbreak, every failure, every moment you thought you would not make it. You are still here. One hundred percent survival rate. That is not luck. That is resilience. That is proof that you are tougher than you think.",
    subheader: "When the next storm comes, and it will, remember this number. One hundred percent. You have never lost a round permanently. You have been knocked down but never knocked out.",
    badge: "You have survived every worst day of your life. You will survive the next one too.",
    cta: "Share what you survived this year. Your story might save someone. Follow for resilience.",
    introHighlight: "track record is flawless",
    headlineHighlight: "One hundred percent",
    subheaderHighlight: "never knocked out",
    badgeHighlight: "survive the next one too",
  },
  {
    theme: "purpose",
    title: "Find Your Why Or Waste Your Life",
    intro: "The two most important days of your life are the day you are born and the day you find out why.",
    headline: "Most people never find their purpose because they never look for it. They follow the script. Go to school, get a job, pay bills, retire, die. But somewhere inside every person is a fire waiting to be lit. A calling that makes ordinary work feel extraordinary.",
    subheader: "Your purpose is at the intersection of what you love, what you are good at, what the world needs, and what you can be paid for. Start exploring. Try things. Your purpose reveals itself through action, not meditation.",
    badge: "A person with purpose will always outperform a person with only a plan.",
    cta: "Have you found your why? Share it below. Follow for purpose-driven content.",
    introHighlight: "find out why",
    headlineHighlight: "a fire waiting to be lit",
    subheaderHighlight: "through action",
    badgeHighlight: "purpose",
  },
  {
    theme: "money",
    title: "Money Is A Tool, Not A Goal",
    intro: "Money does not change people. It reveals them. Chase mastery, and money will follow.",
    headline: "The biggest lie about money is that it should be your primary goal. Money is a tool. A means to freedom, impact, and security. When you chase money directly, you make short-term decisions. When you chase excellence and value, money becomes a byproduct that never stops flowing.",
    subheader: "The wealthiest people in the world did not start by chasing dollars. They started by solving problems. The bigger the problem you solve, the more money flows to you. Focus on value creation, not value extraction.",
    badge: "Get so good they cannot ignore you. The money will follow the mastery.",
    cta: "What is the best money advice you have ever received? Share below. Follow for wealth mindset.",
    introHighlight: "reveals them",
    headlineHighlight: "a tool",
    subheaderHighlight: "solving problems",
    badgeHighlight: "money will follow the mastery",
  },
];

function extractDisplayText(fullText: string, highlight?: string, maxWords = 10): string {
  if (highlight) return highlight.toUpperCase();
  const firstSentence = fullText.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(/\s+/);
  if (words.length <= maxWords) return firstSentence.toUpperCase();
  return words.slice(0, maxWords).join(" ").toUpperCase();
}

function extractSubtext(fullText: string, maxWords = 12): string {
  const firstSentence = fullText.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(/\s+/);
  if (words.length <= maxWords) return firstSentence;
  return words.slice(0, maxWords).join(" ") + "...";
}

// ── BGM Tracks ──

const BGM_FILES = [
  { name: "Optimistic", file: "optimistic.mp3", category: "upbeat" },
  { name: "Inspirational Corporate", file: "inspirational-corporate.mp3", category: "corporate" },
  { name: "Cinematic Documentary", file: "cinematic-documentary.mp3", category: "cinematic" },
  { name: "Cinematic Piano & Strings", file: "cinematic-piano-strings.mp3", category: "cinematic" },
  { name: "Serious Documentary", file: "serious-documentary.mp3", category: "documentary" },
];

function getAudioDuration(filePath: string): string {
  try {
    const result = execFileSync("ffprobe", [
      "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", filePath,
    ], { encoding: "utf-8" }).trim();
    return result;
  } catch {
    return "120.000"; // fallback 2 minutes
  }
}

async function seedYLD() {
  console.log("Seeding YLD content...\n");

  // Find or create the motivational niche
  const [niche] = await db
    .select()
    .from(niches)
    .where(eq(niches.slug, "motivational"))
    .limit(1);

  if (!niche) {
    console.error("Motivational niche not found. Run pnpm db:seed first.");
    process.exit(1);
  }

  console.log(`Using niche: ${niche.name} (${niche.id})\n`);

  // ── Seed 10 YLD Posts ──
  let postCount = 0;
  let sceneCount = 0;

  for (let i = 0; i < SEED_POSTS.length; i++) {
    const p = SEED_POSTS[i];
    const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
    const entranceOffset = i % ENTRANCES.length;

    // Build scene props for the template (frame timing for visual-only render)
    const fps = 30;
    const introHoldFrames = 45;
    const defaultSceneDuration = 4; // seconds per scene
    let currentFrame = introHoldFrames;

    const sectionDefs = [
      { key: "intro", text: p.intro, highlight: p.introHighlight, textSize: 64 },
      { key: "headline", text: p.headline, highlight: p.headlineHighlight, textSize: 56, subtextSize: 24 },
      { key: "subheader", text: p.subheader, highlight: p.subheaderHighlight, textSize: 56 },
      { key: "badge", text: p.badge, highlight: p.badgeHighlight, textSize: 60 },
      { key: "cta", text: p.cta, highlight: undefined, textSize: 48, subtextSize: 26 },
    ];

    const sceneArray = sectionDefs.map((sec, si) => {
      const durationFrames = Math.round(defaultSceneDuration * fps);
      const startFrame = currentFrame;
      currentFrame += durationFrames;

      return {
        text: extractDisplayText(sec.text, sec.highlight, sec.key === "cta" ? 6 : 10),
        subtext: extractSubtext(sec.text),
        highlight: sec.highlight?.toUpperCase(),
        entrance: ENTRANCES[(si + entranceOffset) % ENTRANCES.length],
        textSize: sec.textSize,
        subtextSize: sec.subtextSize ?? 28,
        textAlign: "center" as const,
        startFrame,
        durationFrames,
      };
    });

    const templateProps = {
      scenes: sceneArray,
      title: "YOUR LAST DOLLAR",
      accentColor: accent.color,
      bgGradient: accent.bg,
      particlesEnabled: true,
      transitionFrames: 15,
      introHoldFrames,
    };

    // Insert post
    const [post] = await db
      .insert(posts)
      .values({
        nicheId: niche.id,
        title: p.title,
        status: "draft",
        theme: p.theme,
        templateId: "motivational-narration",
        format: "story",
        metadata: { sceneProps: templateProps },
      })
      .returning();

    postCount++;

    // Insert scenes
    for (let si = 0; si < sectionDefs.length; si++) {
      const sec = sectionDefs[si];
      const sceneP = sceneArray[si];

      await db.insert(scenes).values({
        postId: post.id,
        sortOrder: si,
        key: sec.key,
        displayText: sceneP.text,
        narrationText: sec.text,
        durationSeconds: String(defaultSceneDuration),
        entrance: sceneP.entrance,
        textSize: String(sceneP.textSize),
        extraProps: {
          subtext: sceneP.subtext,
          highlight: sec.highlight,
          subtextSize: sceneP.subtextSize,
          textAlign: sceneP.textAlign,
        },
      });

      sceneCount++;
    }

    console.log(`  [${i + 1}/10] ${p.title} (${p.theme}, ${accent.name})`);
  }

  console.log(`\nSeeded ${postCount} posts with ${sceneCount} scenes.\n`);

  // ── Seed BGM Tracks ──
  const bgmDir = join(process.cwd(), "content/audio/bgm/motivational");
  let bgmCount = 0;

  for (const bgm of BGM_FILES) {
    const filePath = join(bgmDir, bgm.file);
    let fileUrl: string;
    let durationSeconds: string;

    try {
      // Check if file exists locally
      statSync(filePath);
      durationSeconds = getAudioDuration(filePath);

      // Upload to S3
      const s3Key = `bgm/${bgm.file}`;

      try {
        // Dynamic import to avoid issues when running outside the API context
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = new S3Client({
          endpoint: process.env.S3_ENDPOINT || "https://storage.endlessmaker.com",
          region: "us-east-1",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY || "",
            secretAccessKey: process.env.S3_SECRET_KEY || "",
          },
          forcePathStyle: true,
        });

        const buffer = readFileSync(filePath);
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET || "forgebase",
            Key: s3Key,
            Body: buffer,
            ContentType: "audio/mpeg",
          }),
        );
        fileUrl = s3Key;
        console.log(`  Uploaded ${bgm.file} to S3 (${s3Key})`);
      } catch (uploadErr) {
        console.warn(`  S3 upload failed for ${bgm.file}, using local path:`, (uploadErr as Error).message);
        fileUrl = `bgm/${bgm.file}`;
      }
    } catch {
      console.warn(`  BGM file not found: ${filePath}, skipping`);
      continue;
    }

    await db
      .insert(bgmTracks)
      .values({
        name: bgm.name,
        fileUrl,
        durationSeconds,
        category: bgm.category,
        nicheId: niche.id,
      });

    bgmCount++;
    console.log(`  BGM: ${bgm.name} (${durationSeconds}s, ${bgm.category})`);
  }

  console.log(`\nSeeded ${bgmCount} BGM tracks.`);
  console.log("\nYLD seeding complete!");
  process.exit(0);
}

seedYLD().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
