import type { ISocialProvider, OAuthConfig, SocialVideoMetadata, PublishResult, AnalyticsData } from "../types.js";
import { buildAuthorizationUrl } from "../oauth.js";

const TIKTOK_API = "https://open.tiktokapis.com/v2";

export const tiktokProvider: ISocialProvider = {
  name: "tiktok",

  connect(config: OAuthConfig): string {
    return buildAuthorizationUrl(
      "https://www.tiktok.com/v2/auth/authorize/",
      config,
      "tiktok",
    );
  },

  async handleCallback(code: string, config: OAuthConfig) {
    const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });

    const data = await res.json() as { data: { access_token: string; refresh_token: string; expires_in: number; open_id: string } };
    const tokens = data.data;

    // Get user info
    const userRes = await fetch(`${TIKTOK_API}/user/info/?fields=display_name`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userData = await userRes.json() as { data: { user: { display_name: string } } };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accountName: userData.data?.user?.display_name ?? "TikTok User",
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  },

  async publish(videoPath: string, metadata: SocialVideoMetadata, accessToken: string): Promise<PublishResult> {
    // Step 1: Init upload
    const initRes = await fetch(`${TIKTOK_API}/post/publish/inbox/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: metadata.title,
          privacy_level: metadata.privacy === "private" ? "SELF_ONLY" : "PUBLIC_TO_EVERYONE",
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: { source: "FILE_UPLOAD" },
      }),
    });

    const initData = await initRes.json() as { data: { publish_id: string; upload_url: string } };

    // Step 2: Upload video
    const videoBuffer = await (await fetch(videoPath)).arrayBuffer();
    await fetch(initData.data.upload_url, {
      method: "PUT",
      headers: { "Content-Type": "video/mp4" },
      body: videoBuffer,
    });

    return {
      platformPostId: initData.data.publish_id,
    };
  },

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsData> {
    const res = await fetch(`${TIKTOK_API}/video/query/?fields=view_count,like_count,share_count,comment_count`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: [platformPostId] } }),
    });

    const data = await res.json() as { data: { videos: Array<Record<string, number>> } };
    const video = data.data?.videos?.[0] ?? {};

    return {
      views: video.view_count ?? 0,
      likes: video.like_count ?? 0,
      shares: video.share_count ?? 0,
      comments: video.comment_count ?? 0,
      engagementRate: 0,
    };
  },

  async refreshToken(refreshToken: string, config: OAuthConfig) {
    const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await res.json() as { data: { access_token: string; refresh_token: string; expires_in: number } };
    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: new Date(Date.now() + data.data.expires_in * 1000),
    };
  },
};
