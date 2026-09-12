import { LocationFix, LocationPermissionState } from './types';

export interface LocationService {
  requestForegroundPermission(): Promise<LocationPermissionState>;
  checkForegroundPermission(): Promise<LocationPermissionState>;
  getCurrentLocation(maxAccuracyThresholdM?: number): Promise<LocationFix | null>;
}

export class WebLocationService implements LocationService {
  async requestForegroundPermission(): Promise<LocationPermissionState> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return {
        hasPermission: false,
        canAskAgain: false,
        status: 'denied',
      };
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        return {
          hasPermission: result.state === 'granted',
          canAskAgain: result.state !== 'denied',
          status: result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'undetermined',
        };
      }
    } catch {
      // Fallback
    }

    return {
      hasPermission: true,
      canAskAgain: true,
      status: 'granted',
    };
  }

  async checkForegroundPermission(): Promise<LocationPermissionState> {
    return this.requestForegroundPermission();
  }

  async getCurrentLocation(maxAccuracyThresholdM = 100): Promise<LocationFix | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise<LocationFix | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy || 20;
          if (accuracy > maxAccuracyThresholdM) {
            console.warn(`Web location accuracy ${accuracy}m exceeded threshold of ${maxAccuracyThresholdM}m`);
          }

          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            horizontalAccuracyM: accuracy,
            altitudeM: position.coords.altitude || 10,
            timestamp: new Date(position.timestamp).toISOString(),
          });
        },
        (error) => {
          console.warn('Web Geolocation error:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }
}

export const locationService = new WebLocationService();
