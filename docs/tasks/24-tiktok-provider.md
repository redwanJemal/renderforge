# Task 24: TikTok Provider

## Overview

Implement the TikTok social media provider using the Content Posting API v2. Supports video upload with chunked transfers, caption setting, and privacy controls.

## Subtasks

1. [ ] Create `apps/api/src/social/providers/tiktok.ts` — implements ISocialProvider using Content Posting API v2
2. [ ] Video upload: chunk upload for large files
3. [ ] Set caption, privacy level, allow comments/duets/stitch
4. [ ] Verify: OAuth connect, video upload with caption

## Details

### TikTok Provider (`apps/api/src/social/providers/tiktok.ts`)

```typescript
import { ISocialProvider, OAuthTokens, PublishMetadata, PublishResult, AnalyticsResult, SocialProvider } from '../types';
import { OAuth2Base } from '../oauth';
import { config } from '../../config';
import { readFile, stat } from 'node:fs/promises';

const AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokProvider extends OAuth2Base implements ISocialProvider {
  readonly provider: SocialProvider = 'tiktok';

  constructor() {
    super({
      clientId: config.TIKTOK_CLIENT_KEY || '',
      clientSecret: config.TIKTOK_CLIENT_SECRET || '',
      redirectUri: `${config.OAUTH_REDIRECT_BASE}/api/social/callback/tiktok`,
      scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    });
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(','),
      response_type: 'code',
      state,
    });
    return `${AUTH_BASE}?${params}`;
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    // TikTok uses a different token exchange format
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    const data = await res.json();

    if (data.error) {
      throw new Error(`TikTok auth failed: ${data.error_description || data.error}`);
    }

    // Get user info
    const userRes = await fetch(`${API_BASE}/user/info/?fields=open_id,display_name,avatar_url`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const userData = await userRes.json();
    const user = userData.data?.user;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountName: user?.display_name || 'TikTok User',
      accountId: data.open_id,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async publish(videoPath: string, metadata: PublishMetadata, accessToken: string): Promise<PublishResult> {
    try {
      const videoBuffer = await readFile(videoPath);
      const fileSize = videoBuffer.length;

      // Step 1: Initialize upload
      const initRes = await fetch(`${API_BASE}/post/publish/video/init/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: metadata.caption || metadata.title,
            privacy_level: this.mapPrivacy(metadata.privacyLevel),
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000, // 1 second into video
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: fileSize,
            chunk_size: Math.min(fileSize, 10 * 1024 * 1024), // Max 10MB chunks
            total_chunk_count: Math.ceil(fileSize / (10 * 1024 * 1024)),
          },
        }),
      });

      const initData = await initRes.json();

      if (initData.error?.code) {
        return { success: false, error: initData.error.message };
      }

      const publishId = initData.data?.publish_id;
      const uploadUrl = initData.data?.upload_url;

      if (!uploadUrl) {
        return { success: false, error: 'No upload URL returned' };
      }

      // Step 2: Upload video chunks
      const CHUNK_SIZE = 10 * 1024 * 1024;
      let offset = 0;

      while (offset < fileSize) {
        const end = Math.min(offset + CHUNK_SIZE, fileSize);
        const chunk = videoBuffer.subarray(offset, end);

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${offset}-${end - 1}/${fileSize}`,
          },
          body: chunk,
        });

        if (!uploadRes.ok && uploadRes.status !== 206) {
          const err = await uploadRes.text();
          return { success: false, error: `Chunk upload failed: ${err}` };
        }

        offset = end;
      }

      // Step 3: Check publish status (TikTok processes async)
      // Poll for completion
      let attempts = 0;
      while (attempts < 30) { // Max 5 min wait
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s between checks

        const statusRes = await fetch(
          `${API_BASE}/post/publish/status/fetch/`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publish_id: publishId }),
          }
        );

        const statusData = await statusRes.json();
        const status = statusData.data?.status;

        if (status === 'PUBLISH_COMPLETE') {
          return {
            success: true,
            platformPostId: publishId,
            url: `https://www.tiktok.com/@user/video/${publishId}`,
          };
        }

        if (status === 'FAILED') {
          return { success: false, error: statusData.data?.fail_reason || 'Publish failed' };
        }

        attempts++;
      }

      return { success: false, error: 'Publish timed out' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsResult> {
    const res = await fetch(`${API_BASE}/video/query/?fields=id,like_count,comment_count,share_count,view_count`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filters: { video_ids: [platformPostId] },
      }),
    });

    const data = await res.json();
    const video = data.data?.videos?.[0];

    if (!video) {
      return { views: 0, likes: 0, shares: 0, comments: 0, engagementRate: 0 };
    }

    return {
      views: video.view_count || 0,
      likes: video.like_count || 0,
      shares: video.share_count || 0,
      comments: video.comment_count || 0,
      engagementRate: video.view_count > 0
        ? ((video.like_count + video.share_count + video.comment_count) / video.view_count) * 100
        : 0,
    };
  }

  private mapPrivacy(level?: string): string {
    switch (level) {
      case 'public': return 'PUBLIC_TO_EVERYONE';
      case 'private': return 'SELF_ONLY';
      case 'unlisted': return 'MUTUAL_FOLLOW_FRIENDS';
      default: return 'PUBLIC_TO_EVERYONE';
    }
  }
}
```

### Provider Registration

```typescript
// In apps/api/src/social/providers/index.ts
import { TikTokProvider } from './tiktok';

if (config.TIKTOK_CLIENT_KEY) {
  socialRegistry.register(new TikTokProvider());
}
```

### TikTok-Specific Notes

- TikTok uses `client_key` instead of `client_id` in some endpoints
- Video processing is asynchronous — need to poll publish status
- Maximum video size: 4GB, max duration: 10 minutes
- Scopes use comma separation, not space
- Access tokens expire in 24 hours, refresh tokens in 365 days
- Content Posting API v2 requires approved developer app

## Verification

1. OAuth flow: `/api/social/connect/tiktok` redirects to TikTok login
2. Callback exchanges code for access + refresh tokens
3. User display name shown in connected accounts
4. Video upload: chunked upload completes successfully
5. Published video appears on TikTok with caption
6. Privacy level setting works (public/private)
7. Analytics: views, likes, shares, comments fetched
8. Token refresh works within 365-day refresh window
9. Publish status polling completes or times out gracefully
