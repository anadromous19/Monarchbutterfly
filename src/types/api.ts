import { Observation } from './observation';
import { Evidence } from './evidence';
import { WeatherSnapshot } from './weather';

export interface PresignedUploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  expiresInSeconds: number;
  headers?: Record<string, string>;
}

export interface SyncObservationInput {
  id: string;
  idempotencyKey: string;
  capturedAt: string;
  speciesPrediction: string;
  monarchProbability: number;
  confidenceThreshold: number;
  userVerdict?: string | null;
  modelVersion: string;
  modelSha256: string;
  preprocessingVersion: string;
  latitude?: number | null;
  longitude?: number | null;
  horizontalAccuracyM?: number | null;
  altitudeM?: number | null;
  locationConsent: boolean;
  version?: number | null;
}

export interface SyncObservationResponse {
  success: boolean;
  id: string;
  version: number;
  updatedAt: string;
  weatherStatus: string;
  weatherSnapshot?: WeatherSnapshot | null;
  error?: string | null;
}

export interface VerifyEvidenceInput {
  observationId: string;
  evidenceId: string;
  s3Key: string;
  sha256: string;
  byteSize: number;
}

export interface VerifyEvidenceResponse {
  success: boolean;
  evidenceId: string;
  verified: boolean;
  s3Url?: string | null;
}
