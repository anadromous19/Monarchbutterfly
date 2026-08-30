import { WeatherSnapshot } from '../types';

export interface WeatherQuery {
  latitude: number;
  longitude: number;
  capturedAt: string; // ISO-8601
}

export interface WeatherResult {
  status: 'complete' | 'unavailable' | 'denied';
  snapshot?: WeatherSnapshot | null;
}
