import Ionicons from '@react-native-vector-icons/ionicons'
import { useRouter } from 'expo-router'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DemoLoginBlock } from '@/components/DemoLoginBlock'
import { Button } from '@/components/ui/Button'

export default function MagicLinkScreen() {
  const router = useRouter()

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              style={styles.titleRow}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={28} color="#f8fafc" />
              <Text style={styles.title}>Login with Demo Account</Text>
            </Pressable>
            <Text style={styles.subtitle}>
              Note: this is only useful for app reviewers. This will take you to
              a demo Discord account, NOT your own.
            </Text>
            <DemoLoginBlock />
            <Button
              title="I'm not an app reviewer - take me back!"
              onPress={() => router.replace('/(auth)/login')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginLeft: -8,
    padding: 4,
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
    fontStyle: 'italic',
  },
})
