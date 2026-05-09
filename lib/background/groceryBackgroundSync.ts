import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'

import { getGroceryLists, getGuilds } from '@/lib/api/client'
import {
  saveGroceryListsCache,
  saveGuildsCache,
} from '@/lib/storage/offlineCache'
import { getSelectedGuildId } from '@/lib/storage/guildSelection'

/** Task name must match registration and `TaskManager.defineTask`. */
export const GROCERY_BACKGROUND_SYNC_TASK = 'grocery-background-sync'

/**
 * Minimum gap between background runs (minutes). Expo/OS treat this as inexact. Android clamps
 * to at least ~15 minutes; iOS BGTaskScheduler may run much later.
 */
export const GROCERY_BACKGROUND_SYNC_MIN_INTERVAL_MINUTES = 60

TaskManager.defineTask(GROCERY_BACKGROUND_SYNC_TASK, async () => {
  try {
    const guildsRes = await getGuilds()
    await saveGuildsCache(guildsRes.guilds)

    const guilds = guildsRes.guilds
    if (guilds.length === 0) {
      console.log('###backgroundSync: no guilds, skipping grocery fetch')
      return BackgroundTask.BackgroundTaskResult.Success
    }

    let guildId = await getSelectedGuildId()
    const ids = new Set(guilds.map((g) => g.id))
    if (!guildId || !ids.has(guildId)) guildId = guilds[0].id

    const groceryData = await getGroceryLists(guildId)
    await saveGroceryListsCache(guildId, groceryData, Date.now())
    console.log('###backgroundSync: grocery lists cached', { guildId })
    return BackgroundTask.BackgroundTaskResult.Success
  } catch (e) {
    console.log('###backgroundSync: failed', e)
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

export async function registerGroceryBackgroundSyncIfNeeded(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync()
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    console.log('###backgroundSync: not registering, status=', status)
    return
  }

  if (await TaskManager.isTaskRegisteredAsync(GROCERY_BACKGROUND_SYNC_TASK)) {
    return
  }

  await BackgroundTask.registerTaskAsync(GROCERY_BACKGROUND_SYNC_TASK, {
    minimumInterval: GROCERY_BACKGROUND_SYNC_MIN_INTERVAL_MINUTES,
  })
  console.log('###backgroundSync: registered')
}

export async function unregisterGroceryBackgroundSync(): Promise<void> {
  try {
    if (
      !(await TaskManager.isTaskRegisteredAsync(GROCERY_BACKGROUND_SYNC_TASK))
    ) {
      return
    }
    await BackgroundTask.unregisterTaskAsync(GROCERY_BACKGROUND_SYNC_TASK)
    console.log('###backgroundSync: unregistered')
  } catch (e) {
    console.log('###backgroundSync: unregister failed', e)
  }
}
