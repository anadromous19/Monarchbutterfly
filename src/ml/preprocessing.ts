/**
 * Preprocessing pipeline strictly aligned with CNN_model.ipynb training:
 * 1. Image resized to 224 x 224 pixels
 * 2. RGB channel order
 * 3. Float32 normalization: pixel / 255.0 in range [0.0, 1.0]
 */

export interface PreprocessedTensor {
  data: Float32Array;
  shape: [number, number, number, number]; // [1, 224, 224, 3]
}

export function normalizePixels(rawRgba: Uint8Array | Uint8ClampedArray, width: number, height: number): Float32Array {
  const targetSize = 224 * 224 * 3;
  const normalized = new Float32Array(targetSize);

  // If already 224x224 RGB/RGBA
  let targetIdx = 0;
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 224; x++) {
      // Nearest neighbor / scale mapping from source width & height
      const srcX = Math.min(Math.floor((x / 224) * width), width - 1);
      const srcY = Math.min(Math.floor((y / 224) * height), height - 1);
      const srcIdx = (srcY * width + srcX) * 4; // Assuming RGBA 4 bytes per pixel

      // Extract RGB, skip A, normalize / 255.0
      normalized[targetIdx] = rawRgba[srcIdx] / 255.0; // R
      normalized[targetIdx + 1] = rawRgba[srcIdx + 1] / 255.0; // G
      normalized[targetIdx + 2] = rawRgba[srcIdx + 2] / 255.0; // B
      targetIdx += 3;
    }
  }

  return normalized;
}

export function decodePrediction(
  rawProbability: number,
  confidenceThreshold = 0.90,
  labels: string[] = ['non_monarch', 'monarch']
): {
  speciesPrediction: string;
  monarchProbability: number;
  isMonarch: boolean;
} {
  // Clamp rawProbability to [0, 1]
  const clampedProb = Math.max(0.0, Math.min(1.0, rawProbability));
  const isMonarch = clampedProb >= confidenceThreshold;
  const speciesPrediction = isMonarch ? labels[1] : labels[0];

  return {
    speciesPrediction,
    monarchProbability: clampedProb,
    isMonarch,
  };
}
