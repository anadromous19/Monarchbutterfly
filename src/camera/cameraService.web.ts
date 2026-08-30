import { CameraPermissionState, CapturedPhoto } from './types';

export interface CameraService {
  requestCameraPermission(): Promise<CameraPermissionState>;
  checkCameraPermission(): Promise<CameraPermissionState>;
  processCapturedPhoto(
    uri: string,
    width?: number,
    height?: number
  ): Promise<CapturedPhoto>;
}

export class WebCameraService implements CameraService {
  async requestCameraPermission(): Promise<CameraPermissionState> {
    return {
      hasPermission: true,
      canAskAgain: true,
      status: 'granted',
    };
  }

  async checkCameraPermission(): Promise<CameraPermissionState> {
    return {
      hasPermission: true,
      canAskAgain: true,
      status: 'granted',
    };
  }

  async processCapturedPhoto(
    uri: string,
    width = 1920,
    height = 1080
  ): Promise<CapturedPhoto> {
    const mockHash = this.generateFastHash(uri);
    return {
      localUri: uri,
      sha256: mockHash,
      byteSize: 1024 * 512,
      width,
      height,
      mimeType: 'image/jpeg',
    };
  }

  private generateFastHash(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex}a1b2c3d4e5f60718293a4b5c6d7e8f90`.substring(0, 64);
  }
}

export const cameraService = new WebCameraService();
export const MobileCameraService = WebCameraService;
