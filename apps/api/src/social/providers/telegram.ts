import type { ISocialProvider, OAuthConfig, SocialVideoMetadata, PublishResult, AnalyticsData } from "../types.js";

const TELEGRAM_API = "https://api.telegram.org";

// Separator for stored access token (botToken||channelId)
// Bot tokens contain ":" so we can't use that as separator
const TOKEN_SEP = "||";

function parseStoredToken(accessToken: string): { botToken: string; channelId: string } {
  if (accessToken.includes(TOKEN_SEP)) {
    const [botToken, channelId] = accessToken.split(TOKEN_SEP);
    return { botToken, channelId };
  }
  // Legacy format: botToken:channelId — bot token is "digits:hash", channel starts with @ or -
  // Find channel part by looking for the last colon followed by @ or -
  const lastColonIdx = accessToken.lastIndexOf(":");
  const possibleChannel = accessToken.slice(lastColonIdx + 1);
  if (possibleChannel.startsWith("@") || possibleChannel.startsWith("-")) {
    return { botToken: accessToken.slice(0, lastColonIdx), channelId: possibleChannel };
  }
  // Last resort: bot token format is "digits:alphanumeric" — find second colon
  const firstColon = accessToken.indexOf(":");
  const secondColon = accessToken.indexOf(":", firstColon + 1);
  if (secondColon !== -1) {
    return { botToken: accessToken.slice(0, secondColon), channelId: accessToken.slice(secondColon + 1) };
  }
  throw new Error("Invalid stored Telegram token format");
}

export const telegramProvider: ISocialProvider = {
  name: "telegram",

  connect(_config: OAuthConfig): string {
    return "telegram:configure";
  },

  async handleCallback(code: string, _config: OAuthConfig) {
    // code is "botToken||channelId" from the route
    const { botToken, channelId } = parseStoredToken(code);

    if (!botToken || !channelId) {
      throw new Error("Invalid Telegram configuration. Bot token and channel ID are required");
    }

    // Verify bot token by calling getMe
    const meRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
    const meData = (await meRes.json()) as { ok: boolean; result?: { username: string }; description?: string };
    if (!meData.ok) throw new Error(`Invalid Telegram bot token: ${meData.description ?? "verification failed"}`);

    // Verify channel by getting chat info
    const chatRes = await fetch(`${TELEGRAM_API}/bot${botToken}/getChat?chat_id=${encodeURIComponent(channelId)}`);
    const chatData = (await chatRes.json()) as { ok: boolean; result?: { title: string; type: string }; description?: string };
    if (!chatData.ok) throw new Error(`Cannot access channel: ${chatData.description ?? "Make sure the bot is an admin of the channel"}`);

    const botUsername = meData.result?.username ?? "bot";
    const channelTitle = chatData.result?.title ?? channelId;

    return {
      accessToken: `${botToken}${TOKEN_SEP}${channelId}`,
      accountName: `${channelTitle} (@${botUsername})`,
    };
  },

  async publish(videoPath: string, metadata: SocialVideoMetadata, accessToken: string): Promise<PublishResult> {
    const { botToken, channelId } = parseStoredToken(accessToken);

    console.log(`[telegram] Downloading video from: ${videoPath.substring(0, 100)}...`);
    const videoRes = await fetch(videoPath);
    if (!videoRes.ok) throw new Error(`Failed to download video: HTTP ${videoRes.status}`);
    const videoBuffer = await videoRes.arrayBuffer();
    console.log(`[telegram] Video downloaded: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);
    const formData = new FormData();
    formData.append("chat_id", channelId);
    formData.append("video", new Blob([videoBuffer]), "video.mp4");

    let caption = metadata.description
      ? `${metadata.title}\n\n${metadata.description}`
      : metadata.title;

    if (metadata.tags?.length) {
      const hashtags = metadata.tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
      caption = `${caption}\n\n${hashtags}`;
    }

    formData.append("caption", caption);

    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendVideo`, {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string; error_code?: number };
    if (!data.ok) throw new Error(`Telegram API error: ${data.description ?? "Unknown error"} (code: ${data.error_code ?? "?"})`);

    const messageId = data.result?.message_id ?? 0;

    return {
      platformPostId: String(messageId),
      url: channelId.startsWith("@")
        ? `https://t.me/${channelId.replace("@", "")}/${messageId}`
        : undefined,
    };
  },

  async getAnalytics(_platformPostId: string, _accessToken: string): Promise<AnalyticsData> {
    return { views: 0, likes: 0, shares: 0, comments: 0, engagementRate: 0 };
  },

  async refreshToken(_refreshToken: string, _config: OAuthConfig) {
    return { accessToken: _refreshToken };
  },
};
