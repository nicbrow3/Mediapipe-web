import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import './WorkoutTracker.css'; // Reuse existing styles

const MinimalTracker = () => {
  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const requestAnimationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const inferenceTimesRef = useRef([]);
  const fpsTimesRef = useRef([]);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [stats, setStats] = useState({
    fps: 0,
    inferenceTime: 0
  });

  // Constants for performance metrics
  const MAX_SAMPLES = 30; // Store last 30 samples for smoothing

  // Setup camera
  const setupCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      return stream;
    } catch (error) {
      throw new Error(`Error accessing camera: ${error.message}`);
    }
  };

  // Wait for video to be ready
  const waitForVideoReady = (videoElement) => {
    return new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve(videoElement);
      };
    });
  };

  // Initialize MediaPipe
  const initializePoseLandmarker = async () => {
    console.log('Initializing MediaPipe...');
    
    try {
      // Initialize FilesetResolver
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      if (!vision) {
        throw new Error('Failed to initialize FilesetResolver');
      }

      console.log('FilesetResolver initialized successfully');
      
      // Create pose landmarker with minimal settings
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
      
      console.log('PoseLandmarker created successfully');
      return poseLandmarker;
    } catch (error) {
      console.error('Error initializing PoseLandmarker:', error);
      throw error;
    }
  };

  // Add measurement to rolling average
  const addMeasurement = (array, value) => {
    array.push(value);
    if (array.length > MAX_SAMPLES) {
      array.shift(); // Remove oldest
    }
    
    // Calculate average
    return array.reduce((sum, val) => sum + val, 0) / array.length;
  };

  // Update stats state with latest measurements
  const updateStats = useCallback((fps, inferenceTime) => {
    setStats({
      fps: Math.round(fps),
      inferenceTime: Math.round(inferenceTime)
    });
  }, []);

  // Main render loop
  const renderLoop = useCallback(async (now) => {
    if (!poseLandmarkerRef.current || !videoRef.current || !canvasRef.current) {
      requestAnimationRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Calculate FPS
    const fps = 1000.0 / (now - lastFrameTimeRef.current);
    lastFrameTimeRef.current = now;
    const avgFps = addMeasurement(fpsTimesRef.current, fps);

    // Process the frame
    const startTime = performance.now();
    
    // Detect poses
    const results = await poseLandmarkerRef.current.detectForVideo(video, now);
    
    // Measure inference time
    const inferenceTime = performance.now() - startTime;
    const avgInferenceTime = addMeasurement(inferenceTimesRef.current, inferenceTime);
    
    // Update stats periodically (not every frame to avoid UI thrashing)
    if (fpsTimesRef.current.length % 5 === 0) {
      updateStats(avgFps, avgInferenceTime);
    }

    // Draw results
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // First draw the video frame
    ctx.save();
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Then draw the landmarks if available
    if (results.landmarks?.length > 0) {
      for (const landmarks of results.landmarks) {
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
      }
    }
    
    ctx.restore();

    // Continue the render loop
    requestAnimationRef.current = requestAnimationFrame(renderLoop);
  }, [updateStats]);

  // Draw landmarks on canvas
  const drawLandmarks = (ctx, landmarks, width, height) => {
    if (!landmarks) return;

    // Set styles for landmarks
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Draw each landmark
    for (const landmark of landmarks) {
      // Convert normalized coordinates to pixel coordinates
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      // Draw landmark point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw connections between landmarks (simplified)
    // POSE_CONNECTIONS would normally come from MediaPipe, but we'll use a simplified subset
    const connections = [
      // Torso
      [11, 12], [12, 24], [24, 23], [23, 11],
      // Arms
      [11, 13], [13, 15], [12, 14], [14, 16],
      // Legs
      [23, 25], [25, 27], [24, 26], [26, 28],
      // Head
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8]
    ];
    
    ctx.beginPath();
    for (const [i, j] of connections) {
      if (landmarks[i] && landmarks[j]) {
        const x1 = landmarks[i].x * width;
        const y1 = landmarks[i].y * height;
        const x2 = landmarks[j].x * width;
        const y2 = landmarks[j].y * height;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();
  };

  // Start camera and tracking
  const handleStartCamera = async () => {
    try {
      setIsLoading(true);
      
      // Setup camera stream
      const stream = await setupCamera();
      videoRef.current.srcObject = stream;
      console.log('Webcam access successful');

      // Wait for video to be ready
      await waitForVideoReady(videoRef.current);

      // Set canvas dimensions to match video
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      
      // Initialize MediaPipe
      poseLandmarkerRef.current = await initializePoseLandmarker();
      
      console.log('Setup complete, starting render loop');
      
      setIsLoading(false);
      setCameraStarted(true);
      
      // Start the render loop
      lastFrameTimeRef.current = performance.now();
      requestAnimationRef.current = requestAnimationFrame(renderLoop);
    } catch (error) {
      console.error('Error during setup:', error);
      setErrorMessage(`Setup error: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      // Cancel animation frame
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
      
      // Stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      // Close pose landmarker
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, []);

  return (
    <div className="workout-tracker-container">
      {isLoading && <div className="loading-overlay">Loading Camera & Model...</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      
      {/* Show Start Camera button if not started */}
      {!cameraStarted && (
        <div style={{
          zIndex: 10, 
          position: 'absolute', 
          left: '50%', 
          top: '40%', 
          transform: 'translate(-50%, -50%)'
        }}>
          <button 
            onClick={handleStartCamera} 
            className="start-camera-btn" 
            style={{ 
              fontSize: 24, 
              padding: '1em 2em', 
              borderRadius: 8, 
              background: '#45a29e', 
              color: 'white', 
              border: 'none', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
            }}
          >
            Start Minimal Tracking
          </button>
        </div>
      )}

      <div className="video-canvas-container">
        <video 
          ref={videoRef} 
          className="input_video" 
          autoPlay 
          playsInline 
          muted 
        />
        <canvas ref={canvasRef} className="output_canvas" />
        
        {/* Stats Display */}
        {cameraStarted && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '16px',
            zIndex: 100
          }}>
            FPS: {stats.fps} | Inference Time: {stats.inferenceTime}ms
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalTracker; 