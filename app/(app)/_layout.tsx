import { Stack } from 'expo-router';

export default function AppGroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0f172a' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Groceries' }} />
      <Stack.Screen name="guilds" options={{ title: 'Servers' }} />
    </Stack>
  );
}
