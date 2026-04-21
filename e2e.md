# GroceryApp — local setup and manual E2E plan

This document describes how to run **GroceryApp** locally and how to verify behavior end-to-end without automated test runners. It matches the flows implemented in this repo (Expo Router, Discord OAuth + PKCE, GroceryBot API, guild selection, grocery CRUD, offline read cache).

## Prerequisites

- **Node.js** (LTS recommended; align with Expo SDK 54 docs)
- **pnpm** (this repo pins `packageManager` in `package.json`)
- **Expo tooling**: `pnpm dlx expo-doctor` is optional but useful after install
- A way to run the app:
  - **Expo Go** on a physical device, or
  - **iOS Simulator** (macOS + Xcode) / **Android Emulator** (Android Studio)

## Local setup

```bash
git clone <repository-url>
cd <repo-root>
pnpm install
pnpm run typecheck   # optional sanity check
pnpm start           # Metro + Expo dev server
```

From the dev UI, press `i` / `a` / `w` for iOS, Android, or web. **OAuth deep links** are intended for native builds (`groceryapp://…`); web may need extra redirect configuration and is not the primary target for this E2E plan.

## Environment variables

Expo reads public env vars at **build** time via `app.config.ts` (`process.env.EXPO_PUBLIC_*`).

| Variable | Required | Purpose |
|----------|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | No | Overrides the GroceryBot API base URL. Default: `https://api.grocerybot.net` (no trailing slash required; the app strips one if present). |
| `EXPO_PUBLIC_DISCORD_CLIENT_ID` | No | **Not used for OAuth in the current app:** Discord **client ID**, **redirect URI**, and **scopes** are defined in `app.config.ts` `extra` and `lib/config.ts`. Change those files (or reintroduce env-based overrides) if you need a different Discord app or redirect without editing code. |

Example for a **staging API** (optional):

```bash
export EXPO_PUBLIC_API_BASE_URL=https://staging-api.example.com
pnpm start
```

**Discord + backend configuration (not app env vars, but required for real login):**

1. **Discord Developer Portal** (your application, same client ID as in `app.config.ts` → `extra.discordClientId`):
   - OAuth2 → **Redirects**: include exactly **`groceryapp://auth/callback`** (must match `extra.oauthRedirectUri` and what the app sends to `POST /auth/token`).
   - Enable scopes used by the app: **`identify`**, **`guilds`**, **`guilds.members.read`** (see `DISCORD_OAUTH_SCOPES` in `lib/config.ts`).

2. **GroceryBot API** (`ALLOWED_REDIRECT_URIS` on the server): must allow the same **`groceryapp://auth/callback`** string used in the Discord authorize URL and in the JSON body of `POST /auth/token`.

See also: [GroceryBot OpenAPI](https://github.com/verzac/grocer-discord-bot/blob/master/openapi.yaml) and [integration guide](https://github.com/verzac/grocer-discord-bot/blob/master/.cursor/specs/SPEC-001-auth-rework-for-apps/integration-guide.md).

## Implemented product flow (reference)

1. **Cold start**: If no refresh token in Secure Store → **Login** (`/(auth)/login`). If session exists → **Groceries** (`/(app)`).
2. **Login**: Open Discord in the system browser (PKCE). Redirect returns to `groceryapp://auth/callback` with `code` → app calls **`POST /auth/token`** with `code`, `code_verifier`, `redirect_uri` → stores access + refresh tokens in **Expo Secure Store**; tracks access expiry for refresh.
3. **Guilds**: **`GET /guilds`** (Bearer, no `X-Guild-ID`). First guild in the list is selected by default if nothing valid is stored; user can open **Servers** and pick another (`/(app)/guilds`); selection persisted in AsyncStorage.
4. **Groceries**: **`GET /grocery-lists`** with `X-Guild-ID`. **`POST /groceries`** to create (optional `grocery_list_id`; null = default list). **`DELETE /groceries/:id`** to remove.
5. **Token refresh**: On 401 or near-expiry, **`POST /auth/refresh`** with rotation; new tokens saved to Secure Store.
6. **Offline**: When the device reports no network, SWR does not refetch; UI shows **cached** guild list and per-guild grocery payload from **AsyncStorage** (last successful online sync). **Add and delete are disabled** with an on-screen message; read still works from cache.
7. **Logout**: From Servers screen, **Log out** calls **`POST /auth/logout`** when online (then clears tokens) or clears local tokens when offline; clears selected guild id and returns to login.

## Manual E2E checklist

Run through these on a **clean install** (clear app data / reinstall) unless noted.

### E1 — First launch and login

- [ ] **E1.1** Fresh install: app shows **Continue with Discord** and redirect hint `groceryapp://auth/callback`.
- [ ] **E1.2** Tap Continue: system browser opens Discord OAuth; after consent, app returns and lands on **Groceries** without error.
- [ ] **E1.3** If login fails: note error body (e.g. redirect not allowlisted on API, wrong client ID, Discord redirect mismatch).

### E2 — Guilds and default selection

- [ ] **E2.1** After login, grocery screen shows a server name (first from **`GET /guilds`** if no prior selection).
- [ ] **E2.2** Tap **Change** → Servers list loads; tap a server → back on Groceries, **`X-Guild-ID`** should match selection (verify by different list content if applicable).
- [ ] **E2.3** Force-close app, reopen: last selected guild should still apply (AsyncStorage).

### E3 — Grocery read and CRUD (online)

- [ ] **E3.1** Pull to refresh: lists load without persistent error banners.
- [ ] **E3.2** Choose a list pill (Default vs named lists); add an item → appears after sync; **`POST /groceries`** path exercised.
- [ ] **E3.3** Remove an item → disappears; **`DELETE /groceries/:id`** exercised.

### E4 — Offline read, no writes

- [ ] **E4.1** With data loaded, enable **airplane mode** (or disable Wi‑Fi/cellular).
- [ ] **E4.2** Banner indicates offline; previous groceries and guild chip still visible from cache.
- [ ] **E4.3** Add / delete show expectation that internet is required; no successful write while offline.

### E5 — Back online

- [ ] **E5.1** Disable airplane mode; pull to refresh (or navigate) and confirm data updates from API when possible.

### E6 — Session and logout

- [ ] **E6.1** After ~15 minutes (or forced token expiry if you test that way), using the app should still work (refresh path) or prompt re-login if refresh invalid.
- [ ] **E6.2** Servers → **Log out**: returns to login; **`GET /grocery-lists`** should 401 until login again.
- [ ] **E6.3** Optional: log out while offline; local session cleared and login screen shown.

## Automated E2E (not in repo yet)

There is **no** Detox, Maestro, or Appium suite in this repository yet. To add automation later, typical choices are **Maestro** (YAML flows) or **Detox** (Jest + native); OAuth flows usually require a **test backend** and **test Discord app** or deep-link injection of a mock token—plan that separately.

## Quick command reference

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm start` | Start Expo dev server |
| `pnpm run typecheck` | TypeScript check |
| `pnpm run android` / `pnpm run ios` / `pnpm run web` | Start with platform shortcut |
