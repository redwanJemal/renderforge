#!/usr/bin/env npx tsx
/**
 * Kids Content Script Generator
 *
 * Generates narration scripts for kids video templates:
 * - kids-alphabet-adventure: letter-by-letter narration
 * - kids-counting-fun: number-by-number narration
 * - kids-icon-quiz: question-answer narration
 * - kids-bedtime-story: page-by-page story narration
 *
 * Output: content/kids-scripts.json — ready for Qwen3 TTS on Colab
 *
 * Usage:
 *   npx tsx content/generate-kids-scripts.ts
 *   npx tsx content/generate-kids-scripts.ts --template kids-alphabet-adventure
 *   npx tsx content/generate-kids-scripts.ts --full-alphabet  # A-Z (26 letters)
 *   npx tsx content/generate-kids-scripts.ts --full-counting   # 1-20
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_FILE = path.join(__dirname, 'kids-scripts.json');

interface ScriptSection {
  key: string;
  text: string;
  audioFile: string;
  /** Voice hint: 'cheerful' for educational, 'soothing' for bedtime */
  voice: 'cheerful' | 'soothing';
}

interface KidsScript {
  postId: string;
  template: string;
  title: string;
  sections: ScriptSection[];
  fullScript: string;
  audioDir: string;
  voicePreset: string;
}

// ──────────────────────────────────────────────
// ALPHABET ADVENTURE SCRIPTS
// ──────────────────────────────────────────────

const FULL_ALPHABET: Array<{ letter: string; word: string; icon: string }> = [
  { letter: 'A', word: 'Apple', icon: 'apple' },
  { letter: 'B', word: 'Bird', icon: 'bird' },
  { letter: 'C', word: 'Cat', icon: 'cat' },
  { letter: 'D', word: 'Dog', icon: 'dog' },
  { letter: 'E', word: 'Elephant', icon: 'elephant' },
  { letter: 'F', word: 'Fish', icon: 'fish' },
  { letter: 'G', word: 'Star', icon: 'star' },
  { letter: 'H', word: 'Heart', icon: 'heart' },
  { letter: 'I', word: 'Ice cream', icon: 'circle' },
  { letter: 'J', word: 'Jellyfish', icon: 'fish' },
  { letter: 'K', word: 'Kite', icon: 'diamond' },
  { letter: 'L', word: 'Lion', icon: 'lion' },
  { letter: 'M', word: 'Moon', icon: 'circle' },
  { letter: 'N', word: 'Nest', icon: 'bird' },
  { letter: 'O', word: 'Octopus', icon: 'fish' },
  { letter: 'P', word: 'Penguin', icon: 'bird' },
  { letter: 'Q', word: 'Queen', icon: 'star' },
  { letter: 'R', word: 'Rainbow', icon: 'star' },
  { letter: 'S', word: 'Sun', icon: 'star' },
  { letter: 'T', word: 'Tiger', icon: 'lion' },
  { letter: 'U', word: 'Umbrella', icon: 'triangle' },
  { letter: 'V', word: 'Violin', icon: 'star' },
  { letter: 'W', word: 'Whale', icon: 'fish' },
  { letter: 'X', word: 'Xylophone', icon: 'star' },
  { letter: 'Y', word: 'Yarn', icon: 'circle' },
  { letter: 'Z', word: 'Zebra', icon: 'lion' },
];

