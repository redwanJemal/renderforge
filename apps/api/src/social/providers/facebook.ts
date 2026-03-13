import type { ISocialProvider, OAuthConfig, SocialVideoMetadata, PublishResult, AnalyticsData } from "../types.js";
import { buildAuthorizationUrl, exchangeCodeForToken, refreshAccessToken } from "../oauth.js";

const GRAPH_API = "https://graph.facebook.com/v19.0";

export const facebookProvider: ISocialProvider = {
  name: "facebook",

  connect(config: OAuthConfig): string {
    return buildAuthorizationUrl(
      "https://www.facebook.com/v19.0/dialog/oauth",
      config,
      "facebook",
      { display: "popup" },
    );
  },

  async handleCallback(code: string, config: OAuthConfig) {
    const tokens = await exchangeCodeForToken(
      `${GRAPH_API}/oauth/access_token`,
      code,
      config,
    );

    // Get user/page info
    const meRes = await fetch(`${GRAPH_API}/me?fields=name,id&access_token=${tokens.access_token}`);
    const me = await meRes.json() as { name: string; id: string };

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accountName: me.name,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined,
    };
  },

  async publish(videoPath: string, metadata: SocialVideoMetadata, accessToken: string): Promise<PublishResult> {
    // Upload video to Facebook page
    const formData = new FormData();
    const videoBlob = new Blob([await (await fetch(videoPath)).arrayBuffer()]);
    formData.append("source", videoBlob, "video.mp4");
    formData.append("title", metadata.title);
    formData.append("description", metadata.description);
    if (metadata.tags?.length) {
      formData.append("tags", metadata.tags.join(","));
    }

    const res = await fetch(`${GRAPH_API}/me/videos?access_token=${accessToken}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json() as { id: string };
    return {
      platformPostId: data.id,
      url: `https://www.facebook.com/watch/?v=${data.id}`,
    };
  },

  async getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsData> {
    const res = await fetch(
      `${GRAPH_API}/${platformPostId}?fields=views,likes.summary(true),shares,comments.summary(true)&access_token=${accessToken}`,
    );
    const data = await res.json() as Record<string, unknown>;

    return {
      views: (data.views as number) ?? 0,
      likes: ((data.likes as Record<string, unknown>)?.summary as Record<string, unknown>)?.total_count as number ?? 0,
      shares: ((data.shares as Record<string, unknown>)?.count as number) ?? 0,
      comments: ((data.comments as Record<string, unknown>)?.summary as Record<string, unknown>)?.total_count as number ?? 0,
      engagementRate: 0,
    };
  },

  async refreshToken(refreshToken: string, config: OAuthConfig) {
    const result = await refreshAccessToken(
      `${GRAPH_API}/oauth/access_token`,
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
