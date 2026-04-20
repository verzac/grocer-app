import { getApiBaseUrl } from '@/lib/config';
import type { GuildGroceryList, TokenResponse, UserGuildsResponse } from '@/lib/api/types';
import {
  clearTokens,
  getAccessExpiresAt,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/storage/secureTokens';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refresh = await getRefreshToken();
    if (!refresh) return null;

    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) {
      await clearTokens();
      return null;
    }

    const data = (await res.json()) as TokenResponse;
    await setTokens(data.access_token, data.refresh_token, data.expires_in);
    return data.access_token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function getValidAccessToken(): Promise<string | null> {
  const access = await getAccessToken();
  const expiresAt = await getAccessExpiresAt();
  if (access && expiresAt && Date.now() < expiresAt) {
    return access;
  }
  return refreshAccessToken();
}

export async function fetchWithAuth(
  path: string,
  init: RequestInit & { guildId?: string } = {},
): Promise<Response> {
  const { guildId, ...rest } = init;
  const headers = new Headers(rest.headers);

  const token = await getValidAccessToken();
  if (!token) {
    return new Response(null, { status: 401 });
  }
  headers.set('Authorization', `Bearer ${token}`);
  if (guildId) {
    headers.set('X-Guild-ID', guildId);
  }

  let res = await fetch(`${getApiBaseUrl()}${path}`, { ...rest, headers });

  if (res.status === 401) {
    const next = await refreshAccessToken();
    if (!next) return res;
    const h2 = new Headers(rest.headers);
    h2.set('Authorization', `Bearer ${next}`);
    if (guildId) h2.set('X-Guild-ID', guildId);
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...rest, headers: h2 });
  }

  return res;
}

export async function getGuilds(): Promise<UserGuildsResponse> {
  const res = await fetchWithAuth('/guilds');
  if (!res.ok) {
    throw new Error(`GET /guilds failed: ${res.status}`);
  }
  return res.json() as Promise<UserGuildsResponse>;
}

export async function getGroceryLists(guildId: string): Promise<GuildGroceryList> {
  const res = await fetchWithAuth('/grocery-lists', { guildId });
  if (!res.ok) {
    throw new Error(`GET /grocery-lists failed: ${res.status}`);
  }
  return res.json() as Promise<GuildGroceryList>;
}

export async function createGrocery(
  guildId: string,
  body: { item_desc: string; grocery_list_id?: number | null },
): Promise<void> {
  const res = await fetchWithAuth('/groceries', {
    method: 'POST',
    guildId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 201) {
    const text = await res.text();
    throw new Error(text || `POST /groceries failed: ${res.status}`);
  }
}

export async function deleteGrocery(guildId: string, id: number): Promise<void> {
  const res = await fetchWithAuth(`/groceries/${id}`, {
    method: 'DELETE',
    guildId,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`DELETE /groceries/${id} failed: ${res.status}`);
  }
}

export async function logoutSession(): Promise<void> {
  const res = await fetchWithAuth('/auth/logout', { method: 'POST' });
  if (res.status !== 204 && res.status !== 401) {
    await res.text();
  }
  await clearTokens();
}

/** Clears local tokens; calls POST /auth/logout when online. */
export async function signOut(online: boolean): Promise<void> {
  if (online) {
    try {
      await logoutSession();
      return;
    } catch {
      await clearTokens();
      return;
    }
  }
  await clearTokens();
}
