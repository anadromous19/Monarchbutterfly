# Complete Deployment & Publishing Guide

This guide provides step-by-step, beginner-friendly instructions for deploying the **AWS cloud backend**, serving the **web application**, and publishing the **iOS and Android apps** to public app stores.

---

## 🏗️ Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                    │
│   (Web Browser / Expo Go / iOS App / Android App)           │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    1. Authenticate (Guest Identity)          │ 3. Direct Photo Upload
                ▼                             ▼
   ┌──────────────────────────┐    ┌──────────────────────────┐
   │  Amazon Cognito Pool     │    │    Private S3 Bucket     │
   │  (Unauthenticated guest) │    │  (Photos & evidence)     │
   └────────────┬─────────────┘    └──────────────────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │  AWS AppSync (GraphQL)   │
   │  (Sync & queries)        │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │   Amazon DynamoDB        │
   │ (Single-table metadata)  │
   └──────────────────────────┘
```

---

## Part 1: Deploying the AWS Cloud Backend

The cloud backend provisions:
- **Cognito Identity Pool**: Provides temporary guest credentials so citizen scientists can use the app immediately without requiring passwords or sign-ups.
- **Amazon DynamoDB**: Scalable single-table storage for observations, sync timestamps, and verification statuses.
- **Amazon S3**: Private, encrypted bucket with CORS enabled for uploading butterfly evidence photos via presigned URLs.
- **AWS AppSync**: Managed GraphQL API connecting the mobile client to DynamoDB.

---

### Step 1: Install and Configure the AWS CLI

1. Install the [AWS Command Line Interface (CLI)](https://aws.amazon.com/cli/).
2. Create or log into your [AWS Account](https://aws.amazon.com/).
3. In your AWS Console, navigate to **IAM** -> **Users** -> create an access key for your admin user.
4. In your computer terminal, configure the AWS CLI:
   ```powershell
   aws configure
   ```
   * **AWS Access Key ID**: Paste your access key.
   * **AWS Secret Access Key**: Paste your secret key.
   * **Default region name**: `us-east-1` (or your preferred region, e.g. `us-west-2`).
   * **Default output format**: `json`

---

### Step 2: Generate the CloudFormation Template

We have created an automated script that compiles the infrastructure definition in `backend/infrastructure/cdk-stack.ts` into a clean AWS CloudFormation template:

```powershell
pnpm run backend:template
```

This generates `backend/infrastructure/template.json`.

---

### Step 3: Deploy the Stack to AWS

You can deploy using either the **Terminal (CLI)** or the **AWS Web Console**.

#### Method A: Terminal (Fastest)

Run the following command in PowerShell / Command Prompt:

```powershell
aws cloudformation deploy `
  --template-file backend/infrastructure/template.json `
  --stack-name monarch-backend-dev `
  --capabilities CAPABILITY_NAMED_IAM
```

*AWS CloudFormation will create all resources automatically. This typically takes 2–3 minutes.*

#### Method B: AWS Management Console (No Command Line Needed)

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the search bar at the top, type **CloudFormation** and open it.
3. Click **Create stack** -> **With new resources (standard)**.
4. Choose **Upload a template file**, click **Choose file**, and select:
   `backend/infrastructure/template.json` from your project folder.
5. Click **Next**.
6. Set **Stack name**: `monarch-backend-dev`.
7. Click **Next**, keep defaults on the options screen, and click **Next**.
8. At the bottom of the review page, check the box:
   > ☑️ *"I acknowledge that AWS CloudFormation might create IAM resources with custom names."*
9. Click **Submit**.

---

### Step 4: Connect the Mobile App to Your New Backend

Once the CloudFormation stack reaches status `CREATE_COMPLETE`:

1. View the stack outputs in your terminal:
   ```powershell
   aws cloudformation describe-stacks `
     --stack-name monarch-backend-dev `
     --query "Stacks[0].Outputs"
   ```
   *(Or in the AWS Console, click on your stack `monarch-backend-dev` and click the **Outputs** tab).*

2. You will see 4 output values:
   * `Region`
   * `AppSyncUrl`
   * `IdentityPoolId`
   * `S3EvidenceBucket`

3. Copy the file `.env.example` to `.env` in the root of your project:
   ```powershell
   copy .env.example .env
   ```

4. Open `.env` and paste your actual output values:
   ```env
   EXPO_PUBLIC_AWS_REGION=us-east-1
   EXPO_PUBLIC_APPSYNC_URL=https://xxxxxxxxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql
   EXPO_PUBLIC_IDENTITY_POOL_ID=us-east-1:00000000-0000-0000-0000-000000000000
   EXPO_PUBLIC_S3_EVIDENCE_BUCKET=monarch-evidence-123456789012-dev
   ```

