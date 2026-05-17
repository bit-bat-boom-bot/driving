# Drift Runner

A top-down endless drift driver for mobile. Tap and drag your thumb left/right to steer — the car is always accelerating. Collect bolts to upgrade, hunt rare ingredients to unlock Easter-egg cars.

Built with HTML5 Canvas + TypeScript, packaged for Android via Capacitor, monetized with AdMob.

## Run on the web (dev)

```bash
npm install
npm run dev
```

Open the URL Vite prints. Works with mouse drag, touch, or arrow keys.

## Build the Android APK

You need the Android SDK and Java 17+ installed locally. Then:

```bash
npm run android:build       # builds web + syncs + assembleDebug
# APK lands at android/app/build/outputs/apk/debug/app-debug.apk
```

To open the project in Android Studio:

```bash
npm run cap:open
```

## Before publishing

1. **AdMob:** the project ships with Google's official test ad units (safe to use during development; they always fill). Before publishing:
   - Create an AdMob app at https://apps.admob.com/
   - Replace the `APPLICATION_ID` meta-data in `android/app/src/main/AndroidManifest.xml`
   - Replace the unit IDs in `src/ads/admob.ts`
2. **App icon:** replace the default Capacitor icons under `android/app/src/main/res/mipmap-*`.
3. **Signing:** generate a keystore and configure `android/app/build.gradle` for release signing.
4. **Bundle:** use `./gradlew bundleRelease` (AAB) for Play Store upload.

## Architecture

- `src/game/` — physics, world, render, input
- `src/ui/` — HUD, game over, upgrades, garage screens (drawn on canvas)
- `src/data/` — upgrade tree, Easter-egg unlock definitions
- `src/ads/` — AdMob wrapper (web no-op, native via `@capacitor-community/admob`)
- `src/store/` — save/load persistence
- `android/` — Capacitor-generated native shell
