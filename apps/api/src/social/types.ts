export type SocialVideoMetadata = {
  title: string;
  description: string;
  tags?: string[];
  privacy?: "public" | "private" | "unlisted";
  scheduledAt?: Date;
};

export type PublishResult = {
  platformPostId: string;
  url?: string;
};

export type AnalyticsData = {
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

export interface ISocialProvider {
  name: string;
  connect(config: OAuthConfig): string; // Returns OAuth authorization URL
  handleCallback(code: string, config: OAuthConfig): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountName: string;
  }>;
  publish(videoPath: string, metadata: SocialVideoMetadata, accessToken: string): Promise<PublishResult>;
  getAnalytics(platformPostId: string, accessToken: string): Promise<AnalyticsData>;
  refreshToken(refreshToken: string, config: OAuthConfig): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
}
