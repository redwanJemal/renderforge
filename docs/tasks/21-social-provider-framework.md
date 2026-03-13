# Task 21: Social Provider Framework

## Overview

Create the extensible social media provider framework with OAuth2 support, token encryption, and account management. This provides the base interface and infrastructure that individual provider implementations (Tasks 22-25) plug into.

## Subtasks

1. [ ] Create `apps/api/src/social/types.ts` — ISocialProvider interface
2. [ ] Create `apps/api/src/social/oauth.ts` — OAuth2 base handler
3. [ ] Create `apps/api/src/lib/crypto.ts` — AES-256-GCM encryption for tokens
4. [ ] Create `apps/api/src/routes/social.ts` — social account management routes
5. [ ] Create `apps/api/src/jobs/token-refresh.ts` — BullMQ repeatable job for token refresh
6. [ ] Verify: OAuth flow structure works, tokens encrypted/decrypted correctly

## Details

### ISocialProvider Interface (`apps/api/src/social/types.ts`)

```typescript
export type SocialProvider = 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'linkedin';

export type PublishMetadata = {
  title: string;
  description?: string;
  tags?: string[];
  caption?: string;
  privacyLevel?: 'public' | 'private' | 'unlisted';
  scheduledAt?: Date;
};

export type PublishResult = {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
};

export type AnalyticsResult = {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
};

export type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountName?: string;
  accountId?: string;
};

export interface ISocialProvider {
  readonly provider: SocialProvider;

  // OAuth
  getAuthorizationUrl(state: string): string;
  handleCallback(code: string): Promise<OAuthTokens>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  // Publishing
  publish(videoPath: string, metadata: PublishMetadata, accessToken: string): Promise<PublishResult>;

  // Analytics
  getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsResult>;
}
```

### Provider Registry (`apps/api/src/social/registry.ts`)

```typescript
import { ISocialProvider, SocialProvider } from './types';

const providers = new Map<SocialProvider, ISocialProvider>();

export const socialRegistry = {
  register(provider: ISocialProvider) {
    providers.set(provider.provider, provider);
  },

  get(name: SocialProvider): ISocialProvider {
    const provider = providers.get(name);
    if (!provider) throw new Error(`Social provider "${name}" not registered`);
    return provider;
  },

  list(): SocialProvider[] {
    return Array.from(providers.keys());
  },
};
```

### Token Encryption (`apps/api/src/lib/crypto.ts`)

Use AES-256-GCM for encrypting access and refresh tokens stored in the database:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
// Derive a 32-byte key from JWT_SECRET (or use a separate ENCRYPTION_KEY env var)
const KEY = Buffer.from(config.JWT_SECRET.padEnd(32, '0').slice(0, 32));

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### OAuth2 Base Handler (`apps/api/src/social/oauth.ts`)

```typescript
import { OAuthConfig, OAuthTokens } from './types';

export abstract class OAuth2Base {
  constructor(protected config: OAuthConfig) {}

  // Build authorization URL with required params
  protected buildAuthUrl(baseUrl: string, extraParams: Record<string, string> = {}): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      ...extraParams,
    });
    return `${baseUrl}?${params}`;
  }

  // Exchange authorization code for tokens
  protected async exchangeCode(
    tokenUrl: string,
    code: string,
    extraParams: Record<string, string> = {}
  ): Promise<Record<string, unknown>> {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
        grant_type: 'authorization_code',
        ...extraParams,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth token exchange failed: ${error}`);
    }

    return response.json();
  }

  // Refresh an expired access token
  protected async refreshAccessToken(
    tokenUrl: string,
    refreshToken: string
  ): Promise<Record<string, unknown>> {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }
}
```

### Social Routes (`apps/api/src/routes/social.ts`)

```typescript
import { Hono } from 'hono';
import { db, socialAccounts } from '@renderforge/db';
import { eq, and } from 'drizzle-orm';
import { socialRegistry } from '../social/registry';
import { encrypt, decrypt } from '../lib/crypto';
import { randomUUID } from 'node:crypto';

const socialRoutes = new Hono();

// GET /api/social/accounts — list connected accounts
socialRoutes.get('/accounts', async (c) => {
  const user = c.get('user');
  const accounts = await db.select({
    id: socialAccounts.id,
    provider: socialAccounts.provider,
    accountName: socialAccounts.accountName,
    connectedAt: socialAccounts.connectedAt,
    expiresAt: socialAccounts.expiresAt,
  }).from(socialAccounts).where(eq(socialAccounts.userId, user.id));

  return c.json({ accounts });
});

// GET /api/social/connect/:provider — start OAuth flow
socialRoutes.get('/connect/:provider', async (c) => {
  const providerName = c.req.param('provider') as any;
  const provider = socialRegistry.get(providerName);

  // Generate state token for CSRF protection
  const state = randomUUID();
  // Store state in Redis with 10min TTL
  const { redis } = await import('../lib/redis');
  await redis.set(`oauth:state:${state}`, c.get('user').id, 'EX', 600);

  const authUrl = provider.getAuthorizationUrl(state);
  return c.json({ authUrl });
});

