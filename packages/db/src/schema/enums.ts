import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "editor"]);

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "audio_pending",
  "ready",
  "rendering",
  "rendered",
  "published",
]);

export const renderStatusEnum = pgEnum("render_status", [
  "queued",
  "rendering",
  "completed",
  "failed",
  "cancelled",
]);

export const socialProviderEnum = pgEnum("social_provider", [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "telegram",
]);

export const scheduledPostStatusEnum = pgEnum("scheduled_post_status", [
  "scheduled",
  "publishing",
  "published",
  "failed",
]);
