#!/usr/bin/env tsx
/**
 * Seeds a demo bedtime story post with dialog interactions,
 * image illustrations, and uploads the pre-rendered video.
 */
import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync, statSync } from "node:fs";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://storage.endlessmaker.com";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY!;
const S3_BUCKET = process.env.S3_BUCKET || "forgebase";
const API_URL = process.env.API_URL || "http://10.0.21.4:3100";

const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: "us-east-1",
  credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
  forcePathStyle: true,
});

async function getToken(): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@renderforge.com", password: "admin123" }),
  });
  const data = await res.json() as { token: string };
  return data.token;
}

async function apiPost(token: string, endpoint: string, body: unknown) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${endpoint} failed (${res.status}): ${err}`);
  }
  return res.json();
}

async function apiPatch(token: string, endpoint: string, body: unknown) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${endpoint} failed (${res.status}): ${err}`);
  }
  return res.json();
}

async function main() {
  const token = await getToken();
  console.log("Authenticated.\n");

  const NICHE_ID = "37ac4bfb-7e10-4111-9b0b-b84ff8d19230"; // kids-bedtime

  // The bedtime story scene props with images + dialog
  const sceneProps = {
    title: "Twinkle Bear",
    subtitle: "and the Moonlight Garden",
    pages: [
      {
        text: "Once upon a time, in a cozy little forest, there lived a small bear named Twinkle. Twinkle had the softest brown fur and the brightest eyes that sparkled like stars.",
        imageS3Key: "images/kids-assets/bear.png",
      },
      {
        text: "Every night, when the moon rose high above the trees, Twinkle would look up at the sky and wonder, \"Where do the stars go during the day?\"",
        imageS3Key: "images/kids-assets/moon.png",
        dialog: {
          kidText: "Mommy, where DO the stars go? Do they sleep like me?",
          narratorResponse: "That's a wonderful question! Let's find out together...",
          dialogType: "curiosity",
        },
      },
      {
        text: "One magical evening, a tiny firefly named Flicker landed on Twinkle's nose. \"Hello little bear!\" said Flicker. \"I know where the stars hide! Would you like to see?\"",
        imageS3Key: "images/kids-assets/frog.png",
      },
      {
        text: "Twinkle followed Flicker through the whispering trees, past the gentle stream where the frogs sang their lullaby, deeper into the enchanted forest.",
        imageS3Key: "images/kids-assets/tree.png",
        dialog: {
          kidText: "I want to go to the enchanted forest too! Can I come?",
          narratorResponse: "Close your eyes and imagine... you're right there with Twinkle!",
          dialogType: "participatory",
        },
      },
      {
        text: "And there it was! A secret garden where flowers glowed with starlight. Each petal held a tiny piece of the sky. \"This is the Moonlight Garden,\" whispered Flicker.",
        imageS3Key: "images/kids-assets/flower.png",
      },
      {
        text: "Twinkle danced among the glowing flowers, touching each one gently. As he did, the flowers floated up into the sky, becoming stars once more.",
        imageS3Key: "images/kids-assets/star.png",
        dialog: {
          kidText: "The flowers turn into stars?! That's so beautiful!",
          narratorResponse: "Yes, every star was once a flower in the Moonlight Garden...",
          dialogType: "emotional",
        },
      },
      {
        text: "The stars twinkled and danced, painting the night sky with silver light. \"Thank you, little bear,\" the stars seemed to whisper. \"You helped us find our way home.\"",
        imageS3Key: "images/kids-assets/rainbow.png",
      },
      {
        text: "Twinkle yawned a big, sleepy yawn and curled up right there in the moonlight garden. The flowers sang a soft lullaby, and the stars watched over him.",
        imageS3Key: "images/kids-assets/butterfly.png",
        dialog: {
          kidText: "I'm getting sleepy too, just like Twinkle...",
          narratorResponse: "Then close your eyes, little one. The stars are watching over you too.",
          dialogType: "emotional",
        },
      },
      {
        text: "And as Twinkle's eyes slowly closed, he smiled, knowing that every night, the stars would come out to play. And so will you, in your dreams. Goodnight, little one. Sweet dreams.",
        imageS3Key: "images/kids-assets/heart.png",
      },
    ],
    introDurationFrames: 150,
    pageDurationFrames: 270,
    pageTransitionFrames: 30,
    outroDurationFrames: 150,
    outroText: "The End.\nSweet Dreams.",
    skyColor1: "#0B1026",
    skyColor2: "#1B2A4A",
    starCount: 60,
    moonColor: "#FFF8DC",
    textColor: "#F0E6D3",
    accentColor: "#FFAFCC",
    dialogBubbleColor: "#FFE4B5",
    imageVignetteOpacity: 0.4,
  };

  // 1. Create the post
  console.log("Creating post...");
  const post = await apiPost(token, "/api/posts", {
    nicheId: NICHE_ID,
    title: "Twinkle Bear and the Moonlight Garden",
    templateId: "kids-bedtime-story",
    format: "story",
    metadata: {
      sceneProps,
      description: "Interactive bedtime story with kid dialog bubbles, Ken Burns illustrations, and crossfade transitions.",
    },
    scenes: sceneProps.pages.map((page, i) => ({
      sortOrder: i,
      key: `page-${i}`,
      displayText: page.text,
      narrationText: page.text,
    })),
  }) as { id: string };

  console.log(`Post created: ${post.id}`);

  // 2. Transition post through status workflow: draft → audio_pending → ready
  console.log("Updating post status → audio_pending → ready...");
  await apiPatch(token, `/api/posts/${post.id}/status`, { status: "audio_pending" });
  await apiPatch(token, `/api/posts/${post.id}/status`, { status: "ready" });

  // 3. Upload the pre-rendered video to S3
  const videoPath = "output/bedtime-dialog-test.mp4";
  if (existsSync(videoPath)) {
    console.log("Uploading demo video to S3...");
    const videoBuffer = readFileSync(videoPath);
    const videoKey = `renders/bedtime-dialog-demo.mp4`;
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: videoKey,
      Body: videoBuffer,
      ContentType: "video/mp4",
    }));
    const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`Video uploaded: ${videoKey} (${sizeMB} MB)`);

    // Generate thumbnail from video
    const thumbKey = `thumbnails/bedtime-dialog-demo.jpg`;
    const { execFileSync } = await import("node:child_process");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const thumbPath = join(tmpdir(), "bedtime-thumb.jpg");
    try {
      execFileSync("ffmpeg", ["-y", "-ss", "6", "-i", videoPath, "-frames:v", "1", "-q:v", "2", thumbPath], { timeout: 15000 });
      const thumbBuffer = readFileSync(thumbPath);
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: "image/jpeg",
      }));
      console.log(`Thumbnail uploaded: ${thumbKey}`);
    } catch {
      console.warn("Thumbnail generation skipped");
    }

    // 4. Create a render record pointing to the uploaded video
    // We need to insert directly into DB since the render API triggers a job
    const { db, renders, eq } = await import("../packages/db/src/index");
    const fileSizeBytes = statSync(videoPath).size;

    // Get video duration
    let durationMs = 300000; // 5 min default
    try {
      const dur = execFileSync("ffprobe", [
        "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", videoPath,
      ], { encoding: "utf-8" }).trim();
      durationMs = Math.round(parseFloat(dur) * 1000);
    } catch {}

    const [render] = await db.insert(renders).values({
      postId: post.id,
      format: "story",
      status: "completed",
      progress: 100,
      outputUrl: videoKey,
      thumbnailUrl: thumbKey,
      fileSize: fileSizeBytes,
      durationMs,
    }).returning();

    console.log(`Render record created: ${render.id}`);

    // Update post status to "rendered" (ready → rendered is valid)
    await apiPatch(token, `/api/posts/${post.id}/status`, { status: "rendered" });
    console.log("Post status → rendered\n");
  } else {
    console.log(`Video file not found at ${videoPath}, skipping upload.`);
    console.log("You can render it later from the admin dashboard.");
  }

  console.log("\nDone! Demo post is ready in the admin dashboard.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
