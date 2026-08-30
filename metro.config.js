const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add .tflite and .wasm to asset extensions
config.resolver.assetExts.push('tflite', 'wasm');

// If bundling for web, alias native-only TurboModules to our safe stub
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-fast-tflite' || moduleName.startsWith('react-native-fast-tflite/')) {
      return {
        filePath: path.resolve(__dirname, 'src/ml/nativeMock.js'),
        type: 'sourceFile',
      };
    }
    if (moduleName === 'react-native-vision-camera' || moduleName.startsWith('react-native-vision-camera/')) {
      return {
        filePath: path.resolve(__dirname, 'src/ml/nativeMock.js'),
        type: 'sourceFile',
      };
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
