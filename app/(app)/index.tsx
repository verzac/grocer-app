import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

import { Button } from '@/components/ui/Button';
import { useOnline } from '@/hooks/useOnline';
import { createGrocery, deleteGrocery, getGroceryLists, getGuilds } from '@/lib/api/client';
import type { GroceryEntry, GroceryList, GuildGroceryList, UserGuild } from '@/lib/api/types';
import { loadGroceryListsCache, loadGuildsCache, saveGroceryListsCache, saveGuildsCache } from '@/lib/storage/offlineCache';
import { getSelectedGuildId, setSelectedGuildId } from '@/lib/storage/guildSelection';

export default function GroceriesScreen() {
  const router = useRouter();
  const online = useOnline();

  const [cachedGuilds, setCachedGuilds] = useState<UserGuild[]>([]);

  useEffect(() => {
    loadGuildsCache().then((g) => {
      if (g?.length) setCachedGuilds(g);
    });
  }, []);

  const {
    data: guildsData,
    error: guildsError,
    mutate: mutateGuilds,
    isLoading: guildsLoading,
  } = useSWR(online ? 'guilds' : null, getGuilds, {
    revalidateOnFocus: true,
    onSuccess: (data) => {
      saveGuildsCache(data.guilds).catch(() => {});
    },
  });

  const guilds = guildsData?.guilds ?? cachedGuilds;

  const [selectedGuildId, setLocalGuildId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await getSelectedGuildId();
      setLocalGuildId(stored);
    })();
  }, []);

  useEffect(() => {
    if (!guilds.length) return;
    const first = guilds[0].id;
    if (!selectedGuildId || !guilds.some((g) => g.id === selectedGuildId)) {
      setLocalGuildId(first);
      setSelectedGuildId(first).catch(() => {});
    }
  }, [guilds, selectedGuildId]);

  const effectiveGuildId = selectedGuildId ?? guilds[0]?.id ?? null;

  const groceryKey = online && effectiveGuildId ? ['grocery-lists', effectiveGuildId] : null;

  const {
    data: groceryRemote,
    error: groceryError,
    mutate: mutateGroceries,
    isLoading: groceryLoading,
  } = useSWR(groceryKey, () => getGroceryLists(effectiveGuildId!), {
    revalidateOnFocus: true,
    onSuccess: (data) => {
      if (effectiveGuildId) {
        saveGroceryListsCache(effectiveGuildId, data).catch(() => {});
      }
    },
  });

  const [offlineGroceries, setOfflineGroceries] = useState<GuildGroceryList | null>(null);

  useEffect(() => {
    if (!effectiveGuildId) {
      setOfflineGroceries(null);
      return;
    }
    loadGroceryListsCache(effectiveGuildId).then(setOfflineGroceries);
  }, [effectiveGuildId]);

  const groceryData: GuildGroceryList | null | undefined = online ? groceryRemote : offlineGroceries ?? groceryRemote;

  const listById = useMemo(() => {
    const m = new Map<number, GroceryList>();
    groceryData?.grocery_lists?.forEach((l) => m.set(l.id, l));
    return m;
  }, [groceryData]);

  const sections = useMemo(() => {
    const entries = groceryData?.grocery_entries ?? [];
    const byList = new Map<string | number, GroceryEntry[]>();
    for (const e of entries) {
      const key = e.grocery_list_id ?? 'default';
      const arr = byList.get(key) ?? [];
      arr.push(e);
      byList.set(key, arr);
    }
    const order: (string | number)[] = [];
    groceryData?.grocery_lists?.forEach((l) => order.push(l.id));
    if (byList.has('default')) order.push('default');
    for (const k of byList.keys()) {
      if (!order.includes(k)) order.push(k);
    }
    return order.map((k) => ({
      key: String(k),
      label:
        k === 'default'
          ? 'Default list'
          : listById.get(k as number)?.fancy_name ??
            listById.get(k as number)?.list_label ??
            `List ${k}`,
      entries: byList.get(k) ?? [],
    }));
  }, [groceryData, listById]);

  const [newItem, setNewItem] = useState('');
  const [listFilter, setListFilter] = useState<number | 'default' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const listOptions = useMemo(() => {
    const opts: { id: number | 'default'; label: string }[] = [{ id: 'default', label: 'Default' }];
    groceryData?.grocery_lists?.forEach((l) => {
      opts.push({
        id: l.id,
        label: l.fancy_name ? `${l.fancy_name} (${l.list_label})` : l.list_label,
      });
    });
    return opts;
  }, [groceryData]);

  useEffect(() => {
    if (listFilter !== null) return;
    setListFilter(listOptions[0]?.id ?? 'default');
  }, [listFilter, listOptions]);

  const onRefresh = useCallback(async () => {
    setActionError(null);
    await Promise.all([mutateGuilds(), mutateGroceries()]);
  }, [mutateGuilds, mutateGroceries]);

  const onAdd = async () => {
    const desc = newItem.trim();
    if (!desc || !effectiveGuildId) return;
    if (!online) {
      setActionError('You need a connection to add items. Viewing still works offline.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const grocery_list_id =
        listFilter === 'default' || listFilter === null ? null : listFilter;
      await createGrocery(effectiveGuildId, { item_desc: desc, grocery_list_id });
      setNewItem('');
      await mutateGroceries();
      console.log('###grocery: created');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not add item');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!effectiveGuildId) return;
    if (!online) {
      setActionError('You need a connection to delete items.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await deleteGrocery(effectiveGuildId, id);
      await mutateGroceries();
      console.log('###grocery: deleted', id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const guildLabel =
    guilds.find((g) => g.id === effectiveGuildId)?.name ?? 'Select server';

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.push('/(app)/guilds')}
          style={styles.guildChip}
          accessibilityRole="button"
        >
          <Text style={styles.guildChipText} numberOfLines={1}>
            {guildLabel}
          </Text>
          <Text style={styles.guildChipHint}>Change</Text>
        </Pressable>
      </View>

      {!online && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline — showing saved data. Add and delete need internet.
          </Text>
        </View>
      )}

      {guildsError && online && <Text style={styles.warn}>{String(guildsError)}</Text>}
      {groceryError && online && <Text style={styles.warn}>{String(groceryError)}</Text>}

      {actionError && <Text style={styles.err}>{actionError}</Text>}

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add an item…"
          placeholderTextColor="#64748b"
          value={newItem}
          onChangeText={setNewItem}
          editable={!busy}
          onSubmitEditing={onAdd}
        />
        <Button title="Add" loading={busy} disabled={!newItem.trim()} onPress={onAdd} />
      </View>

      <View style={styles.listPick}>
        <Text style={styles.listPickLabel}>List</Text>
        <FlatList
          horizontal
          data={listOptions}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const selected = listFilter === item.id;
            return (
              <Pressable
                onPress={() => setListFilter(item.id)}
                style={[styles.listPill, selected && styles.listPillOn]}
              >
                <Text style={[styles.listPillText, selected && styles.listPillTextOn]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        refreshControl={
          <RefreshControl
            refreshing={(guildsLoading || groceryLoading) && online}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {groceryLoading && online
              ? 'Loading…'
              : 'No groceries yet. Add something when you are online.'}
          </Text>
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            {section.entries.length === 0 ? (
              <Text style={styles.muted}>No items in this list.</Text>
            ) : (
              section.entries.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <Text style={styles.itemText}>{entry.item_desc}</Text>
                  <Pressable
                    onPress={() => onDelete(entry.id)}
                    disabled={busy || !online}
                    style={styles.deleteHit}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${entry.item_desc}`}
                  >
                    <Text style={[styles.delete, !online && styles.deleteDisabled]}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guildChip: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  guildChipText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  guildChipHint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  offlineBanner: {
    backgroundColor: '#422006',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#854d0e',
  },
  offlineText: {
    color: '#fef3c7',
    fontSize: 13,
  },
  warn: {
    color: '#fbbf24',
    marginBottom: 8,
  },
  err: {
    color: '#fecaca',
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16,
  },
  listPick: {
    marginBottom: 12,
  },
  listPickLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  listPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listPillOn: {
    backgroundColor: '#14532d',
    borderColor: '#16a34a',
  },
  listPillText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  listPillTextOn: {
    color: '#ecfccb',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  muted: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  itemText: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
  },
  deleteHit: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  delete: {
    color: '#fca5a5',
    fontWeight: '600',
  },
  deleteDisabled: {
    opacity: 0.4,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
});
