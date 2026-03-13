CREATE TYPE "public"."post_status" AS ENUM('draft', 'audio_pending', 'ready', 'rendering', 'rendered', 'published');--> statement-breakpoint
CREATE TYPE "public"."render_status" AS ENUM('queued', 'rendering', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."scheduled_post_status" AS ENUM('scheduled', 'publishing', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."social_provider" AS ENUM('facebook', 'instagram', 'youtube', 'tiktok', 'linkedin', 'telegram');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheduled_post_id" uuid NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"shares" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"engagement_rate" numeric(5, 2) DEFAULT '0',
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bgm_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"duration_seconds" numeric(8, 3) NOT NULL,
	"category" varchar(100),
	"niche_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "niches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"default_template_id" varchar(100),
	"voice_id" varchar(100),
	"languages" text[] DEFAULT '{}' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "niches_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"niche_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"theme" varchar(50) DEFAULT 'default',
	"template_id" varchar(100),
	"format" varchar(20) DEFAULT 'story',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"format" varchar(20) NOT NULL,
	"status" "render_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"output_url" varchar(500),
	"duration_ms" integer,
	"file_size" bigint,
	"error" text,
	"job_id" varchar(100),
	"bgm_track_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"display_text" text DEFAULT '',
	"narration_text" text DEFAULT '',
	"audio_url" varchar(500),
	"duration_seconds" numeric(8, 3),
	"entrance" varchar(50) DEFAULT 'fade',
	"text_size" varchar(20) DEFAULT 'md',
	"extra_props" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"render_id" uuid NOT NULL,
	"social_account_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"published_at" timestamp with time zone,
	"status" "scheduled_post_status" DEFAULT 'scheduled' NOT NULL,
	"platform_post_id" varchar(255),
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "social_provider" NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"account_name" varchar(255),
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_scheduled_post_id_scheduled_posts_id_fk" FOREIGN KEY ("scheduled_post_id") REFERENCES "public"."scheduled_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bgm_tracks" ADD CONSTRAINT "bgm_tracks_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renders" ADD CONSTRAINT "renders_bgm_track_id_bgm_tracks_id_fk" FOREIGN KEY ("bgm_track_id") REFERENCES "public"."bgm_tracks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_render_id_renders_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."renders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_social_account_id_social_accounts_id_fk" FOREIGN KEY ("social_account_id") REFERENCES "public"."social_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_niche_id_idx" ON "posts" USING btree ("niche_id");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "renders_post_id_idx" ON "renders" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "renders_status_idx" ON "renders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scenes_post_id_sort_idx" ON "scenes" USING btree ("post_id","sort_order");--> statement-breakpoint
CREATE INDEX "scheduled_posts_scheduled_at_idx" ON "scheduled_posts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "scheduled_posts_status_idx" ON "scheduled_posts" USING btree ("status");