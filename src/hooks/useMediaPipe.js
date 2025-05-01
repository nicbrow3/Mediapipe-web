import { useState, useEffect, useRef } from 'react';
import { initializePoseLandmarker, setupCamera, waitForVideoReady, cleanupVideoStream } from '../logic/mediaSetup';

/**
 * Custom hook for handling MediaPipe and camera setup
 * @param {Object} config - MediaPipe configuration object
 * @param {Function} debugLog - Function for debug logging
 * @returns {Object} - MediaPipe state and functions
 */
function useMediaPipe(config, debugLog = console.log) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const poseLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const [cameraStarted, setCameraStarted] = useState(false);

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
      poseLandmarkerRef.current = await initializePoseLandmarker(config, debugLog);
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

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      cleanupVideoStream(videoRef.current);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading,
    errorMessage,
    poseLandmarkerRef,
    lastVideoTimeRef,
    cameraStarted,
    setCameraStarted,
    setupMediaPipe
  };
}

export default useMediaPipe; 