function generateAlphabetScript(
  postId: string,
  letters: Array<{ letter: string; word: string }>,
): KidsScript {
  const sections: ScriptSection[] = [];

  sections.push({
    key: 'intro',
    text: "Hey kids! It's time for an ABC Adventure! Let's learn the alphabet together! Are you ready? Let's go!",
    audioFile: `${postId}/intro.wav`,
    voice: 'cheerful',
  });

  letters.forEach((l, i) => {
    const funFacts: Record<string, string> = {
      A: 'Apples are yummy and come in red, green, and yellow!',
      B: 'Birds can fly high up in the sky!',
      C: 'Cats say meow and love to play!',
      D: 'Dogs are our best friends! Woof woof!',
      E: 'Elephants are the biggest animals on land!',
      F: 'Fish swim in the ocean and rivers!',
    };
    const fact = funFacts[l.letter] || `${l.word} starts with the letter ${l.letter}!`;

    sections.push({
      key: `letter${i + 1}`,
      text: `${l.letter}! ${l.letter} is for ${l.word}! ${fact}`,
      audioFile: `${postId}/letter${i + 1}.wav`,
      voice: 'cheerful',
    });
  });

  sections.push({
    key: 'outro',
    text: "Amazing job! You learned so many letters today! You're a super star! See you next time for more ABC fun!",
    audioFile: `${postId}/outro.wav`,
    voice: 'cheerful',
  });

  return {
    postId,
    template: 'kids-alphabet-adventure',
    title: `ABC Adventure: ${letters[0].letter} to ${letters[letters.length - 1].letter}`,
    sections,
    fullScript: sections.map((s) => s.text).join(' '),
    audioDir: `audio/${postId}`,
    voicePreset: 'kids-cheerful',
  };
}

// ──────────────────────────────────────────────
// COUNTING FUN SCRIPTS
// ──────────────────────────────────────────────

const COUNTING_ITEMS: Array<{ number: number; label: string; icon: string }> = [
  { number: 1, label: 'One Star', icon: 'star' },
  { number: 2, label: 'Two Hearts', icon: 'heart' },
  { number: 3, label: 'Three Apples', icon: 'apple' },
  { number: 4, label: 'Four Fish', icon: 'fish' },
  { number: 5, label: 'Five Cats', icon: 'cat' },
  { number: 6, label: 'Six Birds', icon: 'bird' },
  { number: 7, label: 'Seven Butterflies', icon: 'butterfly' },
  { number: 8, label: 'Eight Diamonds', icon: 'diamond' },
  { number: 9, label: 'Nine Circles', icon: 'circle' },
  { number: 10, label: 'Ten Stars', icon: 'star' },
  { number: 11, label: 'Eleven Triangles', icon: 'triangle' },
  { number: 12, label: 'Twelve Hearts', icon: 'heart' },
  { number: 13, label: 'Thirteen Dogs', icon: 'dog' },
  { number: 14, label: 'Fourteen Fish', icon: 'fish' },
  { number: 15, label: 'Fifteen Lions', icon: 'lion' },
  { number: 16, label: 'Sixteen Elephants', icon: 'elephant' },
  { number: 17, label: 'Seventeen Apples', icon: 'apple' },
  { number: 18, label: 'Eighteen Cats', icon: 'cat' },
  { number: 19, label: 'Nineteen Stars', icon: 'star' },
  { number: 20, label: 'Twenty Butterflies', icon: 'butterfly' },
];

const NUMBER_WORDS = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
];

function generateCountingScript(
  postId: string,
  items: Array<{ number: number; label: string; icon: string }>,
): KidsScript {
  const sections: ScriptSection[] = [];

  sections.push({
    key: 'intro',
    text: "Hey friends! Let's count together! Can you count with me? Here we go!",
    audioFile: `${postId}/intro.wav`,
    voice: 'cheerful',
  });

  items.forEach((item, i) => {
    const countUp = Array.from({ length: item.number }, (_, j) => NUMBER_WORDS[j + 1]).join(', ');
    const singular = item.icon;

    sections.push({
      key: `number${i + 1}`,
      text: `Let's count to ${NUMBER_WORDS[item.number]}! ${countUp}! ${item.label}! Great counting!`,
      audioFile: `${postId}/number${i + 1}.wav`,
      voice: 'cheerful',
    });
  });

  sections.push({
    key: 'outro',
    text: "Wow, you're a counting champion! You did such an amazing job! Keep counting everywhere you go! See you next time!",
    audioFile: `${postId}/outro.wav`,
    voice: 'cheerful',
  });

  return {
    postId,
    template: 'kids-counting-fun',
    title: `Count to ${items[items.length - 1].number}!`,
    sections,
    fullScript: sections.map((s) => s.text).join(' '),
    audioDir: `audio/${postId}`,
    voicePreset: 'kids-cheerful',
  };
}

