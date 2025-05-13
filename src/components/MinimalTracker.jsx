import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import './MinimalTracker.css'; // Use new layout styles
import { calculateAngle, LANDMARK_MAP } from '../logic/landmarkUtils';
import * as exercises from '../exercises';
import { useAppSettings } from '../hooks/useAppSettings';
import { useSessionLogic } from '../hooks/useSessionLogic'; // Timed session hook
import { useLadderSessionLogic } from '../hooks/useLadderSessionLogic'; // New ladder session hook
import VideoCanvas, { setupCamera, waitForVideoReady } from './VideoCanvas';
import AngleDisplay from './AngleDisplay';
import PhaseTrackerDisplay from './PhaseTrackerDisplay';
import LandmarkMetricsDisplay2 from './LandmarkMetricsDisplay2';
import StartButton from './common/StartButton';
import LoadingDisplay from './common/LoadingDisplay';
import ErrorDisplay from './common/ErrorDisplay';
import TrackerControlsBar from './common/TrackerControlsBar';
import BottomControls from './common/BottomControls';
import { ActionIcon } from '@mantine/core';
import { Gear } from 'phosphor-react';
import SettingsOverlay from './SettingsOverlay';
import { RepCounterProvider } from './RepCounterContext';
import RepGoalDisplayContainer from './RepGoalDisplayContainer';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  const [useThreePhases, setUseThreePhases] = useState(appSettings.useThreePhases);

  // Workout Mode State
  const [workoutMode, setWorkoutMode] = useState('manual'); // 'manual', 'session', or 'ladder'

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

  const togglePhaseModeAndUpdateSettings = useCallback((checked) => {
    // If checked is passed directly from the Switch component, use it
    // Otherwise toggle the current value
    setUseThreePhases(prev => {
      const newValue = checked !== undefined ? checked : !prev;
      updateAppSettings({ useThreePhases: newValue });
      return newValue;
    });
  }, [updateAppSettings]);

  const handleWeightChange = useCallback((newWeight) => {
    setWeight(newWeight);
    updateAppSettings({ selectedWeights: newWeight });
  }, [updateAppSettings]);

  // Select a random exercise (passed to useSessionLogic)
  const selectRandomExercise = useCallback(() => {
    if (exerciseOptions && exerciseOptions.length > 0) {
      let randomExercise;
      const currentExercise = selectedExerciseRef.current;
      
      // If we have more than one exercise option
      if (exerciseOptions.length > 1) {
        // Keep selecting until we get a different exercise
        do {
          randomExercise = exerciseOptions[Math.floor(Math.random() * exerciseOptions.length)];
        } while (randomExercise.id === currentExercise?.id);
      } else {
        // If we only have one exercise, use it
        randomExercise = exerciseOptions[0];
      }
      
      // Don't call handleExerciseChange here - it's causing the duplicate logs
      console.log('[MinimalTracker] Random exercise selected:', randomExercise?.name);
      return randomExercise;
    }
    return null;
  }, [exerciseOptions]);

  // Use the timed session logic hook
  const {
    isSessionActive: isTimedSessionActive,
    sessionPhase: timedSessionPhase,
    currentTimerValue: timedSessionTimerValue,
    handleToggleSession: handleToggleTimedSession,
    currentExercise: timedSessionCurrentExercise,
    upcomingExercise: timedSessionUpcomingExercise,
    totalSets: timedSessionTotalSets,
    currentSetNumber: timedSessionCurrentSetNumber,
    updateSessionSettings,
    sessionSettings,
  } = useSessionLogic(selectRandomExercise);

  // Use the ladder session logic hook
  const {
    isSessionActive: isLadderSessionActive,
    sessionPhase: ladderSessionPhase,
    currentTimerValue: ladderSessionTimerValue,
    handleToggleSession: handleToggleLadderSession,
    completeCurrentSet,
    currentExercise: ladderSessionCurrentExercise,
    currentReps,
    totalSets: ladderTotalSets,
    currentSetNumber: ladderCurrentSetNumber,
    updateLadderSettings,
    ladderSettings,
    direction,
    selectedExercise: selectedLadderExercise,
    selectExerciseForLadder,
  } = useLadderSessionLogic(selectRandomExercise);

  // Combined session state based on current workout mode
  const isSessionActive = workoutMode === 'session' ? isTimedSessionActive : 
                            workoutMode === 'ladder' ? isLadderSessionActive : false;
  
  const sessionPhase = workoutMode === 'session' ? timedSessionPhase : 
                        workoutMode === 'ladder' ? ladderSessionPhase : 'idle';
  
  const currentTimerValue = workoutMode === 'session' ? timedSessionTimerValue : 
                             workoutMode === 'ladder' ? ladderSessionTimerValue : 0;
  
  const currentExercise = workoutMode === 'session' ? timedSessionCurrentExercise : 
                           workoutMode === 'ladder' ? ladderSessionCurrentExercise : null;
  
  // Handler to toggle the active session based on workout mode
  const handleToggleSession = useCallback(() => {
    if (workoutMode === 'session') {
      handleToggleTimedSession();
    } else if (workoutMode === 'ladder') {
      handleToggleLadderSession();
    }
  }, [workoutMode, handleToggleTimedSession, handleToggleLadderSession]);

  // Handler to change workout mode
  const handleWorkoutModeChange = (mode) => {
    if (isSessionActive) {
      console.warn("Cannot change workout mode while a session is active. Please stop the session first.");
      return;
    }
    setWorkoutMode(mode);
    // Reset any active sessions when changing modes
    if (isTimedSessionActive) {
      handleToggleTimedSession();
    }
    if (isLadderSessionActive) {
      handleToggleLadderSession();
    }
  };

  // Handler for ladder exercise selection
  const handleLadderExerciseChange = useCallback((exercise) => {
    selectExerciseForLadder(exercise);
  }, [selectExerciseForLadder]);

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
      setErrorMessage(''); // Clear previous errors
      
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
    <RepCounterProvider>
      <div className="minimal-tracker-root">
        {/* Settings Icon Button */}
        {cameraStarted && !isLoading && !errorMessage && (
          <ActionIcon
            variant="filled"
            color="gray"
            size="lg"
            onClick={() => setIsSettingsOpen(true)}
            style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1300 }}
          >
            <Gear size={24} />
          </ActionIcon>
        )}

        {/* Controls overlay - only show after camera started */}
        <TrackerControlsBar
          cameraStarted={cameraStarted && !isLoading && !errorMessage}
          stats={stats}
          landmarksData={landmarksData}
          smoothingEnabled={smoothingEnabled}
          smoothingWindow={ANGLE_SMOOTHING_WINDOW}
          exerciseOptions={exerciseOptions}
          selectedExercise={selectedExercise}
          onExerciseChange={handleExerciseChange}
          isSessionActive={isSessionActive}
          currentTimerValue={currentTimerValue}
          onToggleSession={handleToggleSession}
          workoutMode={workoutMode}
          onWorkoutModeChange={handleWorkoutModeChange}
          currentExercise={currentExercise}
          upcomingExercise={timedSessionUpcomingExercise}  // Only used in timed mode
          sessionPhase={sessionPhase}
          // Timed session specific props
          totalSets={workoutMode === 'session' ? timedSessionTotalSets : 
                     workoutMode === 'ladder' ? ladderTotalSets : 0}
          currentSetNumber={workoutMode === 'session' ? timedSessionCurrentSetNumber : 
                            workoutMode === 'ladder' ? ladderCurrentSetNumber : 0}
          onSessionSettingsChange={updateSessionSettings}
          sessionSettings={sessionSettings}
          // Ladder session specific props
          currentReps={currentReps}
          onCompleteSet={completeCurrentSet}
          onLadderSettingsChange={updateLadderSettings}
          ladderSettings={ladderSettings}
          direction={direction}
          selectedLadderExercise={selectedLadderExercise}
          onLadderExerciseChange={handleLadderExerciseChange}
        />

        {/* Show loading spinner only after camera button is clicked and while loading */}
        {isLoading && cameraStarted && <LoadingDisplay />}
        
        {/* Show error message with improved styling */}
        {errorMessage && 
          <ErrorDisplay 
            message={errorMessage} 
            onRetry={() => {
              setErrorMessage(''); 
              // Optionally, reset cameraStarted if retry should go back to initial start screen
              // setCameraStarted(false); 
              // Or directly call handleStartCamera if retry means attempting camera start again
              handleStartCamera();
            }}
          />
        }
        
        {/* Show Start Camera button if not started and no error is shown */}
        {!cameraStarted && !errorMessage && (
          <StartButton onClick={handleStartCamera} />
        )}

        <div className="video-canvas-container" style={{ visibility: isLoading || errorMessage ? 'hidden' : 'visible' }}>
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
                useThreePhases={useThreePhases}
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
                useThreePhases={useThreePhases}
              />
              <LandmarkMetricsDisplay2
                displaySide="right"
                selectedExercise={selectedExercise}
                landmarksData={landmarksData}
                trackedAngles={trackedAngles}
              />
            </div>
          </div>
          
          {/* Rep Goal Display Container */}
          {cameraStarted && !isLoading && !errorMessage && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
              <RepGoalDisplayContainer 
                repGoal={repGoal}
                isTwoSided={selectedExercise.isTwoSided}
              />
            </div>
          )}
          
          {/* Bottom-center controls container - Replaced by BottomControls component */}
          <BottomControls 
            cameraStarted={cameraStarted}
            isLoading={isLoading}
            errorMessage={errorMessage}
            repGoal={repGoal}
            setRepGoal={setRepGoal}
            selectedExercise={selectedExercise}
            weight={weight}
            onWeightChange={handleWeightChange}
          />
        </div>

        {/* Settings Overlay Drawer */}
        <SettingsOverlay 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          smoothingEnabled={smoothingEnabled}
          onSmoothingChange={toggleSmoothingAndUpdateSettings}
          useThreePhases={useThreePhases}
          onPhaseModeChange={togglePhaseModeAndUpdateSettings}
        />
      </div>
    </RepCounterProvider>
  );
};

export default MinimalTracker; 