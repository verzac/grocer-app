import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { registerGroceryBackgroundSyncIfNeeded } from '@/lib/background/groceryBackgroundSync'
import { hasSession } from '@/lib/storage/secureTokens'

WebBrowser.maybeCompleteAuthSession()

export default function RootLayout() {
  useEffect(() => {
    void hasSession().then((ok) => {
      if (ok) void registerGroceryBackgroundSyncIfNeeded()
    })
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      />
    </SafeAreaProvider>
  )
}