// ──────────────────────────────────────────────
// ICON QUIZ SCRIPTS
// ──────────────────────────────────────────────

interface QuizRound {
  question: string;
  choices: Array<{ icon: string; label: string }>;
  correctIndex: number;
}

const QUIZ_ROUNDS: QuizRound[] = [
  {
    question: 'Which one is a Cat?',
    choices: [
      { icon: 'dog', label: 'Dog' },
      { icon: 'cat', label: 'Cat' },
      { icon: 'fish', label: 'Fish' },
    ],
    correctIndex: 1,
  },
  {
    question: 'Which one is a Bird?',
    choices: [
      { icon: 'bird', label: 'Bird' },
      { icon: 'butterfly', label: 'Butterfly' },
      { icon: 'lion', label: 'Lion' },
    ],
    correctIndex: 0,
  },
  {
    question: 'Which one is an Elephant?',
    choices: [
      { icon: 'cat', label: 'Cat' },
      { icon: 'dog', label: 'Dog' },
      { icon: 'elephant', label: 'Elephant' },
    ],
    correctIndex: 2,
  },
  {
    question: 'Which shape is a Star?',
    choices: [
      { icon: 'circle', label: 'Circle' },
      { icon: 'star', label: 'Star' },
      { icon: 'triangle', label: 'Triangle' },
    ],
    correctIndex: 1,
  },
  {
    question: 'Which one is a Butterfly?',
    choices: [
      { icon: 'fish', label: 'Fish' },
      { icon: 'bird', label: 'Bird' },
      { icon: 'butterfly', label: 'Butterfly' },
    ],
    correctIndex: 2,
  },
  {
    question: 'Which shape is a Heart?',
    choices: [
      { icon: 'heart', label: 'Heart' },
      { icon: 'diamond', label: 'Diamond' },
      { icon: 'square', label: 'Square' },
    ],
    correctIndex: 0,
  },
  {
    question: 'Which one is a Lion?',
    choices: [
      { icon: 'elephant', label: 'Elephant' },
      { icon: 'lion', label: 'Lion' },
      { icon: 'dog', label: 'Dog' },
    ],
    correctIndex: 1,
  },
  {
    question: 'Which one is a Fish?',
    choices: [
      { icon: 'bird', label: 'Bird' },
      { icon: 'cat', label: 'Cat' },
      { icon: 'fish', label: 'Fish' },
    ],
    correctIndex: 2,
  },
];

function generateQuizScript(
  postId: string,
  rounds: QuizRound[],
): KidsScript {
  const sections: ScriptSection[] = [];

  sections.push({
    key: 'intro',
    text: "Welcome to the Quiz Show! Can you guess the right answer? Let's find out how smart you are! Ready? Let's play!",
    audioFile: `${postId}/intro.wav`,
    voice: 'cheerful',
  });

  rounds.forEach((round, i) => {
    const correct = round.choices[round.correctIndex];
    const wrongChoices = round.choices
      .filter((_, j) => j !== round.correctIndex)
      .map((c) => c.label)
      .join(' or ');

    sections.push({
      key: `round${i + 1}`,
      text: `${round.question} Is it the ${wrongChoices}? Or is it the ${correct.label}? That's right! It's the ${correct.label}! Great job!`,
      audioFile: `${postId}/round${i + 1}.wav`,
      voice: 'cheerful',
    });
  });

  sections.push({
    key: 'outro',
    text: "You got them all! You're a quiz champion! Give yourself a big round of applause! See you next time for more fun quizzes!",
    audioFile: `${postId}/outro.wav`,
    voice: 'cheerful',
  });

  return {
    postId,
    template: 'kids-icon-quiz',
    title: 'Animal & Shape Quiz!',
    sections,
    fullScript: sections.map((s) => s.text).join(' '),
    audioDir: `audio/${postId}`,
    voicePreset: 'kids-cheerful',
  };
}

// ──────────────────────────────────────────────
// BEDTIME STORY SCRIPTS
// ──────────────────────────────────────────────

