import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
import { ActionIcon, Text } from '@mantine/core';
import { Gear } from 'phosphor-react';
import SettingsOverlay from './SettingsOverlay';
import { RepCounterProvider, useRepCounter } from './RepCounterContext';
import RepGoalDisplayContainer from './RepGoalDisplayContainer';

// Get exercise options once outside the component to avoid re-computation
const exerciseOptions = Object.values(exercises)
  .filter(e => e && e.id && e.name)
  .sort((a, b) => a.name.localeCompare(b.name)); // Pre-sort the options

const MinimalTrackerContent = () => {
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
      const foundExercise = exerciseOptions.find(ex => ex.id === initialExerciseId);
      if (foundExercise) return foundExercise;
    }
    return exerciseOptions[0]; // Default
  });
  const [trackedAngles, setTrackedAngles] = useState({});
  const [rawAngles, setRawAngles] = useState({});
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [landmarksData, setLandmarksData] = useState(null);
  const [smoothingEnabled, setSmoothingEnabled] = useState(appSettings.isSmoothingEnabled);
  const [weight, setWeight] = useState(appSettings.selectedWeights !== null ? appSettings.selectedWeights : 0);
  const [repGoal, setRepGoal] = useState(10);
  const [workoutMode, setWorkoutMode] = useState('manual'); // 'manual', 'session', or 'ladder'

  // Access the rep counter functionality
  const { resetRepCounts } = useRepCounter();
  
  // Add exercise change notification state
  const [exerciseChangeNotification, setExerciseChangeNotification] = useState({
    visible: false,
    exerciseName: ''
  });

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

  // Functions for settings updates
  const toggleSmoothingAndUpdateSettings = useCallback(() => {
    setSmoothingEnabled(prev => {
      const newValue = !prev;
      updateAppSettings({ isSmoothingEnabled: newValue });
      angleHistoryRef.current = {}; // Clear angle history when toggling
      return newValue;
    });
  }, [updateAppSettings]);

  const togglePhaseModeAndUpdateSettings = useCallback((checked) => {
    const newValue = checked !== undefined ? checked : !appSettings.useThreePhases;
    updateAppSettings({ useThreePhases: newValue });
  }, [updateAppSettings, appSettings.useThreePhases]);

  const toggleLandmarkVisibilityAndUpdateSettings = useCallback((checked) => {
    const newValue = checked !== undefined ? checked : !appSettings.requireAllLandmarks;
    console.log('[MinimalTracker] toggleLandmarkVisibilityAndUpdateSettings - new value:', newValue);
    updateAppSettings({ requireAllLandmarks: newValue });
  }, [updateAppSettings, appSettings.requireAllLandmarks]);

  const updateMinimumVisibilityAndSettings = useCallback((value) => {
    const numericValue = Number(value);
    console.log('[MinimalTracker] updateMinimumVisibilityAndSettings - new value:', numericValue);
    updateAppSettings({ minimumVisibilityThreshold: numericValue });
  }, [updateAppSettings]);

  const toggleSecondaryLandmarksAndUpdateSettings = useCallback((checked) => {
    console.log('[MinimalTracker] toggleSecondaryLandmarksAndUpdateSettings - new value:', checked);
    updateAppSettings({ requireSecondaryLandmarks: checked });
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
      
      console.log('[MinimalTracker] Random exercise selected:', randomExercise?.name);
      return randomExercise;
    }
    return null;
  }, []);  // No dependencies needed since exerciseOptions is now static

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

  // Handler for ladder exercise selection
  const handleLadderExerciseChange = useCallback((exercise) => {
    selectExerciseForLadder(exercise);
    // Also update the main selected exercise to keep them in sync
    setSelectedExercise(exercise);
    updateAppSettings({ selectedExerciseId: exercise.id });
    
    // Reset rep counter when changing exercises
    resetRepCounts();
    
    // Show temporary notification
    setExerciseChangeNotification({
      visible: true,
      exerciseName: exercise.name
    });
    
    // Clear notification after 3 seconds
    setTimeout(() => {
      setExerciseChangeNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, [selectExerciseForLadder, updateAppSettings, resetRepCounts]);

  // Also reset rep counter when exercise changes via the main selector
  const handleExerciseChange = useCallback((newExercise) => {
    setSelectedExercise(newExercise);
    updateAppSettings({ selectedExerciseId: newExercise.id });
    
    // Reset rep counter
    resetRepCounts();
    
    // When changing main exercise, also update ladder exercise if in ladder mode
    if (workoutMode === 'ladder') {
      selectExerciseForLadder(newExercise);
    }
  }, [updateAppSettings, workoutMode, selectExerciseForLadder, resetRepCounts]);

  // Memoize combined session state based on current workout mode
  const isSessionActive = useMemo(() => 
    workoutMode === 'session' ? isTimedSessionActive : 
    workoutMode === 'ladder' ? isLadderSessionActive : false,
  [workoutMode, isTimedSessionActive, isLadderSessionActive]);
  
  const sessionPhase = useMemo(() => 
    workoutMode === 'session' ? timedSessionPhase : 
    workoutMode === 'ladder' ? ladderSessionPhase : 'idle',
  [workoutMode, timedSessionPhase, ladderSessionPhase]);
  
  const currentTimerValue = useMemo(() => 
    workoutMode === 'session' ? timedSessionTimerValue : 
    workoutMode === 'ladder' ? ladderSessionTimerValue : 0,
  [workoutMode, timedSessionTimerValue, ladderSessionTimerValue]);
  
  const currentExercise = useMemo(() => 
    workoutMode === 'session' ? timedSessionCurrentExercise : 
    workoutMode === 'ladder' ? ladderSessionCurrentExercise : null,
  [workoutMode, timedSessionCurrentExercise, ladderSessionCurrentExercise]);
  
  // Handler to toggle the active session based on workout mode
  const handleToggleSession = useCallback(() => {
    if (workoutMode === 'session') {
      handleToggleTimedSession();
    } else if (workoutMode === 'ladder') {
      handleToggleLadderSession();
    }
  }, [workoutMode, handleToggleTimedSession, handleToggleLadderSession]);

  // Effect to synchronize selectedExercise and selectedLadderExercise when ladder mode is activated
  useEffect(() => {
    if (workoutMode === 'ladder' && selectedLadderExercise && selectedExercise?.id !== selectedLadderExercise?.id) {
      // When switching to ladder mode, update ladder exercise to match main exercise
      selectExerciseForLadder(selectedExercise);
    }
  }, [workoutMode, selectedExercise, selectedLadderExercise, selectExerciseForLadder]);

  // Handler to change workout mode - memoized to avoid recreation
  const handleWorkoutModeChange = useCallback((mode) => {
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
  }, [
    isSessionActive, 
    isTimedSessionActive, 
    isLadderSessionActive, 
    handleToggleTimedSession, 
    handleToggleLadderSession
  ]);

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
      requestAnimationRef.current = requestAnimationFrame(renderLoop); // Re-enable continuation
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
    requestAnimationRef.current = requestAnimationFrame(renderLoop); // Re-enable continuation
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
      requestAnimationRef.current = requestAnimationFrame(renderLoop); // Re-enable initial start
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

  // Memoize the active exercise determination to avoid repetitive logic
  const getActiveExercise = useMemo(() => {
    return workoutMode === 'ladder' && isLadderSessionActive && currentExercise
      ? currentExercise
      : selectedExercise;
  }, [workoutMode, isLadderSessionActive, currentExercise, selectedExercise]);

  // Memoize TrackerControlsBar props to minimize recalculations during rendering
  const trackerControlsProps = useMemo(() => ({
    cameraStarted: cameraStarted && !isLoading && !errorMessage,
    stats,
    landmarksData,
    smoothingEnabled,
    smoothingWindow: ANGLE_SMOOTHING_WINDOW,
    exerciseOptions,
    selectedExercise,
    onExerciseChange: handleExerciseChange,
    isSessionActive,
    currentTimerValue,
    onToggleSession: handleToggleSession,
    workoutMode,
    onWorkoutModeChange: handleWorkoutModeChange,
    currentExercise,
    upcomingExercise: timedSessionUpcomingExercise,
    sessionPhase,
    totalSets: workoutMode === 'session' ? timedSessionTotalSets : 
               workoutMode === 'ladder' ? ladderTotalSets : 0,
    currentSetNumber: workoutMode === 'session' ? timedSessionCurrentSetNumber : 
                      workoutMode === 'ladder' ? ladderCurrentSetNumber : 0,
    onSessionSettingsChange: updateSessionSettings,
    sessionSettings,
    currentReps,
    onCompleteSet: completeCurrentSet,
    onLadderSettingsChange: updateLadderSettings,
    ladderSettings,
    direction,
    selectedLadderExercise,
    onLadderExerciseChange: handleLadderExerciseChange,
  }), [
    cameraStarted,
    isLoading,
    errorMessage,
    stats,
    landmarksData,
    smoothingEnabled,
    selectedExercise,
    handleExerciseChange,
    isSessionActive,
    currentTimerValue,
    handleToggleSession,
    workoutMode,
    handleWorkoutModeChange,
    currentExercise,
    timedSessionUpcomingExercise,
    sessionPhase,
    timedSessionTotalSets,
    ladderTotalSets,
    timedSessionCurrentSetNumber,
    ladderCurrentSetNumber,
    updateSessionSettings,
    sessionSettings,
    currentReps,
    completeCurrentSet,
    updateLadderSettings,
    ladderSettings,
    direction,
    selectedLadderExercise,
    handleLadderExerciseChange
  ]);
  
  // Use useMemo for BottomControls props as well
  const bottomControlsProps = useMemo(() => ({
    cameraStarted,
    isLoading,
    errorMessage,
    repGoal,
    setRepGoal,
    selectedExercise,
    weight,
    onWeightChange: handleWeightChange,
    workoutMode,
  }), [
    cameraStarted,
    isLoading,
    errorMessage,
    repGoal,
    selectedExercise,
    weight,
    workoutMode
  ]);

  return (
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

      {/* Exercise Change Notification */}
      {exerciseChangeNotification.visible && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: 'rgba(38, 50, 56, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            zIndex: 2000,
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <Text align="center" color="white" weight={600}>
            Exercise changed to: {exerciseChangeNotification.exerciseName}
          </Text>
        </div>
      )}

      {/* Use memoized props */}
      <TrackerControlsBar {...trackerControlsProps} />

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

      <div className="video-canvas-container" style={{ visibility: isLoading || errorMessage ? 'hidden' : 'visible', position: 'relative' }}>
        <VideoCanvas
          videoRef={videoRef}
          canvasRef={canvasRef}
          landmarks={landmarksData}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          cameraStarted={cameraStarted}
        />
        
        {/* Rep Goal Display Container - Moved before overlay stacks and positioned directly in video container */}
        {cameraStarted && !isLoading && !errorMessage && (
          <RepGoalDisplayContainer 
            repGoal={repGoal}
            isTwoSided={getActiveExercise.isTwoSided}
            ladderReps={workoutMode === 'ladder' && isLadderSessionActive ? currentReps : null}
          />
        )}
        
        {/* Overlay stacks for left and right-aligned UI */}
        <div className="minimal-tracker-overlay">
          <div className="minimal-tracker-stack left">
            {/* Place left-aligned overlays here */}
            <AngleDisplay 
              displaySide="left"
              selectedExercise={getActiveExercise}
              trackedAngles={trackedAngles}
              rawAngles={rawAngles}
              smoothingEnabled={smoothingEnabled}
            />
            <PhaseTrackerDisplay
              displaySide="left"
              selectedExercise={getActiveExercise}
              trackedAngles={trackedAngles}
              useThreePhases={appSettings.useThreePhases}
              landmarksData={landmarksData}
            />
            <LandmarkMetricsDisplay2
              displaySide="left"
              selectedExercise={getActiveExercise}
              landmarksData={landmarksData}
              trackedAngles={trackedAngles}
            />
          </div>
          <div className="minimal-tracker-stack right">
            {/* Place overlays here for right-aligned overlays */}
            <AngleDisplay 
              displaySide="right"
              selectedExercise={getActiveExercise}
              trackedAngles={trackedAngles}
              rawAngles={rawAngles}
              smoothingEnabled={smoothingEnabled}
            />
            <PhaseTrackerDisplay
              displaySide="right"
              selectedExercise={getActiveExercise}
              trackedAngles={trackedAngles}
              useThreePhases={appSettings.useThreePhases}
              landmarksData={landmarksData}
            />
            <LandmarkMetricsDisplay2
              displaySide="right"
              selectedExercise={getActiveExercise}
              landmarksData={landmarksData}
              trackedAngles={trackedAngles}
            />
          </div>
        </div>
        
        <BottomControls {...bottomControlsProps} />
      </div>

      {/* Settings Overlay Drawer */}
      <SettingsOverlay 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        smoothingEnabled={smoothingEnabled}
        onSmoothingChange={toggleSmoothingAndUpdateSettings}
        useThreePhases={appSettings.useThreePhases}
        onPhaseModeChange={togglePhaseModeAndUpdateSettings}
        requireAllLandmarks={appSettings.requireAllLandmarks}
        onLandmarkVsibilityModeChange={toggleLandmarkVisibilityAndUpdateSettings}
        minimumVisibilityThreshold={appSettings.minimumVisibilityThreshold}
        onMinimumVisibilityChange={updateMinimumVisibilityAndSettings}
        requireSecondaryLandmarks={appSettings.requireSecondaryLandmarks}
        onSecondaryLandmarksChange={toggleSecondaryLandmarksAndUpdateSettings}
      />
    </div>
  );
};

// Wrapper component that provides the RepCounterProvider context
const MinimalTracker = () => {
  return (
    <RepCounterProvider>
      <MinimalTrackerContent />
    </RepCounterProvider>
  );
};

export default MinimalTracker; 