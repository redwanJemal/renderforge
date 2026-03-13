# Task 13: Automated BGM Mixing

## Overview

Add background music (BGM) management and automatic mixing into the render pipeline. BGM tracks are stored in MinIO, categorized by niche, and automatically mixed into rendered videos at a configurable volume level.

## Subtasks

1. [ ] Create `apps/api/src/services/bgm.ts` — BGM service: list, getById, getByCategory, upload, delete
2. [ ] Create `apps/api/src/routes/bgm.ts` — CRUD for BGM tracks
3. [ ] Integrate BGM mixing into render worker: auto-select BGM, apply ffmpeg amix
4. [ ] Seed existing BGM files from content/audio/bgm/ into database
5. [ ] Verify: BGM auto-selected during render, mixed into output video

## Details

### BGM Service (`apps/api/src/services/bgm.ts`)

```typescript
import { db, bgmTracks } from '@renderforge/db';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { storage } from './storage';
import { getAudioDuration } from '../lib/ffprobe';

type CreateBGMInput = {
  name: string;
  category?: string;
  nicheId?: string;
};

export const bgmService = {
  async list(options: { category?: string; nicheId?: string } = {}) {
    const conditions = [];
    if (options.category) conditions.push(eq(bgmTracks.category, options.category));
    if (options.nicheId) conditions.push(eq(bgmTracks.nicheId, options.nicheId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(bgmTracks).where(where);
  },

  async getById(id: string) {
    const [track] = await db.select().from(bgmTracks).where(eq(bgmTracks.id, id));
    return track || null;
  },

  async getByCategory(category: string, nicheId?: string) {
    // Prefer niche-specific BGM, fall back to generic
    if (nicheId) {
      const nicheTrack = await db.select().from(bgmTracks)
        .where(and(eq(bgmTracks.category, category), eq(bgmTracks.nicheId, nicheId)));
      if (nicheTrack.length > 0) {
        // Return a random track from the matching set
        return nicheTrack[Math.floor(Math.random() * nicheTrack.length)];
      }
    }

    // Fall back to generic (no niche)
    const tracks = await db.select().from(bgmTracks)
      .where(and(eq(bgmTracks.category, category), isNull(bgmTracks.nicheId)));

    if (tracks.length === 0) return null;
    return tracks[Math.floor(Math.random() * tracks.length)];
  },

  async upload(input: CreateBGMInput, buffer: Buffer, contentType: string, filename: string) {
    // Upload to MinIO
    const ext = filename.split('.').pop() || 'mp3';
    const key = `bgm/${input.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    await storage.upload(key, buffer, contentType);

    // Detect duration
    const tempDir = await mkdtemp(join(tmpdir(), 'rf-bgm-'));
    const tempPath = join(tempDir, `bgm.${ext}`);
    await writeFile(tempPath, buffer);
    const durationSeconds = await getAudioDuration(tempPath);
    await unlink(tempPath).catch(() => {});

    // Insert DB record
    const [track] = await db.insert(bgmTracks).values({
      name: input.name,
      fileUrl: key,
      durationSeconds: durationSeconds.toFixed(3),
      category: input.category,
      nicheId: input.nicheId,
    }).returning();

    return track;
  },

  async delete(id: string) {
    const track = await this.getById(id);
    if (!track) return null;

    // Delete from MinIO
    await storage.delete(track.fileUrl);

    // Delete DB record
    await db.delete(bgmTracks).where(eq(bgmTracks.id, id));
    return track;
  },
};
```

### BGM Routes (`apps/api/src/routes/bgm.ts`)

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { bgmService } from '../services/bgm';

const bgmRoutes = new Hono();

// GET /api/bgm — list BGM tracks
bgmRoutes.get('/', async (c) => {
  const category = c.req.query('category');
  const nicheId = c.req.query('nicheId');
  const tracks = await bgmService.list({ category, nicheId });
  return c.json({ items: tracks });
});

// GET /api/bgm/:id — get single track
bgmRoutes.get('/:id', async (c) => {
  const track = await bgmService.getById(c.req.param('id'));
  if (!track) return c.json({ error: 'Track not found' }, 404);

  const url = await storage.getPresignedUrl(track.fileUrl);
  return c.json({ ...track, url });
});

// POST /api/bgm — upload new BGM track
bgmRoutes.post('/', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const name = body['name'] as string;
  const category = body['category'] as string | undefined;
  const nicheId = body['nicheId'] as string | undefined;

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No audio file provided' }, 400);
  }
  if (!name) return c.json({ error: 'Name is required' }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const track = await bgmService.upload(
    { name, category, nicheId },
    buffer, file.type, file.name
  );

  return c.json(track, 201);
});

// DELETE /api/bgm/:id — delete track
bgmRoutes.delete('/:id', async (c) => {
  const track = await bgmService.delete(c.req.param('id'));
  if (!track) return c.json({ error: 'Track not found' }, 404);
  return c.json({ message: 'Deleted' });
});

export { bgmRoutes };
```

