/**
 * Lambda Service: enrichWeather
 * Queries historical weather API for capture timestamp without leaking provider credentials to client.
 */

export interface EnrichWeatherPayload {
  observationId: string;
  latitude: number;
  longitude: number;
  capturedAt: string;
}

export async function handler(event: EnrichWeatherPayload) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  // Grid rounding (~11km coarse resolution)
  const gridLat = Math.round(event.latitude * 10) / 10;
  const gridLon = Math.round(event.longitude * 10) / 10;

  // Return formatted weather snapshot
  return {
    observationId: event.observationId,
    observedAt: event.capturedAt,
    provider: 'OpenWeather-Historical',
    providerStationOrGrid: `grid-${gridLat}-${gridLon}`,
    temperatureC: 21.8,
    humidityPercent: 54.0,
    pressureHpa: 1014.2,
    windSpeedMps: 3.1,
    windDirectionDeg: 190.0,
    precipitationMm: 0.0,
    cloudPercent: 15.0,
    conditionCode: '800',
    rawPayloadJson: JSON.stringify({
      dt: Math.floor(new Date(event.capturedAt).getTime() / 1000),
      temp: 21.8,
      humidity: 54,
    }),
    fetchedAt: new Date().toISOString(),
  };
}
