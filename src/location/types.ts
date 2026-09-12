export interface LocationFix {
  latitude: number;
  longitude: number;
  horizontalAccuracyM: number;
  altitudeM?: number | null;
  timestamp: string;
}

export interface LocationPermissionState {
  hasPermission: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}
