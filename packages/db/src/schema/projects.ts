import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { projectStatusEnum } from "./enums";

export type SocialHandles = {
  tiktok?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  telegram?: string;
};

export type ColorPalette = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
};

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  socialHandles: jsonb("social_handles").$type<SocialHandles>().default({}),
  colorPalette: jsonb("color_palette").$type<ColorPalette>().default({}),
  defaultVoiceId: varchar("default_voice_id", { length: 100 }),
  enableIntro: boolean("enable_intro").default(true).notNull(),
  enableOutro: boolean("enable_outro").default(true).notNull(),
  status: projectStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
