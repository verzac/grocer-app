# EAS Update automation via GitHub Actions

**Date:** 2026-06-28

## Context

GroceryApp uses EAS Update (`expo-updates`) with fingerprint-based runtime versioning and three update channels aligned to build profiles in `eas.json`: `development`, `preview`, and `production`.

We want over-the-air updates published automatically when code lands on `main`, with production gated behind manual approval. CI (typecheck, format, tests) should pass before any update is published.

Expo offers two official automation paths:

1. **EAS Workflows** — YAML in `.eas/workflows/`, triggered via the Expo GitHub App, jobs run on Expo-managed cloud infrastructure.
2. **GitHub Actions** — YAML in `.github/workflows/`, runs on GitHub-hosted runners, invokes `eas update` via `expo/expo-github-action`.

## Problem

We need a CI/CD approach that:

- Publishes to all three EAS Update channels from `main`
- Runs existing project checks before publishing
- Requires human approval before production OTA goes live
- Fits how this repo and other projects are already operated

## Decision

Use **GitHub Actions** (`.github/workflows/eas-update.yml`) instead of **EAS Workflows**.

Rationale:

- **Single CI home** — GitHub Actions is where CI already lives for this and other repos; one place for logs, secrets, environments, and approval gates.
- **Avoid Expo CI dependency** — EAS Workflows runs on Expo's managed CI service. That service could change pricing or availability over time. GitHub Actions keeps orchestration on GitHub while still using Expo only for what we need (EAS Update publish API via CLI).
- **Explicit channel targeting** — Jobs call existing `pnpm eas:update:*` scripts with `--channel` and `--environment` per profile, rather than `eas update --auto` (which publishes to an EAS branch named after the git branch, not necessarily the configured channels).

Workflow behavior on push to `main`:

| Job                 | When         | What                                                 |
| ------------------- | ------------ | ---------------------------------------------------- |
| `test`              | First        | `typecheck`, `format:check`, `pnpm test`             |
| `update`            | After `test` | Matrix: `development`, `preview` — immediate         |
| `update-production` | After `test` | `production` — waits for GitHub Environment approval |

Other conventions:

- Update messages prefixed with `[Github]` plus the commit message
- Node version from `.nvmrc` via `actions/setup-node` `node-version-file`
- Auth via repo secret `EXPO_TOKEN` (Expo access token)

Production approval uses a GitHub Environment named `production` (Settings → Environments → required reviewers). This is separate from EAS `--environment production` (env vars for the update bundle).

## Consequences

- **Positive:** CI and OTA automation in one system; production approval via familiar GitHub UI; no Expo GitHub App required for workflows; portable if EAS Workflows pricing or terms change.
- **Negative:** We maintain runner setup (pnpm, Node, EAS CLI install) in YAML; duplicated steps across jobs; GitHub Actions minutes usage on our account.
- **Do not:** Switch to EAS Workflows for this unless there is a strong reason to consolidate on Expo-managed CI; do not use `eas update --auto` for production channel publishes from `main`.

## One-time setup

1. Add `EXPO_TOKEN` repo secret ([expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens))
2. Create GitHub Environment `production` with required reviewers
3. Configure EAS environment variables per channel in the Expo dashboard if non-default values are needed

## References

- `.github/workflows/eas-update.yml`
- `package.json` — `eas:update:development`, `eas:update:preview`, `eas:update:production`
- `eas.json` — channel per build profile
- [Expo: GitHub Actions for EAS Update](https://docs.expo.dev/eas-update/github-actions)
- [expo/expo-github-action](https://github.com/expo/expo-github-action)