### Render Worker Integration

Update the render worker (from Task 12) to add BGM mixing after narration merge:

```typescript
// In processRender(), after merging narration audio:

// Step 8: Add BGM
const nicheConfig = manifest.metadata as Record<string, unknown> | null;
const bgmCategory = (nicheConfig?.bgmCategory as string) || manifest.nicheSlug;
const bgmTrack = await bgmService.getByCategory(bgmCategory, manifest.nicheId);

if (bgmTrack) {
  await publishProgress(renderId, 85, 'rendering', 'Mixing BGM...');

  // Download BGM from MinIO
  const bgmLocalPath = join(tempDir, 'bgm.mp3');
  const bgmStream = await storage.download(bgmTrack.fileUrl);
  // ... read stream to buffer and write to file

  // Mix BGM with the narration-merged video
  const withBgmPath = join(tempDir, 'with-bgm.mp4');
  const bgmVolume = (nicheConfig?.bgmVolume as number) || 0.35;

  await execFileAsync('ffmpeg', [
    '-i', finalPath,       // video with narration
    '-i', bgmLocalPath,    // BGM track
    '-filter_complex',
    `[1:a]volume=${bgmVolume}[bgm];[0:a][bgm]amix=inputs=2:duration=first:normalize=0[aout]`,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-y', withBgmPath,
  ]);

  // Replace final path with BGM-mixed version
  finalPath = withBgmPath;
}
```

### Seed Existing BGM (`packages/db/src/seed-bgm.ts`)

```typescript
// Scan content/audio/bgm/ directory and insert tracks
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, bgmTracks, niches } from './index';
import { storage } from '../../apps/api/src/services/storage';
import { getAudioDuration } from '../../apps/api/src/lib/ffprobe';

const BGM_DIR = join(__dirname, '../../../content/audio/bgm');

async function seedBGM() {
  const files = readdirSync(BGM_DIR).filter(f => /\.(mp3|wav|ogg)$/.test(f));

  for (const file of files) {
    const name = file.replace(/\.\w+$/, '').replace(/-/g, ' ');
    const filePath = join(BGM_DIR, file);
    const buffer = readFileSync(filePath);
    const duration = await getAudioDuration(filePath);

    const key = `bgm/${file}`;
    await storage.upload(key, buffer, 'audio/mpeg');

    await db.insert(bgmTracks).values({
      name,
      fileUrl: key,
      durationSeconds: duration.toFixed(3),
      category: 'motivational', // infer from filename or directory structure
    }).onConflictDoNothing();

    console.log(`Seeded BGM: ${name} (${duration.toFixed(1)}s)`);
  }
}

seedBGM().catch(console.error).finally(() => process.exit(0));
```

### Server Integration

```typescript
import { bgmRoutes } from './routes/bgm';
app.route('/api/bgm', bgmRoutes);
```

## Verification

1. Upload a BGM track:
   ```bash
   curl -X POST http://localhost:3100/api/bgm \
     -H "Authorization: Bearer <token>" \
     -F "name=Inspiring Piano" \
     -F "category=motivational" \
     -F "file=@bgm-track.mp3"
   ```
2. `GET /api/bgm` lists all tracks with metadata
3. `GET /api/bgm?category=motivational` filters by category
4. Render a post → BGM is auto-selected by niche category
5. Output video has narration + BGM mixed at correct volume (default 0.35)
6. BGM does not overpower narration (normalize=0 in amix)
7. BGM loops or fades if shorter than video
8. Delete BGM removes from both DB and MinIO
9. Existing BGM files from `content/audio/bgm/` are seeded correctly
