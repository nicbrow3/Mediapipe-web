import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import './MinimalTracker.css'; // Use new layout styles
import * as exercises from '../exercises';
import { useAppSettings } from '../hooks/useAppSettings';
import { useSessionLogic } from '../hooks/useSessionLogic'; // Timed session hook
import { useLadderSessionLogic } from '../hooks/useLadderSessionLogic'; // New ladder session hook
import VideoCanvas, { setupCamera, waitForVideoReady } from './VideoCanvas'; // setupCamera, waitForVideoReady are used by the hook if not moved
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
import { usePoseTracker } from '../hooks/usePoseTracker'; // Import the new hook

// Create a memoized selector for Z-depth data to avoid calculations when not visible
const useZDepthData = (landmarksData, showZDepthDisplay) => {
  return useMemo(() => {
    // Skip all calculations if the display is not visible or no landmarks data
    if (!showZDepthDisplay || !landmarksData) {
      return null;
    }
    
    // Get landmarks - shoulders (11,12) and hips (23,24)
    const leftShoulderZ = landmarksData[11]?.z ?? null;
    const rightShoulderZ = landmarksData[12]?.z ?? null;
    const leftHipZ = landmarksData[23]?.z ?? null;
    const rightHipZ = landmarksData[24]?.z ?? null;
    
    // Calculate relative depth (positive means left is in front)
    const shoulderDifference = (leftShoulderZ !== null && rightShoulderZ !== null) 
      ? leftShoulderZ - rightShoulderZ 
      : null;
      
    const hipDifference = (leftHipZ !== null && rightHipZ !== null) 
      ? leftHipZ - rightHipZ 
      : null;
      
    // Calculate torso rotation (difference between shoulder and hip alignment)
    const torsoRotation = (shoulderDifference !== null && hipDifference !== null)
      ? shoulderDifference - hipDifference
      : null;
    
    return {
      leftShoulderZ,
      rightShoulderZ,
      leftHipZ,
      rightHipZ,
      shoulderDifference,
      hipDifference,
      torsoRotation
    };
  }, [landmarksData, showZDepthDisplay]);
};

// Define a new component to display the Z coordinate
const ZDepthDisplay = ({ zDepthData, onClose }) => {
  // Get formatted values with correct precision - reduced to 2 decimal places
  const formatValue = (value) => value !== null ? value.toFixed(2) : 'N/A';
  
  // Determine color based on value (green for positive, red for negative)
  const getColor = (value) => value > 0 ? '#90ee90' : value < 0 ? '#ffcccb' : 'white';
  
  // Direction indicators
  const getDirectionArrow = (value) => {
    if (value === null) return '';
    if (Math.abs(value) < 0.005) return '•'; // Neutral dot
    if (value > 0) return '▲'; // Up arrow for positive
    return '▼'; // Down arrow for negative
  };
  
  if (!zDepthData) return null;
  
  return (
    <div className="z-depth-display" style={{
      position: 'absolute',
      top: '100px',
      right: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '18px',
      fontWeight: 'bold',
      zIndex: 1000,
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      minWidth: '280px'
    }}>
      <div style={{ 
        marginBottom: '8px', 
        fontSize: '22px', 
        borderBottom: '1px solid #555', 
        paddingBottom: '5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Depth Analysis (Z)</span>
        <button 
          onClick={onClose} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#aaa', 
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 0 0 10px'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ marginBottom: '5px', color: '#aaa' }}>Shoulders:</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Left:</span>
          <span>{formatValue(zDepthData.leftShoulderZ)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Right:</span>
          <span>{formatValue(zDepthData.rightShoulderZ)}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          color: getColor(zDepthData.shoulderDifference),
          borderTop: '1px dotted #555',
          paddingTop: '3px',
          marginTop: '3px'
        }}>
          <span>Difference:</span>
          <span>{getDirectionArrow(zDepthData.shoulderDifference)} {formatValue(zDepthData.shoulderDifference)}</span>
        </div>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <div style={{ marginBottom: '5px', color: '#aaa' }}>Hips:</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Left:</span>
          <span>{formatValue(zDepthData.leftHipZ)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Right:</span>
          <span>{formatValue(zDepthData.rightHipZ)}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          color: getColor(zDepthData.hipDifference),
          borderTop: '1px dotted #555',
          paddingTop: '3px',
          marginTop: '3px'
        }}>
          <span>Difference:</span>
          <span>{getDirectionArrow(zDepthData.hipDifference)} {formatValue(zDepthData.hipDifference)}</span>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '10px', 
        paddingTop: '10px',
        borderTop: '2px solid #555',
      }}>
        <div style={{ marginBottom: '5px', color: '#aaa' }}>Torso Rotation:</div>
        <div style={{ 
          fontSize: '22px',
          color: getColor(zDepthData.torsoRotation),
          textAlign: 'center',
          padding: '5px'
        }}>
          {getDirectionArrow(zDepthData.torsoRotation)} {formatValue(zDepthData.torsoRotation)}
        </div>
        <div style={{ fontSize: '14px', textAlign: 'center', color: '#aaa' }}>
          {zDepthData.torsoRotation > 0.01 ? 'Rotated Right' : 
           zDepthData.torsoRotation < -0.01 ? 'Rotated Left' : 
           'Neutral'}
        </div>
      </div>
      
      <div style={{ fontSize: '14px', marginTop: '15px', textAlign: 'center', color: '#aaa', borderTop: '1px solid #555', paddingTop: '10px' }}>
        +Z values are closer to camera
      </div>
    </div>
  );
};

