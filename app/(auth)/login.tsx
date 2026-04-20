import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import {
  DISCORD_OAUTH_SCOPES,
  getApiBaseUrl,
  getDiscordClientId,
  getDiscordOAuthRedirectUri,
} from '@/lib/config';
import type { TokenResponse } from '@/lib/api/types';
import { setTokens } from '@/lib/storage/secureTokens';

export default function LoginScreen() {
  const router = useRouter();
  const clientId = getDiscordClientId();
  const redirectUri = useMemo(() => getDiscordOAuthRedirectUri(), []);

  const discovery = useMemo(
    () => ({
      authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
    }),
    [],
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: [...DISCORD_OAUTH_SCOPES],
      responseType: AuthSession.ResponseType.Code,
    },
    discovery,
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function exchange() {
      if (response?.type !== 'success' || !request) return;
      const code = response.params.code;
      if (!code) {
        setError('No authorization code returned.');
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            code_verifier: request.codeVerifier,
            redirect_uri: redirectUri,
          }),
        });

        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Token exchange failed (${res.status})`);
        }

        const data = (await res.json()) as TokenResponse;
        await setTokens(data.access_token, data.refresh_token, data.expires_in);
        console.log('###login: token exchange ok');
        router.replace('/(app)');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Login failed';
        setError(msg);
        console.log('###login error', msg);
      } finally {
        setBusy(false);
      }
    }

    exchange();
  }, [response, request, redirectUri, router]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.card}>
        <Text style={styles.title}>GroceryApp</Text>
        <Text style={styles.subtitle}>
          Sign in with Discord to manage groceries for your servers. Data syncs from{' '}
          {getApiBaseUrl()}.
        </Text>

        {error && <Text style={styles.err}>{error}</Text>}

        <Button
          title="Continue with Discord"
          loading={busy}
          disabled={!request}
          onPress={() => {
            setError(null);
            promptAsync().catch((e) => {
              setError(e instanceof Error ? e.message : 'OAuth failed');
            });
          }}
        />

        <Text style={styles.hint}>Redirect URI: {redirectUri}</Text>
        <Text style={styles.hintSmall}>
          This must match Discord OAuth2 → Redirects and the API allowlist for token exchange.
        </Text>
      </View>
    </SafeAreaView>
  );
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
});
