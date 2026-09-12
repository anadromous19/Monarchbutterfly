import { ServerProxyWeatherService } from '../src/weather/weatherService';

describe('WeatherService Suite', () => {
  test('resolves environmental snapshot for consented location and timestamp', async () => {
    const service = new ServerProxyWeatherService();
    const result = await service.resolveWeather('obs-weather-1', {
      latitude: 37.7749,
      longitude: -122.4194,
      capturedAt: '2026-08-30T10:00:00Z',
    });

    expect(result.status).toBe('complete');
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot?.observationId).toBe('obs-weather-1');
    expect(result.snapshot?.temperatureC).toBeGreaterThan(0);
    expect(result.snapshot?.providerStationOrGrid).toContain('grid-37.8--122.4');
  });

  test('returns denied status when latitude and longitude are absent', async () => {
    const service = new ServerProxyWeatherService();
    const result = await service.resolveWeather('obs-weather-2', {
      latitude: 0,
      longitude: 0,
      capturedAt: '2026-08-30T10:00:00Z',
    });

    expect(result.status).toBe('denied');
    expect(result.snapshot).toBeNull();
  });
});
