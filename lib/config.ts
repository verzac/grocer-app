import Constants from 'expo-constants';

type Extra = {
  apiBaseUrl?: string;
  discordClientId?: string;
};

export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const url = extra?.apiBaseUrl ?? 'https://api.grocerybot.net';
  return url.replace(/\/$/, '');
}

export function getDiscordClientId(): string {
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  return extra?.discordClientId ?? '';
}

export const AUTH_REDIRECT_PATH = 'auth/callback';
