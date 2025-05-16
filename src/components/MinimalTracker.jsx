import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
// import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'; // Moved to usePoseTracker
import './MinimalTracker.css'; // Use new layout styles
// import { calculateAngle, LANDMARK_MAP } from '../logic/landmarkUtils'; // Moved to usePoseTracker
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

// Get exercise options once outside the component to avoid re-computation
const exerciseOptions = Object.values(exercises)
  .filter(e => e && e.id && e.name)
  .sort((a, b) => a.name.localeCompare(b.name)); // Pre-sort the options

const MinimalTrackerContent = () => {
  // Settings Hook
  const [appSettings, updateAppSettings] = useAppSettings();

  // Refs for selectedExercise (still needed here for UI logic)
  const selectedExerciseRef = useRef(); // selectedExerciseRef will be updated by selectedExercise state

  // State that remains in MinimalTrackerContent
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(() => {
    const initialExerciseId = appSettings.selectedExerciseId;
    if (initialExerciseId) {
      const foundExercise = exerciseOptions.find(ex => ex.id === initialExerciseId);
      if (foundExercise) return foundExercise;
    }
    return exerciseOptions[0]; // Default
  });
  const [weight, setWeight] = useState(appSettings.selectedWeights !== null ? appSettings.selectedWeights : 0);
  const [repGoal, setRepGoal] = useState(10);
  const [workoutMode, setWorkoutMode] = useState('manual'); // 'manual', 'session', or 'ladder'

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
    angleHistoryRef // Passed from hook
  } = usePoseTracker(selectedExerciseRef, appSettings);


  // Constants (ANGLE_SMOOTHING_WINDOW is now in the hook)
  // const ANGLE_SMOOTHING_WINDOW = 25; // Moved

  // Functions for settings updates
  const toggleSmoothingAndUpdateSettings = useCallback(() => {
    updateAppSettings(prev => ({ isSmoothingEnabled: !prev.isSmoothingEnabled }));
    if (angleHistoryRef && angleHistoryRef.current) { // Clear angle history in the hook
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
    // smoothingEnabled: appSettings.isSmoothingEnabled, // This is now internal to the hook or passed via appSettings
    // smoothingWindow: ANGLE_SMOOTHING_WINDOW, // This is now internal to the hook
    exerciseOptions,
    selectedExercise, // This should be the state variable for the dropdown
    onExerciseChange: handleExerciseChange,
    isSessionActive,
    currentTimerValue,
    onToggleSession: handleToggleSession,
    workoutMode,
    onWorkoutModeChange: handleWorkoutModeChange,
    currentExercise: currentExerciseForDisplay, // Use the renamed variable
    upcomingExercise: timedSessionUpcomingExercise,
    sessionPhase,
    totalSets: workoutMode === 'session' ? timedSessionTotalSets : 
               workoutMode === 'ladder' ? ladderTotalSets : 0,
    currentSetNumber: workoutMode === 'session' ? timedSessionCurrentSetNumber : 
                      workoutMode === 'ladder' ? ladderCurrentSetNumber : 0,
    onSessionSettingsChange: updateSessionSettings,
    sessionSettings,
    currentReps, // For ladder
    onCompleteSet: completeCurrentSet, // For ladder
    onLadderSettingsChange: updateLadderSettings, // For ladder
    ladderSettings, // For ladder
    direction, // For ladder
    selectedLadderExercise, // For ladder
    onLadderExerciseChange: handleLadderExerciseChange, // For ladder
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

      <TrackerControlsBar {...trackerControlsProps} />

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

      <div className="video-canvas-container" style={{ visibility: isLoading || errorMessage ? 'hidden' : 'visible', position: 'relative' }}>
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
        />
        
        {cameraStarted && !isLoading && !errorMessage && (
          <RepGoalDisplayContainer 
            repGoal={repGoal}
            isTwoSided={getActiveExercise.isTwoSided} // Use getActiveExercise
            ladderReps={workoutMode === 'ladder' && isLadderSessionActive ? currentReps : null}
          />
        )}
        
        <div className="minimal-tracker-overlay">
          <div className="minimal-tracker-stack left">
            <AngleDisplay 
              displaySide="left"
              selectedExercise={getActiveExercise} // Use getActiveExercise
              trackedAngles={trackedAngles} // From hook
              rawAngles={rawAngles} // From hook
              smoothingEnabled={appSettings.isSmoothingEnabled} // Pass appSetting for display consistency
            />
            <PhaseTrackerDisplay
              displaySide="left"
              selectedExercise={getActiveExercise} // Use getActiveExercise
              trackedAngles={trackedAngles} // From hook
              useThreePhases={appSettings.useThreePhases}
              landmarksData={landmarksData} // From hook
              workoutMode={workoutMode}
            />
            <LandmarkMetricsDisplay2
              displaySide="left"
              selectedExercise={getActiveExercise} // Use getActiveExercise
              landmarksData={landmarksData} // From hook
              trackedAngles={trackedAngles} // From hook
            />
          </div>
          <div className="minimal-tracker-stack right">
            <AngleDisplay 
              displaySide="right"
              selectedExercise={getActiveExercise} // Use getActiveExercise
              trackedAngles={trackedAngles} // From hook
              rawAngles={rawAngles} // From hook
              smoothingEnabled={appSettings.isSmoothingEnabled} // Pass appSetting for display consistency
            />
            <PhaseTrackerDisplay
              displaySide="right"
              selectedExercise={getActiveExercise} // Use getActiveExercise
              trackedAngles={trackedAngles} // From hook
              useThreePhases={appSettings.useThreePhases}
              landmarksData={landmarksData} // From hook
              workoutMode={workoutMode}
            />
            <LandmarkMetricsDisplay2
              displaySide="right"
              selectedExercise={getActiveExercise} // Use getActiveExercise
              landmarksData={landmarksData} // From hook
              trackedAngles={trackedAngles} // From hook
            />
          </div>
        </div>
        
        <BottomControls {...bottomControlsProps} />
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