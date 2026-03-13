import type { ISocialProvider, OAuthConfig, SocialVideoMetadata, PublishResult, AnalyticsData } from "../types.js";
import { buildAuthorizationUrl, exchangeCodeForToken, refreshAccessToken } from "../oauth.js";

const LINKEDIN_API = "https://api.linkedin.com/v2";

export const linkedinProvider: ISocialProvider = {
  name: "linkedin",

  connect(config: OAuthConfig): string {
    return buildAuthorizationUrl(
      "https://www.linkedin.com/oauth/v2/authorization",
      config,
      "linkedin",
    );
  },

  async handleCallback(code: string, config: OAuthConfig) {
    const tokens = await exchangeCodeForToken(
      "https://www.linkedin.com/oauth/v2/accessToken",
      code,
      config,
    );

    const meRes = await fetch(`${LINKEDIN_API}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = await meRes.json() as { name: string; sub: string };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accountName: me.name ?? "LinkedIn User",
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  },

  async publish(videoPath: string, metadata: SocialVideoMetadata, accessToken: string): Promise<PublishResult> {
    // Step 1: Get user URN
    const meRes = await fetch(`${LINKEDIN_API}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = await meRes.json() as { sub: string };
    const authorUrn = `urn:li:person:${me.sub}`;

    // Step 2: Register upload
    const registerRes = await fetch(`${LINKEDIN_API}/videos?action=initializeUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: authorUrn,
          fileSizeBytes: 0, // Will be replaced
        },
      }),
    });

    const registerData = await registerRes.json() as { value: { uploadUrl: string; video: string } };

    // Step 3: Upload video
    const videoBuffer = await (await fetch(videoPath)).arrayBuffer();
    await fetch(registerData.value.uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "video/mp4",
      },
      body: videoBuffer,
    });

    // Step 4: Create post
    const postRes = await fetch(`${LINKEDIN_API}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: `${metadata.title}\n\n${metadata.description}`,
        visibility: metadata.privacy === "private" ? "CONNECTIONS" : "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED" },
        content: { media: { id: registerData.value.video } },
        lifecycleState: "PUBLISHED",
      }),
    });

    const postData = await postRes.json() as { id: string };
    return {
      platformPostId: postData.id,
      url: `https://www.linkedin.com/feed/update/${postData.id}`,
    };
  },

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsData> {
    // LinkedIn analytics API is limited
    return {
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      engagementRate: 0,
    };
  },

  async refreshToken(refreshToken: string, config: OAuthConfig) {
    const result = await refreshAccessToken(
      "https://www.linkedin.com/oauth/v2/accessToken",
      refreshToken,
      config,
    );
    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt: result.expires_in
        ? new Date(Date.now() + result.expires_in * 1000)
        : undefined,
    };
  },
};
