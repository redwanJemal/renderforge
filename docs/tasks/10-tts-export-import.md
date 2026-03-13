# Task 10: TTS Script Export & Import

## Overview

Create endpoints for exporting narration scripts (for Colab TTS generation) and batch-importing generated audio files back into the system. Auto-transition post status when all scenes have audio.

## Subtasks

1. [ ] GET /api/posts/export/tts-scripts — export scripts for TTS generation
2. [ ] POST /api/uploads/batch-audio — batch import audio files matched to scenes
3. [ ] Auto-transition: when all scenes have audio, auto-set post status to "ready"
4. [ ] Verify: export matches expected format, batch import assigns audio correctly

## Details

### TTS Script Export

**GET /api/posts/export/tts-scripts**

Query params:
- `niche` (string, optional) — filter by niche slug
- `status` (string, default: 'audio_pending') — filter by post status
- `limit` (number, default: 50) — max posts to export

Response format (matches existing `content/scripts-motivational.json`):

```json
{
  "exportedAt": "2026-03-13T00:00:00Z",
  "niche": "motivational",
  "count": 50,
  "scripts": [
    {
      "postId": "uuid-here",
      "originalId": "mot-001",
      "title": "The Power of Persistence",
      "scenes": [
        {
          "key": "hook",
          "sortOrder": 0,
          "narrationText": "What separates the successful from everyone else?",
          "outputFilename": "uuid-here/hook.wav"
        },
        {
          "key": "point1",
          "sortOrder": 1,
          "narrationText": "Persistence is not just about trying harder...",
          "outputFilename": "uuid-here/point1.wav"
        }
      ]
    }
  ]
}
```

The `outputFilename` field tells the TTS system what to name the output file. This creates a predictable naming convention for batch import.

```typescript
// In apps/api/src/routes/posts.ts

postRoutes.get('/export/tts-scripts', async (c) => {
  const nicheSlug = c.req.query('niche');
  const status = c.req.query('status') || 'audio_pending';
  const limit = parseInt(c.req.query('limit') || '50');

  // Build query with optional niche filter
  let nicheId: string | undefined;
  if (nicheSlug) {
    const niche = await nicheService.getBySlug(nicheSlug);
    if (!niche) return c.json({ error: 'Niche not found' }, 404);
    nicheId = niche.id;
  }

  const result = await postService.list({ nicheId, status, limit });

  const scripts = await Promise.all(result.items.map(async (post) => {
    const fullPost = await postService.getById(post.id);
    return {
      postId: post.id,
      originalId: (post.metadata as any)?.originalId || null,
      title: post.title,
      scenes: fullPost!.scenes
        .filter(s => !s.audioUrl) // Only export scenes without audio
        .map(s => ({
          key: s.key,
          sortOrder: s.sortOrder,
          narrationText: s.narrationText,
          outputFilename: `${post.id}/${s.key}.wav`,
        })),
    };
  }));

  // Filter out posts with no scenes needing audio
  const filtered = scripts.filter(s => s.scenes.length > 0);

  return c.json({
    exportedAt: new Date().toISOString(),
    niche: nicheSlug || 'all',
    count: filtered.length,
    scripts: filtered,
  });
});
```

### Batch Audio Import

**POST /api/uploads/batch-audio**

Accept multiple audio files via multipart form upload. Files must follow the naming convention from the export: `{postId}/{sceneKey}.wav`.

Alternatively, accept a zip file containing the structured audio files.

```typescript
// In apps/api/src/routes/uploads.ts

uploadRoutes.post('/batch-audio', async (c) => {
  const body = await c.req.parseBody({ all: true });
  const files = body['files'];

  if (!files) return c.json({ error: 'No files provided' }, 400);

  // Handle both single and multiple files
  const fileList = Array.isArray(files) ? files : [files];
  const results: Array<{ file: string; status: string; error?: string }> = [];

  for (const file of fileList) {
    if (!(file instanceof File)) continue;

    try {
      // Parse filename: expected format "postId/sceneKey.ext"
      // The file.name might be just the filename, so also check webkitRelativePath
      const filename = file.name;
      const parts = filename.split('/');

      let postId: string;
      let sceneKey: string;

      if (parts.length === 2) {
        postId = parts[0];
        sceneKey = parts[1].replace(/\.\w+$/, ''); // Remove extension
      } else {
        // Try to parse from flat naming: "postId_sceneKey.wav"
        const match = filename.match(/^([a-f0-9-]+)[_\/](.+)\.\w+$/);
        if (!match) {
          results.push({ file: filename, status: 'error', error: 'Invalid filename format' });
          continue;
        }
        postId = match[1];
        sceneKey = match[2];
      }

      // Find the scene
      const [scene] = await db.select().from(scenes)
        .where(and(eq(scenes.postId, postId), eq(scenes.key, sceneKey)));

      if (!scene) {
        results.push({ file: filename, status: 'error', error: 'Scene not found' });
        continue;
      }

      // Upload and detect duration
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = filename.split('.').pop() || 'wav';
      const tempDir = await mkdtemp(join(tmpdir(), 'rf-batch-'));
      const tempPath = join(tempDir, `audio.${ext}`);

      await writeFile(tempPath, buffer);
      const durationSeconds = await getAudioDuration(tempPath);
      await unlink(tempPath).catch(() => {});

      const key = `audio/posts/${postId}/scenes/${sceneKey}.${ext}`;
      await storage.upload(key, buffer, file.type || 'audio/wav');

      await db.update(scenes).set({
        audioUrl: key,
        durationSeconds: durationSeconds.toFixed(3),
      }).where(eq(scenes.id, scene.id));

      results.push({ file: filename, status: 'ok' });

      // Check if all scenes now have audio
      await checkAndTransitionStatus(postId);
    } catch (err: any) {
      results.push({ file: file.name, status: 'error', error: err.message });
    }
  }

  const success = results.filter(r => r.status === 'ok').length;
  const errors = results.filter(r => r.status === 'error').length;

  return c.json({
    total: results.length,
    success,
    errors,
    results,
  });
});
```

### Auto-Transition Logic

The `checkAndTransitionStatus` function (from Task 08) is reused here. When batch import completes, each post is checked:

1. Query all scenes for the post
2. If every scene has `audioUrl` AND `durationSeconds` set
3. And the post status is `audio_pending`
4. Auto-update status to `ready`

This is already implemented in Task 08's `checkAndTransitionStatus` helper.

### Zip Upload Support (Optional Enhancement)

For large batch imports, support zip file upload:

```typescript
uploadRoutes.post('/batch-audio-zip', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No zip file provided' }, 400);
  }

  // Extract zip to temp directory
  // Process each extracted file using the same logic as batch-audio
  // Use node:zlib or a zip library like 'unzipper'
});
```

## Verification

1. Export TTS scripts:
   ```bash
   curl "http://localhost:3100/api/posts/export/tts-scripts?niche=motivational&status=audio_pending" \
     -H "Authorization: Bearer <token>"
   ```
   Returns JSON with narration text per scene, matching the expected format

2. Only scenes without audio are included in the export

3. Batch import audio:
   ```bash
   curl -X POST http://localhost:3100/api/uploads/batch-audio \
     -H "Authorization: Bearer <token>" \
     -F "files=@uuid-here/hook.wav" \
     -F "files=@uuid-here/point1.wav"
   ```
   Returns success/error count per file

4. After import, scenes have correct `audio_url` and `duration_seconds`

5. Posts with all scenes having audio auto-transition to "ready" status

6. Posts with some scenes still missing audio remain in "audio_pending"

7. Re-running export after import shows fewer scenes needing audio
