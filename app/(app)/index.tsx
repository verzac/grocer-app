import { useFocusEffect } from 'expo-router'
import Ionicons from '@react-native-vector-icons/ionicons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, { BounceIn, ZoomOut } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import useSWR from 'swr'

import { GuildAvatar } from '@/components/GuildAvatar'
import { formatRelativeAgo } from '@/lib/formatRelativeAgo'
import { Button } from '@/components/ui/Button'
import { useOnline } from '@/hooks/useOnline'
import {
  createGrocery,
  deleteGroceriesBatch,
  getGroceryLists,
  getGuilds,
} from '@/lib/api/client'
import type {
  GroceryEntry,
  GroceryList,
  GuildGroceryList,
  UserGuild,
} from '@/lib/api/types'
import {
  loadGroceryListsCache,
  loadGroceryListsFetchedAt,
  loadGuildsCache,
  saveGroceryListsCache,
  saveGuildsCache,
} from '@/lib/storage/offlineCache'
import {
  getSelectedGuildId,
  setSelectedGuildId,
} from '@/lib/storage/guildSelection'

type ListPillId = 'all' | 'default' | number
const MAX_BULK_DELETE_IDS = 100

export default function GroceriesScreen() {
  const router = useRouter()
  const online = useOnline()

  const [cachedGuilds, setCachedGuilds] = useState<UserGuild[]>([])

  useEffect(() => {
    loadGuildsCache().then((g) => {
      if (g?.length) setCachedGuilds(g)
    })
  }, [])

  const {
    data: guildsData,
    error: guildsError,
    mutate: mutateGuilds,
    isLoading: guildsLoading,
  } = useSWR(online ? 'guilds' : null, getGuilds, {
    revalidateOnFocus: true,
    onSuccess: (data) => {
      saveGuildsCache(data.guilds).catch(() => {})
    },
  })

  const guilds = guildsData?.guilds ?? cachedGuilds

  const [selectedGuildId, setLocalGuildId] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      getSelectedGuildId().then(setLocalGuildId)
    }, []),
  )

  useEffect(() => {
    if (!guilds.length) return
    const first = guilds[0].id
    if (!selectedGuildId || !guilds.some((g) => g.id === selectedGuildId)) {
      setLocalGuildId(first)
      setSelectedGuildId(first).catch(() => {})
    }
  }, [guilds, selectedGuildId])

  const effectiveGuildId = selectedGuildId ?? guilds[0]?.id ?? null
  const effectiveGuildIdRef = useRef(effectiveGuildId)
  effectiveGuildIdRef.current = effectiveGuildId

  const persistGroceriesGen = useRef(0)
  const [lastGroceryRefreshAtMs, setLastGroceryRefreshAtMs] = useState<
    number | null
  >(null)
  const [relativeNowTick, setRelativeNowTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setRelativeNowTick((x) => x + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  /** Offline: restore “last refreshed” from storage. SWR 2 does not invoke onSuccess. */
  useEffect(() => {
    if (!effectiveGuildId) {
      setLastGroceryRefreshAtMs(null)
      return
    }
    if (online) return
    let cancelled = false
    loadGroceryListsFetchedAt(effectiveGuildId).then((t) => {
      if (!cancelled) setLastGroceryRefreshAtMs(t)
    })
    return () => {
      cancelled = true
    }
  }, [effectiveGuildId, online])

  const groceryKey =
    online && effectiveGuildId ? ['grocery-lists', effectiveGuildId] : null

  const {
    data: groceryRemote,
    error: groceryError,
    mutate: mutateGroceries,
    isLoading: groceryLoading,
  } = useSWR(groceryKey, () => getGroceryLists(effectiveGuildId!), {
    revalidateOnFocus: true,
  })

  const [offlineGroceries, setOfflineGroceries] =
    useState<GuildGroceryList | null>(null)

  useEffect(() => {
    if (!online || !effectiveGuildId || groceryRemote == null) return
    const gid = effectiveGuildId
    persistGroceriesGen.current += 1
    const gen = persistGroceriesGen.current
    const fetchedAtMs = Date.now()
    ;(async () => {
      try {
        await saveGroceryListsCache(gid, groceryRemote, fetchedAtMs)
      } catch {
        /* ignore persist errors */
      }
      if (gen !== persistGroceriesGen.current) return
      if (gid !== effectiveGuildIdRef.current) return
      setLastGroceryRefreshAtMs(fetchedAtMs)
      setOfflineGroceries(groceryRemote)
    })()
  }, [online, effectiveGuildId, groceryRemote])

  useEffect(() => {
    if (!effectiveGuildId) {
      setOfflineGroceries(null)
      return
    }
    if (online) return
    loadGroceryListsCache(effectiveGuildId).then(setOfflineGroceries)
  }, [effectiveGuildId, online])

  const groceryData: GuildGroceryList | null | undefined = online
    ? groceryRemote
    : (offlineGroceries ?? groceryRemote)

  const listById = useMemo(() => {
    const m = new Map<number, GroceryList>()
    groceryData?.grocery_lists?.forEach((l) => m.set(l.id, l))
    return m
  }, [groceryData])

  const sections = useMemo(() => {
    const entries = groceryData?.grocery_entries ?? []
    const byList = new Map<string | number, GroceryEntry[]>()
    for (const e of entries) {
      const key = e.grocery_list_id ?? 'default'
      const arr = byList.get(key) ?? []
      arr.push(e)
      byList.set(key, arr)
    }
    const order: (string | number)[] = []
    if (byList.has('default')) order.push('default')
    groceryData?.grocery_lists?.forEach((l) => order.push(l.id))
    for (const k of byList.keys()) {
      if (!order.includes(k)) order.push(k)
    }
    return order.map((k) => ({
      key: String(k),
      label:
        k === 'default'
          ? 'Default list'
          : (listById.get(k as number)?.fancy_name ??
            listById.get(k as number)?.list_label ??
            `List ${k}`),
      entries: byList.get(k) ?? [],
    }))
  }, [groceryData, listById])

  const [newItem, setNewItem] = useState('')
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([])
  const [listFilter, setListFilter] = useState<ListPillId>('all')
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const selectedCount = selectedEntryIds.length
  const selectedIdSet = useMemo(
    () => new Set(selectedEntryIds),
    [selectedEntryIds],
  )

  const listOptions = useMemo(() => {
    const opts: { id: ListPillId; label: string }[] = [
      { id: 'all', label: 'All Lists' },
      { id: 'default', label: 'Default' },
    ]
    groceryData?.grocery_lists?.forEach((l) => {
      opts.push({
        id: l.id,
        label: l.fancy_name
          ? `${l.fancy_name} (${l.list_label})`
          : l.list_label,
      })
    })
    return opts
  }, [groceryData])

  /** No payload yet during first online fetch; avoid All/Default-only pills until data arrives. */
  const groceriesLoadingEmptyOnline =
    online && groceryLoading && groceryData == null

  const showGroceryListFilterPills =
    !groceriesLoadingEmptyOnline &&
    (groceryData == null || (groceryData.grocery_lists?.length ?? 0) > 0)

  const effectiveListFilter: ListPillId = showGroceryListFilterPills
    ? listFilter
    : 'all'

  const groceryListHeader = useMemo(() => {
    if (lastGroceryRefreshAtMs == null) return null
    const ago = formatRelativeAgo(lastGroceryRefreshAtMs, Date.now())
    return <Text style={styles.lastRefreshed}>Last refreshed {ago}</Text>
  }, [lastGroceryRefreshAtMs, relativeNowTick])

  const visibleSections = useMemo(() => {
    if (effectiveListFilter === 'all') return sections
    const wantKey =
      effectiveListFilter === 'default'
        ? 'default'
        : String(effectiveListFilter)
    const filtered = sections.filter((s) => s.key === wantKey)
    if (filtered.length > 0) return filtered
    if (effectiveListFilter === 'default') {
      return [
        {
          key: 'default',
          label: 'Default list',
          entries: [] as GroceryEntry[],
        },
      ]
    }
    return filtered
  }, [sections, effectiveListFilter])

  const onRefresh = useCallback(async () => {
    setActionError(null)
    await Promise.all([mutateGuilds(), mutateGroceries()])
  }, [mutateGuilds, mutateGroceries])

  const onAdd = async () => {
    const desc = newItem.trim()
    if (!desc || !effectiveGuildId) return
    if (!online) {
      setActionError(
        'You need a connection to add items. Viewing still works offline.',
      )
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      const grocery_list_id =
        effectiveListFilter === 'default' || effectiveListFilter === 'all'
          ? null
          : effectiveListFilter
      await createGrocery(effectiveGuildId, {
        item_desc: desc,
        grocery_list_id,
      })
      setNewItem('')
      await mutateGroceries()
      console.log('###grocery: created')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not add item')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    setSelectedEntryIds([])
  }, [effectiveGuildId])

  const onToggleSelect = (id: number) => {
    if (busy || !online) return
    const isChecked = selectedIdSet.has(id)
    if (!isChecked && selectedCount >= MAX_BULK_DELETE_IDS) {
      setActionError(`You can select up to ${MAX_BULK_DELETE_IDS} items.`)
      return
    }
    setActionError(null)
    setSelectedEntryIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const onDeleteSelected = async () => {
    if (!effectiveGuildId) return
    if (selectedCount === 0) return
    if (!online) {
      setActionError('You need a connection to delete items.')
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      await deleteGroceriesBatch(effectiveGuildId, selectedEntryIds)
      await mutateGroceries()
      setSelectedEntryIds([])
      console.log('###grocery: bulk deleted', selectedEntryIds.length)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete')
    } finally {
      setBusy(false)
    }
  }

  const onPressDelete = () => {
    if (selectedCount === 0) return
    Alert.alert(
      'Delete selected items?',
      `Delete ${selectedCount} selected grocery item${selectedCount === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void onDeleteSelected()
          },
        },
      ],
    )
  }

  const selectedGuild =
    effectiveGuildId != null
      ? guilds.find((g) => g.id === effectiveGuildId)
      : undefined

  const guildLabel = selectedGuild?.name ?? 'Select server'

  const chipGuild: UserGuild = selectedGuild ?? {
    id: '__none__',
    name: guildLabel,
    icon: null,
  }

  const chipOrderIndex = selectedGuild
    ? Math.max(
        0,
        guilds.findIndex((g) => g.id === effectiveGuildId),
      )
    : 0

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/(app)/guilds')}
            style={styles.guildChip}
            accessibilityRole="button"
          >
            <View style={styles.guildChipRow}>
              <GuildAvatar
                guild={chipGuild}
                orderIndex={chipOrderIndex}
                size={40}
              />
              <View style={styles.guildChipTextCol}>
                <Text style={styles.guildChipText} numberOfLines={1}>
                  {guildLabel}
                </Text>
                <Text style={styles.guildChipHint}>Change</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {!online && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              Offline — showing saved data. Add and delete need internet.
            </Text>
          </View>
        )}

        {guildsError && online && (
          <Text style={styles.warn}>{String(guildsError)}</Text>
        )}
        {groceryError && online && (
          <Text style={styles.warn}>{String(groceryError)}</Text>
        )}

        {actionError && <Text style={styles.err}>{actionError}</Text>}

        <View style={styles.mainColumn}>
          {showGroceryListFilterPills && (
            <View style={styles.listPick}>
              <Text style={styles.listPickLabel}>List</Text>
              <FlatList
                horizontal
                data={listOptions}
                keyExtractor={(item) => String(item.id)}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => {
                  const selected = listFilter === item.id
                  return (
                    <Pressable
                      onPress={() => setListFilter(item.id)}
                      style={[styles.listPill, selected && styles.listPillOn]}
                    >
                      <Text
                        style={[
                          styles.listPillText,
                          selected && styles.listPillTextOn,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  )
                }}
              />
            </View>
          )}

          <FlatList
            style={styles.groceryFlatList}
            data={visibleSections}
            keyExtractor={(s) => s.key}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={(guildsLoading || groceryLoading) && online}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={styles.groceryFlatListContent}
            ListHeaderComponent={groceryListHeader ?? undefined}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {groceryLoading && online
                  ? 'Loading…'
                  : 'No groceries yet. Add something when you are online.'}
              </Text>
            }
            renderItem={({ item: section }) => (
              <View style={styles.section}>
                {section.key !== 'default' && (
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                )}
                {section.entries.length === 0 ? (
                  <Text style={styles.muted}>No items in this list.</Text>
                ) : (
                  section.entries.map((entry) => (
                    <Pressable
                      key={entry.id}
                      onPress={() => onToggleSelect(entry.id)}
                      disabled={
                        busy ||
                        !online ||
                        (!selectedIdSet.has(entry.id) &&
                          selectedCount >= MAX_BULK_DELETE_IDS)
                      }
                      style={styles.row}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: selectedIdSet.has(entry.id),
                      }}
                      accessibilityLabel={`Select ${entry.item_desc}`}
                    >
                      <Text style={styles.itemText}>{entry.item_desc}</Text>
                      <View
                        style={[
                          styles.checkbox,
                          selectedIdSet.has(entry.id) && styles.checkboxChecked,
                          (!online || busy) && styles.checkboxDisabled,
                        ]}
                      >
                        {selectedIdSet.has(entry.id) ? (
                          <Animated.View
                            entering={BounceIn.duration(240)}
                            exiting={ZoomOut.duration(90)}
                          >
                            <Ionicons name="checkmark" size={16} color="#f8fafc" />
                          </Animated.View>
                        ) : null}
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          />
        </View>

        <View style={styles.composerBar}>
          {selectedCount > 0 ? (
            <View style={styles.bulkRow}>
              {/* <Text style={styles.bulkText}>Delete {selectedCount} item(s)</Text> */}
              <Button
                title="Cancel"
                variant="secondary"
                disabled={busy}
                onPress={() => setSelectedEntryIds([])}
              />
              <Button
                title="Delete"
                variant="danger"
                loading={busy}
                onPress={onPressDelete}
              />
            </View>
          ) : (
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="Add an item..."
                placeholderTextColor="#64748b"
                value={newItem}
                onChangeText={setNewItem}
                editable={!busy}
                onSubmitEditing={onAdd}
              />
              <Button
                title="Add"
                loading={busy}
                disabled={!newItem.trim()}
                onPress={onAdd}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  mainColumn: {
    flex: 1,
    minHeight: 0,
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
  guildChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guildChipTextCol: {
    flex: 1,
    minWidth: 0,
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
    padding: 12,
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
  composerBar: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bulkRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bulkText: {
    flex: 1,
    color: '#f1f5f9',
    fontWeight: '600',
  },
  groceryFlatList: {
    flex: 1,
  },
  groceryFlatListContent: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  lastRefreshed: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 14,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
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
    marginBottom: 8,
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
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  itemText: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
})
