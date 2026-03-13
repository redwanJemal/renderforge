import type { ISocialProvider } from "../types.js";
import { facebookProvider } from "./facebook.js";
import { youtubeProvider } from "./youtube.js";
import { tiktokProvider } from "./tiktok.js";
import { linkedinProvider } from "./linkedin.js";
import { telegramProvider } from "./telegram.js";

const providers: Record<string, ISocialProvider> = {
  facebook: facebookProvider,
  youtube: youtubeProvider,
  tiktok: tiktokProvider,
  linkedin: linkedinProvider,
  telegram: telegramProvider,
};

export function getProvider(name: string): ISocialProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}

export { providers };
