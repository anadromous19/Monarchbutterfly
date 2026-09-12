import { ModelMetadata } from './types';

export const CURRENT_MODEL_METADATA: ModelMetadata = {
  modelVersion: '1.0.0',
  source: 'model/monarch_classifier.h5',
  quantization: 'float16',
  sha256: '0cfe441e2b5eb3de398fbfe317cc05aeece3f711d51bb55289dc19f8217d1850',
  inputDimensions: [224, 224, 3],
  channelOrder: 'RGB',
  preprocessingVersion: 'v1-rgb-scale-0-1',
  normalization: 'pixel_value / 255.0',
  defaultConfidenceThreshold: 0.90,
  labels: ['non_monarch', 'monarch'],
  outputType: 'binary_sigmoid',
};
