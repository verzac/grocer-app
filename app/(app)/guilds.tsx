import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

import { Button } from '@/components/ui/Button';
import { useOnline } from '@/hooks/useOnline';
import { getGuilds, signOut } from '@/lib/api/client';
import type { UserGuild } from '@/lib/api/types';
import { loadGuildsCache, saveGuildsCache } from '@/lib/storage/offlineCache';
import { clearSelectedGuildId, getSelectedGuildId, setSelectedGuildId } from '@/lib/storage/guildSelection';
export default function GuildsScreen() {
  const router = useRouter();
  const online = useOnline();
  const [cached, setCached] = useState<UserGuild[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    loadGuildsCache().then((g) => {
      if (g?.length) setCached(g);
    });
    getSelectedGuildId().then(setCurrentId);
  }, []);

  const { data, error, isLoading, mutate } = useSWR(online ? 'guilds' : null, getGuilds, {
    revalidateOnFocus: true,
    onSuccess: (res) => saveGuildsCache(res.guilds).catch(() => {}),
  });

  const guilds = data?.guilds ?? cached;

  const pick = async (id: string) => {
    setCurrentId(id);
    await setSelectedGuildId(id);
    router.back();
  };

  const onLogout = async () => {
    await signOut(online);
    await clearSelectedGuildId();
    console.log('###session: logged out');
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Text style={styles.title}>Servers</Text>
      {!online && (
        <Text style={styles.hint}>Offline — list may be from last sync.</Text>
      )}
      {error && online && <Text style={styles.err}>{String(error)}</Text>}

      <FlatList
        data={guilds}
        keyExtractor={(g) => g.id}
        refreshing={isLoading && online}
        onRefresh={() => mutate()}
        ListEmptyComponent={
          <Text style={styles.muted}>
            {isLoading && online ? 'Loading…' : 'No servers found.'}
          </Text>
        }
        renderItem={({ item }) => {
          const active = item.id === currentId;
          return (
            <Pressable
              onPress={() => pick(item.id)}
              style={[styles.row, active && styles.rowOn]}
              accessibilityRole="button"
            >
              <Text style={styles.name}>{item.name}</Text>
              {active && <Text style={styles.badge}>Selected</Text>}
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
        <Button title="Log out" variant="danger" onPress={onLogout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  hint: {
    color: '#fbbf24',
    marginBottom: 12,
    fontSize: 13,
  },
  err: {
    color: '#fecaca',
    marginBottom: 8,
  },
  muted: {
    color: '#64748b',
    marginTop: 24,
    textAlign: 'center',
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowOn: {
    borderColor: '#16a34a',
    backgroundColor: '#14532d',
  },
  name: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    color: '#bbf7d0',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    gap: 10,
    marginTop: 16,
  },
});
