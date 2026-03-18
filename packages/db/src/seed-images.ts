import "dotenv/config";
import { db, imageLibrary, eq } from "./index";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "https://storage.endlessmaker.com";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY!;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY!;
const S3_BUCKET = process.env.S3_BUCKET || "forgebase";

const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

// Categorize images by filename
function categorizeImage(filename: string): { category: string; tags: string[] } {
  const name = filename.replace(".png", "").toLowerCase();

  const animals = ["bear", "bird", "butterfly", "cat", "cow", "dog", "elephant", "fish", "frog", "lion", "monkey", "octopus", "penguin", "pig", "rabbit", "snail", "turtle", "whale", "unicorn"];
  const fruits = ["apple", "banana", "cherry", "grape", "strawberry", "watermelon"];
  const nature = ["flower", "moon", "sun", "tree", "rainbow", "star"];
  const objects = ["balloon", "bell", "car", "crown", "diamond", "heart", "rocket", "trophy"];

  if (animals.includes(name)) return { category: "character", tags: ["animal", name, "kids"] };
  if (fruits.includes(name)) return { category: "icon", tags: ["fruit", name, "kids"] };
  if (nature.includes(name)) return { category: "illustration", tags: ["nature", name, "kids"] };
  if (objects.includes(name)) return { category: "icon", tags: ["object", name, "kids"] };

  return { category: "icon", tags: [name, "kids"] };
}

async function s3KeyExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function seedImages() {
  console.log("Seeding image library...\n");

  const assetsDir = join(process.cwd(), "public/kids-assets");
  const files = readdirSync(assetsDir).filter((f) => f.endsWith(".png")).sort();

  console.log(`Found ${files.length} PNG files in public/kids-assets/\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = join(assetsDir, file);
    const buffer = readFileSync(filePath);
    const fileSize = statSync(filePath).size;
    const s3Key = `images/kids-assets/${file}`;
    const { category, tags } = categorizeImage(file);

    // Check if already in S3
    const exists = await s3KeyExists(s3Key);
    if (!exists) {
      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: s3Key,
          Body: buffer,
          ContentType: "image/png",
        }),
      );
    }

    // Check if already in DB by s3Key
    const [existing] = await db.select({ id: imageLibrary.id }).from(imageLibrary).where(eq(imageLibrary.s3Key, s3Key)).limit(1);
    if (!existing) {
      await db.insert(imageLibrary).values({
        filename: file,
        s3Key,
        mimeType: "image/png",
        fileSize,
        tags,
        category,
        description: `${basename(file, ".png")} — Noto Emoji kids asset`,
      });
    }

    if (exists) {
      skipped++;
      process.stdout.write(`  skip ${file}\n`);
    } else {
      uploaded++;
      process.stdout.write(`  upload ${file} → ${s3Key} [${category}]\n`);
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} already existed.`);
  process.exit(0);
}

seedImages().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
