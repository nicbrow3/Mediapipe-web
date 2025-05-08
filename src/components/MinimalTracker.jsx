import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import './MinimalTracker.css'; // Use new layout styles
import { calculateAngle, LANDMARK_MAP } from '../logic/landmarkUtils';
import * as exercises from '../exercises';
import { useAppSettings } from '../hooks/useAppSettings';
import VideoCanvas, { setupCamera, waitForVideoReady } from './VideoCanvas';
import ExerciseSelector from './ExerciseSelector';
import AngleDisplay from './AngleDisplay';
import StatsDisplay from './StatsDisplay';
import PhaseTrackerDisplay from './PhaseTrackerDisplay';
import LandmarkMetricsDisplay2 from './LandmarkMetricsDisplay2';
import WeightIndicator from './WeightIndicator';
import RepGoalIndicator from './RepGoalIndicator';
import { Loader } from '@mantine/core';

const MinimalTracker = () => {
  // References
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const requestAnimationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const inferenceTimesRef = useRef([]);
  const fpsTimesRef = useRef([]);
  const angleHistoryRef = useRef({});
  
  // Settings Hook
  const [appSettings, updateAppSettings] = useAppSettings();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  const [stats, setStats] = useState({
    fps: 0,
    inferenceTime: 0
  });
  const [selectedExercise, setSelectedExercise] = useState(() => {
    const initialExerciseId = appSettings.selectedExerciseId;
    if (initialExerciseId) {
      const foundExercise = Object.values(exercises).find(ex => ex.id === initialExerciseId);
      if (foundExercise) return foundExercise;
    }
    return Object.values(exercises)[0]; // Default
  });
  const [trackedAngles, setTrackedAngles] = useState({});
  const [rawAngles, setRawAngles] = useState({});
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [landmarksData, setLandmarksData] = useState(null);
  const [smoothingEnabled, setSmoothingEnabled] = useState(appSettings.isSmoothingEnabled);
  const [weight, setWeight] = useState(appSettings.selectedWeights !== null ? appSettings.selectedWeights : 0);
  const [repGoal, setRepGoal] = useState(10);

  // Ref for always-current selectedExercise
  const selectedExerciseRef = useRef(selectedExercise);
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  // Ref for always-current smoothingEnabled state
  const smoothingEnabledRef = useRef(smoothingEnabled);
  useEffect(() => {
    smoothingEnabledRef.current = smoothingEnabled;
  }, [smoothingEnabled]);

  // Constants for performance metrics
  const MAX_SAMPLES = 300; // samples for fps and inference time
  const ANGLE_SMOOTHING_WINDOW = 25; // Number of frames to use for angle smoothing (approx. 0.5s at 30fps)

  // Get exercise options from imported exercises
  const exerciseOptions = Object.values(exercises).filter(e => e && e.id && e.name);

  // Handlers that update state and appSettings
  const handleExerciseChange = useCallback((newExercise) => {
    setSelectedExercise(newExercise);
    updateAppSettings({ selectedExerciseId: newExercise.id });
  }, [updateAppSettings]);

  const toggleSmoothingAndUpdateSettings = useCallback(() => {
    setSmoothingEnabled(prev => {
      const newValue = !prev;
      updateAppSettings({ isSmoothingEnabled: newValue });
      angleHistoryRef.current = {}; // Clear angle history when toggling
      return newValue;
    });
  }, [updateAppSettings]);

  const handleWeightChange = useCallback((newWeight) => {
    setWeight(newWeight);
    updateAppSettings({ selectedWeights: newWeight });
  }, [updateAppSettings]);

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
      const newRawAngles = {};
      
      for (const angleConfig of exercise.logicConfig.anglesToTrack) {
        const { side, points, id } = angleConfig;
        const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
        const indices = pointNames.map(name => LANDMARK_MAP[name]);

        if (indices.every(idx => idx !== undefined)) {
          const [a, b, c] = indices.map(idx => landmarks[idx]);
          const rawAngle = calculateAngle(a, b, c); // This is the raw float

          // Store raw angle (rounded for display in (raw: X) part of AngleDisplay)
          newRawAngles[id] = rawAngle !== null ? Math.round(rawAngle) : null;

          // Apply smoothing if enabled, otherwise use raw angle
          if (smoothingEnabledRef.current && rawAngle !== null) {
            newAngles[id] = smoothAngle(id, rawAngle);
          } else {
            newAngles[id] = rawAngle !== null ? Math.round(rawAngle) : null;
          }

        } else {
          newAngles[id] = null;
          newRawAngles[id] = null;
        }
      }
      
      // Add a log here to see what's being set
      // console.log('[MinimalTracker] RenderLoop - Smoothing: ', smoothingEnabled, 'Setting newAngles:', JSON.parse(JSON.stringify(newAngles)));
      setTrackedAngles(newAngles);
      setRawAngles(newRawAngles);
    } else {
      // console.log('No landmarks or exercise config, setting empty trackedAngles');
      setTrackedAngles({});
      setRawAngles({});
    }

    // Continue the render loop
    requestAnimationRef.current = requestAnimationFrame(renderLoop);
  }, [updateStats]);

  // Start camera and tracking
  const handleStartCamera = async () => {
    try {
      // First set cameraStarted to true so the UI changes to camera view
      setCameraStarted(true);
      // Then set loading to true to show the spinner
      setIsLoading(true);
      
      const stream = await setupCamera();
      if (videoRef.current) { // Ensure videoRef is available
        videoRef.current.srcObject = stream;
        console.log('Webcam access successful');

        await waitForVideoReady(videoRef.current);

        // Calculate initial canvas dimensions
        const video = videoRef.current;
        const aspectRatio = video.videoHeight / video.videoWidth;
        const newWidth = window.innerWidth;
        const newHeight = newWidth * aspectRatio;
        setCanvasDimensions({ width: newWidth, height: newHeight });
      } else {
        throw new Error("Video element not available.");
      }
      
      poseLandmarkerRef.current = await initializePoseLandmarker();
      
      console.log('Setup complete, starting render loop');
      
      // Finally set loading to false when everything is ready
      setIsLoading(false);
      
      lastFrameTimeRef.current = performance.now();
      requestAnimationRef.current = requestAnimationFrame(renderLoop);
    } catch (error) {
      console.error('Error during setup:', error);
      setErrorMessage(`Setup error: ${error.message}`);
      setIsLoading(false);
      // If there's an error, we might want to reset cameraStarted
      setCameraStarted(false);
    }
  };

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (videoRef.current && videoRef.current.videoWidth > 0) { // Ensure video has dimensions
        const video = videoRef.current;
        const aspectRatio = video.videoHeight / video.videoWidth;
        const newWidth = window.innerWidth;
        const newHeight = newWidth * aspectRatio;
        setCanvasDimensions({ width: newWidth, height: newHeight });
      }
    };

    window.addEventListener('resize', updateDimensions);
    // Call it once initially in case the video is already ready from a previous mount
    // or if handleStartCamera doesn't cover all scenarios (e.g. HMR)
    if (cameraStarted && videoRef.current && videoRef.current.videoWidth > 0) {
        updateDimensions();
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [cameraStarted]); // Re-run if cameraStarted changes, to ensure dimensions are set after camera is up

  // Toggle smoothing
  // const toggleSmoothing = () => {
  //   const newValue = !smoothingEnabled;
  //   setSmoothingEnabled(newValue);
  //   // Clear angle history when toggling
  //   angleHistoryRef.current = {};
  // };

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

  // Restore original smoothAngle function for now, as the test is in renderLoop
  const smoothAngle = (angleId, rawAngleValue) => {
    if (!smoothingEnabledRef.current || rawAngleValue === null) {
      return rawAngleValue; 
    }
    // Original smoothing logic:
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
  };

  // Reset rep goal to 10 when exercise changes
  useEffect(() => {
    setRepGoal(10);
  }, [selectedExercise]);

  return (
    <div className="minimal-tracker-root">
      {/* Controls overlay - only show after camera started */}
      {cameraStarted && (
        <div className="tracker-controls" style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 0',
          gap: '15px',
          zIndex: 200
        }}>
          {/* Stats display at top */}
          <StatsDisplay 
            stats={stats} 
            cameraStarted={cameraStarted} 
            landmarksData={landmarksData} 
            smoothingEnabled={smoothingEnabled}
            smoothingWindow={ANGLE_SMOOTHING_WINDOW}
          />
          
          {/* Exercise selector and controls row */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            width: '100%',
            gap: '20px'
          }}>
            <ExerciseSelector 
              exerciseOptions={exerciseOptions}
              selectedExercise={selectedExercise}
              onChange={handleExerciseChange}
            />
            
            <button 
              onClick={toggleSmoothingAndUpdateSettings}
              className="smoothing-toggle"
              style={{
                background: smoothingEnabled ? '#45a29e' : '#1c2833',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {smoothingEnabled ? 'Smoothing: ON' : 'Smoothing: OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Show loading spinner only after camera button is clicked and while loading */}
      {isLoading && cameraStarted && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px'
        }}>
          <Loader size="xl" color="#45a29e" />
          <div style={{ color: 'white', fontWeight: 'bold' }}>Loading Camera & Model...</div>
        </div>
      )}
      
      {/* Show error message with improved styling */}
      {errorMessage && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '80%'
        }}>
          <div style={{ color: '#ff5252', fontWeight: 'bold', textAlign: 'center' }}>{errorMessage}</div>
          <button 
            onClick={() => {setErrorMessage(''); setCameraStarted(false);}} 
            style={{ 
              fontSize: 16, 
              padding: '0.5em 1em', 
              borderRadius: 4, 
              background: '#45a29e', 
              color: 'white', 
              border: 'none', 
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}
      
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
        
        {/* Overlay stacks for left and right-aligned UI */}
        <div className="minimal-tracker-overlay">
          <div className="minimal-tracker-stack left">
            {/* Place left-aligned overlays here */}
            <AngleDisplay 
              displaySide="left"
              selectedExercise={selectedExercise}
              trackedAngles={trackedAngles}
              rawAngles={rawAngles}
              smoothingEnabled={smoothingEnabled}
            />
            <PhaseTrackerDisplay
              displaySide="left"
              selectedExercise={selectedExercise}
              trackedAngles={trackedAngles}
            />
            <LandmarkMetricsDisplay2
              displaySide="left"
              selectedExercise={selectedExercise}
              landmarksData={landmarksData}
              trackedAngles={trackedAngles}
            />
          </div>
          <div className="minimal-tracker-stack right">
            {/* Place overlays here for right-aligned overlays */}
            <AngleDisplay 
              displaySide="right"
              selectedExercise={selectedExercise}
              trackedAngles={trackedAngles}
              rawAngles={rawAngles}
              smoothingEnabled={smoothingEnabled}
            />
            <PhaseTrackerDisplay
              displaySide="right"
              selectedExercise={selectedExercise}
              trackedAngles={trackedAngles}
            />
            <LandmarkMetricsDisplay2
              displaySide="right"
              selectedExercise={selectedExercise}
              landmarksData={landmarksData}
              trackedAngles={trackedAngles}
            />
          </div>
        </div>
        {/* Bottom-center controls container */}
        <div style={{
          position: 'fixed',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          zIndex: 400
        }}>
          <RepGoalIndicator repGoal={repGoal} setRepGoal={setRepGoal} />
          {selectedExercise?.hasWeight && (
            <WeightIndicator weight={weight} setWeight={handleWeightChange} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MinimalTracker; 