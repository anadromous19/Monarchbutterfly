import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Monarch Tracker',
  slug: 'monarch-citizen-science',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'monarchapp',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'org.inspirit.monarchtracker',
    infoPlist: {
      NSCameraUsageDescription: 'Monarch Tracker requires camera access to photograph and identify butterflies in real-time.',
      NSLocationWhenInUseUsageDescription: 'Monarch Tracker uses your foreground location to associate environmental and migration coordinates with confirmed sightings.',
      NSPhotoLibraryUsageDescription: 'Monarch Tracker allows selecting butterfly photos from your library for on-device analysis.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F172A',
    },
    package: 'org.inspirit.monarchtracker',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ],
  },
  plugins: [
    'expo-router',
    'expo-asset',
    'expo-font',
    'expo-sqlite',
    [
      'expo-camera',
      {
        cameraPermission: 'Monarch Tracker requires camera access to photograph and identify butterflies.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Monarch Tracker allows selecting butterfly photos from your library.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Monarch Tracker requires location access to record butterfly observation points.',
      },
    ],
    [
      'expo-secure-store',
      {
        faceIDPermission: 'Allow Monarch Tracker to securely authenticate your session.',
      },
    ],
  ],
  extra: {
    ...(process.env.EAS_PROJECT_ID
      ? {
          eas: {
            projectId: process.env.EAS_PROJECT_ID,
          },
        }
      : {}),
    awsRegion: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    appSyncUrl: process.env.EXPO_PUBLIC_APPSYNC_URL || 'https://api.monarchtracker.org/graphql',
    identityPoolId: process.env.EXPO_PUBLIC_IDENTITY_POOL_ID || 'us-east-1:00000000-0000-0000-0000-000000000000',
    s3EvidenceBucket: process.env.EXPO_PUBLIC_S3_EVIDENCE_BUCKET || 'monarch-evidence-private',
    modelVersion: '1.0.0',
    confidenceThreshold: 0.90,
  },
});
