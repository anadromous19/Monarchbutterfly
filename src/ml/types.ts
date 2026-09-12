export interface ModelMetadata {
  modelVersion: string;
  source: string;
  quantization: string;
  sha256: string;
  inputDimensions: [number, number, number]; // [height, width, channels] (224, 224, 3)
  channelOrder: 'RGB' | 'BGR';
  preprocessingVersion: string;
  normalization: string;
  defaultConfidenceThreshold: number;
  labels: string[]; // ["non_monarch", "monarch"]
  outputType: 'binary_sigmoid' | 'softmax';
}

export interface InferenceResult {
  speciesPrediction: string; // "monarch" | "non_monarch"
  monarchProbability: number; // 0.0 to 1.0
  confidenceThreshold: number; // e.g. 0.90
  isMonarch: boolean;
  modelVersion: string;
  modelSha256: string;
  preprocessingVersion: string;
  inferenceTimeMs: number;
}