5. Restart your local server so Expo picks up the new `.env` variables:
   ```powershell
   npx expo start -c
   ```

Your mobile app is now fully connected to your live AWS cloud backend! Observations and photos will now synchronize automatically to DynamoDB and S3.

---

## Part 2: Serving and Deploying the Web App

The Monarch Citizen Science app can be compiled into a high-performance static web application.

### Step 1: Export the Web Bundle

Run:
```powershell
pnpm run build:web
```

This generates optimized static HTML, JavaScript, and CSS files in the `dist/` directory.

---

### Step 2: Choose a Web Hosting Provider

#### Option A: Free Hosting on Vercel or Netlify (Easiest for Beginners)

* **Vercel**:
  1. Install Vercel CLI: `npm install -g vercel`.
  2. Deploy from the project root: `vercel --prod dist`.
* **Netlify**:
  1. Install Netlify CLI: `npm install -g netlify-cli`.
  2. Deploy: `netlify deploy --prod --dir=dist`.

#### Option B: Host on AWS S3 & CloudFront (All-in-One AWS Stack)

If you want to keep your entire web hosting inside your AWS account:

1. Create a public S3 bucket for the website:
   ```powershell
   aws s3 mb s3://my-monarch-web-app-bucket --region us-east-1
   ```
2. Upload the `dist/` files:
   ```powershell
   aws s3 sync dist/ s3://my-monarch-web-app-bucket/ --delete
   ```
3. Enable S3 Static Website Hosting:
   ```powershell
   aws s3 website s3://my-monarch-web-app-bucket/ --index-document index.html --error-document index.html
   ```

---

## Part 3: Publishing to iOS (Apple App Store) and Android (Google Play)

To publish standalone native binaries to the official App Stores, we use **Expo Application Services (EAS)**, which compiles the native C++ Fast TFLite and camera code in the cloud without requiring a Mac or local native build tools.

---

### Step 1: Install EAS CLI & Log In

1. Install the EAS command-line tool globally:
   ```powershell
   npm install -g eas-cli
   ```
2. Log into your Expo account:
   ```powershell
   eas login
   ```
3. Link your local project to your EAS account:
   ```powershell
   eas project:init
   ```

---

### Step 2: Build Production Binaries

Our [`eas.json`](file:///c:/Users/micro.VADER/Documents/Projects/Inspirit/Ajay/monarch/eas.json) file already contains pre-configured build profiles for development, preview, and production.

#### 🤖 For Android (Google Play Store)

```powershell
eas build --platform android --profile production
```
* **Output**: A signed Android App Bundle (`.aab`) ready to be uploaded to the Google Play Console.

#### 🍏 For iOS (Apple App Store / TestFlight)

```powershell
eas build --platform ios --profile production
```
* **Output**: A signed iOS App Store Package (`.ipa`) ready for TestFlight and Apple App Store submission.
* *Note:* You will need an active [Apple Developer Account](https://developer.apple.com/) ($99/year). EAS will automatically generate your provisioning profiles and distribution certificates.

---

### Step 3: Submitting to App Stores

Once your production builds finish in EAS Cloud:

#### Submit to Google Play:
```powershell
eas submit --platform android
```

#### Submit to Apple App Store / TestFlight:
```powershell
eas submit --platform ios
```

---

### Step 4: Over-The-Air (OTA) Updates

If you make bug fixes or UI updates to JavaScript/TypeScript code, you do **not** need to re-submit your app through Apple or Google review. You can publish an instant over-the-air update:

```powershell
eas update --branch production --message "Fixed observation detail formatting"
```

All users will automatically download the update the next time they open the app!

---

## Part 4: Costs, Security & Teardown

### AWS Free Tier Safety
The resources created by this project are designed to stay within AWS Free Tier limits:
- **DynamoDB**: 25 GB storage and 200 million requests/month free forever.
- **Cognito**: 50,000 monthly active guest users free forever.
- **S3**: 5 GB standard storage free for the first 12 months.
- **AppSync**: 4 million GraphQL operations/month free for the first 12 months.

> [!TIP]
> **Set a Billing Alarm:** In the AWS Console, search for **Billing and Cost Management** -> **Budgets** -> create a simple $5 monthly budget alert so AWS emails you if any unexpected usage occurs.

### How to Clean Up (Delete AWS Resources)

If you ever wish to completely dismantle the backend stack to avoid any future charges:

1. Empty the S3 Evidence Bucket in the AWS S3 Console (CloudFormation will not delete a bucket with files in it).
2. Delete the CloudFormation stack:
   ```powershell
   aws cloudformation delete-stack --stack-name monarch-backend-dev
   ```
