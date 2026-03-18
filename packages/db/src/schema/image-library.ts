import { pgTable, uuid, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";

export const imageLibrary = pgTable("image_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: varchar("filename", { length: 255 }).notNull(),
  s3Key: varchar("s3_key", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size").notNull(),
  tags: text("tags").array(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
