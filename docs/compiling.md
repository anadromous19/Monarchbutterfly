Viewed app.config.ts:1-79
Created app.config.ts
Ran command: `npx.cmd expo config`
Used tool: manage_task
Used tool: manage_task

The EAS login prompt appeared for two reasons:

---

### 1. Placeholder EAS Project ID (Now Fixed)

[`app.config.ts`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/app.config.ts) previously had a placeholder `extra.eas.projectId: 'monarch-citizen-science-local'`. Whenever Expo CLI sees a `projectId`, it attempts to authenticate with `expo.dev` to verify the cloud project credentials.

> **Fix Applied**: Updated [`app.config.ts`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/app.config.ts) so `projectId` is only injected when the environment variable `EAS_PROJECT_ID` is set. You will no longer be asked to log in to EAS for local development.

---

### 2. Native Modules vs. Standard "Expo Go" on iOS

The Monarch Tracker app relies on two custom native libraries:

- **`react-native-fast-tflite`**: High-performance C++ TFLite runtime for on-device inference.
- **`react-native-vision-camera`**: Native camera frame acquisition and photo capture.

The pre-compiled **Expo Go** client from the Apple App Store contains only Expo's built-in modules and **cannot** run third-party native C++/Objective-C modules like Fast TFLite.

---

### How to Run the App

#### Option A: Web Browser Preview (No Native Builds Required)

To inspect the UI, navigation flows, and test databases directly in your browser:

```powershell
npm run web
```

#### Option B: Cloud Development Build via EAS (Install on physical iPhone without Mac)

If you want to test on a physical iPhone with real camera and TFLite acceleration:

1. Create a free account at [expo.dev](https://expo.dev) (if you don't have one).
2. Log in in your terminal:
   ```powershell
   npx expo login
   ```
3. Run the cloud build command:
   ```powershell
   npx eas-cli build --profile development --platform ios
   ```
   _EAS will compile the native iOS binary with Fast TFLite & VisionCamera and provide a QR code to install directly on your device._

#### Option C: Android Build (APK)

```powershell
npx eas-cli build --profile development --platform android
```

The Expo configuration has reloaded cleanly without EAS cloud bindings.

If you restart the dev server with `npm start`, you can test the UI on web or prepare native builds without EAS login prompts. Let me know if you have any other questions!

Ran command: `npm start`
Viewed README.md:54-85
