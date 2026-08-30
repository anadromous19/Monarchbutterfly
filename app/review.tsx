import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDatabase, ObservationRepository, EvidenceRepository, WeatherRepository, SyncJobRepository } from '../src/db';
import { ObservationUseCase } from '../src/observations';
import { weatherService } from '../src/weather';
import { UserVerdict } from '../src/types';

function getVerdictBadgeStyle(isPositive: boolean): ViewStyle {
  return {
    backgroundColor: isPositive ? '#064E3B' : '#7F1D1D',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  };
}

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    uri: string;
    sha256: string;
    byteSize: string;
    width: string;
    height: string;
    probability: string;
    isMonarch: string;
    threshold: string;
    latitude: string;
    longitude: string;
    accuracy: string;
    altitude: string;
    locationConsent: string;
  }>();

  const [isSaving, setIsSaving] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState<UserVerdict | null>(null);

  const probability = parseFloat(params.probability || '0');
  const isMonarch = params.isMonarch === 'true';
  const threshold = parseFloat(params.threshold || '0.90');
  const locationConsent = params.locationConsent === 'true';

  useEffect(() => {
    // Default initial user suggestion
    if (selectedVerdict === null) {
      setSelectedVerdict(isMonarch ? 'confirmed' : 'rejected');
    }
  }, [isMonarch, selectedVerdict]);

  const handleSaveObservation = async () => {
    if (!params.uri || !params.sha256) {
      Alert.alert('Error', 'Missing required photo evidence.');
      return;
    }

    setIsSaving(true);
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

      const result = await useCase.createObservation({
        speciesPrediction: isMonarch ? 'monarch' : 'non_monarch',
        monarchProbability: probability,
        confidenceThreshold: threshold,
        userVerdict: selectedVerdict || (isMonarch ? 'confirmed' : 'unsure'),
        locationConsent,
        latitude: params.latitude ? parseFloat(params.latitude) : undefined,
        longitude: params.longitude ? parseFloat(params.longitude) : undefined,
        horizontalAccuracyM: params.accuracy ? parseFloat(params.accuracy) : undefined,
        altitudeM: params.altitude ? parseFloat(params.altitude) : undefined,
        photoUri: params.uri,
        photoSha256: params.sha256,
        photoByteSize: parseInt(params.byteSize || '0', 10),
        photoWidth: parseInt(params.width || '224', 10),
        photoHeight: parseInt(params.height || '224', 10),
      });

      Alert.alert(
        'Observation Saved',
        'Your butterfly observation has been logged to your offline store and queued for cloud sync.',
        [
          {
            text: 'View Log',
            onPress: () => router.replace(`/details/${result.observation.id}`),
          },
          {
            text: 'Home',
            onPress: () => router.replace('/'),
            style: 'cancel',
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error Saving Observation', (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Photo Preview */}
      <View style={styles.previewContainer}>
        <Image source={{ uri: params.uri }} style={styles.previewImage} resizeMode="cover" />
      </View>

      {/* Model Verdict Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>ML Classification Result</Text>
          <View style={getVerdictBadgeStyle(isMonarch)}>
            <Text style={styles.verdictBadgeText}>
              {isMonarch ? 'MONARCH DETECTED' : 'NOT MONARCH'}
            </Text>
          </View>
        </View>

        {/* Probability Meter */}
        <View style={styles.meterContainer}>
          <View style={styles.meterHeader}>
            <Text style={styles.meterLabel}>Confidence Probability:</Text>
            <Text style={[styles.meterValue, { color: isMonarch ? '#10B981' : '#F59E0B' }]}>
              {(probability * 100).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${Math.min(100, probability * 100)}%`,
                  backgroundColor: isMonarch ? '#10B981' : '#F59E0B',
                },
              ]}
            />
          </View>
          <Text style={styles.thresholdNotice}>
            Classification threshold: {(threshold * 100).toFixed(0)}% (Section 3.1)
          </Text>
        </View>
      </View>

      {/* Citizen Scientist Confirmation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Confirm Citizen Verdict</Text>
        <Text style={styles.cardSubtitle}>
          As a field observer, please confirm or adjust the AI classification:
        </Text>

        <View style={styles.verdictOptionRow}>
          <TouchableOpacity
            style={[
              styles.verdictOption,
              selectedVerdict === 'confirmed' && styles.verdictOptionActivePositive,
            ]}
            onPress={() => setSelectedVerdict('confirmed')}
            activeOpacity={0.8}
          >
            <Text style={styles.verdictEmoji}>✓</Text>
            <Text style={styles.verdictOptionText}>Confirm Monarch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.verdictOption,
              selectedVerdict === 'rejected' && styles.verdictOptionActiveNegative,
            ]}
            onPress={() => setSelectedVerdict('rejected')}
            activeOpacity={0.8}
          >
            <Text style={styles.verdictEmoji}>✕</Text>
            <Text style={styles.verdictOptionText}>Not a Monarch</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.verdictOption,
              selectedVerdict === 'unsure' && styles.verdictOptionActiveNeutral,
            ]}
            onPress={() => setSelectedVerdict('unsure')}
            activeOpacity={0.8}
          >
            <Text style={styles.verdictEmoji}>?</Text>
            <Text style={styles.verdictOptionText}>Unsure / Review</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GPS Location & Telemetry Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Telemetry & Privacy Status</Text>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryKey}>Location Permission: </Text>
          <Text style={styles.telemetryVal}>
            {locationConsent ? 'Granted (Accurate Coordinates)' : 'Denied (No Coordinates)'}
          </Text>
        </View>
        {locationConsent && params.latitude && (
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryKey}>Coordinates: </Text>
            <Text style={styles.telemetryVal}>
              {parseFloat(params.latitude).toFixed(4)}°, {parseFloat(params.longitude || '0').toFixed(4)}°
            </Text>
          </View>
        )}
      </View>

      {/* Save Action Buttons */}
      <TouchableOpacity
        style={styles.primarySaveButton}
        onPress={handleSaveObservation}
        disabled={isSaving}
        activeOpacity={0.85}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primarySaveText}>Log Observation to Outbox</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={isSaving}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelButtonText}>Retake Photo</Text>
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
  previewContainer: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  verdictBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  meterContainer: {
    marginTop: 4,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  meterValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  meterTrack: {
    height: 10,
    backgroundColor: '#1E293B',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  thresholdNotice: {
    color: '#64748B',
    fontSize: 11,
  },
  verdictOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verdictOption: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  verdictOptionActivePositive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  verdictOptionActiveNegative: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  verdictOptionActiveNeutral: {
    backgroundColor: '#374151',
    borderColor: '#9CA3AF',
  },
  verdictEmoji: {
    fontSize: 18,
    color: '#F8FAFC',
    marginBottom: 4,
  },
  verdictOptionText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  telemetryKey: {
    color: '#94A3B8',
    fontSize: 12,
  },
  telemetryVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  primarySaveButton: {
    backgroundColor: '#EA580C',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primarySaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
