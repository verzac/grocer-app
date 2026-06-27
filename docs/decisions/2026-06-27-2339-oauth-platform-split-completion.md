# OAuth completion: platform-split handling (iOS vs Android)

**Date:** 2026-06-27

## Context

Discord OAuth uses PKCE via `expo-auth-session` (`useAuthRequest` + `promptAsync`) with redirect URI `groceryapp://auth/callback`.

The app has two screens involved in sign-in:

- `app/(auth)/login.tsx` — starts OAuth, persists PKCE verifier and state to Secure Store
- `app/auth/callback.tsx` — reads PKCE from Secure Store, exchanges the auth code for tokens, shows “Finishing sign-in…”, navigates to `/(app)`

`WebBrowser.maybeCompleteAuthSession()` runs in `app/_layout.tsx` so the native auth browser session can complete when Discord redirects.

## Problem

After Discord auth, iOS and Android deliver the redirect differently:

| Platform    | What happens on redirect                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **iOS**     | `ASWebAuthenticationSession` captures `groceryapp://auth/callback?…` in-process. Expo Router never receives a deep link. `useAuthRequest` sets `response.type === 'success'` on the login screen.             |
| **Android** | Chrome Custom Tabs delivers the redirect as an intent. Expo Router opens `app/auth/callback.tsx` via the intent filter in `app.config.ts`. `useAuthRequest` also sets `response.type === 'success'` on login. |

Earlier implementations hit two regressions:

1. **Double token exchange** — login and callback both exchanged the same auth code. OAuth codes are single-use; the second attempt fails. Fixed by moving exchange solely to `callback.tsx` and not handling success in login for exchange purposes (commit `f400223`).

2. **Double navigation on Android** — programmatic `router.replace('/auth/callback', …)` from login on success, on top of the deep link, caused a visible flash/jank and left a stale login screen on the back stack that users could navigate back to.

Ignoring `response.type === 'success'` in login (Android-only deep-link path) fixed Android but broke iOS: users returned to login with no spinner and no token exchange.

## Decision

Use a **platform-split completion path**:

- **Android:** Do nothing in login when `response.type === 'success'`. Rely on the deep link to `app/auth/callback.tsx` for token exchange and navigation.
- **iOS:** On `response.type === 'success'`, call `router.replace({ pathname: '/auth/callback', params: { code, state } })` so callback runs the same exchange flow as Android.

Token exchange stays **only** in `app/auth/callback.tsx`. Login must not exchange codes or call `POST /auth/token` on success.

Post-login navigation uses `router.dismissTo('/(app)')` from callback (not `replace`) so auth screens are not left on the stack for back navigation.

## Consequences

- **Positive:** Single token-exchange site; iOS and Android both reach callback; no double exchange; no Android double-navigation jank.
- **Negative:** Platform-specific branch in `login.tsx`; behavior must be understood when changing OAuth or routing.
- **Do not:** Navigate to callback on success for all platforms, or exchange tokens in both login and callback.

## References

- `app/(auth)/login.tsx` — iOS-only success handler
- `app/auth/callback.tsx` — token exchange and `dismissTo('/(app)')`
- `app/_layout.tsx` — `WebBrowser.maybeCompleteAuthSession()`
- `app.config.ts` — Android intent filter for `groceryapp://auth/callback`
- Git: `f400223` (double exchange), `51920f2` (iOS-only navigation fix)
