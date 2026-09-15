# Grocery List Selector Uses a Local Expo UI Bottom Sheet

## Status

Accepted

## Context

The grocery list filter was rendered as an Expo UI picker. Its native picker presentation could not be styled to match the rest of the screen.

A native-stack `formSheet` route would allow ordinary React Native content, but the grocery options and active filter are local to the grocery screen. A separate route would require duplicated data loading, route parameters, or shared state solely to communicate a selection back to that screen.

## Decision

Use the universal `BottomSheet` from `@expo/ui` as a controlled overlay owned by the grocery screen. Host the selectable React Native list in `RNHostView` and use the cross-platform half and full snap points.

The trigger and option rows use regular React Native components so their styling is consistent with the app. Selecting an option updates the existing local state and per-guild AsyncStorage value before closing the sheet.

## Consequences

- No navigation route or shared state is needed for the selector.
- The sheet presentation remains native to iOS and Android, so its container and gestures can differ by platform.
- React Native scrollable content must remain inside `RNHostView` with nested scrolling enabled.
