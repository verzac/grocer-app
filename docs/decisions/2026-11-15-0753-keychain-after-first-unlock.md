# Keychain after first unlock for session tokens

**Date:** 2026-11-15

## Context

Auth tokens live in SecureStore (`lib/storage/secureTokens.ts`). Expo’s default on iOS is `WHEN_UNLOCKED`. Background grocery sync (`lib/background/groceryBackgroundSync.ts`) calls the API while the device is often locked; token reads then fail with `errSecInteractionNotAllowed`.

## Decision

Write access token, refresh token, and expiry via `setTokens` with `keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. Leave pending OAuth verifier/state on the default `WHEN_UNLOCKED` (interactive login only).

## Tradeoffs

- **Locked device:** After the first unlock since boot, this app can read those keychain items while the phone is locked (including background sync). Other apps remain sandboxed.
- **Backup restore:** `THIS_DEVICE_ONLY` entries are not migrated to a new device when restoring from backup; users sign in again.
- **Migration:** Existing items keep their old accessibility until the next `setTokens` (sign-in, demo login, or token refresh). A still-valid access token defers migration and can delay locked-device background sync until refresh. No launch-time rewrite.

## Ship

Runtime-only change; EAS Update is sufficient (no native rebuild).

## Verification

After refresh or login on a build with the new JS, locked-device background sync should reach the API. Cold start with a session should still load guilds and groceries.