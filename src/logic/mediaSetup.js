import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

/**
 * Loads a model from IndexedDB if available
 * @param {string} modelType - The model type (lite, full, heavy)
 * @returns {Promise<Uint8Array|null>} - The model buffer or null if not found
 */
async function loadModelFromIndexedDB(modelType) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MediaPipeModels', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'name' });
      }
    };
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      resolve(null);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const getRequest = store.get(`pose_landmarker_${modelType}`);
      
      getRequest.onerror = (event) => {
        console.error('Error getting model from IndexedDB:', event);
        resolve(null);
      };
      
      getRequest.onsuccess = (event) => {
        const model = getRequest.result;
        if (model) {
          resolve(model.data);
        } else {
          resolve(null);
        }
      };
    };
  });
}

/**
 * Saves a model to IndexedDB
 * @param {string} modelType - The model type (lite, full, heavy)
 * @param {Uint8Array} modelData - The model data
 * @returns {Promise<boolean>} - Whether the save was successful
 */
async function saveModelToIndexedDB(modelType, modelData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MediaPipeModels', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('models')) {
        db.createObjectStore('models', { keyPath: 'name' });
      }
    };
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      resolve(false);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      
      const saveRequest = store.put({
        name: `pose_landmarker_${modelType}`,
        data: modelData,
        timestamp: Date.now()
      });
      
      saveRequest.onerror = (event) => {
        console.error('Error saving model to IndexedDB:', event);
        resolve(false);
      };
      
      saveRequest.onsuccess = (event) => {
        resolve(true);
      };
    };
  });
}

/**
 * Gets a model buffer either from IndexedDB or by downloading it
 * @param {Object} config - Configuration object
 * @param {Function} debugLog - Debug logging function
 * @param {Function} progressCallback - Optional callback for download progress
 * @returns {Promise<Uint8Array|null>} - The model buffer
 */