// Define a default/fallback exercise object structure
const FALLBACK_EXERCISE = {
  id: 'no-exercise',
  name: 'No Exercise Loaded',
  isTwoSided: false,
  angles: [],
  connections: { left: [], right: [], center: [] },
  stationaryLandmarks: { points: [], connections: [] },
  landmarks_to_track: [] // Ensure all commonly accessed properties are present
};

// Get exercise options once outside the component to avoid re-computation
const exerciseOptions = Object.values(exercises)
  .filter(e => e && e.id && e.name)
  .sort((a, b) => a.name.localeCompare(b.name)); // Pre-sort the options

// Determine a safe default exercise for initialization
const getDefaultExercise = () => {
  if (exerciseOptions.length > 0) {
    return exerciseOptions[0];
  }
  console.warn("[MinimalTracker] No exercises loaded or found. Using a fallback exercise definition. Please check 'src/exercises/index.js' or ensure exercises are correctly exported.");
  return FALLBACK_EXERCISE;
};

const MinimalTrackerContent = () => {
  // Settings Hook
  const [appSettings, updateAppSettings] = useAppSettings();

  // Refs for selectedExercise (still needed here for UI logic)
  const selectedExerciseRef = useRef(); // selectedExerciseRef will be updated by selectedExercise state

  // State that remains in MinimalTrackerContent
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(() => {
    const initialExerciseId = appSettings.selectedExerciseId;
    let exerciseToSet = getDefaultExercise(); // Start with a safe default from global scope

    if (initialExerciseId) {
      const foundExercise = exerciseOptions.find(ex => ex.id === initialExerciseId);
      if (foundExercise) {
        exerciseToSet = foundExercise;
      } else {
        console.warn(`[MinimalTracker] Initial exercise ID "${initialExerciseId}" from settings not found in current exercise options. Using default exercise: ${exerciseToSet.name}`);
      }
    }
    return exerciseToSet;
  });
  const [weight, setWeight] = useState(appSettings.selectedWeights !== null ? appSettings.selectedWeights : 0);
  const [repGoal, setRepGoal] = useState(10);
  const [workoutMode, setWorkoutMode] = useState('manual'); // 'manual', 'session', or 'ladder'

  // State for the Z-depth display
  const [showZDepthDisplay, setShowZDepthDisplay] = useState(false);
  
  // Update selectedExerciseRef whenever selectedExercise changes
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  // Access the rep counter functionality
  const { resetRepCounts } = useRepCounter();

  // Use the new Pose Tracker Hook
  const {
    videoRef,
    canvasRef,
    isLoading,
    errorMessage,
    setErrorMessage, // Allow MinimalTracker to clear/set error messages if needed
    cameraStarted,
    landmarksData,
    trackedAngles,
    rawAngles,
    stats,
    startTracking,
    canvasDimensions,
    angleHistoryRef, // Passed from hook
    ANGLE_SMOOTHING_WINDOW, // Passed from hook
    // Stationary tracking values from usePoseTracker
    stabilityState, 
    averageStationaryLandmarks,
  } = usePoseTracker(selectedExerciseRef, appSettings);

  // Calculate Z-depth data only when display is visible
  const zDepthData = useZDepthData(landmarksData, showZDepthDisplay);

  // Determine if rep counting should be active based on stationary tracking state
  const isRepCountingAllowed = useMemo(() => 
    appSettings.enableStationaryTracking ? stabilityState === 'stable' : true,
    [appSettings.enableStationaryTracking, stabilityState]
  );

  // Functions for settings updates
  const toggleSmoothingAndUpdateSettings = useCallback(() => {
    updateAppSettings(prev => ({
      ...prev,
      isSmoothingEnabled: !prev.isSmoothingEnabled
    }));
    if (angleHistoryRef && angleHistoryRef.current) {
      angleHistoryRef.current = {};
    }
  }, [updateAppSettings, angleHistoryRef]);

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

  const handleCameraOpacityChange = useCallback((value) => {
    const numericValue = Number(value);
    updateAppSettings({ cameraOpacity: numericValue });
  }, [updateAppSettings]);

  const handleToggleAlwaysShowConnections = useCallback((checked) => {
    updateAppSettings({ alwaysShowConnections: checked });
  }, [updateAppSettings]);

  const handleToggleHighlightExerciseConnections = useCallback((checked) => {
    updateAppSettings({ highlightExerciseConnections: checked });
  }, [updateAppSettings]);

  const handleConnectionHighlightColorChange = useCallback((color) => {
    updateAppSettings({ connectionHighlightColor: color });
  }, [updateAppSettings]);

  // Stationary tracking settings handlers
  const handleEnableStationaryTrackingChange = useCallback((checked) => {
    updateAppSettings({ enableStationaryTracking: checked });
  }, [updateAppSettings]);

  const handleStationaryDeviationThresholdChange = useCallback((value) => {
    updateAppSettings({ stationaryDeviationThreshold: Number(value) });
  }, [updateAppSettings]);

  const handleStationaryAveragingWindowMsChange = useCallback((value) => {
    updateAppSettings({ stationaryAveragingWindowMs: Number(value) });
  }, [updateAppSettings]);

  const handleStationaryHoldDurationMsChange = useCallback((value) => {
    updateAppSettings({ stationaryHoldDurationMs: Number(value) });
  }, [updateAppSettings]);

  const handleWeightChange = useCallback((newWeight) => {
    setWeight(newWeight);
    updateAppSettings({ selectedWeights: newWeight });
  }, [updateAppSettings]);

  // Select a random exercise (passed to useSessionLogic)
  const selectRandomExercise = useCallback(() => {
    if (exerciseOptions && exerciseOptions.length > 0) {
      let randomExercise;
      const currentExercise = selectedExerciseRef.current; // Use ref here
      
      if (exerciseOptions.length > 1) {
        do {
          randomExercise = exerciseOptions[Math.floor(Math.random() * exerciseOptions.length)];
        } while (randomExercise.id === currentExercise?.id);
      } else {
        randomExercise = exerciseOptions[0];
      }
      
      console.log('[MinimalTracker] Random exercise selected:', randomExercise?.name);
      return randomExercise;
    }
    return null;
  }, []);

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

  const handleLadderExerciseChange = useCallback((exercise) => {
    selectExerciseForLadder(exercise);
    setSelectedExercise(exercise); // This will update selectedExerciseRef via its useEffect
    updateAppSettings({ selectedExerciseId: exercise.id });
    resetRepCounts();
  }, [selectExerciseForLadder, updateAppSettings, resetRepCounts]);

  const handleExerciseChange = useCallback((newExercise) => {
    setSelectedExercise(newExercise); // This will update selectedExerciseRef via its useEffect
    updateAppSettings({ selectedExerciseId: newExercise.id });
    resetRepCounts();
    if (workoutMode === 'ladder') {
      selectExerciseForLadder(newExercise);
    }
  }, [updateAppSettings, workoutMode, selectExerciseForLadder, resetRepCounts]);

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
  
  const currentExerciseForDisplay = useMemo(() => // Renamed to avoid conflict with hook's currentExercise
    workoutMode === 'session' ? timedSessionCurrentExercise : 
    workoutMode === 'ladder' ? ladderSessionCurrentExercise : null,
  [workoutMode, timedSessionCurrentExercise, ladderSessionCurrentExercise]);
  
  const handleToggleSession = useCallback(() => {
    if (workoutMode === 'session') {
      handleToggleTimedSession();
    } else if (workoutMode === 'ladder') {
      handleToggleLadderSession();
    }
  }, [workoutMode, handleToggleTimedSession, handleToggleLadderSession]);

  useEffect(() => {
    if (workoutMode === 'ladder' && selectedLadderExercise && selectedExercise?.id !== selectedLadderExercise?.id) {
      selectExerciseForLadder(selectedExercise);
    }
  }, [workoutMode, selectedExercise, selectedLadderExercise, selectExerciseForLadder]);

  const handleWorkoutModeChange = useCallback((mode) => {
    if (isSessionActive) {
      console.warn("Cannot change workout mode while a session is active. Please stop the session first.");
      return;
    }
    setWorkoutMode(mode);
    if (isTimedSessionActive) {
      handleToggleTimedSession(); // Stop session
    }
    if (isLadderSessionActive) {
      handleToggleLadderSession(); // Stop session
    }
  }, [
    isSessionActive, 
    isTimedSessionActive, 
    isLadderSessionActive, 
    handleToggleTimedSession, 
    handleToggleLadderSession
  ]);

  // initializePoseLandmarker, addMeasurement, updateStats, renderLoop, smoothAngle are now in usePoseTracker
  // The main useEffect for cleanup is also in usePoseTracker
  // The useEffect for window resize is also in usePoseTracker

  // The handleStartCamera function is replaced by startTracking from the hook
  const handleStartCamera = () => {
    // setIsLoading(true); // This is handled by the hook's startTracking
    // setErrorMessage(''); // This is handled by the hook's startTracking
    startTracking();
  };


  // Reset rep goal to 10 when exercise changes
  useEffect(() => {
    setRepGoal(10);
  }, [selectedExercise]); // selectedExercise (state) is the correct dependency here

  const getActiveExercise = useMemo(() => {
    // If ladder session is active and has a current exercise, use that.
    // Otherwise, use the globally selected exercise.
    return workoutMode === 'ladder' && isLadderSessionActive && ladderSessionCurrentExercise
      ? ladderSessionCurrentExercise
      : selectedExercise;
  }, [workoutMode, isLadderSessionActive, ladderSessionCurrentExercise, selectedExercise]);

  const trackerControlsProps = useMemo(() => ({
    cameraStarted: cameraStarted && !isLoading && !errorMessage,
    stats,
    landmarksData,
    smoothingEnabled: appSettings.isSmoothingEnabled,
    smoothingWindow: ANGLE_SMOOTHING_WINDOW,
    exerciseOptions,
    selectedExercise,
    onExerciseChange: handleExerciseChange,
    isSessionActive,
    currentTimerValue,
    onToggleSession: handleToggleSession,
    workoutMode,
    onWorkoutModeChange: handleWorkoutModeChange,
    currentExercise: currentExerciseForDisplay,
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
    enableStationaryTracking: appSettings.enableStationaryTracking,
    stabilityState: stabilityState,
  }), [
    cameraStarted,
    isLoading,
    errorMessage,
    stats,
    landmarksData,
    exerciseOptions,
    selectedExercise,
    handleExerciseChange,
    isSessionActive,
    currentTimerValue,
    handleToggleSession,
    workoutMode,
    handleWorkoutModeChange,
    currentExerciseForDisplay,
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
    handleLadderExerciseChange,
    appSettings.enableStationaryTracking,
    stabilityState,
  ]);
  
  const bottomControlsProps = useMemo(() => ({
    cameraStarted: cameraStarted && !isLoading && !errorMessage, // Use hook's cameraStarted
    isLoading, // Use hook's isLoading
    errorMessage, // Use hook's errorMessage
    repGoal,
    setRepGoal,
    selectedExercise, // Use component's selectedExercise state for display/logic here
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
    workoutMode,
    handleWeightChange // Added missing dependency
  ]);

  return (
    <div className="minimal-tracker-root">
      {cameraStarted && !isLoading && !errorMessage && (
        <>
          <ActionIcon
            variant="filled"
            color="gray"
            size="lg"
            onClick={() => setIsSettingsOpen(true)}
            style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1300 }}
          >
            <Gear size={24} />
          </ActionIcon>
          
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={() => setShowZDepthDisplay(!showZDepthDisplay)}
            style={{ position: 'fixed', top: '20px', right: '80px', zIndex: 1300 }}
          >
            Z
          </ActionIcon>
        </>
      )}

      <TrackerControlsBar
        stats={stats}
        landmarksData={landmarksData}
        cameraStarted={cameraStarted}
        smoothingEnabled={appSettings.isSmoothingEnabled}
        smoothingWindow={ANGLE_SMOOTHING_WINDOW}
        exerciseOptions={exerciseOptions}
        selectedExercise={selectedExercise}
        onExerciseChange={handleExerciseChange}
        isSessionActive={isSessionActive}
        currentTimerValue={currentTimerValue}
        onToggleSession={handleToggleSession}
        workoutMode={workoutMode}
        onWorkoutModeChange={handleWorkoutModeChange}
        currentExercise={currentExerciseForDisplay}
        upcomingExercise={timedSessionUpcomingExercise}
        sessionPhase={sessionPhase}
        totalSets={workoutMode === 'session' ? timedSessionTotalSets : 
                   workoutMode === 'ladder' ? ladderTotalSets : 0}
        currentSetNumber={workoutMode === 'session' ? timedSessionCurrentSetNumber : 
                        workoutMode === 'ladder' ? ladderCurrentSetNumber : 0}
        onSessionSettingsChange={updateSessionSettings}
        sessionSettings={sessionSettings}
        currentReps={currentReps}
        onCompleteSet={completeCurrentSet}
        onLadderSettingsChange={updateLadderSettings}
        ladderSettings={ladderSettings}
        direction={direction}
        selectedLadderExercise={selectedLadderExercise}
        onLadderExerciseChange={handleLadderExerciseChange}
        enableStationaryTracking={appSettings.enableStationaryTracking}
        stabilityState={stabilityState}
      />

      {isLoading && cameraStarted && <LoadingDisplay />}
      
      {errorMessage && 
        <ErrorDisplay 
          message={errorMessage} 
          onRetry={() => {
            if (typeof setErrorMessage === 'function') setErrorMessage(''); // Use setter from hook if available
            // startTracking will handle isLoading and errorMessage resetting.
            startTracking(); 
          }}
        />
      }
      
      {!cameraStarted && !errorMessage && (
        <StartButton onClick={handleStartCamera} />
      )}

      <div className="video-canvas-container" style={{ 
        visibility: isLoading || errorMessage ? 'hidden' : 'visible', 
        position: 'relative',
        height: 'calc(100vh - 120px)', // Set explicit height 
        minHeight: '500px',            // Ensure minimum height
        overflow: 'hidden',            // Hide overflow
      }}>
        <VideoCanvas
          videoRef={videoRef} // From hook
          canvasRef={canvasRef} // From hook
          landmarks={landmarksData} // From hook
          width={canvasDimensions.width} // From hook
          height={canvasDimensions.height} // From hook
          cameraStarted={cameraStarted} // From hook
          feedOpacity={appSettings.cameraOpacity / 100}
          minVisibilityForConnection={appSettings.minimumVisibilityThreshold / 100}
          overrideConnectionVisibility={appSettings.alwaysShowConnections}
          highlightExerciseConnections={appSettings.highlightExerciseConnections}
          connectionHighlightColor={appSettings.connectionHighlightColor}
          selectedExercise={getActiveExercise}
          // Stationary landmark visualization props
          enableStationaryTracking={appSettings.enableStationaryTracking}
          stationaryDeviationThreshold={appSettings.stationaryDeviationThreshold}
          stabilityState={stabilityState}
          averageStationaryLandmarks={averageStationaryLandmarks}
          stationaryLandmarksConfiguration={getActiveExercise?.stationaryLandmarks}
        />
        
        {cameraStarted && !isLoading && !errorMessage && (
          <RepGoalDisplayContainer 
            repGoal={repGoal}
            isTwoSided={getActiveExercise.isTwoSided} // Use getActiveExercise
            ladderReps={workoutMode === 'ladder' && isLadderSessionActive ? currentReps : null}
          />
        )}
        
        {/* Only render ZDepthDisplay when showZDepthDisplay is true and we have data */}
        {cameraStarted && !isLoading && !errorMessage && showZDepthDisplay && (
          <ZDepthDisplay 
            zDepthData={zDepthData}
            onClose={() => setShowZDepthDisplay(false)}
          />
        )}
        
        <div className="minimal-tracker-overlay">
          {/* Determine if the exercise has angles configured for each side */}
          {(() => {
            const hasLeftAngles = getActiveExercise?.logicConfig?.type === 'angle' &&
                                  Array.isArray(getActiveExercise.logicConfig.anglesToTrack) &&
                                  getActiveExercise.logicConfig.anglesToTrack.some(a => a.id.toLowerCase().includes('left'));
                                  
            const hasRightAngles = getActiveExercise?.logicConfig?.type === 'angle' &&
                                   Array.isArray(getActiveExercise.logicConfig.anglesToTrack) &&
                                   getActiveExercise.logicConfig.anglesToTrack.some(a => a.id.toLowerCase().includes('right') || !a.id.toLowerCase().includes('left'));

            return (
              <>
                {hasLeftAngles && (
                  <div className="minimal-tracker-stack left">
                    <AngleDisplay 
                      displaySide="left"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      trackedAngles={trackedAngles} // From hook
                      rawAngles={rawAngles} // From hook
                      smoothingEnabled={appSettings.isSmoothingEnabled} // Pass appSetting for display consistency
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                    />
                    <PhaseTrackerDisplay
                      displaySide="left"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      trackedAngles={trackedAngles} // From hook
                      landmarksData={landmarksData} // From hook
                      workoutMode={workoutMode}
                      isRepCountingAllowed={isRepCountingAllowed} // Pass to PhaseTrackerDisplay
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                    />
                    <LandmarkMetricsDisplay2
                      displaySide="left"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      landmarksData={landmarksData} // From hook
                      trackedAngles={trackedAngles} // From hook
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                    />
                  </div>
                )}

                {hasRightAngles && (
                  <div className="minimal-tracker-stack right">
                    <AngleDisplay 
                      displaySide="right"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      trackedAngles={trackedAngles} // From hook
                      rawAngles={rawAngles} // From hook
                      smoothingEnabled={appSettings.isSmoothingEnabled} // Pass appSetting for display consistency
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                    />
                    <PhaseTrackerDisplay
                      displaySide="right"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      trackedAngles={trackedAngles} // From hook
                      landmarksData={landmarksData} // From hook
                      workoutMode={workoutMode}
                      isRepCountingAllowed={isRepCountingAllowed} // Pass to PhaseTrackerDisplay
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                    />
                    <LandmarkMetricsDisplay2
                      displaySide="right"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      landmarksData={landmarksData} // From hook
                      trackedAngles={trackedAngles} // From hook
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                    />
                  </div>
                )}
              </>
            );
          })()}
          
          <BottomControls {...bottomControlsProps} />
        </div>
      </div>

      <SettingsOverlay 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        smoothingEnabled={appSettings.isSmoothingEnabled}
        onSmoothingChange={toggleSmoothingAndUpdateSettings}
        useThreePhases={appSettings.useThreePhases}
        onPhaseModeChange={togglePhaseModeAndUpdateSettings}
        requireAllLandmarks={appSettings.requireAllLandmarks}
        onLandmarkVsibilityModeChange={toggleLandmarkVisibilityAndUpdateSettings}
        minimumVisibilityThreshold={appSettings.minimumVisibilityThreshold}
        onMinimumVisibilityChange={updateMinimumVisibilityAndSettings}
        requireSecondaryLandmarks={appSettings.requireSecondaryLandmarks}
        onSecondaryLandmarksChange={toggleSecondaryLandmarksAndUpdateSettings}
        cameraOpacity={appSettings.cameraOpacity}
        onCameraOpacityChange={handleCameraOpacityChange}
        alwaysShowConnections={appSettings.alwaysShowConnections}
        onToggleAlwaysShowConnections={handleToggleAlwaysShowConnections}
        highlightExerciseConnections={appSettings.highlightExerciseConnections}
        onToggleHighlightExerciseConnections={handleToggleHighlightExerciseConnections}
        connectionHighlightColor={appSettings.connectionHighlightColor}
        onConnectionHighlightColorChange={handleConnectionHighlightColorChange}
        
        enableStationaryTracking={appSettings.enableStationaryTracking}
        onEnableStationaryTrackingChange={handleEnableStationaryTrackingChange}
        stationaryDeviationThreshold={appSettings.stationaryDeviationThreshold}
        onStationaryDeviationThresholdChange={handleStationaryDeviationThresholdChange}
        stationaryAveragingWindowMs={appSettings.stationaryAveragingWindowMs}
        onStationaryAveragingWindowMsChange={handleStationaryAveragingWindowMsChange}
        stationaryHoldDurationMs={appSettings.stationaryHoldDurationMs}
        onStationaryHoldDurationMsChange={handleStationaryHoldDurationMsChange}
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