import AsyncStorage from '@react-native-async-storage/async-storage'

export type GroceryListSelection = 'all' | 'default' | number

const KEY = 'selected_grocery_lists_by_guild'

function isSelection(value: unknown): value is GroceryListSelection {
  return (
    value === 'all' ||
    value === 'default' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

async function loadSelections(): Promise<Record<string, GroceryListSelection>> {
  const raw = await AsyncStorage.getItem(KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const selections: Record<string, GroceryListSelection> = {}
    for (const [guildId, value] of Object.entries(parsed)) {
      if (isSelection(value)) selections[guildId] = value
    }
    return selections
  } catch {
    return {}
  }
}

export async function getSelectedGroceryList(
  guildId: string,
): Promise<GroceryListSelection | null> {
  const selections = await loadSelections()
  return selections[guildId] ?? null
}

export async function setSelectedGroceryList(
  guildId: string,
  selection: GroceryListSelection,
): Promise<void> {
  const selections = await loadSelections()
  selections[guildId] = selection
  await AsyncStorage.setItem(KEY, JSON.stringify(selections))
}

export async function clearSelectedGroceryLists(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
