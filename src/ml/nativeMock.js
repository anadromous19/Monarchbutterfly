// Mock stub for web bundling of native-only modules
module.exports = {
  loadTensorflowModel: async () => ({
    run: async () => [new Float32Array([0.95])],
  }),
  Camera: {
    requestCameraPermission: async () => 'granted',
    getCameraPermissionStatus: () => 'granted',
  },
  useCameraDevices: () => ({ back: {} }),
  useFrameProcessor: () => {},
};
