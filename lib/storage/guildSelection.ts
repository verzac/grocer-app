import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'selected_guild_id';

export async function getSelectedGuildId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function setSelectedGuildId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}

export async function clearSelectedGuildId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
