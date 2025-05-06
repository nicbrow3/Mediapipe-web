import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import './WorkoutTracker.css'; // Reuse existing styles
import { calculateAngle, LANDMARK_MAP } from '../logic/landmarkUtils';
import * as exercises from '../exercises';
import VideoCanvas, { setupCamera, waitForVideoReady } from './VideoCanvas';
import ExerciseSelector from './ExerciseSelector';
import AngleDisplay from './AngleDisplay';
import StatsDisplay from './StatsDisplay';
import PhaseTrackerDisplay from './PhaseTrackerDisplay';
import LandmarkMetricsDisplay from './LandmarkMetricsDisplay';

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
  const [selectedExercise, setSelectedExercise] = useState(Object.values(exercises)[0]);
  const [trackedAngles, setTrackedAngles] = useState({});
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [landmarksData, setLandmarksData] = useState(null);

  // Ref for always-current selectedExercise
  const selectedExerciseRef = useRef(selectedExercise);
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  // Constants for performance metrics
  const MAX_SAMPLES = 30; // Store last 30 samples for smoothing

  // Get exercise options from imported exercises
  const exerciseOptions = Object.values(exercises).filter(e => e && e.id && e.name);

  useEffect(() => {
  }, [selectedExercise]);

  // Log state changes
  useEffect(() => {
  }, [cameraStarted, selectedExercise, trackedAngles]);

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

    // Set landmarks for rendering
    if (results.landmarks && results.landmarks.length > 0) {
      setLandmarksData(results.landmarks[0]);
    } else {
      setLandmarksData(null);
    }

    // Use the latest selectedExercise from ref
    const exercise = selectedExerciseRef.current;
    if (results.landmarks && results.landmarks.length > 0 && exercise && exercise.logicConfig?.type === 'angle' && Array.isArray(exercise.logicConfig.anglesToTrack)) {
      const landmarks = results.landmarks[0];
      const newAngles = {};
      for (const angleConfig of exercise.logicConfig.anglesToTrack) {
        const { side, points, id } = angleConfig;
        // Map points to landmark names, e.g. left_shoulder, left_elbow, left_wrist
        const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
        const indices = pointNames.map(name => LANDMARK_MAP[name]);
        if (indices.every(idx => idx !== undefined)) {
          const [a, b, c] = indices.map(idx => landmarks[idx]);
          const angle = calculateAngle(a, b, c);
          newAngles[id] = angle ? Math.round(angle) : null;
        } else {
          newAngles[id] = null;
        }
      }
      console.log('Calculated angles:', newAngles);
      setTrackedAngles(newAngles);
    } else {
      console.log('No landmarks or exercise config, setting empty trackedAngles');
      setTrackedAngles({});
    }

    // Continue the render loop
    requestAnimationRef.current = requestAnimationFrame(renderLoop);
  }, [updateStats]);

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
      const width = videoRef.current.videoWidth;
      const height = videoRef.current.videoHeight;
      setCanvasDimensions({ width, height });
      
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
      {/* Exercise Dropdown (only show after camera started) */}
      {cameraStarted && (
        <ExerciseSelector 
          exerciseOptions={exerciseOptions}
          selectedExercise={selectedExercise}
          onChange={setSelectedExercise}
        />
      )}
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
        <VideoCanvas
          videoRef={videoRef}
          canvasRef={canvasRef}
          landmarks={landmarksData}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          cameraStarted={cameraStarted}
        />
        
        {/* Phase and Rep Counter */}
        {cameraStarted && (
          <PhaseTrackerDisplay
            selectedExercise={selectedExercise}
            trackedAngles={trackedAngles}
          />
        )}
        
        {/* Angle Displays for selected exercise */}
        <AngleDisplay 
          selectedExercise={selectedExercise}
          trackedAngles={trackedAngles}
        />
        
        {/* Landmark Metrics Display */}
        {cameraStarted && landmarksData && (
          <LandmarkMetricsDisplay
            selectedExercise={selectedExercise}
            landmarksData={landmarksData}
            trackedAngles={trackedAngles}
          />
        )}
        
        {/* Stats Display */}
        <StatsDisplay 
          stats={stats} 
          cameraStarted={cameraStarted} 
        />
      </div>
    </div>
  );
};

export default MinimalTracker; 