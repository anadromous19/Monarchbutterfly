# Monarch Citizen Science Mobile App

A cross-platform mobile application and AWS serverless cloud backend for detecting and tracking Monarch butterflies (*Danaus plexippus*) in the wild.

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

## Getting Started

### 1. Model Conversion & Validation
```powershell
# Convert legacy Keras H5 model to TFLite Float16
python scripts/model/convert_h5_to_tflite.py --input model/monarch_classifier.h5 --output assets/models/monarch_classifier_float16.tflite --quantization float16

# Validate numeric parity with Keras baseline
python scripts/model/validate_parity.py
```

### 2. Running Automated Tests
```powershell
npm test
```

### 3. Running Mobile App Locally
```powershell
npm start
# Press 'w' for web preview, 'a' for Android, or 'i' for iOS simulator
```

### 4. Building with EAS
```powershell
npx eas-cli build --profile development --platform android
npx eas-cli build --profile development --platform ios
```