// GET /api/social/callback/:provider — OAuth callback
socialRoutes.get('/callback/:provider', async (c) => {
  const providerName = c.req.param('provider') as any;
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code || !state) return c.json({ error: 'Missing code or state' }, 400);

  // Verify state
  const { redis } = await import('../lib/redis');
  const userId = await redis.get(`oauth:state:${state}`);
  if (!userId) return c.json({ error: 'Invalid or expired state' }, 400);
  await redis.del(`oauth:state:${state}`);

  // Exchange code for tokens
  const provider = socialRegistry.get(providerName);
  const tokens = await provider.handleCallback(code);

  // Encrypt tokens before storing
  const encAccessToken = encrypt(tokens.accessToken);
  const encRefreshToken = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;

  // Upsert social account
  await db.insert(socialAccounts).values({
    userId,
    provider: providerName,
    accessTokenEnc: encAccessToken,
    refreshTokenEnc: encRefreshToken,
    accountName: tokens.accountName || providerName,
    connectedAt: new Date(),
    expiresAt: tokens.expiresAt || null,
  }).onConflictDoUpdate({
    target: [socialAccounts.userId, socialAccounts.provider],
    set: {
      accessTokenEnc: encAccessToken,
      refreshTokenEnc: encRefreshToken,
      accountName: tokens.accountName || providerName,
      connectedAt: new Date(),
      expiresAt: tokens.expiresAt || null,
    },
  });

  // Redirect to admin dashboard
  return c.redirect('/social?connected=true');
});

// DELETE /api/social/disconnect/:id — disconnect account
socialRoutes.delete('/disconnect/:id', async (c) => {
  const user = c.get('user');
  const [account] = await db.delete(socialAccounts)
    .where(and(eq(socialAccounts.id, c.req.param('id')), eq(socialAccounts.userId, user.id)))
    .returning();

  if (!account) return c.json({ error: 'Account not found' }, 404);
  return c.json({ message: 'Disconnected' });
});

// GET /api/social/providers — list available providers
socialRoutes.get('/providers', async (c) => {
  const available = socialRegistry.list();
  return c.json({ providers: available });
});

export { socialRoutes };
```

### Token Refresh Job (`apps/api/src/jobs/token-refresh.ts`)

```typescript
import { Worker, Queue } from 'bullmq';
import { createRedisConnection } from '../lib/redis';
import { db, socialAccounts } from '@renderforge/db';
import { lt, isNotNull, and } from 'drizzle-orm';
import { socialRegistry } from '../social/registry';
import { decrypt, encrypt } from '../lib/crypto';

export function startTokenRefreshJob() {
  const queue = new Queue('token-refresh', { connection: createRedisConnection() });

  // Add repeatable job: every 6 hours
  queue.add('refresh-tokens', {}, {
    repeat: { every: 6 * 60 * 60 * 1000 }, // 6 hours
    removeOnComplete: true,
  });

  const worker = new Worker('token-refresh', async () => {
    console.log('[token-refresh] Checking for expiring tokens...');

    // Find accounts expiring within 24 hours
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiring = await db.select().from(socialAccounts)
      .where(and(
        lt(socialAccounts.expiresAt, soon),
        isNotNull(socialAccounts.refreshTokenEnc),
      ));

    for (const account of expiring) {
      try {
        const provider = socialRegistry.get(account.provider);
        const refreshToken = decrypt(account.refreshTokenEnc!);
        const newTokens = await provider.refreshToken(refreshToken);

        await db.update(socialAccounts).set({
          accessTokenEnc: encrypt(newTokens.accessToken),
          refreshTokenEnc: newTokens.refreshToken ? encrypt(newTokens.refreshToken) : account.refreshTokenEnc,
          expiresAt: newTokens.expiresAt,
        }).where(eq(socialAccounts.id, account.id));

        console.log(`[token-refresh] Refreshed token for ${account.provider}:${account.accountName}`);
      } catch (err: any) {
        console.error(`[token-refresh] Failed to refresh ${account.provider}:${account.accountName}:`, err.message);
      }
    }
  }, {
    connection: createRedisConnection(),
  });

  return { queue, worker };
}
```

### Config Additions

Add to `apps/api/src/config.ts`:
```typescript
// Optional: per-provider OAuth credentials
FACEBOOK_APP_ID: z.string().optional(),
FACEBOOK_APP_SECRET: z.string().optional(),
YOUTUBE_CLIENT_ID: z.string().optional(),
YOUTUBE_CLIENT_SECRET: z.string().optional(),
TIKTOK_CLIENT_KEY: z.string().optional(),
TIKTOK_CLIENT_SECRET: z.string().optional(),
LINKEDIN_CLIENT_ID: z.string().optional(),
LINKEDIN_CLIENT_SECRET: z.string().optional(),
OAUTH_REDIRECT_BASE: z.string().default('http://localhost:3100'),
```

### Server Integration

```typescript
import { socialRoutes } from './routes/social';
import { startTokenRefreshJob } from './jobs/token-refresh';

app.route('/api/social', socialRoutes);
const tokenRefresh = startTokenRefreshJob();
```

## Verification

1. `GET /api/social/providers` returns list of registered providers
2. `GET /api/social/connect/facebook` returns OAuth authorization URL
3. OAuth callback stores encrypted tokens in database
4. `GET /api/social/accounts` lists connected accounts (without exposing tokens)
5. `DELETE /api/social/disconnect/:id` removes account
6. Encryption/decryption: `decrypt(encrypt("test"))` returns "test"
7. Token refresh job runs every 6 hours, refreshes expiring tokens
8. State parameter prevents CSRF in OAuth flow
9. ISocialProvider interface is importable and implementable
