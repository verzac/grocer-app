import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import { useTokenExchange } from '@/hooks/data/useTokenExchange'
import { registerGroceryBackgroundSyncIfNeeded } from '@/lib/background/groceryBackgroundSync'
import { getDiscordOAuthRedirectUri } from '@/lib/config'
import {
  clearPendingOAuth,
  getPendingOAuth,
  setTokens,
} from '@/lib/storage/secureTokens'

export default function OAuthCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    code?: string
    state?: string
    error?: string
  }>()
  const redirectUri = useMemo(() => getDiscordOAuthRedirectUri(), [])
  const [error, setError] = useState<string | null>(null)
  const { trigger: exchangeToken } = useTokenExchange()

  useEffect(() => {
    async function completeOAuth() {
      const code = typeof params.code === 'string' ? params.code : null
      const state = typeof params.state === 'string' ? params.state : null
      const authError = typeof params.error === 'string' ? params.error : null

      if (authError) {
        setError(`Discord error: ${authError}`)
        await clearPendingOAuth()
        return
      }

      if (!code) {
        setError('Missing authorization code.')
        return
      }

      const pending = await getPendingOAuth()
      if (!pending.codeVerifier || !pending.state) {
        setError('Missing PKCE verifier. Please try login again.')
        return
      }

      if (state !== pending.state) {
        await clearPendingOAuth()
        setError('OAuth state mismatch. Please try login again.')
        return
      }

      try {
        const data = await exchangeToken({
          code,
          codeVerifier: pending.codeVerifier,
          redirectUri,
        })
        await setTokens(data.access_token, data.refresh_token, data.expires_in)
        await clearPendingOAuth()
        await registerGroceryBackgroundSyncIfNeeded()
        console.log('###callback: token exchange ok')
        router.dismissTo('/(app)')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Login failed'
        setError(msg)
        console.log('###callback error', msg)
      }
    }

    completeOAuth()
  }, [
    exchangeToken,
    params.code,
    params.error,
    params.state,
    redirectUri,
    router,
  ])

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.card}>
        {!error ? (
          <>
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={styles.title}>Finishing sign-in...</Text>
          </>
        ) : (
          <>
            <Text style={styles.errTitle}>Sign-in failed</Text>
            <Text style={styles.errText}>{error}</Text>
            <Text style={styles.hint}>
              Go back and tap Continue with Discord again.
            </Text>
            <Button
              title="Try login again"
              onPress={() => {
                router.replace('/(auth)/login')
              }}
              style={styles.retryButton}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
  },
  errTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fecaca',
  },
  errText: {
    fontSize: 14,
    color: '#fecaca',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  retryButton: {
    width: '100%',
    marginTop: 4,
  },
})
