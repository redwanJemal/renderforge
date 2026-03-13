import type { ISocialProvider, OAuthConfig, SocialVideoMetadata, PublishResult, AnalyticsData } from "../types.js";
import { buildAuthorizationUrl, exchangeCodeForToken, refreshAccessToken } from "../oauth.js";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

export const youtubeProvider: ISocialProvider = {
  name: "youtube",

  connect(config: OAuthConfig): string {
    return buildAuthorizationUrl(
      "https://accounts.google.com/o/oauth2/v2/auth",
      config,
      "youtube",
      { access_type: "offline", prompt: "consent" },
    );
  },

  async handleCallback(code: string, config: OAuthConfig) {
    const tokens = await exchangeCodeForToken(
      "https://oauth2.googleapis.com/token",
      code,
      config,
    );

    const channelRes = await fetch(`${YOUTUBE_API}/channels?part=snippet&mine=true`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const channelData = await channelRes.json() as { items: Array<{ snippet: { title: string } }> };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accountName: channelData.items?.[0]?.snippet?.title ?? "YouTube Channel",
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  },

  async publish(videoPath: string, metadata: SocialVideoMetadata, accessToken: string): Promise<PublishResult> {
    // Resumable upload
    const videoMeta = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: metadata.privacy ?? "public",
        ...(metadata.scheduledAt && { publishAt: metadata.scheduledAt.toISOString() }),
      },
    };

    // Step 1: Start resumable upload
    const initRes = await fetch(
      `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(videoMeta),
      },
    );

    const uploadUrl = initRes.headers.get("location");
    if (!uploadUrl) throw new Error("Failed to get upload URL");

    // Step 2: Upload video
    const videoBuffer = await (await fetch(videoPath)).arrayBuffer();
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "video/mp4",
      },
      body: videoBuffer,
    });

    const uploadData = await uploadRes.json() as { id: string };
    return {
      platformPostId: uploadData.id,
      url: `https://www.youtube.com/watch?v=${uploadData.id}`,
    };
  },

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsData> {
    const res = await fetch(
      `${YOUTUBE_API}/videos?part=statistics&id=${platformPostId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json() as { items: Array<{ statistics: Record<string, string> }> };
    const stats = data.items?.[0]?.statistics ?? {};

    const views = parseInt(stats.viewCount ?? "0");
    const likes = parseInt(stats.likeCount ?? "0");
    const comments = parseInt(stats.commentCount ?? "0");

    return {
      views,
      likes,
      shares: 0,
      comments,
      engagementRate: views > 0 ? ((likes + comments) / views) * 100 : 0,
    };
  },

  async refreshToken(refreshToken: string, config: OAuthConfig) {
    const result = await refreshAccessToken(
      "https://oauth2.googleapis.com/token",
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
