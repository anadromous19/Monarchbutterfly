# Monarch Citizen Science Mobile App

A cross-platform mobile application and AWS serverless cloud backend for detecting and tracking Monarch butterflies (_Danaus plexippus_) in the wild.

Built with **React Native / Expo**, **Fast TFLite**, **SQLite**, and **AWS AppSync / DynamoDB / S3**.

---

## Key Features

- **On-Device ML Inference**: Ultra-fast on-device species classification powered by TensorFlow Lite (`assets/models/monarch_classifier_float16.tflite`) with input shape `(224, 224, 3)` RGB normalized to `[0.0, 1.0]`.
- **Offline-First Storage**: Local SQLite database with transactional migrations for observations, photographic evidence, and environmental snapshots.
- **Durable Sync Outbox**: Reliable cloud synchronization worker with leases, exponential backoff, jitter, and idempotency guarantees.
- **Field Confirmation & Demographics**: Citizen scientist verification workflow with granular privacy consent controls and JSON/CSV data export.
- **AWS Serverless Backend**: Cognito unauthenticated guest identities, AppSync GraphQL API, DynamoDB single-table design (`PK=OBS#<id>`, `SK=META`), private S3 evidence bucket, and historical weather enrichment proxy.

---

## Project Structure

```text
monarch/
├── app/                         # Expo Router screens and navigation
│   ├── _layout.tsx              # Root layout & sync worker initialization
│   ├── index.tsx                # Dashboard with statistics & quick actions
│   ├── capture.tsx              # Viewfinder & camera/photo picker
│   ├── review.tsx               # Species prediction, confidence gauge, verdict
│   ├── history.tsx              # Observation log with search and status filters
│   ├── details/[id].tsx         # Full observation detail, weather, delete
│   └── settings.tsx             # Consent preferences, demographics, data export
├── src/
│   ├── types/                   # Shared TypeScript domain interfaces
│   ├── ml/                      # TFLite loader, preprocessing, inference engine
│   ├── db/                      # SQLite migrations and repositories
│   ├── camera/                  # Camera permissions and photo processor
│   ├── location/                # Foreground location provider with accuracy checks
│   ├── weather/                 # Environmental weather snapshot resolver
│   ├── auth/                    # Cognito guest identity & SecureStore session
│   ├── api/                     # AppSync GraphQL client & direct S3 uploader
│   ├── sync/                    # Durable outbox sync engine & backoff
│   ├── privacy/                 # Consent manager & JSON/CSV data exporter
│   └── observations/            # Observation creation & lifecycle use cases
├── assets/
│   └── models/                  # Versioned .tflite model and metadata JSON
├── backend/
│   ├── infrastructure/          # AWS CDK stack & AppSync GraphQL schema
│   └── functions/               # Lambda resolvers for sync, presigned URLs, weather
├── scripts/
│   └── model/                   # H5 to TFLite conversion & parity validation
├── tests/                       # Jest unit & integration test suite
├── app.config.ts                # Expo configuration & native permissions
├── eas.json                     # EAS Cloud build profiles
└── package.json
```

---

---

## 📋 Prerequisites

Before starting, make sure you have the following installed on your computer:

1. **Node.js**: LTS version (v20.x or v22.x recommended). [Download Node.js](https://nodejs.org/)
2. **pnpm**: The package manager used by this project.
   - Install globally via npm:
     ```powershell
     npm install -g pnpm
     ```
   - _Windows Tip:_ If PowerShell blocks running scripts, run this in PowerShell:
     ```powershell
     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
     ```
3. **Expo Go app** on your physical phone (free on Apple App Store or Google Play Store).
4. **Git**: [Download Git](https://git-scm.com/)
5. **Python 3.9+** _(Optional)_: Only needed if you plan to convert or retrain machine learning models in `scripts/model/`.

---

## 🚀 Quick Start Guide (Step-by-Step)

### Step 1: Install Project Dependencies

Clone or open the repository, then run:

```powershell
pnpm install
```

> [!NOTE]
> `pnpm install` automatically runs our post-install compatibility script (`scripts/patch-codegen.js`) to ensure all native modules match the latest Expo SDK 57 runtime.

---

### Step 2: Run Automated Tests & Verify Code

Before running the mobile interface, you can verify that database migrations, sync workers, and ML preprocessing logic pass all checks:

```powershell
# 1. Check TypeScript types
pnpm typecheck

# 2. Run unit & integration test suites
pnpm test
```

All 5 test suites (14 tests) should pass with green checkmarks!

---

### Step 3: Run the App

You have **3 ways** to preview and interact with the application:

#### 🌐 Method A: Instant Web Preview (Recommended for Quick UI Testing)
If you want to view the screens, test navigation, and verify settings without needing a phone or emulator:

```powershell
pnpm run web
```
This automatically compiles and opens the app in your default web browser (`http://localhost:8081`). Native camera and TFLite modules are safely stubbed with mock fallbacks for web.

---

#### 📱 Method B: Run on a Physical Phone via Expo Go

1. **Synchronize Your Expo Account (Crucial)**:
   - If your computer terminal is logged into Expo (`npx expo login`), open the **Expo Go** app on your phone, go to the **Profile** tab, and log into the **exact same account**.
   - *Why?* When your computer is logged in, Expo secures the dev session with your account. Your phone's Expo Go must be logged in as the same user to access it.
   - *Alternative (Anonymous Mode):* If you prefer not to log in on your phone, run `npx expo logout` on your PC first, then start the server.

2. **Ensure Both Devices Are on the Same Wi-Fi**:
   - Your computer and your mobile phone must be connected to the same local Wi-Fi network.

3. **Start the Dev Server**:
   ```powershell
   npx expo start -c
   ```
   *(The `-c` flag ensures the bundler starts with a clean cache).*

4. **Open the App on Your Phone**:
   - **iPhone (iOS)**: Open your phone's built-in **Camera** app, point it at the QR code in your terminal, and tap the yellow **"Open in Expo Go"** banner.
   - **Android**: Open the **Expo Go** app, tap **"Scan QR code"**, and point your camera at the terminal.
   - _If logged in:_ The app will also appear automatically under the **"In Development"** section on your Expo Go home screen!

---

#### 🛠️ Method C: Native Development Build via EAS (For Full Camera & ML Testing)
Standard Expo Go contains only Expo's pre-compiled binaries and cannot execute third-party C++ native libraries like `react-native-fast-tflite`. If you need full on-device hardware-accelerated ML model inference on your iPhone or Android:

1. Create a free account at [expo.dev](https://expo.dev) if you haven't already.
2. Log in in your terminal:
   ```powershell
   npx expo login
   ```
3. Build a custom development client in the cloud:
   ```powershell
   # For Android (generates an APK to install on your phone)
   npx eas-cli build --profile development --platform android

   # For iOS (generates an ad-hoc build you can install on your iPhone)
   npx eas-cli build --profile development --platform ios
   ```
4. Install the build directly on your phone using the QR code provided by EAS Cloud.

---

## ❓ Frequently Asked Questions & Troubleshooting

### 1. "Project is incompatible with this version of Expo Go"
* **Cause**: Your phone's Expo Go app was updated from the App Store to a newer SDK than the project.
* **Fix**: This project is configured for **Expo SDK 57**. Always ensure your dependencies match by checking `pnpm dlx expo-doctor`.

### 2. "You must be logged in to open this project / Problem running requested project"
* **Cause**: Your computer is logged in to Expo CLI, but your phone's Expo Go is logged out or using a different account.
* **Fix**: Sign in to the **same account** on your phone (Profile tab in Expo Go), or log out on your computer using `npx expo logout`.

### 3. "Why is there no `i` option in Expo CLI to launch the iOS simulator?"
* **Explanation**: iOS simulators require Apple's **Xcode and macOS**. If you are developing on **Windows**, Apple does not support local iOS simulation. Use **Web Preview (`w`)**, an **Android emulator (`a`)**, or test on a **physical iPhone** by scanning the terminal QR code.

### 4. "Bundler fails or gets stuck on cached files"
* **Fix**: Clear the Metro bundler cache by starting with the `-c` flag:
  ```powershell
  npx expo start -c
  ```

### 5. "PowerShell says running scripts is disabled on this system"
* **Fix**: Run PowerShell as Administrator (or in your current session) and allow local scripts:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

---

## ☁️ Deployment & Publishing Guide

For complete, beginner-friendly instructions on:
- **Deploying the AWS cloud backend** (Cognito Identity Pool, DynamoDB table, S3 evidence bucket, AppSync GraphQL API via 1-click CloudFormation).
- **Serving the static web app** (via S3/CloudFront or Vercel/Netlify).
- **Publishing to app stores** (Android Google Play `.aab` and iOS Apple App Store `.ipa` via EAS Cloud).
- **Managing AWS Free Tier costs and teardown**.

👉 **Check out the full [Deployment & Publishing Guide](docs/deployment.md)**.

---

Have fun exploring and identifying Monarch butterflies! 🦋

