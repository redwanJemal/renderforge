#!/usr/bin/env npx tsx
/**
 * Unified Content Generator
 *
 * Generates TTS scripts + splits.json for any niche using content banks.
 * Replaces niche-specific generators (generate-motivational.ts, generate-kids-scripts.ts, etc.)
 *
 * Usage:
 *   npx tsx content/generate-content.ts --niche motivational           # all posts
 *   npx tsx content/generate-content.ts --niche motivational --limit 5 # first 5
 *   npx tsx content/generate-content.ts --niche motivational --theme mindset
 *   npx tsx content/generate-content.ts --niche jokes --dry-run
 *   npx tsx content/generate-content.ts --list                         # list niches
 */

import * as fs from 'fs';
import * as path from 'path';
import { getBank, listBanks } from './banks';
import { niches } from './niches';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

interface ScriptSection {
  key: string;
  text: string;
  audioFile: string;
}

interface ScriptPost {
  postId: string;
  template: string;
  theme: string;
  title: string;
  sections: ScriptSection[];
  fullScript: string;
  audioDir: string;
}

interface SplitsJson {
  segments: { key: string; start: number; end: number }[];
  props: Record<string, any>;
}

// ──────────────────────────────────────────────
// GENERATION
// ──────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let nicheId: string | null = null;
  let limit = Infinity;
  let theme: string | null = null;
  let dryRun = false;
  let listMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--niche' && args[i + 1]) nicheId = args[i + 1];
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    if (args[i] === '--theme' && args[i + 1]) theme = args[i + 1];
    if (args[i] === '--dry-run') dryRun = true;
    if (args[i] === '--list') listMode = true;
  }

  // List mode
  if (listMode) {
    console.log('\n  Available content banks:\n');
    const banks = listBanks();
    for (const b of banks) {
      const niche = niches[b.nicheId];
      const langs = niche?.languages?.join(', ') || 'en';
      const status = b.totalPosts > 0 ? `${b.totalPosts} posts` : 'stub (no content yet)';
      console.log(`  ${b.nicheId.padEnd(20)} ${status.padEnd(25)} ${b.themes} themes  [${langs}]`);
    }
    console.log('');
    return;
  }

  if (!nicheId) {
    console.log('Usage:');
    console.log('  npx tsx content/generate-content.ts --niche <niche-id>');
    console.log('  npx tsx content/generate-content.ts --list');
    console.log('');
    console.log('Options:');
    console.log('  --limit N          Generate first N posts only');
    console.log('  --theme <id>       Filter by theme');
    console.log('  --dry-run          Preview without writing files');
    process.exit(1);
  }

  // Look up bank and niche
  const bank = getBank(nicheId);
  if (!bank) {
    console.error(`No content bank for niche: ${nicheId}`);
    console.error('Run with --list to see available niches.');
    process.exit(1);
  }

  const niche = niches[nicheId];
  if (!niche) {
    console.error(`No niche definition for: ${nicheId}`);
    process.exit(1);
  }

  // Get posts from bank
  const posts = bank.getPosts({ theme: theme || undefined, limit });

  if (posts.length === 0) {
    console.error(`No posts available for niche: ${nicheId}${theme ? ` (theme: ${theme})` : ''}`);
    console.error('This niche may be a stub. Add content to its bank file.');
    process.exit(1);
  }

  const AUDIO_DIR = path.join(__dirname, 'audio');
  const SCRIPTS_FILE = path.join(__dirname, `scripts-${nicheId}.json`);

  console.log('═══════════════════════════════════════════════');
  console.log('  CONTENT GENERATOR');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Niche:       ${niche.name} (${nicheId})`);
  console.log(`  Template:    ${niche.defaultTemplateId}`);
  console.log(`  Format:      ${niche.defaultFormat}`);
  console.log(`  Voice:       ${niche.voiceId}`);
  console.log(`  Languages:   ${niche.languages.join(', ')}`);
  console.log(`  Posts:       ${posts.length}${theme ? ` (theme: ${theme})` : ''}`);
  console.log(`  Mode:        ${dryRun ? 'dry-run' : 'generate'}`);
  console.log('═══════════════════════════════════════════════\n');

  const allScripts: ScriptPost[] = [];
  let currentTheme = '';

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const postNum = String(i + 1).padStart(3, '0');
    const postId = `${niche.postIdPrefix}-${postNum}`;

    if (post.theme !== currentTheme) {
      currentTheme = post.theme;
      console.log(`  [${post.theme}]`);
    }

    // Build script post
    const sections: ScriptSection[] = post.sections.map((s) => ({
      key: s.key,
      text: s.text,
      audioFile: `${postId}/${s.key}.wav`,
    }));

    const scriptPost: ScriptPost = {
      postId,
      template: niche.defaultTemplateId,
      theme: post.theme,
      title: post.title,
      sections,
      fullScript: post.fullScript,
      audioDir: `audio/${postId}`,
    };

    allScripts.push(scriptPost);

    const wordCount = post.fullScript.split(/\s+/).length;
    const estDuration = Math.round(wordCount / 2.5);
    console.log(`    ${postId}: "${post.title}" (${wordCount} words, ~${estDuration}s)`);

    if (dryRun) continue;

    // Write splits.json
    const postAudioDir = path.join(AUDIO_DIR, postId);
    fs.mkdirSync(postAudioDir, { recursive: true });

    const splits: SplitsJson = {
      segments: post.sections.map((s) => ({ key: s.key, start: 0, end: 0 })),
      props: post.sceneProps,
    };

    fs.writeFileSync(
      path.join(postAudioDir, 'splits.json'),
      JSON.stringify(splits, null, 2),
    );
  }

  if (!dryRun) {
    fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(allScripts, null, 2));
    console.log(`\n  Scripts:     ${SCRIPTS_FILE}`);
    console.log(`  Audio dirs:  ${AUDIO_DIR}/${niche.postIdPrefix}-XXX/splits.json`);
  }

  const totalWords = allScripts.reduce((sum, s) => sum + s.fullScript.split(/\s+/).length, 0);
  const estTotalMin = Math.round(totalWords / 2.5 / 60);

  console.log('\n═══════════════════════════════════════════════');
  console.log('  GENERATION COMPLETE');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Posts:       ${allScripts.length}`);
  console.log(`  Words:       ${totalWords.toLocaleString()}`);
  console.log(`  Est. audio:  ~${estTotalMin} minutes`);
  if (!dryRun) {
    console.log('\n  Next steps:');
    console.log(`  1. Upload scripts-${nicheId}.json to Google Colab`);
    console.log('  2. Generate TTS audio (Qwen3)');
    console.log(`  3. Upload full.wav files to MinIO: ${niche.storagePrefix}/${niche.postIdPrefix}-XXX.wav`);
    console.log(`  4. Run: npx tsx content/batch-render.ts --niche ${nicheId} --resume`);
  }
  console.log('═══════════════════════════════════════════════');
}

main();
