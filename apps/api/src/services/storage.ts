import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const storage = {
  async upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  },

  async download(key: string): Promise<Buffer> {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      }),
    );
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  },

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
  },

  async delete(key: string): Promise<void> {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      }),
    );
  },

  async list(prefix: string): Promise<string[]> {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: config.S3_BUCKET,
        Prefix: prefix,
      }),
    );
    return (response.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
  },
};
