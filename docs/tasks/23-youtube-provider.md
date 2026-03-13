# Task 23: YouTube Provider

## Overview

Implement the YouTube social media provider using the YouTube Data API v3. Supports resumable video uploads with progress tracking and scheduled publishing.

## Subtasks

1. [ ] Create `apps/api/src/social/providers/youtube.ts` — implements ISocialProvider using YouTube Data API v3
2. [ ] Resumable video upload with progress tracking
3. [ ] Scheduling: use publishAt parameter for future publishing
4. [ ] Verify: OAuth connect, resumable upload, scheduled publish

## Details

### YouTube Provider (`apps/api/src/social/providers/youtube.ts`)

```typescript
import { ISocialProvider, OAuthTokens, PublishMetadata, PublishResult, AnalyticsResult, SocialProvider } from '../types';
import { OAuth2Base } from '../oauth';
import { config } from '../../config';
import { readFile, stat } from 'node:fs/promises';

const AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

export class YouTubeProvider extends OAuth2Base implements ISocialProvider {
  readonly provider: SocialProvider = 'youtube';

  constructor() {
    super({
      clientId: config.YOUTUBE_CLIENT_ID || '',
      clientSecret: config.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: `${config.OAUTH_REDIRECT_BASE}/api/social/callback/youtube`,
      scopes: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl',
      ],
    });
  }

  getAuthorizationUrl(state: string): string {
    return this.buildAuthUrl(AUTH_BASE, {
      state,
      access_type: 'offline',    // Get refresh token
      prompt: 'consent',          // Always show consent screen for refresh token
    });
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    const tokenData = await this.exchangeCode(TOKEN_URL, code);

    // Get channel info
    const channelRes = await fetch(
      `${API_BASE}/channels?part=snippet&mine=true`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];

    return {
      accessToken: tokenData.access_token as string,
      refreshToken: tokenData.refresh_token as string,
      expiresAt: new Date(Date.now() + (tokenData.expires_in as number) * 1000),
      accountName: channel?.snippet?.title || 'YouTube Channel',
      accountId: channel?.id,
    };
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const data = await this.refreshAccessToken(TOKEN_URL, refreshToken);
    return {
      accessToken: data.access_token as string,
      refreshToken: (data.refresh_token as string) || refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
    };
  }

  async publish(videoPath: string, metadata: PublishMetadata, accessToken: string): Promise<PublishResult> {
    try {
      // Step 1: Initiate resumable upload
      const videoMeta = {
        snippet: {
          title: metadata.title,
          description: metadata.description || '',
          tags: metadata.tags || [],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: metadata.privacyLevel || 'public',
          selfDeclaredMadeForKids: false,
          ...(metadata.scheduledAt ? {
            privacyStatus: 'private',
            publishAt: metadata.scheduledAt.toISOString(),
          } : {}),
        },
      };

      const initRes = await fetch(
        `${UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/mp4',
          },
          body: JSON.stringify(videoMeta),
        }
      );

      if (!initRes.ok) {
        const err = await initRes.json();
        return { success: false, error: err.error?.message || 'Upload init failed' };
      }

      const uploadUrl = initRes.headers.get('location');
      if (!uploadUrl) return { success: false, error: 'No upload URL received' };

      // Step 2: Upload video in chunks (resumable)
      const videoBuffer = await readFile(videoPath);
      const fileSize = videoBuffer.length;
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

      let uploadedBytes = 0;
      let videoId: string | undefined;

      while (uploadedBytes < fileSize) {
        const end = Math.min(uploadedBytes + CHUNK_SIZE, fileSize);
        const chunk = videoBuffer.subarray(uploadedBytes, end);

        const chunkRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${uploadedBytes}-${end - 1}/${fileSize}`,
            'Content-Type': 'video/mp4',
          },
          body: chunk,
        });

        if (chunkRes.status === 200 || chunkRes.status === 201) {
          // Upload complete
          const data = await chunkRes.json();
          videoId = data.id;
          break;
        } else if (chunkRes.status === 308) {
          // Chunk accepted, continue
          const range = chunkRes.headers.get('range');
          if (range) {
            uploadedBytes = parseInt(range.split('-')[1]) + 1;
          } else {
            uploadedBytes = end;
          }
        } else {
          const err = await chunkRes.text();
          return { success: false, error: `Upload failed at ${uploadedBytes}/${fileSize}: ${err}` };
        }
      }

      if (!videoId) {
        return { success: false, error: 'Upload completed but no video ID returned' };
      }

      return {
        success: true,
        platformPostId: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsResult> {
    // Use YouTube Analytics API
    const res = await fetch(
      `${API_BASE}/videos?part=statistics&id=${platformPostId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const stats = data.items?.[0]?.statistics;

    if (!stats) {
      return { views: 0, likes: 0, shares: 0, comments: 0, engagementRate: 0 };
    }

    const views = parseInt(stats.viewCount || '0');
    const likes = parseInt(stats.likeCount || '0');
    const comments = parseInt(stats.commentCount || '0');
    // YouTube doesn't expose shares via Data API
    const shares = 0;

    return {
      views,
      likes,
      shares,
      comments,
      engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
    };
  }
}
```

### Provider Registration

```typescript
// In apps/api/src/social/providers/index.ts
import { YouTubeProvider } from './youtube';

if (config.YOUTUBE_CLIENT_ID) {
  socialRegistry.register(new YouTubeProvider());
}
```

### Scheduled Publishing

YouTube supports scheduled publishing via the `publishAt` parameter:
- Set `privacyStatus` to `private`
- Set `publishAt` to an ISO 8601 datetime
- YouTube will automatically publish at the scheduled time

This is handled in the `publish()` method above when `metadata.scheduledAt` is provided.

### Upload Progress

For large videos, the resumable upload reports progress via chunk completion. The publish worker can publish progress events:

```typescript
// In the upload loop, publish progress
const progressPercent = Math.round((uploadedBytes / fileSize) * 100);
await redis.publish(`publish:progress:${jobId}`, JSON.stringify({
  status: 'uploading',
  progress: progressPercent,
  message: `Uploading to YouTube... ${progressPercent}%`,
}));
```

## Verification

1. OAuth flow: `/api/social/connect/youtube` redirects to Google consent screen
2. Callback stores access + refresh tokens encrypted in database
3. Channel name displayed in connected accounts
4. Video upload: uploads using resumable protocol in 10MB chunks
5. Published video appears on YouTube channel with correct title/description/tags
6. Scheduled publish: video set to private with publishAt date
7. Analytics: views, likes, comments fetched from YouTube Data API
8. Token refresh works when access token expires (1-hour expiry for Google)
9. Large video upload (>100MB) completes reliably via chunked upload
