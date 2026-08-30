import { DatabaseConnection } from './database';
import { WeatherSnapshot } from '../types';

interface WeatherRow {
  observation_id: string;
  observed_at: string | null;
  provider: string | null;
  provider_station_or_grid: string | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  pressure_hpa: number | null;
  wind_speed_mps: number | null;
  wind_direction_deg: number | null;
  precipitation_mm: number | null;
  cloud_percent: number | null;
  condition_code: string | null;
  raw_payload_json: string | null;
  fetched_at: string | null;
}

function mapRowToWeather(row: WeatherRow): WeatherSnapshot {
  return {
    observationId: row.observation_id,
    observedAt: row.observed_at,
    provider: row.provider,
    providerStationOrGrid: row.provider_station_or_grid,
    temperatureC: row.temperature_c,
    humidityPercent: row.humidity_percent,
    pressureHpa: row.pressure_hpa,
    windSpeedMps: row.wind_speed_mps,
    windDirectionDeg: row.wind_direction_deg,
    precipitationMm: row.precipitation_mm,
    cloudPercent: row.cloud_percent,
    conditionCode: row.condition_code,
    rawPayloadJson: row.raw_payload_json,
    fetchedAt: row.fetched_at,
  };
}

export class WeatherRepository {
  constructor(private db: DatabaseConnection) {}

  async upsert(weather: WeatherSnapshot): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO weather_snapshots (
        observation_id, observed_at, provider, provider_station_or_grid,
        temperature_c, humidity_percent, pressure_hpa, wind_speed_mps,
        wind_direction_deg, precipitation_mm, cloud_percent,
        condition_code, raw_payload_json, fetched_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        weather.observationId,
        weather.observedAt ?? null,
        weather.provider ?? null,
        weather.providerStationOrGrid ?? null,
        weather.temperatureC ?? null,
        weather.humidityPercent ?? null,
        weather.pressureHpa ?? null,
        weather.windSpeedMps ?? null,
        weather.windDirectionDeg ?? null,
        weather.precipitationMm ?? null,
        weather.cloudPercent ?? null,
        weather.conditionCode ?? null,
        weather.rawPayloadJson ?? null,
        weather.fetchedAt ?? new Date().toISOString(),
      ]
    );
  }

  async getByObservationId(observationId: string): Promise<WeatherSnapshot | null> {
    const row = await this.db.getFirstAsync<WeatherRow>(
      'SELECT * FROM weather_snapshots WHERE observation_id = ?;',
      [observationId]
    );
    return row ? mapRowToWeather(row) : null;
  }
}
