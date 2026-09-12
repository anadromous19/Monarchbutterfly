import * as Location from 'expo-location';
import { LocationFix, LocationPermissionState } from './types';

export interface LocationService {
  requestForegroundPermission(): Promise<LocationPermissionState>;
  checkForegroundPermission(): Promise<LocationPermissionState>;
  getCurrentLocation(maxAccuracyThresholdM?: number): Promise<LocationFix | null>;
}

export class MobileLocationService implements LocationService {
  async requestForegroundPermission(): Promise<LocationPermissionState> {
    try {
      if (Location && Location.requestForegroundPermissionsAsync) {
        const response = await Location.requestForegroundPermissionsAsync();
        return {
          hasPermission: response.status === 'granted',
          canAskAgain: response.canAskAgain,
          status: response.status === 'granted' ? 'granted' : 'denied',
        };
      }
    } catch (err) {
      console.warn('Location request permission warning:', err);
    }

    return {
      hasPermission: false,
      canAskAgain: true,
      status: 'denied',
    };
  }

  async checkForegroundPermission(): Promise<LocationPermissionState> {
    try {
      if (Location && Location.getForegroundPermissionsAsync) {
        const response = await Location.getForegroundPermissionsAsync();
        return {
          hasPermission: response.status === 'granted',
          canAskAgain: response.canAskAgain,
          status: response.status === 'granted' ? 'granted' : response.status === 'denied' ? 'denied' : 'undetermined',
        };
      }
    } catch (err) {
      console.warn('Location check permission warning:', err);
    }

    return {
      hasPermission: false,
      canAskAgain: true,
      status: 'denied',
    };
  }

  async getCurrentLocation(maxAccuracyThresholdM = 100): Promise<LocationFix | null> {
    try {
      if (Location && Location.requestForegroundPermissionsAsync) {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          console.log('Location permission was not granted by user.');
          return null;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const accuracy = loc.coords.accuracy ?? 15;
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
    } catch (err) {
      console.warn('Could not acquire live GPS position:', err);
    }

    return null;
  }
}

export const locationService = new MobileLocationService();
