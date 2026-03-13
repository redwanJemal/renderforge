import type { OAuthConfig } from "./types.js";

export function buildAuthorizationUrl(
  authorizeUrl: string,
  config: OAuthConfig,
  state: string,
  extraParams?: Record<string, string>,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    response_type: "code",
    state,
    ...extraParams,
  });
  return `${authorizeUrl}?${params}`;
}

export async function exchangeCodeForToken(
  tokenUrl: string,
  code: string,
  config: OAuthConfig,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(
  tokenUrl: string,
  refreshToken: string,
  config: OAuthConfig,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}
