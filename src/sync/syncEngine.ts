import { AppSyncClient, S3Uploader } from '../api';
import {
  DatabaseConnection,
  EvidenceRepository,
  ObservationRepository,
  SyncJobRepository,
  WeatherRepository,
} from '../db';
import { SyncJob } from '../types';
import { calculateNextAttemptTime } from './backoff';

export interface SyncEngineStatus {
  isRunning: boolean;
  pendingJobCount: number;
  lastRunAt: string | null;
  lastError: string | null;
}

export class SyncEngine {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private lastRunAt: string | null = null;
  private lastError: string | null = null;

  constructor(
    private db: DatabaseConnection,
    private obsRepo: ObservationRepository,
    private evidenceRepo: EvidenceRepository,
    private weatherRepo: WeatherRepository,
    private syncJobRepo: SyncJobRepository,
    private appSyncClient: AppSyncClient,
    private s3Uploader: S3Uploader
  ) {}

  start(intervalMs = 15000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processOutbox().catch((err) => {
        console.warn('Sync engine cycle error:', err);
      });
    }, intervalMs);
    // Initial kick
    this.processOutbox().catch(console.warn);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus(): SyncEngineStatus {
    return {
      isRunning: this.isRunning,
      pendingJobCount: 0,
      lastRunAt: this.lastRunAt,
      lastError: this.lastError,
    };
  }

  /**
   * Processes all due sync outbox jobs idempotently.
   */
  async processOutbox(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;
    this.lastRunAt = new Date().toISOString();
    let processedCount = 0;

    try {
      const dueJobs = await this.syncJobRepo.leaseDueJobs(5, 60);

      for (const job of dueJobs) {
        try {
          await this.executeJob(job);
          await this.syncJobRepo.markCompleted(job.id);
          processedCount++;
        } catch (err) {
          const errorMsg = (err as Error).message || String(err);
          this.lastError = errorMsg;
          const { nextAttemptAt, isAbandoned } = calculateNextAttemptTime(job.attempts);
          await this.syncJobRepo.markFailed(job.id, nextAttemptAt, errorMsg, isAbandoned);
        }
      }
    } finally {
      this.isRunning = false;
    }

    return processedCount;
  }

  private async executeJob(job: SyncJob): Promise<void> {
    if (job.entityType === 'observation') {
      if (job.operation === 'delete') {
        await this.appSyncClient.deleteObservation(job.entityId, job.idempotencyKey);
        return;
      }

      // Upsert observation
      const observation = await this.obsRepo.getById(job.entityId);
      if (!observation) return;

      await this.obsRepo.updateSyncStatus(observation.id, 'syncing');

      // 1. Metadata synchronization
      const metaResponse = await this.appSyncClient.syncObservation({
        id: observation.id,
        idempotencyKey: job.idempotencyKey,
        capturedAt: observation.capturedAt,
        speciesPrediction: observation.speciesPrediction,
        monarchProbability: observation.monarchProbability,
        confidenceThreshold: observation.confidenceThreshold,
        userVerdict: observation.userVerdict,
        modelVersion: observation.modelVersion,
        modelSha256: observation.modelSha256,
        preprocessingVersion: observation.preprocessingVersion,
        latitude: observation.latitude,
        longitude: observation.longitude,
        horizontalAccuracyM: observation.horizontalAccuracyM,
        altitudeM: observation.altitudeM,
        locationConsent: observation.locationConsent,
        version: observation.remoteVersion,
      });

      if (!metaResponse.success) {
        throw new Error(metaResponse.error || 'Metadata sync failed');
      }

      // Update weather snapshot if returned
      if (metaResponse.weatherSnapshot) {
        await this.weatherRepo.upsert(metaResponse.weatherSnapshot);
        await this.obsRepo.updateWeatherStatus(observation.id, 'complete');
      }

      // 2. Evidence synchronization
      const evidenceList = await this.evidenceRepo.getByObservationId(observation.id);
      for (const evidence of evidenceList) {
        if (evidence.uploadStatus !== 'uploaded') {
          await this.evidenceRepo.updateUploadStatus(evidence.id, 'uploading');

          // Presigned URL
          const presigned = await this.appSyncClient.getPresignedUploadUrl(
            observation.id,
            evidence.id,
            evidence.sha256,
            evidence.byteSize
          );

          // Direct S3 upload
          const uploadRes = await this.s3Uploader.uploadEvidence({
            uploadUrl: presigned.uploadUrl,
            localUri: evidence.localUri,
            sha256: evidence.sha256,
            mimeType: evidence.mimeType,
            headers: presigned.headers,
          });

          if (!uploadRes.success) {
            await this.evidenceRepo.updateUploadStatus(evidence.id, 'failed');
            throw new Error(`S3 upload failed: ${uploadRes.error}`);
          }

          // Evidence verification
          const verifyRes = await this.appSyncClient.verifyEvidence({
            observationId: observation.id,
            evidenceId: evidence.id,
            s3Key: presigned.s3Key,
            sha256: evidence.sha256,
            byteSize: evidence.byteSize,
          });

          if (!verifyRes.verified) {
            await this.evidenceRepo.updateUploadStatus(evidence.id, 'failed');
            throw new Error('Server evidence verification failed');
          }

          await this.evidenceRepo.updateUploadStatus(evidence.id, 'uploaded', presigned.s3Key);
        }
      }

      // Mark observation fully synced
      await this.obsRepo.updateSyncStatus(observation.id, 'synced', metaResponse.version, null);
    }
  }
}
