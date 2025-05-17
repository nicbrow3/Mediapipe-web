import { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { calculateAngle, LANDMARK_MAP } from '../logic/landmarkUtils';
import { setupCamera, waitForVideoReady } from '../components/VideoCanvas'; // Assuming these can be imported or moved

//handles MediaPipe initialization, camera setup, the render loop,
// and related state like isLoading, landmarksData, trackedAngles, etc.

// Constants for performance metrics and smoothing
const MAX_SAMPLES = 150; // samples for fps and inference time
export const ANGLE_SMOOTHING_WINDOW = 25; // Number of frames to use for angle smoothing

export const usePoseTracker = (selectedExerciseRef, appSettings) => {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const requestAnimationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const inferenceTimesRef = useRef([]);
  const fpsTimesRef = useRef([]);
  const angleHistoryRef = useRef({});

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [stats, setStats] = useState({
    fps: 0,
    inferenceTime: 0
  });
  const [trackedAngles, setTrackedAngles] = useState({});
  const [rawAngles, setRawAngles] = useState({});
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [landmarksData, setLandmarksData] = useState(null);

  // Initialize MediaPipe
  const initializePoseLandmarker = async () => {
    console.log('[usePoseTracker] Initializing MediaPipe...');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (!vision) {
        throw new Error('Failed to initialize FilesetResolver');
      }
      console.log('[usePoseTracker] FilesetResolver initialized successfully');
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
        enableFaceLandmarks: false,
        enableHandLandmarks: false
      });
      console.log('[usePoseTracker] PoseLandmarker created successfully');
      return poseLandmarker;
    } catch (error) {
      console.error('[usePoseTracker] Error initializing PoseLandmarker:', error);
      throw error;
    }
  };

  // Add measurement to rolling average
  const addMeasurement = (array, value) => {
    array.push(value);
    if (array.length > MAX_SAMPLES) {
      array.shift(); // Remove oldest
    }
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  };

  // Update stats state with latest measurements
  const updateStats = useCallback((fps, inferenceTime) => {
    setStats({
      fps: Math.round(fps),
      inferenceTime: Math.round(inferenceTime)
    });
  }, []);
  
  // Smooth angle function
  const smoothAngle = useCallback((angleId, rawAngleValue) => {
    if (!appSettings.isSmoothingEnabled || rawAngleValue === null) {
      return rawAngleValue;
    }
    if (!angleHistoryRef.current[angleId]) {
      angleHistoryRef.current[angleId] = [];
    }
    const history = angleHistoryRef.current[angleId];
    history.push(rawAngleValue);
    if (history.length > ANGLE_SMOOTHING_WINDOW) {
      history.shift();
    }
    const sum = history.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / history.length);
  }, [appSettings.isSmoothingEnabled]);


  // Main render loop
  const renderLoop = useCallback(async (now) => {
    if (!poseLandmarkerRef.current || !videoRef.current || !canvasRef.current) {
      requestAnimationRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const video = videoRef.current;
    const fps = 1000.0 / (now - lastFrameTimeRef.current);
    lastFrameTimeRef.current = now;
    const avgFps = addMeasurement(fpsTimesRef.current, fps);

    const startTime = performance.now();
    const results = await poseLandmarkerRef.current.detectForVideo(video, now);
    const inferenceTime = performance.now() - startTime;
    const avgInferenceTime = addMeasurement(inferenceTimesRef.current, inferenceTime);

    if (fpsTimesRef.current.length % 5 === 0) {
      updateStats(avgFps, avgInferenceTime);
    }

    if (results.landmarks && results.landmarks.length > 0) {
      setLandmarksData(results.landmarks[0]);
    } else {
      setLandmarksData(null);
    }

    const exercise = selectedExerciseRef.current;
    if (results.landmarks && results.landmarks.length > 0 && exercise && exercise.logicConfig?.type === 'angle' && Array.isArray(exercise.logicConfig.anglesToTrack)) {
      const landmarks = results.landmarks[0];
      const newAngles = {};
      const newRawAngles = {};
      
      for (const angleConfig of exercise.logicConfig.anglesToTrack) {
        const { side, points, id } = angleConfig;
        const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
        const indices = pointNames.map(name => LANDMARK_MAP[name]);

        if (indices.every(idx => idx !== undefined)) {
          const [a, b, c] = indices.map(idx => landmarks[idx]);
          const rawAngle = calculateAngle(a, b, c);
          newRawAngles[id] = rawAngle !== null ? Math.round(rawAngle) : null;
          if (appSettings.isSmoothingEnabled && rawAngle !== null) {
            newAngles[id] = smoothAngle(id, rawAngle);
          } else {
            newAngles[id] = rawAngle !== null ? Math.round(rawAngle) : null;
          }
        } else {
          newAngles[id] = null;
          newRawAngles[id] = null;
        }
      }
      setTrackedAngles(newAngles);
      setRawAngles(newRawAngles);
    } else {
      setTrackedAngles({});
      setRawAngles({});
    }
    requestAnimationRef.current = requestAnimationFrame(renderLoop);
  }, [updateStats, selectedExerciseRef, appSettings.isSmoothingEnabled, smoothAngle]);

  // Start camera and tracking
  const startTracking = useCallback(async () => {
    try {
      setCameraStarted(true);
      setIsLoading(true);
      setErrorMessage('');
      
      const stream = await setupCamera(); // Assumes setupCamera is imported or defined within
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[usePoseTracker] Webcam access successful');
        await waitForVideoReady(videoRef.current); // Assumes waitForVideoReady is imported or defined
        const video = videoRef.current;
        const aspectRatio = video.videoHeight / video.videoWidth;
        const newWidth = window.innerWidth;
        const newHeight = newWidth * aspectRatio;
        setCanvasDimensions({ width: newWidth, height: newHeight });
      } else {
        throw new Error("Video element not available.");
      }
      
      poseLandmarkerRef.current = await initializePoseLandmarker();
      console.log('[usePoseTracker] Setup complete, starting render loop');
      setIsLoading(false);
      lastFrameTimeRef.current = performance.now();
      requestAnimationRef.current = requestAnimationFrame(renderLoop);
    } catch (error) {
      console.error('[usePoseTracker] Error during setup:', error);
      setErrorMessage(`Setup error: ${error.message}`);
      setIsLoading(false);
      setCameraStarted(false);
    }
  }, [renderLoop]); // Removed initializePoseLandmarker from deps, it's stable

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        const aspectRatio = video.videoHeight / video.videoWidth;
        const newWidth = window.innerWidth;
        const newHeight = newWidth * aspectRatio;
        setCanvasDimensions({ width: newWidth, height: newHeight });
      }
    };
    window.addEventListener('resize', updateDimensions);
    if (cameraStarted && videoRef.current && videoRef.current.videoWidth > 0) {
        updateDimensions();
    }
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [cameraStarted]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null; // Explicitly nullify
      }
      console.log('[usePoseTracker] Cleaned up resources.');
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading,
    errorMessage,
    cameraStarted,
    landmarksData,
    trackedAngles,
    rawAngles,
    stats,
    startTracking,
    canvasDimensions,
    angleHistoryRef // Exposing for debugging or if needed by consuming component to clear
  };
}; 