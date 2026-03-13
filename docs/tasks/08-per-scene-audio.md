# Task 08: Per-Scene Audio System

## Overview

Implement per-scene audio upload, duration detection, manifest generation, and TTS script export. Each scene in a post can have its own audio file, and the manifest service computes exact frame timings from the audio durations.

## Subtasks

1. [ ] Upload audio per scene → MinIO, ffprobe detects duration → updates scene.duration_seconds and scene.audio_url
2. [ ] Create `apps/api/src/services/manifest.ts` — builds FrameManifest from DB scenes
3. [ ] GET /api/posts/:id/manifest — returns FrameManifest for a post
4. [ ] GET /api/posts/:id/tts-script — exports narration text per scene for TTS generation
5. [ ] Verify: upload audio per scene, manifest reflects exact durations, TTS script exports correctly

## Details

### Scene Audio Upload

Complete the scene audio upload endpoint in `apps/api/src/routes/posts.ts`:

```typescript
// POST /api/posts/:id/scenes/:sceneId/audio
postRoutes.post('/:id/scenes/:sceneId/audio', async (c) => {
  const postId = c.req.param('id');
  const sceneId = c.req.param('sceneId');

  // Verify scene belongs to post
  const [scene] = await db.select().from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.postId, postId)));

  if (!scene) return c.json({ error: 'Scene not found' }, 404);

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No audio file provided' }, 400);
  }

  // Write to temp, detect duration
  const buffer = Buffer.from(await file.arrayBuffer());
  const tempDir = await mkdtemp(join(tmpdir(), 'rf-audio-'));
  const ext = file.name.split('.').pop() || 'wav';
  const tempPath = join(tempDir, `scene.${ext}`);

  try {
    await writeFile(tempPath, buffer);
    const durationSeconds = await getAudioDuration(tempPath);

    // Upload to MinIO with structured key
    const key = `audio/posts/${postId}/scenes/${scene.key}.${ext}`;
    await storage.upload(key, buffer, file.type);

    // Update scene record
    const [updated] = await db.update(scenes).set({
      audioUrl: key,
      durationSeconds: durationSeconds.toFixed(3),
    }).where(eq(scenes.id, sceneId)).returning();

    // Check if all scenes have audio, auto-update post status
    await checkAndTransitionStatus(postId);

    return c.json({
      scene: updated,
      duration_seconds: durationSeconds,
      audio_url: key,
    });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
});

// Helper: if all scenes have audio, transition post to "ready"
async function checkAndTransitionStatus(postId: string) {
  const postScenes = await db.select().from(scenes).where(eq(scenes.postId, postId));
  const allHaveAudio = postScenes.every(s => s.audioUrl && s.durationSeconds);

  if (allHaveAudio) {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (post && post.status === 'audio_pending') {
      await db.update(posts).set({ status: 'ready', updatedAt: new Date() })
        .where(eq(posts.id, postId));
    }
  }
}
```

### Manifest Service (`apps/api/src/services/manifest.ts`)

The manifest service builds a `FrameManifest` — frame-accurate timing data derived from scene audio durations. This is used by the render worker to configure Remotion.

```typescript
import { db, scenes, posts, niches } from '@renderforge/db';
import { eq, asc } from 'drizzle-orm';

const DEFAULT_FPS = 30;
const PADDING_FRAMES = 15; // 0.5s padding between scenes
const INTRO_FRAMES = 60;   // 2s intro
const OUTRO_FRAMES = 90;   // 3s outro

export type SceneFrame = {
  key: string;
  displayText: string;
  narrationText: string;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  durationSeconds: number;
  audioUrl: string | null;
  entrance: string;
  textSize: string;
  extraProps: Record<string, unknown> | null;
};

export type FrameManifest = {
  postId: string;
  title: string;
  nicheSlug: string;
  templateId: string;
  format: string;
  theme: string;
  fps: number;
  totalFrames: number;
  totalDurationSeconds: number;
  scenes: SceneFrame[];
  metadata: Record<string, unknown> | null;
};

export const manifestService = {
  async buildManifest(postId: string): Promise<FrameManifest> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new Error('Post not found');

    const [niche] = await db.select().from(niches).where(eq(niches.id, post.nicheId));
    if (!niche) throw new Error('Niche not found');

    const postScenes = await db.select().from(scenes)
      .where(eq(scenes.postId, postId))
      .orderBy(asc(scenes.sortOrder));

    if (postScenes.length === 0) throw new Error('Post has no scenes');

    // Build frame timings from exact audio durations
    let currentFrame = INTRO_FRAMES;
    const sceneFrames: SceneFrame[] = [];

    for (const scene of postScenes) {
      const durationSeconds = scene.durationSeconds
        ? parseFloat(scene.durationSeconds)
        : 3.0; // fallback for scenes without audio

      const durationFrames = Math.ceil(durationSeconds * DEFAULT_FPS);

      sceneFrames.push({
        key: scene.key,
        displayText: scene.displayText,
        narrationText: scene.narrationText,
        startFrame: currentFrame,
        endFrame: currentFrame + durationFrames,
        durationFrames,
        durationSeconds,
        audioUrl: scene.audioUrl,
        entrance: scene.entrance || 'fade',
        textSize: scene.textSize || 'md',
        extraProps: scene.extraProps as Record<string, unknown> | null,
      });

      currentFrame += durationFrames + PADDING_FRAMES;
    }

    const totalFrames = currentFrame + OUTRO_FRAMES;

    return {
      postId: post.id,
      title: post.title,
      nicheSlug: niche.slug,
      templateId: post.templateId || niche.defaultTemplateId || 'motivational-narration',
      format: post.format || 'story',
      theme: post.theme || 'dark',
      fps: DEFAULT_FPS,
      totalFrames,
      totalDurationSeconds: totalFrames / DEFAULT_FPS,
      scenes: sceneFrames,
      metadata: post.metadata as Record<string, unknown> | null,
    };
  },
};
```

### Manifest Route

```typescript
// GET /api/posts/:id/manifest
postRoutes.get('/:id/manifest', async (c) => {
  try {
    const manifest = await manifestService.buildManifest(c.req.param('id'));
    return c.json(manifest);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});
```

### TTS Script Export

```typescript
// GET /api/posts/:id/tts-script
postRoutes.get('/:id/tts-script', async (c) => {
  const post = await postService.getById(c.req.param('id'));
  if (!post) return c.json({ error: 'Post not found' }, 404);

  const script = {
    postId: post.id,
    title: post.title,
    scenes: post.scenes.map(s => ({
      key: s.key,
      narrationText: s.narrationText,
      sortOrder: s.sortOrder,
    })),
  };

  return c.json(script);
});
```

## Verification

1. Upload audio to a scene:
   ```bash
   curl -X POST http://localhost:3100/api/posts/<postId>/scenes/<sceneId>/audio \
     -H "Authorization: Bearer <token>" \
     -F "file=@scene-audio.wav"
   ```
2. Scene record updated with `audio_url` and `duration_seconds`
3. After all scenes have audio, post auto-transitions from `audio_pending` to `ready`
4. `GET /api/posts/:id/manifest` returns FrameManifest with correct frame timings:
   - Scene start/end frames derived from audio durations
   - Includes intro/outro padding
   - Total frames calculated correctly
5. `GET /api/posts/:id/tts-script` returns clean narration text per scene
6. Duration values match ffprobe output (within 0.01s)
