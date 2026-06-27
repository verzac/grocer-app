# AGENTS.md

## Scope

These instructions apply to the whole repository.

## Project

This is an Expo React Native app using Expo Router, TypeScript strict mode, and pnpm. The app implements Discord OAuth, GroceryBot API access, guild selection, grocery CRUD, token refresh, and offline read cache behavior.

Key locations:

- `app/`: Expo Router routes and layouts.
- `components/`: shared React Native components.
- `hooks/`: app hooks, including data hooks.
- `lib/api/`: API client, response types, fetch timing, and retry helpers.
- `lib/storage/`: Secure Store and AsyncStorage persistence helpers.
- `lib/config.ts` and `app.config.ts`: API base URL, OAuth client, redirect URI, app scheme, and EAS config.
- `e2e.md`: local setup and manual end-to-end verification plan.
- `docs/decisions/`: architecture and design decision records.

## Decisions

Record non-obvious architecture and design decisions under `docs/decisions/`. Filename format: `{YYYY-MM-DD}-{HHMM}-{title}.md` (e.g. `2026-06-27-2339-oauth-platform-split-completion.md`).

## Commands

Use pnpm.

- Install dependencies: `pnpm install`
- Start dev server: `pnpm start`
- Platform shortcuts: `pnpm run ios`, `pnpm run android`, `pnpm run web`
- Type check: `pnpm run typecheck`
- Check formatting: `pnpm run format:check`
- Format files: `pnpm run format`

There is no automated test suite in this repository yet. For behavior changes, run `pnpm run typecheck` and use the relevant checklist in `e2e.md`. Do not run EAS build, submit, or update commands unless explicitly requested.

## Code Style

- Keep TypeScript strict-compatible.
- Prefer existing local patterns over new abstractions.
- Use the `@/` path alias for root imports when it matches surrounding code.
- Follow the existing Prettier style: single quotes, no semicolons, trailing commas where Prettier inserts them.
- Keep React Native styles in `StyleSheet.create` unless adjacent code uses a different pattern.
- Keep comments sparse and only add them where they clarify non-obvious behavior.

## App Invariants

- OAuth redirect values must stay aligned across `app.config.ts`, `lib/config.ts`, Discord app settings, and the backend allowlist. The current redirect URI is `groceryapp://auth/callback`.
- Access and refresh tokens belong in Expo Secure Store only. Do not persist tokens in AsyncStorage.
- Guild selection and offline read cache use AsyncStorage. Do not store sensitive auth material there.
- Authenticated API requests go through `lib/api/client.ts` so token refresh, `Authorization`, and `X-Guild-ID` behavior stay centralized.
- Offline mode is read-only. Do not enable create or delete flows while the device is offline unless the app adds an explicit queued-write design.
- Batch grocery deletion is capped at 100 ids per request.

## CI

When adding a new **non-code** top-level folder (docs, tooling, editor config, etc.), add a matching entry to `paths-ignore` in `.github/workflows/ci.yml` so pushes that touch only that folder do not run CI or EAS Update.

## Verification

Before handing off code changes:

- Run `pnpm run typecheck`.
- Run `pnpm run format:check` when formatting may have changed.
- For OAuth, guild selection, grocery CRUD, token refresh, logout, or offline behavior, verify the matching section of `e2e.md` or state clearly what was not run.

