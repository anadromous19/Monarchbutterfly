import { normalizePixels, decodePrediction } from '../src/ml/preprocessing';

describe('ML Preprocessing & Postprocessing Suite', () => {
  test('normalizePixels correctly resizes and scales RGB values to [0.0, 1.0]', () => {
    // 2x2 test image (RGBA 4 bytes per pixel)
    const rawRgba = new Uint8Array([
      255, 0, 0, 255,     // Red
      0, 255, 0, 255,     // Green
      0, 0, 255, 255,     // Blue
      255, 255, 255, 255, // White
    ]);

    const tensor = normalizePixels(rawRgba, 2, 2);

    expect(tensor).toBeInstanceOf(Float32Array);
    expect(tensor.length).toBe(224 * 224 * 3);

    // Verify values fall strictly within [0.0, 1.0]
    for (let i = 0; i < 100; i++) {
      expect(tensor[i]).toBeGreaterThanOrEqual(0.0);
      expect(tensor[i]).toBeLessThanOrEqual(1.0);
    }
  });

  test('decodePrediction correctly classifies monarch when probability exceeds threshold', () => {
    const threshold = 0.90;
    const positiveResult = decodePrediction(0.95, threshold, ['non_monarch', 'monarch']);

    expect(positiveResult.isMonarch).toBe(true);
    expect(positiveResult.speciesPrediction).toBe('monarch');
    expect(positiveResult.monarchProbability).toBe(0.95);

    const negativeResult = decodePrediction(0.85, threshold, ['non_monarch', 'monarch']);
    expect(negativeResult.isMonarch).toBe(false);
    expect(negativeResult.speciesPrediction).toBe('non_monarch');
    expect(negativeResult.monarchProbability).toBe(0.85);
  });

  test('decodePrediction clamps probabilities to valid [0.0, 1.0] bounds', () => {
    const overflow = decodePrediction(1.5, 0.90);
    expect(overflow.monarchProbability).toBe(1.0);

    const underflow = decodePrediction(-0.2, 0.90);
    expect(underflow.monarchProbability).toBe(0.0);
  });
});
