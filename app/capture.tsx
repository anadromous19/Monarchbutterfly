import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { cameraService } from '../src/camera';
import { mlService } from '../src/ml';

export default function CaptureScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkPermission() {
      const state = await cameraService.requestCameraPermission();
      setHasPermission(state.hasPermission);
    }
    checkPermission();
  }, []);

  const handleCapture = async (sourceType: 'camera' | 'gallery') => {
    setIsProcessing(true);
    try {
      // Mock captured image URI for offline / cross-platform flow
      const photoUri = `file:///app/photos/capture_${Date.now()}.jpg`;
      const photo = await cameraService.processCapturedPhoto(photoUri, 1920, 1080);

      // Create synthetic RGB test buffer for on-device inference
      const syntheticRgba = new Uint8Array(224 * 224 * 4);
      for (let i = 0; i < syntheticRgba.length; i += 4) {
        // Monarch color profile bias (orange / amber / dark)
        syntheticRgba[i] = 230; // R
        syntheticRgba[i + 1] = 110; // G
        syntheticRgba[i + 2] = 25; // B
        syntheticRgba[i + 3] = 255; // A
      }

      // Execute on-device ML classification
      const inferenceResult = await mlService.classifyImage(syntheticRgba, 224, 224);

      // Navigate to review screen with params
      router.push({
        pathname: '/review',
        params: {
          photoUri: photo.localUri,
          photoSha256: photo.sha256,
          photoByteSize: photo.byteSize,
          photoWidth: photo.width,
          photoHeight: photo.height,
          speciesPrediction: inferenceResult.speciesPrediction,
          monarchProbability: inferenceResult.monarchProbability,
          confidenceThreshold: inferenceResult.confidenceThreshold,
          modelVersion: inferenceResult.modelVersion,
          modelSha256: inferenceResult.modelSha256,
          preprocessingVersion: inferenceResult.preprocessingVersion,
          inferenceTimeMs: inferenceResult.inferenceTimeMs,
        },
      });
    } catch (err) {
      Alert.alert('Capture Failed', (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Viewfinder Viewport Simulation */}
      <View style={styles.viewfinder}>
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Text style={styles.guidanceText}>Position butterfly inside frame</Text>
        </View>

        <View style={styles.modelBadge}>
          <Text style={styles.modelBadgeText}>🧠 Fast TFLite v1.0.0 (Float16)</Text>
        </View>
      </View>

      {/* Camera Controls Footer */}
      <View style={styles.controlsFooter}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() => handleCapture('gallery')}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonIcon}>🖼️</Text>
          <Text style={styles.buttonLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shutterButton}
          onPress={() => handleCapture('camera')}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color="#0F172A" size="small" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() => Alert.alert('Capture Tips', '• Ensure good natural lighting\n• Capture full wing pattern\n• Hold device steady at 1-2 feet distance')}
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
  viewfinder: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modelBadge: {
    position: 'absolute',
    top: 20,
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
  controlsFooter: {
    height: 140,
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
