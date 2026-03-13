// Shared types and constants for RenderForge

export type Format = "story" | "post" | "landscape";

export type PostStatus = "draft" | "audio_pending" | "ready" | "rendering" | "rendered" | "published";

export type RenderStatus = "queued" | "rendering" | "completed" | "failed" | "cancelled";

export type SocialProvider = "facebook" | "instagram" | "youtube" | "tiktok" | "linkedin";

export type UserRole = "admin" | "editor";

export const FORMATS: Record<Format, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: "Story (9:16)" },
  post: { width: 1080, height: 1080, label: "Post (1:1)" },
  landscape: { width: 1920, height: 1080, label: "Landscape (16:9)" },
};

export const POST_STATUS_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ["audio_pending"],
  audio_pending: ["ready", "draft"],
  ready: ["rendering"],
  rendering: ["rendered", "ready"],
  rendered: ["published", "ready"],
  published: [],
};

export const DEFAULT_FPS = 30;
export const DEFAULT_FORMAT: Format = "story";
export const DEFAULT_THEME = "default";
