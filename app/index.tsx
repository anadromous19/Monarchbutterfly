import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getDatabase,
  ObservationRepository,
  EvidenceRepository,
  WeatherRepository,
  SyncJobRepository,
} from '../src/db';
import { Observation } from '../src/types';
import { SyncEngine } from '../src/sync';
import { AppSyncClient, S3Uploader } from '../src/api';
import { authService } from '../src/auth';
import { CURRENT_MODEL_METADATA } from '../src/ml';

function getDotStyle(color: string): ViewStyle {
  return {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color,
    marginRight: 6,
  };
}

function getSyncStatusTextStyle(status: string): TextStyle {
  return {
    fontSize: 11,
    fontWeight: '600',
    color: status === 'synced' ? '#34D399' : status === 'syncing' ? '#60A5FA' : '#FBBF24',
  };
}

export default function DashboardScreen() {
  const router = useRouter();

  const [observations, setObservations] = useState<Observation[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const obsRepo = new ObservationRepository(db);
      const syncRepo = new SyncJobRepository(db);

      const allObs = await obsRepo.listAll();
      const recentObs = allObs.slice(0, 5);
      const pendingCount = await syncRepo.getPendingCount();

      setObservations(recentObs);
      setPendingSyncCount(pendingCount);
    } catch (err) {
      console.warn('Dashboard data load error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const db = await getDatabase();
      const obsRepo = new ObservationRepository(db);
      const evidenceRepo = new EvidenceRepository(db);
      const weatherRepo = new WeatherRepository(db);
      const syncRepo = new SyncJobRepository(db);

      const appSyncClient = new AppSyncClient(
        { endpoint: 'https://mock.api/graphql', region: 'us-east-1' },
        authService
      );
      const s3Uploader = new S3Uploader();

      const engine = new SyncEngine(
        db,
        obsRepo,
        evidenceRepo,
        weatherRepo,
        syncRepo,
        appSyncClient,
        s3Uploader
      );

      await engine.processOutbox();
      await loadDashboardData();
    } catch (err) {
      console.warn('Manual sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalSightings = observations.length;
  const monarchSightings = observations.filter((o) => o.speciesPrediction === 'monarch').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            loadDashboardData();
          }}
          tintColor="#F97316"
        />
      }
    >
      <StatusBar barStyle="light-content" />

      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Monarch Tracker</Text>
          <Text style={styles.appSubtitle}>Citizen Science Observation Portal</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Outbox Sync Status Banner */}
      {pendingSyncCount > 0 && (
        <View style={styles.syncBanner}>
          <View style={styles.syncBannerContent}>
            <View style={getDotStyle('#F59E0B')} />
            <Text style={styles.syncBannerText}>
              {pendingSyncCount} offline {pendingSyncCount === 1 ? 'observation' : 'observations'} queued for sync
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncNowButton}
            onPress={handleManualSync}
            disabled={isSyncing}
          >
            <Text style={styles.syncNowText}>{isSyncing ? 'Syncing...' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hero Metric Cards */}
      <View style={styles.metricGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{totalSightings}</Text>
          <Text style={styles.metricLabel}>Total Sightings</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricNumber, { color: '#F97316' }]}>{monarchSightings}</Text>
          <Text style={styles.metricLabel}>Monarchs Logged</Text>
        </View>
      </View>

      {/* Primary Action Button: Open Camera Viewfinder */}
      <TouchableOpacity
        style={styles.captureButton}
        onPress={() => router.push('/capture')}
        activeOpacity={0.85}
      >
        <View style={styles.captureIconCircle}>
          <Text style={styles.captureIconText}>📷</Text>
        </View>
        <View style={styles.captureTextGroup}>
          <Text style={styles.captureTitle}>Record New Observation</Text>
          <Text style={styles.captureDesc}>Capture photo for on-device ML classification</Text>
        </View>
      </TouchableOpacity>

      {/* Model Provenance Card */}
      <View style={styles.provenanceCard}>
        <View style={styles.provenanceHeader}>
          <Text style={styles.provenanceTitle}>On-Device ML Classifier</Text>
          <View style={styles.provenanceBadge}>
            <Text style={styles.provenanceBadgeText}>v{CURRENT_MODEL_METADATA.modelVersion}</Text>
          </View>
        </View>
        <Text style={styles.provenanceDetail}>
          Format: {CURRENT_MODEL_METADATA.quantization.toUpperCase()} TFLite • Input: 224x224 RGB
        </Text>
        <Text style={styles.provenanceDetail}>
          Threshold: {(CURRENT_MODEL_METADATA.defaultConfidenceThreshold * 100).toFixed(0)}% confidence gate
        </Text>
      </View>

      {/* Recent Observations List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Observations</Text>
        <TouchableOpacity onPress={() => router.push('/history')}>
          <Text style={styles.viewAllText}>View All ({totalSightings})</Text>
        </TouchableOpacity>
      </View>

      {observations.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateEmoji}>🦋</Text>
          <Text style={styles.emptyStateTitle}>No Observations Yet</Text>
          <Text style={styles.emptyStateDesc}>
            Tap "Record New Observation" above to capture and classify your first butterfly sighting.
          </Text>
        </View>
      ) : (
        observations.map((obs) => (
          <TouchableOpacity
            key={obs.id}
            style={styles.obsItemCard}
            onPress={() => router.push(`/details/${obs.id}`)}
            activeOpacity={0.75}
          >
            <View style={styles.obsItemHeader}>
              <Text style={styles.obsSpecies}>
                {obs.speciesPrediction === 'monarch' ? 'Monarch Butterfly' : 'Other Species'}
              </Text>
              <Text style={styles.obsProbability}>
                {(obs.monarchProbability * 100).toFixed(1)}%
              </Text>
            </View>

            <Text style={styles.obsTimestamp}>
              {new Date(obs.capturedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>

            <View style={styles.obsFooter}>
              <View style={styles.verdictChip}>
                <Text style={styles.verdictChipText}>
                  {obs.userVerdict ? obs.userVerdict.toUpperCase() : 'PENDING'}
                </Text>
              </View>
              <Text style={getSyncStatusTextStyle(obs.syncStatus)}>
                {obs.syncStatus === 'synced'
                  ? '✓ Synced'
                  : obs.syncStatus === 'syncing'
                  ? '⟳ Syncing'
                  : '⏳ Queued'}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsIcon: {
    fontSize: 20,
  },
  syncBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  syncBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncBannerText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '600',
  },
  syncNowButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncNowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  captureButton: {
    backgroundColor: '#EA580C',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  captureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  captureIconText: {
    fontSize: 24,
  },
  captureTextGroup: {
    flex: 1,
  },
  captureTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  captureDesc: {
    color: '#FED7AA',
    fontSize: 12,
    marginTop: 2,
  },
  provenanceCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  provenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  provenanceTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  provenanceBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  provenanceBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  provenanceDetail: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  viewAllText: {
    fontSize: 13,
    color: '#F97316',
    fontWeight: '600',
  },
  emptyStateCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  emptyStateEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyStateTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyStateDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  obsItemCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  obsItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  obsSpecies: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  obsProbability: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  obsTimestamp: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  obsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  verdictChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verdictChipText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