interface StoryPage {
  text: string;
  illustration: string; // description for visual
}

const BEDTIME_STORIES: Array<{
  id: string;
  title: string;
  pages: StoryPage[];
}> = [
  {
    id: 'bedtime-twinkle-bear',
    title: 'Twinkle Bear and the Moonlight Garden',
    pages: [
      {
        text: 'Once upon a time, in a cozy little forest, there lived a small bear named Twinkle. Twinkle had the softest brown fur and the brightest eyes that sparkled like stars.',
        illustration: 'bear in forest',
      },
      {
        text: "Every night, when the moon rose high above the trees, Twinkle would look up at the sky and wonder, Where do the stars go during the day?",
        illustration: 'bear looking at moon',
      },
      {
        text: "One magical evening, a tiny firefly named Flicker landed on Twinkle's nose. Hello little bear! said Flicker. I know where the stars hide! Would you like to see?",
        illustration: 'firefly on bear nose',
      },
      {
        text: 'Twinkle followed Flicker through the whispering trees, past the gentle stream where the frogs sang their lullaby, deeper into the enchanted forest.',
        illustration: 'forest path with stream',
      },
      {
        text: "And there it was! A secret garden where flowers glowed with starlight. Each petal held a tiny piece of the sky. This is the Moonlight Garden, whispered Flicker.",
        illustration: 'glowing garden',
      },
      {
        text: 'Twinkle danced among the glowing flowers, touching each one gently. As he did, the flowers floated up into the sky, becoming stars once more.',
        illustration: 'flowers floating to sky',
      },
      {
        text: "The stars twinkled and danced, painting the night sky with silver light. Thank you, little bear, the stars seemed to whisper. You helped us find our way home.",
        illustration: 'starry sky',
      },
      {
        text: 'Twinkle yawned a big, sleepy yawn and curled up right there in the moonlight garden. The flowers sang a soft lullaby, and the stars watched over him.',
        illustration: 'bear sleeping in garden',
      },
      {
        text: "And as Twinkle's eyes slowly closed, he smiled, knowing that every night, the stars would come out to play. And so will you, in your dreams. Goodnight, little one. Sweet dreams.",
        illustration: 'peaceful sleeping scene',
      },
    ],
  },
  {
    id: 'bedtime-cloud-bunny',
    title: 'Cloud Bunny and the Rainbow Bridge',
    pages: [
      {
        text: 'High up in the sky, above the fluffy white clouds, lived a little bunny named Cloud. Cloud was no ordinary bunny. She was as white as snow and as soft as a pillow.',
        illustration: 'white bunny on cloud',
      },
      {
        text: "Cloud loved to hop from cloud to cloud, making shapes for the children below. Look! It's a bunny cloud! the children would say, and Cloud would wiggle her nose with joy.",
        illustration: 'bunny hopping on clouds',
      },
      {
        text: "One day, Cloud noticed something beautiful. A rainbow stretched across the sky after a gentle rain. I wonder what's at the other end, she thought.",
        illustration: 'rainbow across sky',
      },
      {
        text: 'Cloud hopped onto the rainbow bridge. It felt warm under her paws, like walking on sunshine. Each color hummed a different note, making the most beautiful melody.',
        illustration: 'bunny on rainbow',
      },
      {
        text: "At the end of the rainbow, Cloud found a garden of moon flowers. They only bloomed at night and glowed with a gentle silver light. Hello, Cloud Bunny, the flowers sang.",
        illustration: 'moon flower garden',
      },
      {
        text: "The moon flowers gave Cloud a special gift. A tiny glowing seed. Plant this in your cloud, they said, and you'll grow your very own star.",
        illustration: 'glowing seed gift',
      },
      {
        text: "Cloud hopped back along the rainbow, holding the seed carefully. She planted it in the softest, fluffiest cloud she could find and watered it with dewdrops.",
        illustration: 'planting seed in cloud',
      },
      {
        text: 'That night, the seed grew into a beautiful little star that twinkled and glowed. Cloud curled up next to her star, warm and safe in the sky.',
        illustration: 'star growing from cloud',
      },
      {
        text: "And if you look up at the night sky, you might just see Cloud Bunny's star, twinkling just for you. Close your eyes now. Cloud Bunny is watching over you. Goodnight, sweet child. Sleep tight.",
        illustration: 'night sky with special star',
      },
    ],
  },
  {
    id: 'bedtime-ocean-turtle',
    title: 'Little Turtle and the Ocean Lullaby',
    pages: [
      {
        text: 'Deep in the warm blue ocean, a tiny sea turtle named Splash was born on a sandy beach under a sky full of stars. She took her first steps toward the sparkling water.',
        illustration: 'baby turtle on beach',
      },
      {
        text: 'The ocean welcomed Splash with gentle waves that rocked her back and forth, like a cradle made of water. Welcome, little one, the ocean seemed to say.',
        illustration: 'turtle in gentle waves',
      },
      {
        text: "Splash met all kinds of wonderful friends. A friendly seahorse named Swirl, a cheerful clownfish named Bubble, and a wise old whale named Deep. They all played together in the coral garden.",
        illustration: 'underwater friends',
      },
      {
        text: "But when the sun began to set and the water turned golden, Splash felt a little scared. Where do I sleep? she asked. The ocean is so big.",
        illustration: 'sunset ocean',
      },
      {
        text: "Don't worry, said Deep the whale, with the kindest voice. Listen closely. Can you hear it? The ocean sings a lullaby every night.",
        illustration: 'whale talking to turtle',
      },
      {
        text: 'And sure enough, Splash could hear it. The waves made a soft whooshing sound, the dolphins hummed, the seashells chimed, and the coral swayed like gentle hands.',
        illustration: 'musical ocean scene',
      },
      {
        text: "Splash found a perfect little spot in the soft sea grass, where the current was warm and calm. The bioluminescent jellyfish floated nearby, glowing like tiny lanterns.",
        illustration: 'turtle in sea grass with jellyfish',
      },
      {
        text: "The ocean's lullaby wrapped around Splash like a cozy blanket. The stars reflected in the water above, and the whole ocean sparkled like a million diamonds.",
        illustration: 'sparkling ocean at night',
      },
      {
        text: "Splash closed her little eyes and smiled. She was home. And the ocean would sing to her every single night. Close your eyes too. Can you hear the ocean singing? Goodnight, little dreamer. Sleep well.",
        illustration: 'sleeping turtle',
      },
    ],
  },
];