async function getModelBuffer(config, debugLog, progressCallback = null) {
  const modelPath = config.mediapipe.modelPath;
  const modelType = modelPath.includes('lite') ? 'lite' : 
                    modelPath.includes('full') ? 'full' : 
                    modelPath.includes('heavy') ? 'heavy' : 'unknown';
  
  // Check if we're using a local model
  const useLocalModel = modelPath.startsWith(window.location.origin);
  if (useLocalModel) {
    debugLog('Using locally stored model');
    
    // Try to get model from IndexedDB
    const modelBuffer = await loadModelFromIndexedDB(modelType);
    if (modelBuffer) {
      debugLog('Found model in IndexedDB, using it');
      return modelBuffer;
    }
    
    // If not in IndexedDB, we need to download and store it
    debugLog('Model not found in IndexedDB, downloading from remote URL');
    
    // Derive the remote URL from the model type
    const remoteUrl = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelType}/float16/1/pose_landmarker_${modelType}.task`;
    
    try {
      debugLog(`Downloading model from ${remoteUrl}`);
      const response = await fetch(remoteUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }
      
      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      const reader = response.body.getReader();
      let receivedLength = 0;
      let chunks = [];
      
      // Process the data stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress if callback provided
        if (progressCallback) {
          const progress = Math.round((receivedLength / total) * 100);
          progressCallback(progress);
        }
      }
      
      // Combine all chunks into a single Uint8Array
      const modelBuffer = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        modelBuffer.set(chunk, position);
        position += chunk.length;
      }
      
      // Save to IndexedDB for future use
      const saveResult = await saveModelToIndexedDB(modelType, modelBuffer);
      debugLog(`Model saved to IndexedDB: ${saveResult}`);
      
      // Mark as downloaded in localStorage for UI state
      localStorage.setItem(`pose_landmarker_${modelType}_downloaded`, 'true');
      
      return modelBuffer;
    } catch (error) {
      debugLog(`Error downloading model: ${error.message}`);
      return null;
    }
  } else {
    // Using remote model path directly
    debugLog('Using remote model path directly');
    return null;
  }
}

/**
 * Initializes MediaPipe PoseLandmarker
 * @param {Object} config - App configuration with MediaPipe settings
 * @param {Function} debugLog - Function for debug logging
 * @param {Function} progressCallback - Optional callback for download progress
 * @returns {Promise<Object>} - Object containing initialized pose landmarker and model info
 */
async function initializePoseLandmarker(config, debugLog = console.log, progressCallback = null) {
  debugLog('Setting up MediaPipe...');
  debugLog(`Using WASM path: ${config.mediapipe.wasmPath}`);
  
  // Initialize FilesetResolver
  const vision = await FilesetResolver.forVisionTasks(config.mediapipe.wasmPath);
  
  if (!vision) {
    throw new Error('Failed to initialize FilesetResolver');
  }
  
  debugLog('FilesetResolver initialized successfully');
  
  // Check if we need to load a local model
  const modelBuffer = await getModelBuffer(config, debugLog, progressCallback);
  
  let poseLandmarker = null;
  let modelInfo = {
    delegate: 'Unknown',
    isLocalModel: !!modelBuffer,
    modelPath: config.mediapipe.modelPath
  };
  
  // First try with GPU
  try {
    debugLog('Attempting to initialize with GPU delegate...');
    debugLog(`Face landmarks enabled: ${config.pose.enableFaceLandmarks}, Hand landmarks enabled: ${config.pose.enableHandLandmarks}`);
    
    const options = {
      runningMode: 'VIDEO',
      numPoses: config.pose.numPoses,
      minPoseDetectionConfidence: config.pose.minPoseDetectionConfidence,
      minPosePresenceConfidence: config.pose.minPosePresenceConfidence,
      minTrackingConfidence: config.pose.minTrackingConfidence,
      outputSegmentationMasks: false,
      enableFaceLandmarks: config.pose.enableFaceLandmarks,
      enableHandLandmarks: config.pose.enableHandLandmarks
    };
    
    // Different initialization based on whether we have a local model buffer
    if (modelBuffer) {
      debugLog('Using local model buffer with GPU');
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: {
          modelAssetBuffer: modelBuffer,
          delegate: 'GPU'
        }
      });
    } else {
      debugLog('Using remote model path with GPU');
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: {
          modelAssetPath: config.mediapipe.modelPath,
          delegate: 'GPU'
        }
      });
    }
    
    debugLog('Successfully initialized with GPU delegate');
    modelInfo.delegate = 'GPU';
  } catch (gpuError) {
    // If GPU fails, try with CPU
    debugLog('GPU initialization failed: ' + gpuError.message);
    debugLog('Falling back to CPU delegate...');
    
    try {
      const options = {
        runningMode: 'VIDEO',
        numPoses: config.pose.numPoses,
        minPoseDetectionConfidence: config.pose.minPoseDetectionConfidence,
        minPosePresenceConfidence: config.pose.minPosePresenceConfidence,
        minTrackingConfidence: config.pose.minTrackingConfidence,
        outputSegmentationMasks: false,
        enableFaceLandmarks: config.pose.enableFaceLandmarks,
        enableHandLandmarks: config.pose.enableHandLandmarks
      };
      
      // Different initialization based on whether we have a local model buffer
      if (modelBuffer) {
        debugLog('Using local model buffer with CPU');
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: {
            modelAssetBuffer: modelBuffer,
            delegate: 'CPU'
          }
        });
      } else {
        debugLog('Using remote model path with CPU');
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: {
            modelAssetPath: config.mediapipe.modelPath,
            delegate: 'CPU'
          }
        });
      }
      
      debugLog('Successfully initialized with CPU delegate');
      modelInfo.delegate = 'CPU';
    } catch (cpuError) {
      throw new Error(`Failed to initialize with both GPU and CPU: GPU error: ${gpuError.message}, CPU error: ${cpuError.message}`);
    }
  }
  
  if (!poseLandmarker) {
    throw new Error('Failed to initialize PoseLandmarker');
  }
  
  // Extract model type from the model path
  const modelPath = config.mediapipe.modelPath;
  const modelType = modelPath.includes('lite') ? 'lite' : 
                    modelPath.includes('full') ? 'full' : 
                    modelPath.includes('heavy') ? 'heavy' : 'unknown';
  
  modelInfo.modelType = modelType;
  
  debugLog('MediaPipe setup complete!');
  return {
    poseLandmarker, 
    info: modelInfo
  };
}

/**
 * Sets up the camera stream
 * @returns {Promise<MediaStream>} The camera stream
 */
async function setupCamera() {
  const constraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user'
    }
  };
  return await navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Waits for a video element to be ready with valid dimensions
 * @param {HTMLVideoElement} videoElement The video element to wait for
 * @returns {Promise<void>}
 */
function waitForVideoReady(videoElement) {
  return new Promise((resolve) => {
    if (videoElement.readyState >= 2) {
      resolve();
    } else {
      videoElement.onloadeddata = () => {
        resolve();
      };
    }
  });
}

/**
 * Cleans up the video stream by stopping all tracks
 * @param {HTMLVideoElement} videoElement The video element with the stream
 */
function cleanupVideoStream(videoElement) {
  if (videoElement && videoElement.srcObject) {
    const stream = videoElement.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    videoElement.srcObject = null;
  }
}

export {
  initializePoseLandmarker,
  setupCamera,
  waitForVideoReady,
  cleanupVideoStream,
  loadModelFromIndexedDB,
  saveModelToIndexedDB
}; 