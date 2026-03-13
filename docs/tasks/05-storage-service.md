# Task 05: Storage Service

## Overview

Create a MinIO/S3 storage service for managing audio files, rendered videos, and other assets. Includes multipart upload endpoint with ffprobe-based audio duration detection.

## Subtasks

1. [ ] Create `apps/api/src/services/storage.ts` — S3 client wrapper with upload, download, getPresignedUrl, delete, list
2. [ ] Create `apps/api/src/routes/uploads.ts` — audio upload endpoint + file proxy download
3. [ ] Integrate ffprobe for audio duration detection on upload
4. [ ] Verify: audio file uploads to MinIO, duration is detected, presigned URLs work

## Details

### Storage Service (`apps/api/src/services/storage.ts`)

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';

const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

export const storage = {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await s3.send(new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return key;
  },

  async download(key: string): Promise<ReadableStream> {
    const result = await s3.send(new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    }));
    return result.Body as ReadableStream;
  },

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(s3, new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    }), { expiresIn });
  },

  async delete(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    }));
  },

  async list(prefix: string): Promise<string[]> {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: config.S3_BUCKET,
      Prefix: prefix,
    }));
    return (result.Contents || []).map(obj => obj.Key!).filter(Boolean);
  },
};
```

### ffprobe Duration Detection (`apps/api/src/lib/ffprobe.ts`)

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    filePath,
  ]);

  const data = JSON.parse(stdout);
  const duration = parseFloat(data.format.duration);

  if (isNaN(duration)) {
    throw new Error('Could not detect audio duration');
  }

  return duration;
}
```

### Upload Routes (`apps/api/src/routes/uploads.ts`)

```typescript
import { Hono } from 'hono';
import { storage } from '../services/storage';
import { getAudioDuration } from '../lib/ffprobe';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const uploadRoutes = new Hono();

// POST /api/uploads/audio — upload audio file, detect duration
uploadRoutes.post('/audio', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No audio file provided' }, 400);
  }

  // Validate content type
  const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/x-wav'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: `Invalid audio type: ${file.type}` }, 400);
  }

  // Write to temp file for ffprobe
  const tempDir = await mkdtemp(join(tmpdir(), 'rf-'));
  const ext = file.name.split('.').pop() || 'wav';
  const tempPath = join(tempDir, `upload.${ext}`);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempPath, buffer);

    // Detect duration
    const durationSeconds = await getAudioDuration(tempPath);

    // Upload to MinIO
    const key = `audio/${randomUUID()}.${ext}`;
    await storage.upload(key, buffer, file.type);

    const url = await storage.getPresignedUrl(key);

    return c.json({
      key,
      url,
      duration_seconds: parseFloat(durationSeconds.toFixed(3)),
      content_type: file.type,
      size: buffer.length,
    });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
});

// GET /api/files/:key — proxy download from MinIO
uploadRoutes.get('/files/*', async (c) => {
  const key = c.req.path.replace('/api/uploads/files/', '');

  try {
    const url = await storage.getPresignedUrl(key, 300);
    return c.redirect(url);
  } catch {
    return c.json({ error: 'File not found' }, 404);
  }
});

export { uploadRoutes };
```

### Server Integration

Add to `apps/api/src/server.ts`:
```typescript
import { uploadRoutes } from './routes/uploads';

// Protected upload routes
app.route('/api/uploads', uploadRoutes);
```

### MinIO Bucket Setup

Ensure the bucket exists on first startup. Add to server initialization:

```typescript
import { S3Client, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: config.S3_BUCKET }));
    console.log(`Created bucket: ${config.S3_BUCKET}`);
  }
}
```

## Verification

1. MinIO is running (via docker-compose or existing instance)
2. Upload an audio file:
   ```bash
   curl -X POST http://localhost:3100/api/uploads/audio \
     -H "Authorization: Bearer <token>" \
     -F "file=@test-audio.wav"
   ```
3. Response includes `key`, `url`, and `duration_seconds`
4. Download via presigned URL works
5. File is visible in MinIO browser/console
6. Duration matches the actual audio file duration (verify with `ffprobe`)
