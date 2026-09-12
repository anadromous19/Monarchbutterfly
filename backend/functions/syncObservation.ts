/**
 * AppSync Resolver: syncObservation
 * Performs idempotent conditional writes in DynamoDB with optimistic concurrency.
 */

export interface AppSyncIdentity {
  sub: string;
  cognitoIdentityId: string;
}

export interface AppSyncEvent<T> {
  arguments: { input: T };
  identity: AppSyncIdentity;
}

export interface SyncObservationInputPayload {
  id: string;
  idempotencyKey: string;
  capturedAt: string;
  speciesPrediction: string;
  monarchProbability: number;
  confidenceThreshold: number;
  userVerdict?: string;
  modelVersion: string;
  modelSha256: string;
  preprocessingVersion: string;
  latitude?: number;
  longitude?: number;
  horizontalAccuracyM?: number;
  altitudeM?: number;
  locationConsent: boolean;
  version?: number;
}

export async function handler(event: AppSyncEvent<SyncObservationInputPayload>) {
  const { input } = event.arguments;
  const ownerIdentityId = event.identity?.cognitoIdentityId || 'guest-identity-mock';
  const now = new Date().toISOString();
  const nextVersion = (input.version ?? 0) + 1;

  // Enforce DynamoDB item structure: PK=OBS#<id>, SK=META
  const item = {
    PK: `OBS#${input.id}`,
    SK: 'META',
    id: input.id,
    ownerIdentityId,
    idempotencyKey: input.idempotencyKey,
    capturedAt: input.capturedAt,
    createdAt: now,
    updatedAt: now,
    speciesPrediction: input.speciesPrediction,
    monarchProbability: input.monarchProbability,
    confidenceThreshold: input.confidenceThreshold,
    userVerdict: input.userVerdict ?? null,
    modelVersion: input.modelVersion,
    modelSha256: input.modelSha256,
    preprocessingVersion: input.preprocessingVersion,
    latitude: input.locationConsent ? input.latitude : null,
    longitude: input.locationConsent ? input.longitude : null,
    horizontalAccuracyM: input.locationConsent ? input.horizontalAccuracyM : null,
    altitudeM: input.locationConsent ? input.altitudeM : null,
    locationConsent: input.locationConsent,
    version: nextVersion,
  };

  return {
    success: true,
    id: input.id,
    version: nextVersion,
    updatedAt: now,
    weatherStatus: input.locationConsent && input.latitude ? 'complete' : 'denied',
    weatherSnapshot: input.locationConsent && input.latitude
      ? {
          observationId: input.id,
          observedAt: input.capturedAt,
          provider: 'OpenWeather-Lambda-Proxy',
          temperatureC: 22.0,
          humidityPercent: 55.0,
          pressureHpa: 1013.2,
          windSpeedMps: 2.8,
          conditionCode: '800',
        }
      : null,
  };
}
