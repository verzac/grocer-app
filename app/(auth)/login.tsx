import * as AuthSession from 'expo-auth-session'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Image, Linking, Platform, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/Button'
import {
  DISCORD_OAUTH_SCOPES,
  getDiscordClientId,
  getDiscordOAuthRedirectUri,
} from '@/lib/config'
import { clearPendingOAuth, setPendingOAuth } from '@/lib/storage/secureTokens'

const PRIVACY_POLICY_URL = 'https://grocerybot.net/privacy-policy-mobile'

export default function LoginScreen() {
  const router = useRouter()
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
    if (!response) return
    if (response.type === 'success') {
      // iOS only: ASWebAuthenticationSession captures the redirect URI internally
      // and never dispatches it as a deep link, so Expo Router won't navigate to
      // app/auth/callback.tsx. We must navigate there manually.
      // On Android, Chrome Custom Tabs delivers the redirect as an intent that
      // Expo Router handles as a deep link, so navigating here would cause a
      // double-navigation (jank flash + stale back-stack entry).
      if (Platform.OS === 'ios') {
        const { code, state } = response.params
        if (code) {
          router.replace({
            pathname: '/auth/callback',
            params: { code, state },
          })
        }
      }
      return
    }
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
  }, [response, router])

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Image
            accessibilityLabel="GroceryBot"
            source={require('../../assets/grocerybot.png')}
            style={styles.titleLogo}
          />
          <Text style={styles.title}>GroceryBot App</Text>
        </View>
        <Text style={styles.subtitle}>
          Sign in with Discord to manage groceries for your servers.
        </Text>

        <View style={styles.disclaimerBlock}>
          <Text style={styles.disclaimerHint}>
            We use your Discord login to
          </Text>
          <View style={styles.listItemRow}>
            <Text style={[styles.disclaimerHint, styles.listMarker]}>(1)</Text>
            <Text style={[styles.disclaimerHint, styles.listItemText]}>
              find your list of Discord servers; and
            </Text>
          </View>
          <View style={styles.listItemRow}>
            <Text style={[styles.disclaimerHint, styles.listMarker]}>(2)</Text>
            <Text style={[styles.disclaimerHint, styles.listItemText]}>
              retrieve the grocery lists for that server.
            </Text>
          </View>
          <Text style={styles.disclaimerHint}>
            We do <Text style={styles.emphasis}>not</Text> store your personal
            information (e.g. nicknames, username). User and server avatars are
            forwarded straight from Discord to you. You can read more about this
            in our{' '}
            <Text
              accessibilityRole="link"
              style={styles.disclaimerLink}
              onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

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
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 16,
    maxWidth: 512,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleLogo: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    flexShrink: 1,
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
  disclaimerBlock: {
    gap: 8,
  },
  disclaimerHint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#94a3b8',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 4,
  },
  listMarker: {
    minWidth: 28,
  },
  listItemText: {
    flex: 1,
  },
  emphasis: {
    fontStyle: 'italic',
  },
  disclaimerLink: {
    fontSize: 13,
    color: '#93c5fd',
    textDecorationLine: 'underline',
  },
})
