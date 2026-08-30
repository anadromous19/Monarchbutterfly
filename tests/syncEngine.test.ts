import { createInMemoryDatabase } from '../src/db/database';
import { runMigrations } from '../src/db/migrations';
import { ObservationRepository } from '../src/db/observationRepository';
import { EvidenceRepository } from '../src/db/evidenceRepository';
import { WeatherRepository } from '../src/db/weatherRepository';
import { SyncJobRepository } from '../src/db/syncJobRepository';
import { AppSyncClient, S3Uploader } from '../src/api';
import { SyncEngine } from '../src/sync/syncEngine';
import { AuthService, AuthSession } from '../src/auth';
import { Observation, Evidence } from '../src/types';
import { calculateNextAttemptTime } from '../src/sync/backoff';

describe('Sync Engine & Backoff Suite', () => {
  test('calculateNextAttemptTime calculates exponential backoff with jitter', () => {
    const attempt0 = calculateNextAttemptTime(0);
    expect(attempt0.isAbandoned).toBe(false);

    const attemptMax = calculateNextAttemptTime(10);
    expect(attemptMax.isAbandoned).toBe(true);
  });

  test('SyncEngine processes outbox jobs and updates observation sync status', async () => {
    const db = createInMemoryDatabase();
    await runMigrations(db);

    const obsRepo = new ObservationRepository(db);
    const evidenceRepo = new EvidenceRepository(db);
    const weatherRepo = new WeatherRepository(db);
    const syncJobRepo = new SyncJobRepository(db);

    const mockAuthService: AuthService = {
      getSession: async (): Promise<AuthSession> => ({
        identityId: 'us-east-1:test-identity',
        token: 'mock-token',
        isGuest: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
      refreshSession: async () => mockAuthService.getSession(),
      getIdentityId: async () => 'us-east-1:test-identity',
    };

    const appSyncClient = new AppSyncClient(
      { endpoint: 'https://mock.api/graphql', region: 'us-east-1' },
      mockAuthService
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

    const obs: Observation = {
      id: 'obs-sync-1',
      ownerIdentityId: null,
      capturedAt: '2026-08-30T10:00:00Z',
      createdAt: '2026-08-30T10:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z',
      speciesPrediction: 'monarch',
      monarchProbability: 0.95,
      confidenceThreshold: 0.90,
      userVerdict: 'confirmed',
      modelVersion: '1.0.0',
      modelSha256: 'sha256-mock',
      preprocessingVersion: 'v1-rgb-scale-0-1',
      latitude: 37.77,
      longitude: -122.41,
      horizontalAccuracyM: 10,
      altitudeM: 5,
      locationConsent: true,
      weatherStatus: 'pending',
      syncStatus: 'pending',
      remoteVersion: null,
      lastErrorCode: null,
      deletedAt: null,
    };

    const evidence: Evidence = {
      id: 'ev-sync-1',
      observationId: 'obs-sync-1',
      localUri: 'file:///data/img.jpg',
      sha256: 'hash-abc',
      mimeType: 'image/jpeg',
      byteSize: 300000,
      width: 1920,
      height: 1080,
      s3Key: null,
      uploadStatus: 'pending',
      createdAt: '2026-08-30T10:00:00Z',
    };

    await obsRepo.insert(obs);
    await evidenceRepo.insert(evidence);
    await syncJobRepo.enqueue({
      id: 'job-sync-1',
      entityType: 'observation',
      entityId: 'obs-sync-1',
      operation: 'upsert',
      nextAttemptAt: '2026-01-01T00:00:00Z',
      idempotencyKey: 'idemp-sync-1',
    });

    const processed = await syncEngine.processOutbox();
    expect(processed).toBe(1);

    const updatedObs = await obsRepo.getById('obs-sync-1');
    expect(updatedObs?.syncStatus).toBe('synced');

    const updatedEvidence = await evidenceRepo.getById('ev-sync-1');
    expect(updatedEvidence?.uploadStatus).toBe('uploaded');
  });
});
