export type UserVerdict = 'confirmed' | 'rejected' | 'unsure';

export type WeatherStatus = 'pending' | 'complete' | 'unavailable' | 'denied';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'tombstoned';

export interface Observation {
  id: string; // UUID v4
  ownerIdentityId?: string | null;
  capturedAt: string; // ISO-8601
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  speciesPrediction: string; // e.g. "monarch" or "non_monarch"
  monarchProbability: number; // 0.0 - 1.0
  confidenceThreshold: number; // e.g. 0.90
  userVerdict?: UserVerdict | null;
  modelVersion: string; // e.g. "1.0.0"
  modelSha256: string;
  preprocessingVersion: string; // e.g. "v1-rgb-scale-0-1"
  latitude?: number | null;
  longitude?: number | null;
  horizontalAccuracyM?: number | null;
  altitudeM?: number | null;
  locationConsent: boolean;
  weatherStatus: WeatherStatus;
  syncStatus: SyncStatus;
  remoteVersion?: number | null;
  lastErrorCode?: string | null;
  deletedAt?: string | null; // ISO-8601 when tombstoned
}

export interface CreateObservationInput {
  id?: string;
  capturedAt?: string;
  speciesPrediction: string;
  monarchProbability: number;
  confidenceThreshold?: number;
  userVerdict?: UserVerdict;
  modelVersion?: string;
  modelSha256?: string;
  preprocessingVersion?: string;
  latitude?: number | null;
  longitude?: number | null;
  horizontalAccuracyM?: number | null;
  altitudeM?: number | null;
  locationConsent: boolean;
  photoUri: string;
  photoSha256: string;
  photoByteSize: number;
  photoWidth?: number;
  photoHeight?: number;
}