function generateBedtimeScript(story: typeof BEDTIME_STORIES[0]): KidsScript {
  const postId = story.id;
  const sections: ScriptSection[] = [];

  sections.push({
    key: 'intro',
    text: `It's story time. Tonight's story is called, ${story.title}. Get cozy, close your eyes, and listen.`,
    audioFile: `${postId}/intro.wav`,
    voice: 'soothing',
  });

  story.pages.forEach((page, i) => {
    sections.push({
      key: `page${i + 1}`,
      text: page.text,
      audioFile: `${postId}/page${i + 1}.wav`,
      voice: 'soothing',
    });
  });

  sections.push({
    key: 'outro',
    text: 'The end. Goodnight. Sweet dreams.',
    audioFile: `${postId}/outro.wav`,
    voice: 'soothing',
  });

  return {
    postId,
    template: 'kids-bedtime-story',
    title: story.title,
    sections,
    fullScript: sections.map((s) => s.text).join(' '),
    audioDir: `audio/${postId}`,
    voicePreset: 'kids-soothing',
  };
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let templateFilter: string | null = null;
  let fullAlphabet = false;
  let fullCounting = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && args[i + 1]) templateFilter = args[i + 1];
    if (args[i] === '--full-alphabet') fullAlphabet = true;
    if (args[i] === '--full-counting') fullCounting = true;
  }

  const allScripts: KidsScript[] = [];

  // Alphabet Adventure
  if (!templateFilter || templateFilter === 'kids-alphabet-adventure') {
    if (fullAlphabet) {
      // Full A-Z in chunks of 6-8 letters for episode-style content
      const chunkSize = 6;
      for (let i = 0; i < 26; i += chunkSize) {
        const chunk = FULL_ALPHABET.slice(i, i + chunkSize);
        const epNum = Math.floor(i / chunkSize) + 1;
        allScripts.push(
          generateAlphabetScript(`alphabet-ep${epNum}`, chunk),
        );
      }
    } else {
      // Default: A-F (matches template defaults)
      allScripts.push(
        generateAlphabetScript('alphabet-af', FULL_ALPHABET.slice(0, 6)),
      );
    }
  }

  // Counting Fun
  if (!templateFilter || templateFilter === 'kids-counting-fun') {
    if (fullCounting) {
      // 1-10 and 11-20 as two episodes
      allScripts.push(generateCountingScript('counting-1to10', COUNTING_ITEMS.slice(0, 10)));
      allScripts.push(generateCountingScript('counting-11to20', COUNTING_ITEMS.slice(10, 20)));
    } else {
      // Default: 1-5 (matches template defaults)
      allScripts.push(generateCountingScript('counting-1to5', COUNTING_ITEMS.slice(0, 5)));
    }
  }

  // Icon Quiz
  if (!templateFilter || templateFilter === 'kids-icon-quiz') {
    // 5 rounds (default) and 8 rounds (extended)
    allScripts.push(generateQuizScript('quiz-animals', QUIZ_ROUNDS.slice(0, 5)));
    allScripts.push(generateQuizScript('quiz-extended', QUIZ_ROUNDS));
  }

  // Bedtime Stories
  if (!templateFilter || templateFilter === 'kids-bedtime-story') {
    for (const story of BEDTIME_STORIES) {
      allScripts.push(generateBedtimeScript(story));
    }
  }

  // Write scripts
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allScripts, null, 2));

  const totalSections = allScripts.reduce((sum, s) => sum + s.sections.length, 0);
  console.log('═══════════════════════════════════════════════');
  console.log('  KIDS CONTENT SCRIPTS GENERATED');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Scripts:        ${allScripts.length}`);
  console.log(`  Total sections: ${totalSections}`);
  console.log(`  Output:         ${OUTPUT_FILE}`);
  console.log('═══════════════════════════════════════════════');

  // Preview
  console.log('\n── Preview ──');
  for (const s of allScripts) {
    const cheerful = s.sections.filter((sec) => sec.voice === 'cheerful').length;
    const soothing = s.sections.filter((sec) => sec.voice === 'soothing').length;
    console.log(`\n[${s.postId}] ${s.template} — "${s.title}"`);
    console.log(`  Sections: ${s.sections.length} (voice: ${cheerful ? `${cheerful} cheerful` : ''}${soothing ? ` ${soothing} soothing` : ''})`);
    console.log(`  Voice preset: ${s.voicePreset}`);
    for (const sec of s.sections.slice(0, 3)) {
      console.log(`  ${sec.key}: "${sec.text.slice(0, 70)}${sec.text.length > 70 ? '...' : ''}"`);
    }
    if (s.sections.length > 3) {
      console.log(`  ... and ${s.sections.length - 3} more sections`);
    }
  }

  // Summary by voice type
  const cheerfulScripts = allScripts.filter((s) => s.voicePreset === 'kids-cheerful');
  const soothingScripts = allScripts.filter((s) => s.voicePreset === 'kids-soothing');

  console.log('\n── Voice Requirements ──');
  console.log(`  kids-cheerful: ${cheerfulScripts.length} scripts (${cheerfulScripts.reduce((s, x) => s + x.sections.length, 0)} audio files)`);
  console.log(`    → Bright, energetic child-friendly narrator voice`);
  console.log(`    → For: alphabet, counting, quiz templates`);
  console.log(`  kids-soothing: ${soothingScripts.length} scripts (${soothingScripts.reduce((s, x) => s + x.sections.length, 0)} audio files)`);
  console.log(`    → Calm, warm, gentle bedtime narrator voice`);
  console.log(`    → For: bedtime story templates`);
}

main();
