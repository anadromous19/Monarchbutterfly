# Compilation & Execution Guide

This document provides technical details on how the Monarch Citizen Science app is compiled, run, and deployed across Web, Mobile (Expo Go), and Native Development Builds.

---

## Architecture Overview

The Monarch Citizen Science application is built using:
- **Expo SDK 57** (`react-native 0.86.3` / `react 19.2.3`).
- **Expo Router v57** for file-based navigation in `app/`.
- **`expo-sqlite`** for transactional on-device offline storage.
- **`react-native-fast-tflite`** for high-performance C++ TFLite inference.
- **`react-native-vision-camera`** for camera frame acquisition and photo capture.

---

## 1. Local Development Options

### Option A: Web Browser Preview (Fastest, No Device Needed)

```powershell
pnpm run web
```
* **How it works:** Metro uses [`metro.config.js`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/metro.config.js) to detect the `web` platform and alias native-only TurboModules (`react-native-fast-tflite` and `react-native-vision-camera`) to safe stub mocks (`src/ml/nativeMock.js`).
* **Best for:** Rapid UI layout design, navigation testing, state management, and settings verification.

---

### Option B: Expo Go Mobile Preview (Physical iOS or Android Device)

```powershell
npx expo start -c
```

#### Account Synchronization Rule
When your PC terminal is logged in to Expo (`npx expo login`), Expo attaches your user handle (e.g. `@negligee4524`) to the local development session.
* **Requirement:** You must log into the **same Expo account** inside the Expo Go app on your phone (open Expo Go -> **Profile** tab -> Log In).
* **If not logged in:** Expo Go will reject the connection with `"You must be logged in to open this project"`.
* **Anonymous Alternative:** Run `npx expo logout` on your PC if you wish to run without accounts.

---

### Option C: Cloud Development Build via EAS (Full Native Hardware)

Standard Expo Go does not contain compiled C++ binaries for third-party libraries like Fast TFLite. If you need live camera inference with the `.tflite` model on a physical phone:

1. Log into your free Expo account:
   ```powershell
   npx expo login
   ```
2. Build your custom development client:
   ```powershell
   # Android APK
   npx eas-cli build --profile development --platform android

   # iOS IPA
   npx eas-cli build --profile development --platform ios
   ```
3. Scan the QR code generated in terminal by EAS to install the app on your device.
4. Run `pnpm start` to connect your local dev server directly to your custom build.

---

## 2. Testing & Quality Verification

Run these commands prior to committing changes:

```powershell
# TypeScript Type Checking
pnpm typecheck

# Jest Unit & Integration Tests (SQLite, ML Preprocessing, Sync Worker)
pnpm test
```

---

## 3. Important Build & Config Files

* **[`app.config.ts`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/app.config.ts)**: Dynamic Expo configuration, native permissions (Camera, Location, Photo Library), and environment variables. Note: `projectId` is only injected when `EAS_PROJECT_ID` is set to avoid mandatory EAS cloud login prompts during local development.
* **[`metro.config.js`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/metro.config.js)**: Configures asset extensions (`.tflite`, `.wasm`) and platform-specific stubbing for web.
* **[`scripts/patch-codegen.js`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/scripts/patch-codegen.js)**: Automatically reconciles React Native 0.86 Flow type specs (`ReadonlyArray` / `Readonly`) with `@react-native/codegen`.
* **[`docs/deployment.md`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/docs/deployment.md)**: Full step-by-step instructions for deploying the AWS backend, serving the web bundle, and publishing production builds to app stores.
