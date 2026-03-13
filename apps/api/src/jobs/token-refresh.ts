import { Worker, type Job } from "bullmq";
import { getRedis } from "../lib/redis.js";
import { db, socialAccounts, eq, lt } from "@renderforge/db";
import { getProvider } from "../social/providers/index.js";
import { decrypt, encrypt } from "../lib/crypto.js";

export function createTokenRefreshWorker() {
  const redis = getRedis();

  const worker = new Worker(
    "token-refresh",
    async (job: Job) => {
      console.log("[token-refresh] Checking for expiring tokens...");

      // Find accounts expiring within 24 hours
      const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const expiring = await db
        .select()
        .from(socialAccounts)
        .where(lt(socialAccounts.expiresAt, soon));

      for (const account of expiring) {
        if (!account.refreshTokenEnc) continue;

        try {
          const provider = getProvider(account.provider);
          const refreshToken = decrypt(account.refreshTokenEnc);

          const envPrefix = account.provider.toUpperCase();
          const config = {
            clientId: process.env[`${envPrefix}_CLIENT_ID`] ?? "",
            clientSecret: process.env[`${envPrefix}_CLIENT_SECRET`] ?? "",
            redirectUri: "",
            scopes: [],
          };

          const result = await provider.refreshToken(refreshToken, config);

          await db
            .update(socialAccounts)
            .set({
              accessTokenEnc: encrypt(result.accessToken),
              refreshTokenEnc: result.refreshToken ? encrypt(result.refreshToken) : account.refreshTokenEnc,
              expiresAt: result.expiresAt ?? null,
            })
            .where(eq(socialAccounts.id, account.id));

          console.log(`[token-refresh] Refreshed token for ${account.provider}:${account.accountName}`);
        } catch (err) {
          console.error(`[token-refresh] Failed for ${account.id}:`, err);
        }
      }
    },
    { connection: redis },
  );

  return worker;
}
