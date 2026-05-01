import type { ExpoConfig } from 'expo/config'

const EAS_PROJECT_ID = '16bf991e-d6e0-45c7-b22a-c2630c2052be'

const config: ExpoConfig = {
  name: 'GroceryApp',
  slug: 'grocery-app',
  version: '1.0.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'groceryapp',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0f172a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'net.grocerybot.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f172a',
    },
    predictiveBackGestureEnabled: false,
    package: 'net.grocerybot.app',
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          {
            scheme: 'groceryapp',
            host: 'auth',
            pathPrefix: '/callback',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-dev-client',
    'expo-router',
    'expo-secure-store',
    '@react-native-async-storage/expo-with-async-storage',
    'expo-updates',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.grocerybot.net',
    discordClientId: '815120759680532510',
    oauthRedirectUri: 'groceryapp://auth/callback',
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
}

export default config
