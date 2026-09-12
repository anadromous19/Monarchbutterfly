import { ObservationRepository, WeatherRepository } from '../db';
import { Observation, WeatherSnapshot } from '../types';

export interface ExportDataPayload {
  exportedAt: string;
  totalObservations: number;
  observations: Array<{
    observation: Observation;
    weatherSnapshot?: WeatherSnapshot | null;
  }>;
}

export class DataExporter {
  constructor(
    private obsRepo: ObservationRepository,
    private weatherRepo: WeatherRepository
  ) {}

  async exportJson(): Promise<string> {
    const observations = await this.obsRepo.listAll(true);
    const enriched = await Promise.all(
      observations.map(async (obs) => {
        const weather = await this.weatherRepo.getByObservationId(obs.id);
        return {
          observation: obs,
          weatherSnapshot: weather,
        };
      })
    );

    const payload: ExportDataPayload = {
      exportedAt: new Date().toISOString(),
      totalObservations: observations.length,
      observations: enriched,
    };

    return JSON.stringify(payload, null, 2);
  }

  async exportCsv(): Promise<string> {
    const observations = await this.obsRepo.listAll(false);
    const headers = [
      'id',
      'captured_at',
      'species_prediction',
      'monarch_probability',
      'confidence_threshold',
      'user_verdict',
      'latitude',
      'longitude',
      'horizontal_accuracy_m',
      'weather_status',
      'sync_status',
      'model_version',
      'temperature_c',
      'humidity_percent',
    ];

    const rows: string[] = [headers.join(',')];

    for (const obs of observations) {
      const weather = await this.weatherRepo.getByObservationId(obs.id);
      const row = [
        `"${obs.id}"`,
        `"${obs.capturedAt}"`,
        `"${obs.speciesPrediction}"`,
        obs.monarchProbability.toFixed(4),
        obs.confidenceThreshold.toFixed(2),
        `"${obs.userVerdict || ''}"`,
        obs.latitude !== null && obs.latitude !== undefined ? obs.latitude.toFixed(6) : '',
        obs.longitude !== null && obs.longitude !== undefined ? obs.longitude.toFixed(6) : '',
        obs.horizontalAccuracyM !== null && obs.horizontalAccuracyM !== undefined ? obs.horizontalAccuracyM.toFixed(1) : '',
        `"${obs.weatherStatus}"`,
        `"${obs.syncStatus}"`,
        `"${obs.modelVersion}"`,
        weather?.temperatureC !== null && weather?.temperatureC !== undefined ? weather.temperatureC.toFixed(1) : '',
        weather?.humidityPercent !== null && weather?.humidityPercent !== undefined ? weather.humidityPercent.toFixed(1) : '',
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }
}
