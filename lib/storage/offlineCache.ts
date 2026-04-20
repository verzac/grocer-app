import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GuildGroceryList } from '@/lib/api/types';
import type { UserGuild } from '@/lib/api/types';

const PREFIX_GROCERY = 'offline:grocery-lists:';
const KEY_GUILDS = 'offline:guilds';

export async function saveGuildsCache(guilds: UserGuild[]): Promise<void> {
  await AsyncStorage.setItem(KEY_GUILDS, JSON.stringify(guilds));
}

export async function loadGuildsCache(): Promise<UserGuild[] | null> {
  const raw = await AsyncStorage.getItem(KEY_GUILDS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserGuild[];
  } catch {
    return null;
  }
}

export async function saveGroceryListsCache(
  guildId: string,
  data: GuildGroceryList,
): Promise<void> {
  await AsyncStorage.setItem(PREFIX_GROCERY + guildId, JSON.stringify(data));
}

export async function loadGroceryListsCache(
  guildId: string,
): Promise<GuildGroceryList | null> {
  const raw = await AsyncStorage.getItem(PREFIX_GROCERY + guildId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GuildGroceryList;
  } catch {
    return null;
  }
}
