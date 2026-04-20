import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { hasSession } from '@/lib/storage/secureTokens';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    hasSession().then((s) => {
      setLoggedIn(s);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#94a3b8" />
      </View>
    );
  }

  if (loggedIn) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
