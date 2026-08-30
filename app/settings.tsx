import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getDatabase, ObservationRepository, WeatherRepository, ProfileRepository, SyncJobRepository } from '../src/db';
import { ConsentManager, DataExporter, CURRENT_CONSENT_VERSION } from '../src/privacy';
import { ParticipantProfile, ExperienceLevel } from '../src/types';
import { CURRENT_MODEL_METADATA } from '../src/ml';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [shareDemographics, setShareDemographics] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const db = await getDatabase();
        const profileRepo = new ProfileRepository(db);
        const syncRepo = new SyncJobRepository(db);
        const manager = new ConsentManager(profileRepo);

        const p = await manager.getConsentState();
        setProfile(p);
        if (p.experienceLevel) setExperienceLevel(p.experienceLevel);
        setShareDemographics(p.shareDemographics);

        const count = await syncRepo.getPendingCount();
        setPendingCount(count);
      } catch (err) {
        console.warn('Settings load error:', err);
      }
    }

    loadSettings();
  }, []);

  const handleUpdateDemographics = async () => {
    try {
      const db = await getDatabase();
      const profileRepo = new ProfileRepository(db);
      const manager = new ConsentManager(profileRepo);

      const updated = await manager.updateDemographics(
        experienceLevel,
        profile?.ageBand || '25-34',
        profile?.demographicRegion || 'North America (Central Flyway)',
        shareDemographics
      );
      setProfile(updated);
      Alert.alert('Settings Updated', 'Your voluntary citizen science profile has been saved.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const db = await getDatabase();
      const obsRepo = new ObservationRepository(db);
      const weatherRepo = new WeatherRepository(db);
      const exporter = new DataExporter(obsRepo, weatherRepo);

      const jsonStr = await exporter.exportJson();
      Alert.alert(
        'JSON Export Generated',
        `Successfully generated export payload (${jsonStr.length} bytes). In EAS build, this saves to your device downloads.`
      );
    } catch (err) {
      Alert.alert('Export Error', (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const db = await getDatabase();
      const obsRepo = new ObservationRepository(db);
      const weatherRepo = new WeatherRepository(db);
      const exporter = new DataExporter(obsRepo, weatherRepo);

      const csvStr = await exporter.exportCsv();
      Alert.alert(
        'CSV Export Generated',
        `Successfully generated CSV spreadsheet with ${csvStr.split('\n').length} rows.`
      );
    } catch (err) {
      Alert.alert('Export Error', (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Consent & Demographics Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Citizen Science Demographics</Text>
        <Text style={styles.cardSubtitle}>
          Demographic survey data is completely voluntary and kept strictly separate from exact GPS locations.
        </Text>

        <Text style={styles.inputLabel}>Field Experience Level:</Text>
        <View style={styles.experienceRow}>
          {(['beginner', 'intermediate', 'expert'] as ExperienceLevel[]).map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[
                styles.expButton,
                experienceLevel === lvl && styles.expButtonActive,
              ]}
              onPress={() => setExperienceLevel(lvl)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.expButtonText,
                  experienceLevel === lvl && styles.expButtonTextActive,
                ]}
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchTitle}>Share Anonymous Demographics</Text>
            <Text style={styles.switchSubtitle}>
              Helps researchers evaluate observer skill distribution across flyway corridors
            </Text>
          </View>
          <Switch
            value={shareDemographics}
            onValueChange={setShareDemographics}
            trackColor={{ false: '#334155', true: '#F97316' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          style={styles.saveProfileButton}
          onPress={handleUpdateDemographics}
          activeOpacity={0.85}
        >
          <Text style={styles.saveProfileText}>Save Preferences</Text>
        </TouchableOpacity>
      </View>

      {/* Data Export & Privacy Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Portability & Export</Text>
        <Text style={styles.cardSubtitle}>
          You own your citizen science observations. Export your observation history at any time:
        </Text>

        <View style={styles.exportButtonRow}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportJson}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <Text style={styles.exportIcon}>📄</Text>
            <Text style={styles.exportButtonText}>Export JSON</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportCsv}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <Text style={styles.exportIcon}>📊</Text>
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cloud Sync & Diagnostics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sync Outbox Diagnostics</Text>
        <View style={styles.diagRow}>
          <Text style={styles.diagKey}>Pending Sync Queue: </Text>
          <Text style={styles.diagVal}>{pendingCount} jobs</Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={styles.diagKey}>Consent Policy: </Text>
          <Text style={styles.diagVal}>v{CURRENT_CONSENT_VERSION}</Text>
        </View>
        <View style={styles.diagRow}>
          <Text style={styles.diagKey}>Model Hash: </Text>
          <Text style={styles.diagVal} numberOfLines={1}>
            {CURRENT_MODEL_METADATA.sha256.substring(0, 16)}...
          </Text>
        </View>
      </View>
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
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  experienceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  expButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  expButtonActive: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
  },
  expButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  expButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  saveProfileButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveProfileText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '700',
  },
  exportButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  exportIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  exportButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  diagKey: {
    color: '#94A3B8',
    fontSize: 13,
  },
  diagVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
});
