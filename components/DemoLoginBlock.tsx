import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '@/components/ui/Button'
import { useDemoLogin } from '@/hooks/data/useDemoLogin'
import { setTokens } from '@/lib/storage/secureTokens'

export function DemoLoginBlock() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { trigger, isMutating } = useDemoLogin()

  return (
    <View style={styles.block}>
      {error && <Text style={styles.err}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Demo password"
        placeholderTextColor="#64748b"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={setPassword}
        editable={!isMutating}
      />

      <Button
        title="Demo Login"
        variant="secondary"
        loading={isMutating}
        disabled={!password.trim()}
        onPress={async () => {
          setError(null)
          try {
            const data = await trigger(password)
            await setTokens(
              data.access_token,
              data.refresh_token,
              data.expires_in,
            )
            router.replace('/(app)')
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Demo login failed'
            if (msg.includes('401')) {
              setError('Invalid demo password.')
            } else if (msg.includes('429')) {
              setError('Too many attempts — please wait 30 seconds.')
            } else {
              setError(msg)
            }
          }
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    gap: 12,
  },
  err: {
    color: '#fecaca',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#f8fafc',
  },
})
