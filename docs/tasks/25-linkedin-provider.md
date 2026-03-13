# Task 25: LinkedIn Provider

## Overview

Implement the LinkedIn social media provider using the LinkedIn Marketing API. Supports video upload to personal profiles and company pages.

## Subtasks

1. [ ] Create `apps/api/src/social/providers/linkedin.ts` — implements ISocialProvider using LinkedIn Marketing API
2. [ ] Video upload to profile or company page
3. [ ] Set title, description, visibility
4. [ ] Verify: OAuth connect, video post to profile

## Details

### LinkedIn Provider (`apps/api/src/social/providers/linkedin.ts`)

```typescript
import { ISocialProvider, OAuthTokens, PublishMetadata, PublishResult, AnalyticsResult, SocialProvider } from '../types';
import { OAuth2Base } from '../oauth';
import { config } from '../../config';
import { readFile } from 'node:fs/promises';

const AUTH_BASE = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const API_BASE = 'https://api.linkedin.com/v2';
const REST_API = 'https://api.linkedin.com/rest';

export class LinkedInProvider extends OAuth2Base implements ISocialProvider {
  readonly provider: SocialProvider = 'linkedin';

  constructor() {
    super({
      clientId: config.LINKEDIN_CLIENT_ID || '',
      clientSecret: config.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: `${config.OAUTH_REDIRECT_BASE}/api/social/callback/linkedin`,
      scopes: ['openid', 'profile', 'w_member_social'],
    });
  }

  getAuthorizationUrl(state: string): string {
    return this.buildAuthUrl(AUTH_BASE, { state });
  }

  async handleCallback(code: string): Promise<OAuthTokens> {
    const tokenData = await this.exchangeCode(TOKEN_URL, code);

    // Get profile info using OpenID
    const profileRes = await fetch(`${API_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    return {
      accessToken: tokenData.access_token as string,
      refreshToken: tokenData.refresh_token as string | undefined,
      expiresAt: new Date(Date.now() + (tokenData.expires_in as number) * 1000),
      accountName: profile.name || `${profile.given_name} ${profile.family_name}`,
      accountId: profile.sub, // LinkedIn member URN
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
      // Step 1: Get member URN
      const meRes = await fetch(`${API_BASE}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const me = await meRes.json();
      const authorUrn = `urn:li:person:${me.sub}`;

      // Step 2: Initialize video upload
      const videoBuffer = await readFile(videoPath);
      const fileSize = videoBuffer.length;

      const initRes = await fetch(`${REST_API}/videos?action=initializeUpload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: authorUrn,
            fileSizeBytes: fileSize,
            uploadCaptions: false,
            uploadThumbnail: false,
          },
        }),
      });

      const initData = await initRes.json();
      const uploadInstructions = initData.value?.uploadInstructions;
      const videoUrn = initData.value?.video;

      if (!uploadInstructions || !videoUrn) {
        return { success: false, error: 'Failed to initialize upload' };
      }

      // Step 3: Upload video chunks per upload instructions
      for (const instruction of uploadInstructions) {
        const start = instruction.firstByte;
        const end = instruction.lastByte + 1;
        const chunk = videoBuffer.subarray(start, end);

        const uploadRes = await fetch(instruction.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${accessToken}`,
          },
          body: chunk,
        });

        if (!uploadRes.ok) {
          return { success: false, error: `Chunk upload failed: ${uploadRes.status}` };
        }
      }

      // Step 4: Finalize upload
      const finalizeRes = await fetch(`${REST_API}/videos?action=finalizeUpload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          finalizeUploadRequest: {
            video: videoUrn,
            uploadToken: '',
            uploadedPartIds: [],
          },
        }),
      });

      // Step 5: Wait for video processing
      let processed = false;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const statusRes = await fetch(`${REST_API}/videos/${encodeURIComponent(videoUrn)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
          },
        });
        const statusData = await statusRes.json();

        if (statusData.status === 'AVAILABLE') {
          processed = true;
          break;
        }
      }

      if (!processed) {
        return { success: false, error: 'Video processing timed out' };
      }

      // Step 6: Create post with video
      const postRes = await fetch(`${REST_API}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202401',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          commentary: metadata.description || metadata.title,
          visibility: metadata.privacyLevel === 'private' ? 'CONNECTIONS' : 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          content: {
            media: {
              title: metadata.title,
              id: videoUrn,
            },
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      });

      if (!postRes.ok) {
        const err = await postRes.json();
        return { success: false, error: JSON.stringify(err) };
      }

      const postId = postRes.headers.get('x-restli-id') || '';

      return {
        success: true,
        platformPostId: postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsResult> {
    // LinkedIn analytics are limited for personal profiles
    // Organization statistics require r_organization_social scope

    try {
      const res = await fetch(
        `${REST_API}/socialActions/${encodeURIComponent(platformPostId)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': '202401',
          },
        }
      );

      const data = await res.json();

      return {
        views: 0, // Views not available via standard API
        likes: data.likesSummary?.totalLikes || 0,
        shares: data.commentsSummary?.totalFirstLevelComments || 0, // Using comments as proxy
        comments: data.commentsSummary?.totalFirstLevelComments || 0,
        engagementRate: 0,
      };
    } catch {
      return { views: 0, likes: 0, shares: 0, comments: 0, engagementRate: 0 };
    }
  }
}
```

### Provider Registration

```typescript
// In apps/api/src/social/providers/index.ts
import { LinkedInProvider } from './linkedin';

if (config.LINKEDIN_CLIENT_ID) {
  socialRegistry.register(new LinkedInProvider());
}
```

### LinkedIn-Specific Notes

- LinkedIn access tokens expire in 2 months (60 days)
- Refresh tokens expire in 12 months
- Video upload uses a multi-step process: initialize → upload chunks → finalize → create post
- LinkedIn API requires specific version headers (`LinkedIn-Version: 202401`)
- Video processing can take several minutes
- Company page posting requires additional scopes and organization access
- Rate limits: 100 API calls per day for most endpoints

### Company Page Support (Future Enhancement)

To support company page posting:
1. Request `w_organization_social` scope
2. Use `urn:li:organization:{orgId}` as the author
3. User must be an admin of the organization

## Verification

1. OAuth flow: `/api/social/connect/linkedin` redirects to LinkedIn login
2. Callback stores encrypted tokens with profile name
3. Video upload: initialize → chunk upload → finalize → post creation
4. Published video appears on LinkedIn profile/feed
5. Title and description set correctly on the post
6. Analytics: likes and comments fetched
7. Token refresh works within 12-month window
8. Video processing wait handles timeout gracefully
