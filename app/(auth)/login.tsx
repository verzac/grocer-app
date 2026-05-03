import * as AuthSession from 'expo-auth-session'
import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import {
  DISCORD_OAUTH_SCOPES,
  getDiscordClientId,
  getDiscordOAuthRedirectUri,
} from '@/lib/config'
import { clearPendingOAuth, setPendingOAuth } from '@/lib/storage/secureTokens'

export default function LoginScreen() {
  const clientId = getDiscordClientId()
  const redirectUri = useMemo(() => getDiscordOAuthRedirectUri(), [])

  const discovery = useMemo(
    () => ({
      authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
    }),
    [],
  )

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: [...DISCORD_OAUTH_SCOPES],
      responseType: AuthSession.ResponseType.Code,
    },
    discovery,
  )

  const [prompting, setPrompting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!response || response.type === 'success') return
    if (response.type === 'error') {
      const p = response.params as Record<string, string | undefined>
      const code = p.error
      const desc = p.error_description
      const line = [code, desc].filter(Boolean).join(': ')
      setError(line || 'Discord sign-in failed.')
      void clearPendingOAuth()
      return
    }
    if (response.type === 'cancel' || response.type === 'dismiss') {
      void clearPendingOAuth()
    }
  }, [response])

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.card}>
        <Text style={styles.title}>GroceryApp</Text>
        <Text style={styles.subtitle}>
          Sign in with Discord to manage groceries for your servers.
        </Text>

        {error && <Text style={styles.err}>{error}</Text>}

        <Button
          title="Continue with Discord"
          loading={prompting}
          disabled={!request}
          onPress={async () => {
            setError(null)
            if (!request?.codeVerifier || !request.state) {
              setError('OAuth request is not ready. Please try again.')
              return
            }

            setPrompting(true)
            try {
              await setPendingOAuth(request.codeVerifier, request.state)
              await promptAsync()
            } catch (e) {
              setError(e instanceof Error ? e.message : 'OAuth failed')
            } finally {
              setPrompting(false)
            }
          }}
        />

        <Text style={styles.hint}>Redirect URI: {redirectUri}</Text>
        <Text style={styles.hintSmall}>
          This must match Discord OAuth2 → Redirects and the API allowlist for
          token exchange.
        </Text>
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
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  err: {
    color: '#fecaca',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  hintSmall: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
})
