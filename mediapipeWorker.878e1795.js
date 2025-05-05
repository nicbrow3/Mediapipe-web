// MediaPipe Worker - Handles pose detection off the main thread
// Classic worker (not module) to allow MediaPipe to use importScripts internally
// Store references for MediaPipe classes
let FilesetResolver, PoseLandmarker, FaceLandmarker, HandLandmarker;
// Store landmarker instances
let poseLandmarker = null;
let faceLandmarker = null;
let handLandmarker = null;
let lastVideoTime = -1;
// Initialize MediaPipe models
async function initializeMediaPipe(config) {
    try {
        console.log('Worker: Starting MediaPipe initialization');
        const initStartTime = performance.now();
        // Try to load MediaPipe from local file
        try {
            // Use local file path relative to the worker
            self.importScripts('/vendor/mediapipe/vision_bundle.js');
        } catch (e) {
            console.warn('Failed to load MediaPipe from local path, trying CDN fallback:', e);
            try {
                // Fallback to CDN
                self.importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js');
            } catch (e2) {
                console.error('Failed to load MediaPipe from fallback CDN:', e2);
                throw new Error('Failed to load MediaPipe library: ' + e2.message);
            }
        }
        const importTime = performance.now() - initStartTime;
        console.log(`Worker: MediaPipe import took ${Math.round(importTime)}ms`);
        // Assign the globals to local variables
        FilesetResolver = self.FilesetResolver;
        PoseLandmarker = self.PoseLandmarker;
        FaceLandmarker = self.FaceLandmarker;
        HandLandmarker = self.HandLandmarker;
        // Configure vision tasks path - use local wasm files
        const vision = await FilesetResolver.forVisionTasks(config.wasmPath || '/vendor/mediapipe/wasm');
        const resolverTime = performance.now() - initStartTime - importTime;
        console.log(`Worker: FilesetResolver took ${Math.round(resolverTime)}ms`);
        // Choose the appropriate model based on device performance
        // Use lite model by default for better performance
        const modelPath = config.modelPath || '/vendor/mediapipe/models/pose_landmarker_lite.task';
        console.log(`Worker: Using model: ${modelPath}`);
        // Initialize PoseLandmarker
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: modelPath,
                delegate: config.delegate || 'GPU'
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: config.minConfidence || 0.5,
            minPosePresenceConfidence: config.minConfidence || 0.5,
            minTrackingConfidence: config.minTrackingConfidence || 0.5,
            outputSegmentationMasks: false
        });
        const totalInitTime = performance.now() - initStartTime;
        console.log(`Worker: Total initialization took ${Math.round(totalInitTime)}ms`);
        // Conditionally initialize FaceLandmarker if enabled
        if (config.enableFaceLandmarks) faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: config.delegate || 'GPU'
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            outputFaceBlendshapes: false
        });
        // Conditionally initialize HandLandmarker if enabled
        if (config.enableHandLandmarks) handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: config.delegate || 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || 'Unknown error initializing MediaPipe'
        };
    }
}
// Process a video frame
function processVideoFrame(imageData, width, height, timestamp) {
    try {
        if (!poseLandmarker) return {
            error: 'PoseLandmarker not initialized'
        };
        // Convert the imageData to an object the MediaPipe can process
        const image = {
            data: new Uint8Array(imageData),
            width: width,
            height: height
        };
        // Skip if same timestamp (no new frame)
        if (timestamp === lastVideoTime) return {
            noNewFrame: true
        };
        // Process with pose landmarker
        const poseResults = poseLandmarker.detectForVideo(image, timestamp);
        // Process with face landmarker if available
        let faceResults = null;
        if (faceLandmarker) faceResults = faceLandmarker.detectForVideo(image, timestamp);
        // Process with hand landmarker if available
        let handResults = null;
        if (handLandmarker) handResults = handLandmarker.detectForVideo(image, timestamp);
        // Update timestamp
        lastVideoTime = timestamp;
        // Return processed results
        return {
            pose: poseResults,
            face: faceResults,
            hand: handResults,
            timestamp: timestamp
        };
    } catch (error) {
        return {
            error: error.message || 'Error processing video frame',
            stack: error.stack
        };
    }
}
// Listen for messages from the main thread
self.onmessage = async (event)=>{
    const { type, data } = event.data;
    switch(type){
        case 'INIT':
            const initResult = await initializeMediaPipe(data.config);
            self.postMessage({
                type: 'INIT_RESULT',
                data: initResult
            });
            break;
        case 'PROCESS_FRAME':
            const result = processVideoFrame(data.imageData, data.width, data.height, data.timestamp);
            self.postMessage({
                type: 'PROCESS_RESULT',
                data: result
            });
            break;
        case 'UPDATE_CONFIG':
            // Handle config updates (e.g., toggling face/hand detection)
            if (data.enableFaceLandmarks !== undefined) {
                // Reinitialize MediaPipe with new config if needed
                const reinitResult = await initializeMediaPipe(data);
                self.postMessage({
                    type: 'CONFIG_UPDATED',
                    data: reinitResult
                });
            }
            break;
        default:
            self.postMessage({
                type: 'ERROR',
                data: {
                    error: `Unknown message type: ${type}`
                }
            });
    }
};

//# sourceMappingURL=mediapipeWorker.878e1795.js.map
