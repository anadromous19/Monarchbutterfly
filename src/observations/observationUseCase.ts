import { DatabaseConnection, ObservationRepository, EvidenceRepository, WeatherRepository, SyncJobRepository } from '../db';
import { CreateObservationInput, Observation, Evidence, UserVerdict, SyncJob } from '../types';
import { WeatherService } from '../weather';

export interface CreateObservationResult {
  observation: Observation;
  evidence: Evidence;
  syncJob: SyncJob;
}

export class ObservationUseCase {
  constructor(
    private db: DatabaseConnection,
    private obsRepo: ObservationRepository,
    private evidenceRepo: EvidenceRepository,
    private weatherRepo: WeatherRepository,
    private syncJobRepo: SyncJobRepository,
    private weatherService: WeatherService
  ) {}

  /**
   * Atomically records a new observation and enqueues sync outbox job before network calls.
   * Enforces offline-first guarantee from architecture.md section 4.4.
   */
  async createObservation(input: CreateObservationInput): Promise<CreateObservationResult> {
    const observationId = input.id || this.generateUuid();
    const evidenceId = this.generateUuid();
    const syncJobId = this.generateUuid();
    const now = new Date().toISOString();
    const capturedAt = input.capturedAt || now;

    const observation: Observation = {
      id: observationId,
      ownerIdentityId: null,
      capturedAt,
      createdAt: now,
      updatedAt: now,
      speciesPrediction: input.speciesPrediction,
      monarchProbability: input.monarchProbability,
      confidenceThreshold: input.confidenceThreshold ?? 0.90,
      userVerdict: input.userVerdict ?? null,
      modelVersion: input.modelVersion ?? '1.0.0',
      modelSha256: input.modelSha256 ?? 'sha256-verified-manifest',
      preprocessingVersion: input.preprocessingVersion ?? 'v1-rgb-scale-0-1',
      latitude: input.locationConsent ? input.latitude : null,
      longitude: input.locationConsent ? input.longitude : null,
      horizontalAccuracyM: input.locationConsent ? input.horizontalAccuracyM : null,
      altitudeM: input.locationConsent ? input.altitudeM : null,
      locationConsent: input.locationConsent,
      weatherStatus: input.locationConsent && input.latitude && input.longitude ? 'pending' : 'denied',
      syncStatus: 'pending',
      remoteVersion: null,
      lastErrorCode: null,
      deletedAt: null,
    };

    const evidence: Evidence = {
      id: evidenceId,
      observationId,
      localUri: input.photoUri,
      sha256: input.photoSha256,
      mimeType: 'image/jpeg',
      byteSize: input.photoByteSize,
      width: input.photoWidth ?? null,
      height: input.photoHeight ?? null,
      s3Key: null,
      uploadStatus: 'pending',
      createdAt: now,
    };

    const idempotencyKey = `obs-${observationId}-${capturedAt}`;

    const syncJob: SyncJob = {
      id: syncJobId,
      entityType: 'observation',
      entityId: observationId,
      operation: 'upsert',
      state: 'pending',
      attempts: 0,
      nextAttemptAt: now,
      leaseExpiresAt: null,
      idempotencyKey,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };

    // Atomic transaction
    await this.db.withTransactionAsync(async () => {
      await this.obsRepo.insert(observation);
      await this.evidenceRepo.insert(evidence);
      await this.syncJobRepo.enqueue(syncJob);
    });

    // Opportunistic async weather pre-fetch if location consented
    if (observation.locationConsent && observation.latitude && observation.longitude) {
      this.weatherService.resolveWeather(observationId, {
        latitude: observation.latitude,
        longitude: observation.longitude,
        capturedAt,
      }).then(async (res) => {
        if (res.snapshot) {
          await this.weatherRepo.upsert(res.snapshot);
          await this.obsRepo.updateWeatherStatus(observationId, res.status);
        }
      }).catch((err) => {
        console.warn('Opportunistic weather pre-fetch failed:', err);
      });
    }

    return {
      observation,
      evidence,
      syncJob,
    };
  }

  async confirmVerdict(observationId: string, verdict: UserVerdict): Promise<void> {
    await this.obsRepo.updateUserVerdict(observationId, verdict);
    // Re-enqueue sync job for verdict update
    const syncJobId = this.generateUuid();
    const now = new Date().toISOString();
    await this.syncJobRepo.enqueue({
      id: syncJobId,
      entityType: 'observation',
      entityId: observationId,
      operation: 'upsert',
      nextAttemptAt: now,
      idempotencyKey: `verdict-${observationId}-${Date.now()}`,
    });
  }

  async deleteObservation(observationId: string): Promise<void> {
    await this.obsRepo.markDeleted(observationId);
    const syncJobId = this.generateUuid();
    const now = new Date().toISOString();
    await this.syncJobRepo.enqueue({
      id: syncJobId,
      entityType: 'observation',
      entityId: observationId,
      operation: 'delete',
      nextAttemptAt: now,
      idempotencyKey: `delete-${observationId}-${Date.now()}`,
    });
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
