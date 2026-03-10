#!/usr/bin/env npx tsx
/**
 * Script Generator for Audio-First Pipeline
 *
 * Reads content-plan.json and generates narration scripts for each post.
 * Exports scripts.json — ready to feed into Qwen3 TTS on Google Colab.
 *
 * Each script is split into sections so TTS generates separate audio files
 * per section, enabling precise video-audio sync.
 *
 * Usage:
 *   npx tsx content/generate-scripts.ts                    # all posts
 *   npx tsx content/generate-scripts.ts --limit 10         # first 10
 *   npx tsx content/generate-scripts.ts --post day01-post1 # specific post
 */

import * as fs from 'fs';
import * as path from 'path';

const PLAN_FILE = path.join(__dirname, 'content-plan.json');
const OUTPUT_FILE = path.join(__dirname, 'scripts.json');

interface Post {
  id: string;
  day: number;
  postNum: number;
  date: string;
  pillar: string;
  template: 'slider' | 'yld-intro';
  title: string;
  description: string;
  tags: string[];
  caption: string;
  props: Record<string, any>;
}

interface ScriptSection {
  key: string;       // e.g. "intro", "slide1", "slide2", "outro"
  text: string;      // narration text for TTS
  audioFile: string;  // expected filename: {postId}/{key}.wav
}

interface PostScript {
  postId: string;
  template: string;
  pillar: string;
  title: string;
  sections: ScriptSection[];
  /** Full narration text (all sections joined) — for single-file TTS */
  fullScript: string;
  /** Expected audio directory */
  audioDir: string;
}

// ──────────────────────────────────────────────
// SCRIPT GENERATION
// ──────────────────────────────────────────────

function generateYLDScript(post: Post): ScriptSection[] {
  const p = post.props;
  const sections: ScriptSection[] = [];

  // Section 1: Intro (logo + brand)
  sections.push({
    key: 'intro',
    text: 'Your Last Dollar.',
    audioFile: `${post.id}/intro.wav`,
  });

  // Section 2: Main headline
  const line1 = p.header?.line1 || '';
  const line2 = p.header?.line2 || '';
  sections.push({
    key: 'headline',
    text: `${line1} ${line2}`.trim(),
    audioFile: `${post.id}/headline.wav`,
  });

  // Section 3: Subheader / explanation
  const subtext = (p.subheader?.text || '').replace(/\n/g, ' ');
  if (subtext) {
    sections.push({
      key: 'subheader',
      text: subtext,
      audioFile: `${post.id}/subheader.wav`,
    });
  }

  // Section 4: Badge text
  const badge = p.badge?.text || '';
  if (badge) {
    sections.push({
      key: 'badge',
      text: badge,
      audioFile: `${post.id}/badge.wav`,
    });
  }

  // Section 5: CTA
  const cta = (p.cta?.text || '').replace('→', '').trim();
  if (cta) {
    sections.push({
      key: 'cta',
      text: cta,
      audioFile: `${post.id}/cta.wav`,
    });
  }

  return sections;
}

function generateSliderScript(post: Post): ScriptSection[] {
  const p = post.props;
  const sections: ScriptSection[] = [];

  // Section 1: Intro
  const introTitle = p.intro?.title || 'Your Last Dollar';
  const introSub = p.intro?.subtitle || '';
  sections.push({
    key: 'intro',
    text: `${introTitle}. ${introSub}.`.trim(),
    audioFile: `${post.id}/intro.wav`,
  });

  // Sections 2-N: Each slide
  const slides: any[] = p.slides || [];
  slides.forEach((slide: any, i: number) => {
    const headline = (slide.headline || '').replace(/\n/g, ' ');
    const subtext = (slide.subtext || '').replace(/\n/g, ' ');
    sections.push({
      key: `slide${i + 1}`,
      text: `${headline}. ${subtext}`.trim(),
      audioFile: `${post.id}/slide${i + 1}.wav`,
    });
  });

  // Last section: Outro
  const outroText = p.outro?.text || '';
  const outroSub = p.outro?.subtext || '';
  sections.push({
    key: 'outro',
    text: `${outroText}. Follow ${outroSub}.`.trim(),
    audioFile: `${post.id}/outro.wav`,
  });

  return sections;
}

// ──────────────────────────────────────────────
// COLAB NOTEBOOK GENERATOR
// ──────────────────────────────────────────────

