import { useState, useEffect, useRef } from 'react';
import { initializePoseLandmarker, setupCamera, waitForVideoReady, cleanupVideoStream } from '../logic/mediaSetup';

/**
 * Custom hook for handling MediaPipe and camera setup
 * @param {Object} config - MediaPipe configuration object
 * @param {Function} debugLog - Function for debug logging
 * @param {Function} progressCallback - Optional progress callback for model loading
 * @returns {Object} - MediaPipe state and functions
 */
function useMediaPipe(config, debugLog = console.log, progressCallback = null) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const poseLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  // Setup MediaPipe and camera
  const setupMediaPipe = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setErrorMessage('Video or canvas element not available');
      return;
    }

    try {
      setIsLoading(true);
      
      // Setup camera stream
      const stream = await setupCamera();
      video.srcObject = stream;
      debugLog('Webcam access successful');

      // Wait for video to be ready
      await waitForVideoReady(video);

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Initialize MediaPipe
      const result = await initializePoseLandmarker(config, debugLog, progressCallback);
      
      // If initializePoseLandmarker now returns an object with poseLandmarker and info fields
      if (result && result.poseLandmarker) {
        poseLandmarkerRef.current = result.poseLandmarker;
        // Save model info like which delegate (GPU/CPU) is being used
        setModelInfo(result.info || { delegate: 'Unknown' });
      } else {
        // For backward compatibility
        poseLandmarkerRef.current = result;
      }
      
      debugLog(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);

      setIsLoading(false);
      setCameraStarted(true);
      return true;
    } catch (error) {
      console.error('Error during setup:', error);
      debugLog('Error during setup: ' + error.message);
      setErrorMessage(`Setup error: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  // Cleanup camera stream and MediaPipe landmarker on unmount
  useEffect(() => {
    return () => {
      cleanupVideoStream(videoRef.current);
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
        debugLog('MediaPipe PoseLandmarker closed.');
      }
    };
  }, [debugLog]);

  return {
    videoRef,
    canvasRef,
    isLoading,
    errorMessage,
    poseLandmarkerRef,
    lastVideoTimeRef,
    cameraStarted,
    setCameraStarted,
    setupMediaPipe,
    modelInfo
  };
}

export default useMediaPipe; 