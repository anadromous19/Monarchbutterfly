import { DatabaseConnection } from './database';
import { Observation, SyncStatus, UserVerdict, WeatherStatus } from '../types';

interface ObservationRow {
  id: string;
  owner_identity_id: string | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
  species_prediction: string;
  monarch_probability: number;
  confidence_threshold: number;
  user_verdict: UserVerdict | null;
  model_version: string;
  model_sha256: string;
  preprocessing_version: string;
  latitude: number | null;
  longitude: number | null;
  horizontal_accuracy_m: number | null;
  altitude_m: number | null;
  location_consent: number;
  weather_status: WeatherStatus;
  sync_status: SyncStatus;
  remote_version: number | null;
  last_error_code: string | null;
  deleted_at: string | null;
}

function mapRowToObservation(row: ObservationRow): Observation {
  return {
    id: row.id,
    ownerIdentityId: row.owner_identity_id,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    speciesPrediction: row.species_prediction,
    monarchProbability: row.monarch_probability,
    confidenceThreshold: row.confidence_threshold,
    userVerdict: row.user_verdict,
    modelVersion: row.model_version,
    modelSha256: row.model_sha256,
    preprocessingVersion: row.preprocessing_version,
    latitude: row.latitude,
    longitude: row.longitude,
    horizontalAccuracyM: row.horizontal_accuracy_m,
    altitudeM: row.altitude_m,
    locationConsent: row.location_consent === 1,
    weatherStatus: row.weather_status,
    syncStatus: row.sync_status,
    remoteVersion: row.remote_version,
    lastErrorCode: row.last_error_code,
    deletedAt: row.deleted_at,
  };
}

export class ObservationRepository {
  constructor(private db: DatabaseConnection) {}

  async insert(obs: Observation): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO observations (
        id, owner_identity_id, captured_at, created_at, updated_at,
        species_prediction, monarch_probability, confidence_threshold, user_verdict,
        model_version, model_sha256, preprocessing_version,
        latitude, longitude, horizontal_accuracy_m, altitude_m, location_consent,
        weather_status, sync_status, remote_version, last_error_code, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        obs.id,
        obs.ownerIdentityId ?? null,
        obs.capturedAt,
        obs.createdAt,
        obs.updatedAt,
        obs.speciesPrediction,
        obs.monarchProbability,
        obs.confidenceThreshold,
        obs.userVerdict ?? null,
        obs.modelVersion,
        obs.modelSha256,
        obs.preprocessingVersion,
        obs.latitude ?? null,
        obs.longitude ?? null,
        obs.horizontalAccuracyM ?? null,
        obs.altitudeM ?? null,
        obs.locationConsent ? 1 : 0,
        obs.weatherStatus,
        obs.syncStatus,
        obs.remoteVersion ?? null,
        obs.lastErrorCode ?? null,
        obs.deletedAt ?? null,
      ]
    );
  }

  async getById(id: string): Promise<Observation | null> {
    const row = await this.db.getFirstAsync<ObservationRow>(
      'SELECT * FROM observations WHERE id = ?;',
      [id]
    );
    return row ? mapRowToObservation(row) : null;
  }

  async listAll(includeDeleted = false): Promise<Observation[]> {
    const sql = includeDeleted
      ? 'SELECT * FROM observations ORDER BY captured_at DESC;'
      : 'SELECT * FROM observations WHERE deleted_at IS NULL ORDER BY captured_at DESC;';
    const rows = await this.db.getAllAsync<ObservationRow>(sql);
    return rows.map(mapRowToObservation);
  }

  async updateSyncStatus(
    id: string,
    syncStatus: SyncStatus,
    remoteVersion?: number | null,
    lastErrorCode?: string | null
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE observations
       SET sync_status = ?, remote_version = COALESCE(?, remote_version), last_error_code = ?, updated_at = ?
       WHERE id = ?;`,
      [syncStatus, remoteVersion ?? null, lastErrorCode ?? null, now, id]
    );
  }

  async updateWeatherStatus(
    id: string,
    weatherStatus: WeatherStatus
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE observations SET weather_status = ?, updated_at = ? WHERE id = ?;`,
      [weatherStatus, now, id]
    );
  }

  async updateUserVerdict(
    id: string,
    userVerdict: UserVerdict
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE observations
       SET user_verdict = ?, sync_status = 'pending', updated_at = ?
       WHERE id = ?;`,
      [userVerdict, now, id]
    );
  }

  async markDeleted(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE observations
       SET deleted_at = ?, sync_status = 'tombstoned', updated_at = ?
       WHERE id = ?;`,
      [now, now, id]
    );
  }
}
