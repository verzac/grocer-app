import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { onAuthExpired } from '@/lib/api/client'
import { registerGroceryBackgroundSyncIfNeeded } from '@/lib/background/groceryBackgroundSync'
import { clearTokens, hasSession } from '@/lib/storage/secureTokens'

WebBrowser.maybeCompleteAuthSession()

export default function RootLayout() {
  const router = useRouter()

  useEffect(() => {
    void hasSession().then((ok) => {
      if (ok) void registerGroceryBackgroundSyncIfNeeded()
    })
  }, [])

  useEffect(() => {
    onAuthExpired(() => {
      void (async () => {
        await clearTokens()
        console.log('###session: auth expired')
        router.replace('/(auth)/login')
      })()
    })
    return () => onAuthExpired(null)
  }, [router])

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
