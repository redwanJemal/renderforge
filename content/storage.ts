#!/usr/bin/env npx tsx
/**
 * MinIO/S3 Storage Client
 *
 * Downloads/uploads files to MinIO-compatible S3 storage.
 * Reads credentials from .env (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET).
 *
 * Usage:
 *   npx tsx content/storage.ts --list [prefix]
 *   npx tsx content/storage.ts --download <key> <local-path>
 *   npx tsx content/storage.ts --upload <local-path> <key>
 */

import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-east-1', // MinIO ignores this but SDK requires it
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = process.env.S3_BUCKET || 'forgebase';

export async function downloadFile(key: string, localPath: string): Promise<void> {
  const dir = path.dirname(localPath);
  fs.mkdirSync(dir, { recursive: true });

  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!response.Body) throw new Error(`No body in response for key: ${key}`);

  const body = response.Body as Readable;
  await pipeline(body, fs.createWriteStream(localPath));
  console.log(`  Downloaded: ${key} → ${localPath}`);
}

export async function uploadFile(localPath: string, key: string): Promise<void> {
  const body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: key.endsWith('.mp4') ? 'video/mp4' : key.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream',
  }));
  console.log(`  Uploaded: ${localPath} → s3://${BUCKET}/${key}`);
}

export async function listObjects(prefix?: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const response = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
  }));

  return (response.Contents || []).map((obj) => ({
    key: obj.Key!,
    size: obj.Size || 0,
    lastModified: obj.LastModified || new Date(),
  }));
}

// ── CLI ──────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--list') {
    const prefix = args[1] || undefined;
    const objects = await listObjects(prefix);
    console.log(`\nObjects in s3://${BUCKET}/${prefix || ''}:`);
    for (const obj of objects) {
      const sizeMB = (obj.size / 1024 / 1024).toFixed(2);
      console.log(`  ${obj.key.padEnd(50)} ${sizeMB} MB  ${obj.lastModified.toISOString()}`);
    }
    console.log(`\n  Total: ${objects.length} objects`);
  } else if (args[0] === '--download' && args[1] && args[2]) {
    await downloadFile(args[1], args[2]);
  } else if (args[0] === '--upload' && args[1] && args[2]) {
    await uploadFile(args[1], args[2]);
  } else {
    console.log('Usage:');
    console.log('  npx tsx content/storage.ts --list [prefix]');
    console.log('  npx tsx content/storage.ts --download <key> <local-path>');
    console.log('  npx tsx content/storage.ts --upload <local-path> <key>');
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch((err) => {
    console.error('Storage error:', err.message);
    process.exit(1);
  });
}
