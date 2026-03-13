import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3100),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://renderforge:renderforge@localhost:5432/renderforge"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().default("renderforge-dev-secret-change-in-production"),
  S3_ENDPOINT: z.string().default("https://storage.endlessmaker.com"),
  S3_ACCESS_KEY: z.string().default(""),
  S3_SECRET_KEY: z.string().default(""),
  S3_BUCKET: z.string().default("forgebase"),
});

export const config = envSchema.parse(process.env);
export type Config = typeof config;
