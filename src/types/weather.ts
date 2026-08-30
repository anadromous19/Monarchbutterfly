export interface WeatherSnapshot {
  observationId: string;
  observedAt?: string | null; // ISO-8601
  provider?: string | null; // e.g. "openweather"
  providerStationOrGrid?: string | null;
  temperatureC?: number | null;
  humidityPercent?: number | null;
  pressureHpa?: number | null;
  windSpeedMps?: number | null;
  windDirectionDeg?: number | null;
  precipitationMm?: number | null;
  cloudPercent?: number | null;
  conditionCode?: string | null; // e.g. "800" (Clear), "500" (Rain)
  rawPayloadJson?: string | null;
  fetchedAt?: string | null;
}
