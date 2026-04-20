import * as SecureStore from 'expo-secure-store';

const ACCESS = 'gb_access_token';
const REFRESH = 'gb_refresh_token';
const EXPIRES_AT = 'gb_access_expires_at_ms';

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH);
}

export async function setTokens(
  access: string,
  refresh: string,
  expiresInSeconds: number,
): Promise<void> {
  const expiresAt = Date.now() + expiresInSeconds * 1000 - 30_000;
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
  await SecureStore.setItemAsync(EXPIRES_AT, String(expiresAt));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await SecureStore.deleteItemAsync(EXPIRES_AT);
}

export async function getAccessExpiresAt(): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(EXPIRES_AT);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function hasSession(): Promise<boolean> {
  const r = await getRefreshToken();
  return !!r;
}
