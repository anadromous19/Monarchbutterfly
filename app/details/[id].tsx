import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getDatabase,
  ObservationRepository,
  EvidenceRepository,
  WeatherRepository,
  SyncJobRepository,
} from '../../src/db';
import { Observation, Evidence, WeatherSnapshot } from '../../src/types';
import { ObservationUseCase } from '../../src/observations';
import { weatherService } from '../../src/weather';

function getSyncBadgeStyle(status: string): ViewStyle {
  return {
    backgroundColor: status === 'synced' ? '#064E3B' : status === 'syncing' ? '#1E3A8A' : '#78350F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  };
}

export default function ObservationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [observation, setObservation] = useState<Observation | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadObservationDetails() {
      if (!id) return;
      try {
        const db = await getDatabase();
        const obsRepo = new ObservationRepository(db);
        const evidenceRepo = new EvidenceRepository(db);
        const weatherRepo = new WeatherRepository(db);

        const obs = await obsRepo.getById(id);
        if (obs) {
          setObservation(obs);
          const evidence = await evidenceRepo.getByObservationId(obs.id);
          setEvidenceList(evidence);
          const w = await weatherRepo.getByObservationId(obs.id);
          setWeather(w);
        }
      } catch (err) {
        console.warn('Error loading observation details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadObservationDetails();
  }, [id]);

  const handleDelete = () => {
    if (!observation) return;
    Alert.alert(
      'Delete Observation',
      'This will mark the observation as deleted and sync the tombstone deletion to the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const obsRepo = new ObservationRepository(db);
              const evidenceRepo = new EvidenceRepository(db);
              const weatherRepo = new WeatherRepository(db);
              const syncJobRepo = new SyncJobRepository(db);

              const useCase = new ObservationUseCase(
                db,
                obsRepo,
                evidenceRepo,
                weatherRepo,
                syncJobRepo,
                weatherService
              );

              await useCase.deleteObservation(observation.id);
              router.replace('/history');
            } catch (err) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!observation) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Observation not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Header Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroSpecies}>
            {observation.speciesPrediction === 'monarch' ? 'Monarch Butterfly' : 'Other Species'}
          </Text>
          <View style={getSyncBadgeStyle(observation.syncStatus)}>
            <Text style={styles.syncBadgeText}>
              {observation.syncStatus === 'synced'
                ? '✓ Cloud Synced'
                : observation.syncStatus === 'syncing'
                ? '⟳ Syncing'
                : '⏳ Offline Outbox'}
            </Text>
          </View>
        </View>

        <Text style={styles.scientificName}>Danaus plexippus</Text>
        <Text style={styles.capturedAtText}>
          Captured on {new Date(observation.capturedAt).toLocaleString()}
        </Text>

        {/* Confidence Gauge */}
        <View style={styles.probRow}>
          <Text style={styles.probLabel}>On-Device ML Confidence:</Text>
          <Text style={styles.probValue}>
            {(observation.monarchProbability * 100).toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Field Verdict Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Citizen Scientist Verdict</Text>
        <View style={styles.verdictDisplay}>
          <Text style={styles.verdictValue}>
            {observation.userVerdict
              ? observation.userVerdict.toUpperCase()
              : 'PENDING FIELD CONFIRMATION'}
          </Text>
        </View>
      </View>

      {/* Environmental & Weather Snapshot */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Environmental Weather Snapshot</Text>
        {weather ? (
          <View style={styles.weatherGrid}>
            <View style={styles.weatherItem}>
              <Text style={styles.weatherVal}>{weather.temperatureC ?? '--'} °C</Text>
              <Text style={styles.weatherLabel}>Temperature</Text>
            </View>
            <View style={styles.weatherItem}>
              <Text style={styles.weatherVal}>{weather.humidityPercent ?? '--'}%</Text>
              <Text style={styles.weatherLabel}>Humidity</Text>
            </View>
            <View style={styles.weatherItem}>
              <Text style={styles.weatherVal}>{weather.windSpeedMps ?? '--'} m/s</Text>
              <Text style={styles.weatherLabel}>Wind Speed</Text>
            </View>
            <View style={styles.weatherItem}>
              <Text style={styles.weatherVal}>{weather.pressureHpa ?? '--'} hPa</Text>
              <Text style={styles.weatherLabel}>Pressure</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.weatherPendingText}>
            {observation.locationConsent
              ? 'Weather enrichment scheduled upon cloud synchronization.'
              : 'Weather unavailable (location permission was not granted).'}
          </Text>
        )}
      </View>

      {/* GPS Location Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Geographic Coordinates</Text>
        {observation.latitude && observation.longitude ? (
          <View>
            <Text style={styles.coordText}>
              Latitude: {observation.latitude.toFixed(5)}° N
            </Text>
            <Text style={styles.coordText}>
              Longitude: {observation.longitude.toFixed(5)}° W
            </Text>
            <Text style={styles.accuracyText}>
              Horizontal Accuracy: ±{observation.horizontalAccuracyM?.toFixed(1) || '10'} meters
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocationText}>No coordinates attached to this sighting.</Text>
        )}
      </View>

      {/* Photographic Evidence Metadata */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evidence & Provenance</Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaKey}>Model Version: </Text>
          {observation.modelVersion}
        </Text>
        <Text style={styles.metaLine}>
          <Text style={styles.metaKey}>Preprocessing: </Text>
          {observation.preprocessingVersion}
        </Text>
        <Text style={styles.metaLine} numberOfLines={1}>
          <Text style={styles.metaKey}>Model SHA-256: </Text>
          {observation.modelSha256.substring(0, 24)}...
        </Text>
        {evidenceList.map((e) => (
          <Text key={e.id} style={styles.metaLine} numberOfLines={1}>
            <Text style={styles.metaKey}>Photo SHA-256: </Text>
            {e.sha256.substring(0, 24)}... ({Math.round(e.byteSize / 1024)} KB)
          </Text>
        ))}
      </View>

      {/* Delete Action */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
        <Text style={styles.deleteButtonText}>Delete Observation</Text>
      </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSpecies: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  syncBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scientificName: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: 2,
  },
  capturedAtText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  probRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
  },
  probLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  probValue: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  verdictDisplay: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  verdictValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  weatherItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  weatherVal: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '700',
  },
  weatherLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  weatherPendingText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  coordText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  accuracyText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  noLocationText: {
    color: '#64748B',
    fontSize: 13,
  },
  metaLine: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 6,
  },
  metaKey: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#7F1D1D',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  deleteButtonText: {
    color: '#FEE2E2',
    fontSize: 14,
    fontWeight: '700',
  },
});
