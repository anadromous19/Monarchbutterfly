import { createInMemoryDatabase } from '../src/db/database';
import { runMigrations } from '../src/db/migrations';
import { ObservationRepository } from '../src/db/observationRepository';
import { EvidenceRepository } from '../src/db/evidenceRepository';
import { WeatherRepository } from '../src/db/weatherRepository';
import { ProfileRepository } from '../src/db/profileRepository';
import { SyncJobRepository } from '../src/db/syncJobRepository';
import { Observation, Evidence, WeatherSnapshot, ParticipantProfile } from '../src/types';

describe('SQLite Database & Repositories Suite', () => {
  let db: ReturnType<typeof createInMemoryDatabase>;
  let obsRepo: ObservationRepository;
  let evidenceRepo: EvidenceRepository;
  let weatherRepo: WeatherRepository;
  let profileRepo: ProfileRepository;
  let syncJobRepo: SyncJobRepository;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await runMigrations(db);

    obsRepo = new ObservationRepository(db);
    evidenceRepo = new EvidenceRepository(db);
    weatherRepo = new WeatherRepository(db);
    profileRepo = new ProfileRepository(db);
    syncJobRepo = new SyncJobRepository(db);
  });

  test('ObservationRepository correctly inserts and retrieves observations', async () => {
    const obs: Observation = {
      id: 'obs-test-1',
      ownerIdentityId: 'us-east-1:guest-1',
      capturedAt: '2026-08-30T10:00:00Z',
      createdAt: '2026-08-30T10:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z',
      speciesPrediction: 'monarch',
      monarchProbability: 0.96,
      confidenceThreshold: 0.90,
      userVerdict: 'confirmed',
      modelVersion: '1.0.0',
      modelSha256: 'sha256-mock-test',
      preprocessingVersion: 'v1-rgb-scale-0-1',
      latitude: 37.7749,
      longitude: -122.4194,
      horizontalAccuracyM: 12.0,
      altitudeM: 10.0,
      locationConsent: true,
      weatherStatus: 'pending',
      syncStatus: 'pending',
      remoteVersion: null,
      lastErrorCode: null,
      deletedAt: null,
    };

    await obsRepo.insert(obs);
    const fetched = await obsRepo.getById('obs-test-1');

    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe('obs-test-1');
    expect(fetched?.speciesPrediction).toBe('monarch');
    expect(fetched?.monarchProbability).toBe(0.96);
    expect(fetched?.locationConsent).toBe(true);
    expect(fetched?.latitude).toBe(37.7749);
  });

  test('EvidenceRepository correctly tracks photographic metadata and upload states', async () => {
    const evidence: Evidence = {
      id: 'ev-test-1',
      observationId: 'obs-test-1',
      localUri: 'file:///data/photo.jpg',
      sha256: 'hash123',
      mimeType: 'image/jpeg',
      byteSize: 500000,
      width: 1920,
      height: 1080,
      s3Key: null,
      uploadStatus: 'pending',
      createdAt: '2026-08-30T10:00:00Z',
    };

    await evidenceRepo.insert(evidence);
    const fetchedList = await evidenceRepo.getByObservationId('obs-test-1');

    expect(fetchedList.length).toBe(1);
    expect(fetchedList[0].id).toBe('ev-test-1');
    expect(fetchedList[0].uploadStatus).toBe('pending');

    await evidenceRepo.updateUploadStatus('ev-test-1', 'uploaded', 's3://bucket/key.jpg');
    const updated = await evidenceRepo.getById('ev-test-1');
    expect(updated?.uploadStatus).toBe('uploaded');
  });

  test('WeatherRepository upserts and retrieves environmental snapshots', async () => {
    const weather: WeatherSnapshot = {
      observationId: 'obs-test-1',
      observedAt: '2026-08-30T10:00:00Z',
      provider: 'OpenWeather-Lambda-Proxy',
      providerStationOrGrid: 'grid-37.8--122.4',
      temperatureC: 24.5,
      humidityPercent: 50.0,
      pressureHpa: 1012.0,
      windSpeedMps: 4.0,
      windDirectionDeg: 270.0,
      precipitationMm: 0.0,
      cloudPercent: 10.0,
      conditionCode: '800',
    };

    await weatherRepo.upsert(weather);
    const fetched = await weatherRepo.getByObservationId('obs-test-1');

    expect(fetched).not.toBeNull();
    expect(fetched?.temperatureC).toBe(24.5);
    expect(fetched?.conditionCode).toBe('800');
  });

  test('SyncJobRepository enqueues, leases, and tracks outbox jobs', async () => {
    await syncJobRepo.enqueue({
      id: 'job-1',
      entityType: 'observation',
      entityId: 'obs-test-1',
      operation: 'upsert',
      nextAttemptAt: '2026-01-01T00:00:00Z',
      idempotencyKey: 'idemp-1',
    });

    const pendingCount = await syncJobRepo.getPendingCount();
    expect(pendingCount).toBe(1);

    const leased = await syncJobRepo.leaseDueJobs(5, 60);
    expect(leased.length).toBe(1);
    expect(leased[0].id).toBe('job-1');
    expect(leased[0].attempts).toBe(1);

    await syncJobRepo.markCompleted('job-1');
  });
});
