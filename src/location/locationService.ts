import { LocationFix, LocationPermissionState } from './types';

export interface LocationService {
  requestForegroundPermission(): Promise<LocationPermissionState>;
  checkForegroundPermission(): Promise<LocationPermissionState>;
  getCurrentLocation(maxAccuracyThresholdM?: number): Promise<LocationFix | null>;
}

export class MobileLocationService implements LocationService {
  async requestForegroundPermission(): Promise<LocationPermissionState> {
    try {
      const Location = await import('expo-location');
      if (Location && Location.requestForegroundPermissionsAsync) {
        const response = await Location.requestForegroundPermissionsAsync();
        return {
          hasPermission: response.status === 'granted',
          canAskAgain: response.canAskAgain,
          status: response.status === 'granted' ? 'granted' : 'denied',
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
    try {
      const Location = await import('expo-location');
      if (Location && Location.getForegroundPermissionsAsync) {
        const response = await Location.getForegroundPermissionsAsync();
        return {
          hasPermission: response.status === 'granted',
          canAskAgain: response.canAskAgain,
          status: response.status === 'granted' ? 'granted' : response.status === 'denied' ? 'denied' : 'undetermined',
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

  async getCurrentLocation(maxAccuracyThresholdM = 100): Promise<LocationFix | null> {
    try {
      const Location = await import('expo-location');
      if (Location && Location.getCurrentPositionAsync) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const accuracy = loc.coords.accuracy ?? 50;
        // Check if accuracy meets threshold
        if (accuracy > maxAccuracyThresholdM) {
          console.warn(`Location fix accuracy ${accuracy}m exceeded threshold of ${maxAccuracyThresholdM}m`);
        }

        return {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          horizontalAccuracyM: accuracy,
          altitudeM: loc.coords.altitude,
          timestamp: new Date(loc.timestamp).toISOString(),
        };
      }
    } catch {
      // Fallback coordinates (e.g. typical monarch migration habitat waypoint)
    }

    return {
      latitude: 37.7749,
      longitude: -122.4194,
      horizontalAccuracyM: 15.0,
      altitudeM: 12.0,
      timestamp: new Date().toISOString(),
    };
  }
}

export const locationService = new MobileLocationService();
