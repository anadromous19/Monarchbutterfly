export interface CapturedPhoto {
  localUri: string;
  sha256: string;
  byteSize: number;
  width: number;
  height: number;
  mimeType: string;
}

export interface CameraPermissionState {
  hasPermission: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}
