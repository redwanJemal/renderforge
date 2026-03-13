import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { socialProviderEnum } from "./enums";
import { users } from "./users";

export const socialAccounts = pgTable("social_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  provider: socialProviderEnum("provider").notNull(),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  accountName: varchar("account_name", { length: 255 }),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
