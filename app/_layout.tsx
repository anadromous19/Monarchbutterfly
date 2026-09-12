import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { getDatabase } from '../src/db';
import { mlService } from '../src/ml';
import { authService } from '../src/auth';
import { SyncEngine } from '../src/sync';
import {
  ObservationRepository,
  EvidenceRepository,
  WeatherRepository,
  SyncJobRepository,
} from '../src/db';
import { AppSyncClient, S3Uploader } from '../src/api';

export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      try {
        // 1. Initialize SQLite Database & Migrations
        const db = await getDatabase();

        // 2. Warm ML Inference Engine
        await mlService.loadModel();

        // 3. Initialize Auth Session
        await authService.getSession();

        // 4. Start Background Sync Worker Daemon
        const obsRepo = new ObservationRepository(db);
        const evidenceRepo = new EvidenceRepository(db);
        const weatherRepo = new WeatherRepository(db);
        const syncJobRepo = new SyncJobRepository(db);
        const appSyncClient = new AppSyncClient(
          { endpoint: 'https://api.monarchtracker.org/graphql', region: 'us-east-1' },
          authService
        );
        const s3Uploader = new S3Uploader();

        const syncEngine = new SyncEngine(
          db,
          obsRepo,
          evidenceRepo,
          weatherRepo,
          syncJobRepo,
          appSyncClient,
          s3Uploader
        );
        syncEngine.start(30000); // 30s background cycle
      } catch (err) {
        console.error('App initialization error:', err);
      } finally {
        setIsReady(true);
      }
    }

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Initializing Monarch Tracker...</Text>
      </View>
    );
  }

  const renderBackButton = () => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.backButton}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <Text style={styles.backButtonIcon}>‹</Text>
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0F172A',
          },
          headerTintColor: '#F8FAFC',
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: '#090D16',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Monarch Tracker',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="capture"
          options={{
            title: 'Capture Butterfly',
            headerLeft: renderBackButton,
          }}
        />
        <Stack.Screen
          name="review"
          options={{
            title: 'Observation Review',
            headerLeft: renderBackButton,
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            title: 'Observation Log',
            headerLeft: renderBackButton,
          }}
        />
        <Stack.Screen
          name="details/[id]"
          options={{
            title: 'Observation Details',
            headerLeft: renderBackButton,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings & Privacy',
            headerLeft: renderBackButton,
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginLeft: -4,
  },
  backButtonIcon: {
    color: '#F97316',
    fontSize: 32,
    lineHeight: 32,
    fontWeight: '300',
    marginRight: 2,
    marginTop: -2,
  },
  backButtonText: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '600',
  },
});
