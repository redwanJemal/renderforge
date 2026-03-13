# Task 09: Content Seeding

## Overview

Create a seed script that migrates the existing 100 motivational content posts from `content/banks/motivational.ts` into the database, creating proper post and scene records, and linking existing audio files stored in MinIO.

## Subtasks

1. [ ] Create seed script that migrates 100 motivational posts from `content/banks/motivational.ts` to database (posts + scenes)
2. [ ] Link existing MinIO audio files (content/audio/mot-001 through mot-100) to scenes via audio_url
3. [ ] Verify: 100 posts with scenes exist in DB, audio URLs resolve

## Details

### Source Data

The existing content bank is in `content/banks/motivational.ts`. Each entry has a structure like:

```typescript
{
  id: 'mot-001',
  title: 'The Power of Persistence',
  segments: [
    { key: 'hook', text: '...', narration: '...', entrance: 'fade', textSize: 'lg' },
    { key: 'point1', text: '...', narration: '...', entrance: 'slideUp' },
    // ... more segments
  ],
  theme: 'dark',
  template: 'motivational-narration',
}
```

### Audio File Structure

Existing audio files are stored at:
```
content/audio/mot-001/
  ├── splits.json        # scene split timing data
  └── scenes/
      ├── hook.wav
      ├── point1.wav
      ├── point2.wav
      └── ...
```

These may already be in MinIO or on the local filesystem. The seed script should handle both cases.

### Seed Script (`packages/db/src/seed-content.ts`)

```typescript
import { db, posts, scenes, niches } from './index';
import { eq } from 'drizzle-orm';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Import motivational content bank
import { motivationalContent } from '../../../content/banks/motivational';

const CONTENT_AUDIO_DIR = join(__dirname, '../../../content/audio');

async function seedContent() {
  console.log('Seeding motivational content...');

  // Find motivational niche
  const [niche] = await db.select().from(niches).where(eq(niches.slug, 'motivational'));
  if (!niche) {
    console.error('Motivational niche not found. Run db:seed first.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const entry of motivationalContent) {
    // Check if post already exists (by title match or metadata.originalId)
    const existing = await db.select().from(posts)
      .where(eq(posts.title, entry.title));

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Create post
    const [post] = await db.insert(posts).values({
      nicheId: niche.id,
      title: entry.title,
      status: 'draft',
      theme: entry.theme || 'dark',
      templateId: entry.template || 'motivational-narration',
      format: 'story',
      metadata: { originalId: entry.id },
    }).returning();

    // Create scenes from segments
    const sceneRows = entry.segments.map((seg, idx) => {
      const audioDir = join(CONTENT_AUDIO_DIR, entry.id, 'scenes');
      const audioFile = `${seg.key}.wav`;
      const audioPath = join(audioDir, audioFile);

      // Check if audio exists locally
      let audioUrl: string | null = null;
      let durationSeconds: string | null = null;

      if (existsSync(audioPath)) {
        audioUrl = `audio/${entry.id}/scenes/${audioFile}`;
      }

      // Check splits.json for duration data
      const splitsPath = join(CONTENT_AUDIO_DIR, entry.id, 'splits.json');
      if (existsSync(splitsPath)) {
        try {
          const splits = JSON.parse(readFileSync(splitsPath, 'utf-8'));
          const sceneSplit = splits.find((s: any) => s.key === seg.key);
          if (sceneSplit?.duration) {
            durationSeconds = sceneSplit.duration.toFixed(3);
          }
        } catch {}
      }

      return {
        postId: post.id,
        sortOrder: idx,
        key: seg.key,
        displayText: seg.text,
        narrationText: seg.narration,
        audioUrl,
        durationSeconds,
        entrance: seg.entrance || 'fade',
        textSize: seg.textSize || 'md',
      };
    });

    await db.insert(scenes).values(sceneRows);

    // If all scenes have audio, set post to "ready"
    const allHaveAudio = sceneRows.every(s => s.audioUrl && s.durationSeconds);
    if (allHaveAudio) {
      await db.update(posts).set({ status: 'ready' }).where(eq(posts.id, post.id));
    } else if (sceneRows.some(s => !s.audioUrl)) {
      await db.update(posts).set({ status: 'audio_pending' }).where(eq(posts.id, post.id));
    }

    created++;
  }

  console.log(`Seeded ${created} posts, skipped ${skipped} existing`);
}

seedContent().catch(console.error).finally(() => process.exit(0));
```

### Upload Local Audio to MinIO

If audio files are on the local filesystem but not in MinIO, create a companion script:

```typescript
// packages/db/src/seed-audio.ts
// Scans content/audio/* and uploads to MinIO
import { storage } from '../../apps/api/src/services/storage';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const AUDIO_BASE = join(__dirname, '../../../content/audio');

async function uploadAudio() {
  const dirs = readdirSync(AUDIO_BASE, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('mot-'));

  for (const dir of dirs) {
    const scenesDir = join(AUDIO_BASE, dir.name, 'scenes');
    if (!existsSync(scenesDir)) continue;

    const files = readdirSync(scenesDir).filter(f => f.endsWith('.wav'));
    for (const file of files) {
      const key = `audio/${dir.name}/scenes/${file}`;
      const buffer = readFileSync(join(scenesDir, file));
      await storage.upload(key, buffer, 'audio/wav');
      console.log(`Uploaded: ${key}`);
    }
  }
}
```

### Package.json Script

Add to `packages/db/package.json`:
```json
{
  "scripts": {
    "seed:content": "tsx src/seed-content.ts",
    "seed:audio": "tsx src/seed-audio.ts"
  }
}
```

And to root `package.json`:
```json
{
  "scripts": {
    "db:seed:content": "pnpm --filter @renderforge/db seed:content",
    "db:seed:audio": "pnpm --filter @renderforge/db seed:audio"
  }
}
```

## Verification

1. `pnpm db:seed:content` runs without errors
2. Database contains 100 posts linked to the "motivational" niche
3. Each post has the correct number of scenes with displayText and narrationText
4. Posts with complete audio are in "ready" status
5. Posts without audio are in "audio_pending" status
6. `GET /api/posts?nicheId=<motivational-niche-id>` returns seeded posts
7. `GET /api/posts/:id` shows scenes with audio_url and duration_seconds populated
8. Audio files accessible via MinIO presigned URLs
