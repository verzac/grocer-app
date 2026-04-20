import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  discordClientId?: string;
  oauthRedirectUri?: string;
};

/** Must match Discord OAuth2 redirect and `app.config.ts` scheme + path. */
export const DISCORD_OAUTH_REDIRECT_URI = 'groceryapp://auth/callback';

export const DISCORD_OAUTH_SCOPES = [
  'identify',
  'guilds',
  'guilds.members.read',
] as const;

export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const url = extra?.apiBaseUrl ?? 'https://api.grocerybot.net';
  return url.replace(/\/$/, '');
}

export function getDiscordClientId(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.discordClientId ?? '815120759680532510';
}

export function getDiscordOAuthRedirectUri(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.oauthRedirectUri ?? DISCORD_OAUTH_REDIRECT_URI;
}
