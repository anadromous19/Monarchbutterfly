/**
 * SQLite Database Schema and Table Definitions
 * Matches Architecture Document section 4.1
 */

export const CREATE_TABLES_V1 = `
-- Enable foreign keys and WAL mode handled in database lifecycle

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  owner_identity_id TEXT,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  species_prediction TEXT NOT NULL,
  monarch_probability REAL NOT NULL CHECK(monarch_probability BETWEEN 0 AND 1),
  confidence_threshold REAL NOT NULL,
  user_verdict TEXT CHECK(user_verdict IN ('confirmed','rejected','unsure')),
  model_version TEXT NOT NULL,
  model_sha256 TEXT NOT NULL,
  preprocessing_version TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  horizontal_accuracy_m REAL,
  altitude_m REAL,
  location_consent INTEGER NOT NULL DEFAULT 0,
  weather_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(weather_status IN ('pending','complete','unavailable','denied')),
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(sync_status IN ('pending','syncing','synced','failed','tombstoned')),
  remote_version INTEGER,
  last_error_code TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  local_uri TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  s3_key TEXT,
  upload_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(upload_status IN ('pending','uploading','uploaded','failed')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weather_snapshots (
  observation_id TEXT PRIMARY KEY REFERENCES observations(id) ON DELETE CASCADE,
  observed_at TEXT,
  provider TEXT,
  provider_station_or_grid TEXT,
  temperature_c REAL,
  humidity_percent REAL,
  pressure_hpa REAL,
  wind_speed_mps REAL,
  wind_direction_deg REAL,
  precipitation_mm REAL,
  cloud_percent REAL,
  condition_code TEXT,
  raw_payload_json TEXT,
  fetched_at TEXT
);

CREATE TABLE IF NOT EXISTS participant_profile (
  local_profile_id TEXT PRIMARY KEY,
  consent_version TEXT NOT NULL,
  consented_at TEXT,
  age_band TEXT,
  experience_level TEXT,
  demographic_region TEXT,
  share_demographics INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  lease_expires_at TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_observations_sync ON observations(sync_status, updated_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_due ON sync_jobs(state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_evidence_observation ON evidence(observation_id);
`;

export const SCHEMA_MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: CREATE_TABLES_V1,
  },
];
