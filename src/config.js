/**
 * Configuration for MediaPipe Vision tasks
 * This files is used to configure the MediaPipe model and pose detection settings
 */
const config = {
  // MediaPipe WASM paths
  mediapipe: {
    wasmPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
    modelPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  },
  
  // Pose detection settings
  pose: {
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    numPoses: 1,
    // Default tracking settings - can be overridden by app settings
    enableFaceLandmarks: true,
    enableHandLandmarks: true,
  }
};

export default config; 