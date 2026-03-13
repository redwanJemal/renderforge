import { Hono } from "hono";
import { db, socialAccounts, eq } from "@renderforge/db";
import { authMiddleware, type AuthUser } from "../middleware/auth.js";
import { getProvider } from "../social/providers/index.js";
import { encrypt, decrypt } from "../lib/crypto.js";
import type { OAuthConfig } from "../social/types.js";

const socialRouter = new Hono();

socialRouter.use("*", authMiddleware);

function getOAuthConfig(provider: string): OAuthConfig {
  const envPrefix = provider.toUpperCase();
  return {
    clientId: process.env[`${envPrefix}_CLIENT_ID`] ?? "",
    clientSecret: process.env[`${envPrefix}_CLIENT_SECRET`] ?? "",
    redirectUri: process.env[`${envPrefix}_REDIRECT_URI`] ?? `${process.env.APP_URL ?? "http://localhost:3100"}/api/social/callback/${provider}`,
    scopes: (process.env[`${envPrefix}_SCOPES`] ?? "").split(",").filter(Boolean),
  };
}

socialRouter.get("/accounts", async (c) => {
  const user = c.get("user") as AuthUser;
  const accounts = await db
    .select({
      id: socialAccounts.id,
      provider: socialAccounts.provider,
      accountName: socialAccounts.accountName,
      connectedAt: socialAccounts.connectedAt,
      expiresAt: socialAccounts.expiresAt,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, user.id));

  return c.json(accounts);
});

socialRouter.get("/connect/:provider", async (c) => {
  const providerName = c.req.param("provider");
  const provider = getProvider(providerName);
  const config = getOAuthConfig(providerName);
  const authUrl = provider.connect(config);
  return c.json({ url: authUrl });
});

socialRouter.get("/callback/:provider", async (c) => {
  const providerName = c.req.param("provider");
  const code = c.req.query("code");
  const user = c.get("user") as AuthUser;

  if (!code) return c.json({ error: "No code provided" }, 400);

  const provider = getProvider(providerName);
  const config = getOAuthConfig(providerName);

  const result = await provider.handleCallback(code, config);

  await db.insert(socialAccounts).values({
    userId: user.id,
    provider: providerName as "facebook" | "youtube" | "tiktok" | "linkedin" | "telegram",
    accessTokenEnc: encrypt(result.accessToken),
    refreshTokenEnc: result.refreshToken ? encrypt(result.refreshToken) : null,
    accountName: result.accountName,
    expiresAt: result.expiresAt ?? null,
  });

  // Redirect to admin dashboard
  return c.redirect("/social?connected=true");
});

// Telegram direct connect (no OAuth)
socialRouter.post("/connect/telegram", async (c) => {
  const user = c.get("user") as AuthUser;
  const { botToken, channelId } = await c.req.json() as { botToken: string; channelId: string };

  if (!botToken || !channelId) {
    return c.json({ error: "Bot token and channel ID are required" }, 400);
  }

  const provider = getProvider("telegram");
  const config = getOAuthConfig("telegram");

  const result = await provider.handleCallback(`${botToken}||${channelId}`, config);

  await db.insert(socialAccounts).values({
    userId: user.id,
    provider: "telegram",
    accessTokenEnc: encrypt(result.accessToken),
    refreshTokenEnc: null,
    accountName: result.accountName,
    expiresAt: null,
  });

  return c.json({ success: true, accountName: result.accountName });
});

socialRouter.delete("/disconnect/:id", async (c) => {
  const [account] = await db
    .delete(socialAccounts)
    .where(eq(socialAccounts.id, c.req.param("id")))
    .returning();

  if (!account) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export { socialRouter };