function generateColabNotebook(scripts: PostScript[]): string {
  // Generate a Python script that can be pasted into Colab
  const lines: string[] = [];

  lines.push(`"""
Qwen3 TTS Audio Generator for RenderForge
==========================================
Paste this in Google Colab. It will:
1. Install Qwen3 TTS dependencies
2. Generate .wav files for each script section
3. Zip everything for download

Generated: ${new Date().toISOString()}
Total posts: ${scripts.length}
Total audio files: ${scripts.reduce((sum, s) => sum + s.sections.length, 0)}
"""

# ── Cell 1: Install dependencies ──
# !pip install transformers torch torchaudio soundfile accelerate

# ── Cell 2: Load model ──
# Adjust model name if using a different Qwen TTS variant
"""
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch, soundfile as sf, os, json

# Load Qwen3 TTS (adjust model path as needed)
# model = ...
# tokenizer = ...
"""

# ── Cell 3: Load scripts ──
import json, os

scripts = json.loads("""${JSON.stringify(scripts)}""")

print(f"Loaded {len(scripts)} post scripts")
print(f"Total sections to generate: {sum(len(s['sections']) for s in scripts)}")

# ── Cell 4: Generate audio for each section ──
"""
os.makedirs("audio", exist_ok=True)

for post in scripts:
    post_dir = os.path.join("audio", post["postId"])
    os.makedirs(post_dir, exist_ok=True)

    for section in post["sections"]:
        output_path = os.path.join("audio", section["audioFile"])
        text = section["text"]

        print(f"Generating: {section['audioFile']} -> \\"{text[:50]}...\\"")

        # ── Replace this with your Qwen3 TTS generation code ──
        # audio = generate_tts(text, voice="young_male")
        # sf.write(output_path, audio, samplerate=24000)

        # Placeholder: you need to fill in the actual TTS call
        pass

print("Done! All audio files generated.")
"""

# ── Cell 5: Also generate full narration per post (single file) ──
"""
for post in scripts:
    full_path = os.path.join("audio", post["postId"], "full.wav")
    text = post["fullScript"]

    print(f"Full narration: {post['postId']} -> \\"{text[:60]}...\\"")

    # audio = generate_tts(text, voice="young_male")
    # sf.write(full_path, audio, samplerate=24000)
    pass
"""

# ── Cell 6: Zip and download ──
"""
import shutil
shutil.make_archive("renderforge-audio", "zip", "audio")

from google.colab import files
files.download("renderforge-audio.zip")
print("Download started!")
"""
`);

  return lines.join('\n');
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let limit = Infinity;
  let specificPost: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    if (args[i] === '--post' && args[i + 1]) specificPost = args[i + 1];
  }

  if (!fs.existsSync(PLAN_FILE)) {
    console.error('content-plan.json not found. Run generate-plan.ts first.');
    process.exit(1);
  }

  const plan: Post[] = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8'));
  let posts = specificPost ? plan.filter((p) => p.id === specificPost) : plan;
  posts = posts.slice(0, limit);

  const scripts: PostScript[] = posts.map((post) => {
    const sections =
      post.template === 'yld-intro'
        ? generateYLDScript(post)
        : generateSliderScript(post);

    return {
      postId: post.id,
      template: post.template,
      pillar: post.pillar,
      title: post.title,
      sections,
      fullScript: sections.map((s) => s.text).join(' '),
      audioDir: `audio/${post.id}`,
    };
  });

  // Write scripts.json
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(scripts, null, 2));
  console.log(`\nGenerated scripts for ${scripts.length} posts → ${OUTPUT_FILE}`);

  const totalSections = scripts.reduce((sum, s) => sum + s.sections.length, 0);
  console.log(`Total audio sections: ${totalSections}`);
  console.log(`Average sections/post: ${(totalSections / scripts.length).toFixed(1)}`);

  // Write Colab helper
  const colabScript = generateColabNotebook(scripts);
  const colabFile = path.join(__dirname, 'colab-tts.py');
  fs.writeFileSync(colabFile, colabScript);
  console.log(`Colab TTS script → ${colabFile}`);

  // Preview first 3
  console.log('\n── Preview ──');
  for (const s of scripts.slice(0, 3)) {
    console.log(`\n[${s.postId}] ${s.template} — ${s.title}`);
    for (const sec of s.sections) {
      console.log(`  ${sec.key}: "${sec.text.slice(0, 80)}${sec.text.length > 80 ? '...' : ''}"`);
    }
  }
}

main();
