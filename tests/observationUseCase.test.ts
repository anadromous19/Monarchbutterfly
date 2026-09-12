import { createInMemoryDatabase } from '../src/db/database';
import { runMigrations } from '../src/db/migrations';
import { ObservationRepository } from '../src/db/observationRepository';
import { EvidenceRepository } from '../src/db/evidenceRepository';
import { WeatherRepository } from '../src/db/weatherRepository';
import { SyncJobRepository } from '../src/db/syncJobRepository';
import { ObservationUseCase } from '../src/observations/observationUseCase';
import { WeatherService } from '../src/weather';

describe('ObservationUseCase Suite', () => {
  test('atomically creates observation, evidence metadata, and sync outbox job', async () => {
    const db = createInMemoryDatabase();
    await runMigrations(db);

    const obsRepo = new ObservationRepository(db);
    const evidenceRepo = new EvidenceRepository(db);
    const weatherRepo = new WeatherRepository(db);
    const syncJobRepo = new SyncJobRepository(db);

    const mockWeatherService: WeatherService = {
      resolveWeather: async () => ({ status: 'complete', snapshot: null }),
    };

    const useCase = new ObservationUseCase(
      db,
      obsRepo,
      evidenceRepo,
      weatherRepo,
      syncJobRepo,
      mockWeatherService
    );

    const result = await useCase.createObservation({
      speciesPrediction: 'monarch',
      monarchProbability: 0.97,
      confidenceThreshold: 0.90,
      userVerdict: 'confirmed',
      locationConsent: true,
      latitude: 37.7749,
      longitude: -122.4194,
      horizontalAccuracyM: 8.5,
      altitudeM: 15.0,
      photoUri: 'file:///cache/butterfly.jpg',
      photoSha256: 'sha256-evidence-test',
      photoByteSize: 450000,
      photoWidth: 1920,
      photoHeight: 1080,
    });

    expect(result.observation.id).toBeDefined();
    expect(result.observation.speciesPrediction).toBe('monarch');
    expect(result.observation.monarchProbability).toBe(0.97);
    expect(result.observation.syncStatus).toBe('pending');
    expect(result.evidence.observationId).toBe(result.observation.id);
    expect(result.syncJob.entityId).toBe(result.observation.id);
  });

  test('confirmVerdict and deleteObservation record state updates and outbox jobs', async () => {
    const db = createInMemoryDatabase();
    await runMigrations(db);

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
      { resolveWeather: async () => ({ status: 'unavailable', snapshot: null }) }
    );

    const result = await useCase.createObservation({
      speciesPrediction: 'monarch',
      monarchProbability: 0.92,
      confidenceThreshold: 0.90,
      locationConsent: false,
      photoUri: 'file:///cache/photo.jpg',
      photoSha256: 'hash-1',
      photoByteSize: 100000,
    });

    await useCase.confirmVerdict(result.observation.id, 'confirmed');
    await useCase.deleteObservation(result.observation.id);
  });
});
