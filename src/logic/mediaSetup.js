import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Initializes MediaPipe PoseLandmarker
 * @param {Object} config - App configuration with MediaPipe settings
 * @param {Function} debugLog - Function for debug logging
 * @returns {Promise<Object>} - Initialized pose landmarker
 */
async function initializePoseLandmarker(config, debugLog = console.log) {
  debugLog('Setting up MediaPipe...');
  debugLog(`Using WASM path: ${config.mediapipe.wasmPath}`);
  
  // Initialize FilesetResolver
  const vision = await FilesetResolver.forVisionTasks(config.mediapipe.wasmPath);
  
  if (!vision) {
    throw new Error('Failed to initialize FilesetResolver');
  }
  
  debugLog('FilesetResolver initialized successfully');
  
  let poseLandmarker = null;
  
  // First try with GPU
  try {
    debugLog('Attempting to initialize with GPU delegate...');
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.mediapipe.modelPath,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: config.pose.numPoses,
      minPoseDetectionConfidence: config.pose.minPoseDetectionConfidence,
      minPosePresenceConfidence: config.pose.minPosePresenceConfidence,
      minTrackingConfidence: config.pose.minTrackingConfidence,
      outputSegmentationMasks: false
    });
    debugLog('Successfully initialized with GPU delegate');
  } catch (gpuError) {
    // If GPU fails, try with CPU
    debugLog('GPU initialization failed: ' + gpuError.message);
    debugLog('Falling back to CPU delegate...');
    
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: config.mediapipe.modelPath,
        delegate: 'CPU'
      },
      runningMode: 'VIDEO',
      numPoses: config.pose.numPoses,
      minPoseDetectionConfidence: config.pose.minPoseDetectionConfidence,
      minPosePresenceConfidence: config.pose.minPosePresenceConfidence,
      minTrackingConfidence: config.pose.minTrackingConfidence,
      outputSegmentationMasks: false
    });
    debugLog('Successfully initialized with CPU delegate');
  }
  
  if (!poseLandmarker) {
    throw new Error('Failed to initialize PoseLandmarker');
  }
  
  debugLog('MediaPipe setup complete!');
  return poseLandmarker;
}

/**
 * Sets up the camera and returns a video stream
 * @returns {Promise<MediaStream>} - Video stream from camera
 */
async function setupCamera() {
  // Polyfill for getUserMedia (for iOS/Safari/legacy support)
  const getUserMediaCompat = (constraints) => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (getUserMedia) {
      // Promisify the legacy getUserMedia
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
    return Promise.reject(new Error('getUserMedia is not supported in this browser.'));
  };

  // Access webcam
  return await getUserMediaCompat({ video: true });
}

/**
 * Waits for video to be ready with valid dimensions
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {Promise<void>} - Resolves when video is ready
 */
async function waitForVideoReady(videoElement) {
  return new Promise((resolve) => {
    if (videoElement.readyState >= 2 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      resolve();
    } else {
      videoElement.addEventListener('loadedmetadata', () => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          resolve();
        } else {
          // Sometimes we need to wait a bit longer after metadata
          videoElement.addEventListener('loadeddata', resolve);
        }
      }, { once: true });
    }
  });
}

/**
 * Cleans up video stream tracks
 * @param {HTMLVideoElement} videoElement - Video element with srcObject stream
 */
function cleanupVideoStream(videoElement) {
  if (videoElement && videoElement.srcObject) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach(track => track.stop());
  }
}

export {
  initializePoseLandmarker,
  setupCamera,
  waitForVideoReady,
  cleanupVideoStream
}; 