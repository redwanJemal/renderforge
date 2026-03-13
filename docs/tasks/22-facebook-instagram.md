# Task 22: Facebook & Instagram Provider

## Overview

Implement the Facebook and Instagram social media provider using the Meta Graph API v19. Supports video publishing to Facebook Pages and cross-posting to connected Instagram Business accounts.

## Subtasks

1. [ ] Create `apps/api/src/social/providers/facebook.ts` — implements ISocialProvider using Graph API v19
2. [ ] Video publishing: upload video to Facebook page, set title/description/tags
3. [ ] Instagram cross-posting: publish to connected Instagram account via Graph API
4. [ ] Verify: OAuth connect, video upload, cross-post to Instagram

## Details

### Facebook Provider (`apps/api/src/social/providers/facebook.ts`)

```typescript
import { ISocialProvider, OAuthTokens, PublishMetadata, PublishResult, AnalyticsResult, SocialProvider } from '../types';
import { OAuth2Base } from '../oauth';
import { config } from '../../config';
import { createReadStream } from 'node:fs';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const AUTH_BASE = 'https://www.facebook.com/v19.0/dialog/oauth';
const TOKEN_URL = `${GRAPH_API_BASE}/oauth/access_token`;

export class FacebookProvider extends OAuth2Base implements ISocialProvider {
  readonly provider: SocialProvider = 'facebook';

  constructor() {
    super({
      clientId: config.FACEBOOK_APP_ID || '',
      clientSecret: config.FACEBOOK_APP_SECRET || '',
      redirectUri: `${config.OAUTH_REDIRECT_BASE}/api/social/callback/facebook`,
      scopes: [
        'pages_manage_posts',
        'pages_read_engagement',
        'pages_show_list',
        'publish_video',
        'instagram_basic',
        'instagram_content_publish',
      ],
    });
  }

  getAuthorizationUrl(state: string): string {
    return this.buildAuthUrl(AUTH_BASE, { state });
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    // Exchange code for short-lived user token
    const tokenData = await this.exchangeCode(TOKEN_URL, code);
    const shortToken = tokenData.access_token as string;

    // Exchange for long-lived token (60-day expiry)
    const longLivedRes = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        fb_exchange_token: shortToken,
      })
    );
    const longLived = await longLivedRes.json();

    // Get user's pages
    const pagesRes = await fetch(`${GRAPH_API_BASE}/me/accounts?access_token=${longLived.access_token}`);
    const pages = await pagesRes.json();
    const page = pages.data?.[0]; // Use first page

    // Get page access token (does not expire)
    const pageToken = page?.access_token || longLived.access_token;

    return {
      accessToken: pageToken,
      refreshToken: longLived.access_token, // Store user token for refresh
      expiresAt: new Date(Date.now() + (longLived.expires_in || 5184000) * 1000),
      accountName: page?.name || 'Facebook Page',
      accountId: page?.id,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?` + new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        fb_exchange_token: refreshToken,
      })
    );
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
    };
  }

  async publish(videoPath: string, metadata: PublishMetadata, accessToken: string): Promise<PublishResult> {
    try {
      // Step 1: Upload video to Page
      const formData = new FormData();
      const videoBuffer = await readFile(videoPath);
      formData.append('source', new Blob([videoBuffer]), 'video.mp4');
      formData.append('title', metadata.title);
      if (metadata.description) formData.append('description', metadata.description);
      formData.append('access_token', accessToken);

      // For scheduled publishing
      if (metadata.scheduledAt) {
        formData.append('scheduled_publish_time', String(Math.floor(metadata.scheduledAt.getTime() / 1000)));
        formData.append('published', 'false');
      }

      const res = await fetch(`${GRAPH_API_BASE}/me/videos`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return {
        success: true,
        platformPostId: data.id,
        url: `https://www.facebook.com/${data.id}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsResult> {
    const res = await fetch(
      `${GRAPH_API_BASE}/${platformPostId}?fields=insights.metric(post_video_views,post_reactions_by_type_total,post_activity_by_action_type)&access_token=${accessToken}`
    );
    const data = await res.json();

    // Parse insights data
    const insights = data.insights?.data || [];
    const views = insights.find((i: any) => i.name === 'post_video_views')?.values?.[0]?.value || 0;
    const reactions = insights.find((i: any) => i.name === 'post_reactions_by_type_total')?.values?.[0]?.value || {};
    const activity = insights.find((i: any) => i.name === 'post_activity_by_action_type')?.values?.[0]?.value || {};

    const likes = Object.values(reactions).reduce((sum: number, v: any) => sum + (v || 0), 0);
    const shares = activity.share || 0;
    const comments = activity.comment || 0;

    return {
      views,
      likes,
      shares,
      comments,
      engagementRate: views > 0 ? ((likes + shares + comments) / views) * 100 : 0,
    };
  }
}
```

### Instagram Cross-Posting

Instagram publishing via Graph API requires a two-step process:

```typescript
export class InstagramProvider extends OAuth2Base implements ISocialProvider {
  readonly provider: SocialProvider = 'instagram';

  // Instagram uses Facebook OAuth — share the same auth flow
  // The Facebook page token also works for the connected Instagram account

  async publish(videoPath: string, metadata: PublishMetadata, accessToken: string): Promise<PublishResult> {
    try {
      // Step 1: Get Instagram account ID linked to the Facebook page
      const igRes = await fetch(
        `${GRAPH_API_BASE}/me?fields=instagram_business_account&access_token=${accessToken}`
      );
      const igData = await igRes.json();
      const igAccountId = igData.instagram_business_account?.id;

      if (!igAccountId) {
        return { success: false, error: 'No Instagram account linked to this page' };
      }

      // Step 2: Upload video to a public URL (Instagram requires URL, not direct upload)
      // First upload to MinIO and get a presigned URL
      const videoUrl = await getPublicVideoUrl(videoPath); // presigned URL with long expiry

      // Step 3: Create media container
      const containerRes = await fetch(
        `${GRAPH_API_BASE}/${igAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_url: videoUrl,
            caption: metadata.caption || metadata.description || metadata.title,
            media_type: 'REELS', // Use Reels for video
            access_token: accessToken,
          }),
        }
      );
      const container = await containerRes.json();

      if (container.error) {
        return { success: false, error: container.error.message };
      }

      // Step 4: Wait for processing, then publish
      await waitForProcessing(igAccountId, container.id, accessToken);

      const publishRes = await fetch(
        `${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: accessToken,
          }),
        }
      );
      const published = await publishRes.json();

      return {
        success: true,
        platformPostId: published.id,
        url: `https://www.instagram.com/reel/${published.id}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsResult> {
    const res = await fetch(
      `${GRAPH_API_BASE}/${platformPostId}/insights?metric=plays,likes,comments,shares&access_token=${accessToken}`
    );
    const data = await res.json();
    // Parse and return analytics
    // ...
  }
}
```

### Provider Registration

```typescript
// apps/api/src/social/providers/index.ts
import { socialRegistry } from '../registry';
import { FacebookProvider } from './facebook';
import { InstagramProvider } from './instagram';

export function registerSocialProviders() {
  if (config.FACEBOOK_APP_ID) {
    socialRegistry.register(new FacebookProvider());
    socialRegistry.register(new InstagramProvider());
  }
}
```

Call in server startup:
```typescript
import { registerSocialProviders } from './social/providers';
registerSocialProviders();
```

## Verification

1. Facebook OAuth flow: `/api/social/connect/facebook` redirects to Facebook login
2. Callback exchanges code for long-lived page token
3. Token stored encrypted in database
4. `POST /api/social/publish` with Facebook account uploads video to page
5. Video appears on Facebook page with title and description
6. Instagram cross-post: video published as Reel on linked Instagram
7. Analytics: views, likes, shares fetched from Graph API
8. Token refresh works for expiring tokens
