import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { cameraService } from '../src/camera';
import { mlService } from '../src/ml';
import { locationService } from '../src/location';

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  const processAndReviewPhoto = async (
    uri: string,
    width = 1920,
    height = 1080
  ) => {
    setIsProcessing(true);
    try {
      // 1. Process photo metadata and compute SHA-256 hash
      const photo = await cameraService.processCapturedPhoto(uri, width, height);

      // 2. Acquire foreground GPS fix
      const locationFix = await locationService.getCurrentLocation(100);

      // 3. Execute ML classification directly on the image
      const inferenceResult = await mlService.classifyImageUri(photo.localUri);

      // 4. Navigate to review screen
      router.push({
        pathname: '/review',
        params: {
          uri: photo.localUri,
          sha256: photo.sha256,
          byteSize: photo.byteSize.toString(),
          width: photo.width.toString(),
          height: photo.height.toString(),
          probability: inferenceResult.monarchProbability.toString(),
          isMonarch: inferenceResult.isMonarch.toString(),
          threshold: inferenceResult.confidenceThreshold.toString(),
          latitude: locationFix ? locationFix.latitude.toString() : '',
          longitude: locationFix ? locationFix.longitude.toString() : '',
          accuracy: locationFix ? locationFix.horizontalAccuracyM.toString() : '',
          altitude: locationFix?.altitudeM ? locationFix.altitudeM.toString() : '',
          locationConsent: locationFix ? 'true' : 'false',
        },
      });
    } catch (err) {
      Alert.alert('Processing Failed', (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTakePhoto = async () => {
    if (isProcessing) return;

    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
        });

        if (photo && photo.uri) {
          await processAndReviewPhoto(photo.uri, photo.width || 1920, photo.height || 1080);
          return;
        }
      } catch (err) {
        console.warn('Camera takePicture error, falling back:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    // Fallback simulation capture if camera is busy or on simulator
    const fallbackUri = `file:///app/photos/capture_${Date.now()}.jpg`;
    await processAndReviewPhoto(fallbackUri, 1920, 1080);
  };

  const handlePickFromGallery = async () => {
    if (isProcessing) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processAndReviewPhoto(asset.uri, asset.width || 1920, asset.height || 1080);
      }
    } catch (err) {
      Alert.alert('Gallery Error', (err as Error).message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Live Camera Viewfinder or Permission Fallback */}
      <View style={styles.viewfinderContainer}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
          />
        ) : (
          <View style={styles.permissionPlaceholder}>
            <Text style={styles.placeholderEmoji}>📷</Text>
            <Text style={styles.placeholderTitle}>Camera Access Required</Text>
            <Text style={styles.placeholderSubtitle}>
              Allow camera permission to photograph and detect butterflies in real-time.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Viewfinder Target Reticle Overlay */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.reticle}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Text style={styles.guidanceText}>Align butterfly in frame</Text>
          </View>

          <View style={styles.modelBadge}>
            <Text style={styles.modelBadgeText}>🧠 Fast TFLite v1.0.0 (Float16)</Text>
          </View>
        </View>

        {/* In-Camera Quick Back Button */}
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.floatingBackIcon}>✕</Text>
        </TouchableOpacity>

        {/* Flip Camera Button */}
        {permission?.granted && (
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            activeOpacity={0.8}
          >
            <Text style={styles.flipIcon}>🔄</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Camera Controls Footer */}
      <View style={styles.controlsFooter}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handlePickFromGallery}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>🖼️</Text>
          <Text style={styles.buttonLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shutterButton}
          onPress={handleTakePhoto}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#0F172A" size="small" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() =>
            Alert.alert(
              'Field Observation Tips',
              '• Ensure clear natural lighting\n• Capture both upper and underside wing patterns\n• Hold steady at 1-2 feet distance'
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>💡</Text>
          <Text style={styles.buttonLabel}>Tips</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  viewfinderContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  permissionPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0F172A',
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#F97316',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  guidanceText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modelBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modelBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 10,
  },
  floatingBackIcon: {
    fontSize: 18,
    color: '#F8FAFC',
    fontWeight: '700',
  },
  flipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 10,
  },
  flipIcon: {
    fontSize: 20,
  },
  controlsFooter: {
    height: 130,
    backgroundColor: '#090D16',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  galleryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  buttonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  buttonLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#EA580C',
  },
});
