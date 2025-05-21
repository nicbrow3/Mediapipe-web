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
import { ActionIcon, Text, Group, Modal } from '@mantine/core';
import { Gear } from '@phosphor-icons/react';
import { RulerIcon } from '@phosphor-icons/react';
import { ChartBar } from '@phosphor-icons/react';
import FpsDisplay from './common/FpsDisplay'; // Import FpsDisplay
import SettingsOverlay from './SettingsOverlay';
import { RepCounterProvider, useRepCounter } from './RepCounterContext';
import RepGoalDisplayContainer from './RepGoalDisplayContainer';
import { usePoseTracker } from '../hooks/usePoseTracker'; // Import the new hook
import WorkoutBuilder from './WorkoutBuilder'; // Import the new workout builder component
import useStructuredWorkoutLogic from '../hooks/useStructuredWorkoutLogic'; // Import the structured workout hook

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
  const [workoutMode, setWorkoutMode] = useState('manual'); // 'manual', 'session', 'ladder', or 'circuit'
  
  // Circuit workout state
  const [workoutPlan, setWorkoutPlan] = useState([]); 
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);

  // State for the Z-depth display
  const [showZDepthDisplay, setShowZDepthDisplay] = useState(false);
  
  // State for showing/hiding angle UI components
  const [showAngleUI, setShowAngleUI] = useState(true);
  
  // New state to store visibility data for both sides
  const [landmarkVisibilityData, setLandmarkVisibilityData] = useState({
    left: { primaryLandmarks: { allVisible: true, minVisibility: 100 } },
    right: { primaryLandmarks: { allVisible: true, minVisibility: 100 } }
  });
  
  // Add state for showing/hiding the tracker controls
  const [showControls, setShowControls] = useState(true);
  
  // Update selectedExerciseRef whenever selectedExercise changes
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  // Access the rep counter functionality
  const { repCount, resetRepCounts } = useRepCounter();
  const repCountRef = useRef(repCount); // Create a ref to track the current rep count

  // Update the ref whenever repCount changes
  useEffect(() => {
    repCountRef.current = repCount;
  }, [repCount]);

  // Initialize the structured workout logic
  const {
    initializeWorkout,
    getCurrentExerciseDetails,
    advanceToNextSet,
    toggleWorkout,
    isActive: isStructuredWorkoutActive,
    isWorkoutComplete,
    resetWorkout
  } = useStructuredWorkoutLogic();
  
  // Current exercise details from structured workout
  const [structuredWorkoutDetails, setStructuredWorkoutDetails] = useState(null);
  
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
    setSessionExercise, // Get the function to set fixed exercise
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
    calculateNextReps, // Add the calculateNextReps function for use in UI
    isCompletionModalOpen, // For completion modal
    handleCompletionModalClose, // For completion modal
    sessionStats, // For completion modal
  } = useLadderSessionLogic(selectRandomExercise);

  // Define handleExerciseChange first so it can be referenced by handleLadderExerciseChange
  const handleExerciseChange = useCallback((newExercise) => {
    // Update the global selected exercise reference
    setSelectedExercise(newExercise); // This will update selectedExerciseRef via its useEffect
    updateAppSettings({ selectedExerciseId: newExercise.id });
    resetRepCounts();
    
    // Keep all exercise selectors in sync
    if (workoutMode === 'ladder' || workoutMode === 'session') {
      selectExerciseForLadder(newExercise); // Update ladder exercise
    }
  }, [updateAppSettings, workoutMode, selectExerciseForLadder, resetRepCounts]);

  // Now define handleLadderExerciseChange which depends on handleExerciseChange
  const handleLadderExerciseChange = useCallback((exercise) => {
    // This function is now just an alias for handleExerciseChange to maintain consistent behavior
    handleExerciseChange(exercise);
  }, [handleExerciseChange]);

  const isSessionActive = useMemo(() => 
    workoutMode === 'session' ? isTimedSessionActive : 
    workoutMode === 'ladder' ? isLadderSessionActive :
    workoutMode === 'circuit' ? isStructuredWorkoutActive : false,
  [workoutMode, isTimedSessionActive, isLadderSessionActive, isStructuredWorkoutActive]);
  
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
    } else if (workoutMode === 'circuit') {
      const isNowActive = toggleWorkout(); // Toggle the workout state and get the new state
      
      // If the workout is now active, make sure we have current exercise details
      if (isNowActive && !structuredWorkoutDetails) {
        const details = getCurrentExerciseDetails();
        setStructuredWorkoutDetails(details);
      }
    }
  }, [workoutMode, handleToggleTimedSession, handleToggleLadderSession, toggleWorkout, structuredWorkoutDetails, getCurrentExerciseDetails]);

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
    
    // Reset the current structured workout if switching away from it
    if (workoutMode === 'circuit' && mode !== 'circuit') {
      resetWorkout();
      setStructuredWorkoutDetails(null);
    }
    
    setWorkoutMode(mode);
    
    if (isTimedSessionActive) {
      handleToggleTimedSession(); // Stop session
    }
    if (isLadderSessionActive) {
      handleToggleLadderSession(); // Stop session
    }
    
    // Don't automatically open the workout builder when switching to circuit mode
    // Only initialize workout logic if we have a plan and we're switching to circuit mode
    if (mode === 'circuit' && workoutPlan.length > 0) {
      const success = initializeWorkout(workoutPlan);
      if (success) {
        const details = getCurrentExerciseDetails();
        setStructuredWorkoutDetails(details);
      }
    }
  }, [
    isSessionActive, 
    isTimedSessionActive, 
    isLadderSessionActive,
    handleToggleTimedSession,
    handleToggleLadderSession,
    workoutPlan,
    workoutMode,
    initializeWorkout,
    getCurrentExerciseDetails,
    resetWorkout
  ]);
  
  // Handle opening the workout builder
  const handleOpenWorkoutBuilder = useCallback(() => {
    setShowWorkoutBuilder(true);
  }, []);
  
  // Handle saving the workout plan from the builder
  const handleSaveWorkoutPlan = useCallback((newWorkoutPlan) => {
    setWorkoutPlan(newWorkoutPlan);
    setShowWorkoutBuilder(false);
    
    // If we're in circuit mode, initialize the workout with the new plan
    if (workoutMode === 'circuit') {
      const success = initializeWorkout(newWorkoutPlan);
      if (success) {
        const details = getCurrentExerciseDetails();
        setStructuredWorkoutDetails(details);
      }
    }
  }, [workoutMode, initializeWorkout, getCurrentExerciseDetails]);
  
  // Handle canceling the workout builder
  const handleCancelWorkoutBuilder = useCallback(() => {
    setShowWorkoutBuilder(false);
    
    // If we're in circuit mode and there's no workout plan, switch back to manual mode
    if (workoutMode === 'circuit' && (!workoutPlan || workoutPlan.length === 0)) {
      setWorkoutMode('manual');
    }
  }, [workoutMode, workoutPlan, setWorkoutMode]);
  
  // Handle completing a set in structured workout mode
  const handleCompleteStructuredSet = useCallback(() => {
    const currentDetails = getCurrentExerciseDetails();
    
    if (currentDetails) {
      // Use the ref to get the current rep count
      const currentRepCount = repCountRef.current;
      
      // Determine if rep goal was met (using the larger count for two-sided exercises)
      const effectiveCount = Math.max(
        currentRepCount.left || 0,
        currentRepCount.right || 0
      );
      
      console.log(`Completed set with ${effectiveCount} reps (target: ${currentDetails.targetReps})`);
      
      // Advance to the next set
      const success = advanceToNextSet();
      if (success) {
        // Update exercise details
        const newDetails = getCurrentExerciseDetails();
        setStructuredWorkoutDetails(newDetails);
        
        // Reset rep counts for the next set
        resetRepCounts();
      } else {
        // Workout is complete
        console.log('Workout complete!');
        setStructuredWorkoutDetails(null);
      }
    }
  }, [getCurrentExerciseDetails, advanceToNextSet, resetRepCounts]);

  // initializePoseLandmarker, addMeasurement, updateStats, renderLoop, smoothAngle are now in usePoseTracker
  // The main useEffect for cleanup is also in usePoseTracker
  // The useEffect for window resize is also in usePoseTracker

  // The handleStartCamera function is replaced by startTracking from the hook
  const handleStartCamera = () => {
    // setIsLoading(true); // This is handled by the hook's startTracking
    // setErrorMessage(''); // This is handled by the hook's startTracking
    startTracking();
  };


  // Reset rep goal to 10 when exercise changes, or update based on structured workout
  useEffect(() => {
    if (workoutMode === 'circuit' && structuredWorkoutDetails) {
      // Set rep goal from structured workout details
      setRepGoal(structuredWorkoutDetails.targetReps);
      
      // Update weight if applicable
      if (structuredWorkoutDetails.weight !== null) {
        setWeight(structuredWorkoutDetails.weight);
      }
    } else {
      // Default rep goal
      setRepGoal(10);
    }
  }, [selectedExercise, workoutMode, structuredWorkoutDetails]); // Dependencies updated

  const getActiveExercise = useMemo(() => {
    if (workoutMode === 'ladder' && isLadderSessionActive && ladderSessionCurrentExercise) {
      return ladderSessionCurrentExercise;
    } else if (workoutMode === 'circuit' && isStructuredWorkoutActive && structuredWorkoutDetails) {
      // Find the exercise by ID from the structured workout details
      const exerciseId = structuredWorkoutDetails.exerciseId;
      const structuredExercise = Object.values(exercises).find(ex => ex.id === exerciseId);
      return structuredExercise || selectedExercise;
    } else {
      return selectedExercise;
    }
  }, [
    workoutMode, 
    isLadderSessionActive, 
    ladderSessionCurrentExercise, 
    isStructuredWorkoutActive,
    structuredWorkoutDetails,
    selectedExercise
  ]);

  // Handler to receive visibility updates from PhaseTrackerDisplay
  const handleVisibilityDataUpdate = useCallback((side, data) => {
    if (!data) return; // Skip if no data
    
    // Only update if there's a meaningful change to prevent infinite loops
    setLandmarkVisibilityData(prev => {
      const currentSideData = prev[side.toLowerCase()];
      
      // Check if primary landmarks data has changed
      const primaryChanged = 
        currentSideData?.primaryLandmarks?.allVisible !== data.primaryLandmarks?.allVisible ||
        Math.abs((currentSideData?.primaryLandmarks?.minVisibility || 0) - (data.primaryLandmarks?.minVisibility || 0)) > 2;
      
      // Check if secondary landmarks data has changed  
      const secondaryChanged =
        currentSideData?.secondaryLandmarks?.allVisible !== data.secondaryLandmarks?.allVisible ||
        Math.abs((currentSideData?.secondaryLandmarks?.minVisibility || 0) - (data.secondaryLandmarks?.minVisibility || 0)) > 2;
      
      // Only update state if there's a meaningful change
      if (primaryChanged || secondaryChanged) {
        return {
          ...prev,
          [side.toLowerCase()]: data
        };
      }
      
      // Return the previous state unchanged if nothing significant changed
      return prev;
    });
  }, []);

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
    isCompletionModalOpen,
    onCompletionModalClose: handleCompletionModalClose,
    sessionStats,
    // Circuit/Structured workout props
    workoutPlan,
    onOpenWorkoutBuilder: handleOpenWorkoutBuilder,
    structuredWorkoutDetails,
    onCompleteStructuredSet: handleCompleteStructuredSet,
    showControls, // Pass the visibility state
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
  isCompletionModalOpen,
  handleCompletionModalClose,
  sessionStats,
  // Circuit/Structured workout dependencies
  workoutPlan,
  handleOpenWorkoutBuilder,
  structuredWorkoutDetails,
  handleCompleteStructuredSet,
  showControls
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

  // Effect to update the fixed exercise when selectedExercise changes
  // and useRandomExercises is false
  useEffect(() => {
    if (
      workoutMode === 'session' && 
      setSessionExercise && 
      sessionSettings?.useRandomExercises === false
    ) {
      setSessionExercise(selectedExercise);
    }
  }, [workoutMode, selectedExercise, sessionSettings?.useRandomExercises, setSessionExercise]);

  return (
    <div className="minimal-tracker-root">
      {cameraStarted && !isLoading && !errorMessage && (
        <>
          <Group spacing="xs" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1300 }}>
            {/* FPS Display */}
            <FpsDisplay 
              fps={stats.fps} 
              inferenceTime={stats.inferenceTime} 
            />

            {/* Settings button */}
            <ActionIcon
              variant="filled"
              color="gray"
              size="lg"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
            >
              <Gear size={24} />
            </ActionIcon>

            {/* Controls toggle */}
            <ActionIcon
              variant="filled"
              color={showControls ? 'blue' : 'gray'}
              size="lg"
              onClick={() => setShowControls(!showControls)}
              title={showControls ? "Hide controls" : "Show controls"}
            >
              <ChartBar size={24} />
            </ActionIcon>

            {/* Toggle angles visibility */}
            <ActionIcon
              variant="filled"
              color={showAngleUI ? 'cyan' : 'gray'}
              size="lg"
              onClick={() => setShowAngleUI(!showAngleUI)}
              title={showAngleUI ? "Hide angle display" : "Show angle display"}
            >
              <RulerIcon size={24} />
            </ActionIcon>
            
            {/* Z-depth toggle */}
            <ActionIcon
              variant="filled"
              color={showZDepthDisplay ? 'blue' : 'gray'}
              size="lg"
              onClick={() => setShowZDepthDisplay(!showZDepthDisplay)}
              title={showZDepthDisplay ? "Hide depth analysis" : "Show depth analysis"}
            >
              Z
            </ActionIcon>
          </Group>
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
        workoutPlan={workoutPlan}
        onOpenWorkoutBuilder={handleOpenWorkoutBuilder}
        structuredWorkoutDetails={structuredWorkoutDetails}
        onCompleteStructuredSet={handleCompleteStructuredSet}
        onLadderExerciseChange={handleLadderExerciseChange}
        enableStationaryTracking={appSettings.enableStationaryTracking}
        stabilityState={stabilityState}
        isCompletionModalOpen={isCompletionModalOpen}
        onCompletionModalClose={handleCompletionModalClose}
        sessionStats={sessionStats}
        showControls={showControls} // Pass the visibility state
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
            sessionPhase={sessionPhase}
            nextLadderReps={workoutMode === 'ladder' && sessionPhase === 'resting' ? calculateNextReps() : null}
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
                {hasLeftAngles && showAngleUI && (
                  <div className="minimal-tracker-stack left">
                    <AngleDisplay 
                      displaySide="left"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      trackedAngles={trackedAngles} // From hook
                      rawAngles={rawAngles} // From hook
                      smoothingEnabled={appSettings.isSmoothingEnabled} // Pass appSetting for display consistency
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                      landmarkVisibility={landmarkVisibilityData.left} // Pass the actual landmark visibility data
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
                      sessionPhase={sessionPhase} // Pass current session phase
                      onVisibilityDataUpdate={(data) => handleVisibilityDataUpdate('left', data)} // Add this handler
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

                {hasRightAngles && showAngleUI && (
                  <div className="minimal-tracker-stack right">
                    <AngleDisplay 
                      displaySide="right"
                      selectedExercise={getActiveExercise} // Use getActiveExercise
                      trackedAngles={trackedAngles} // From hook
                      rawAngles={rawAngles} // From hook
                      smoothingEnabled={appSettings.isSmoothingEnabled} // Pass appSetting for display consistency
                      cameraStarted={cameraStarted} // Pass camera status
                      hasLandmarksData={!!landmarksData} // Pass boolean indicating data presence
                      landmarkVisibility={landmarkVisibilityData.right} // Pass the actual landmark visibility data
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
                      sessionPhase={sessionPhase} // Pass current session phase
                      onVisibilityDataUpdate={(data) => handleVisibilityDataUpdate('right', data)} // Add this handler
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
      
      {/* Workout Builder Modal */}
      <Modal
        opened={showWorkoutBuilder}
        onClose={handleCancelWorkoutBuilder}
        size="xl"
        title="Workout Builder"
        padding={0}
        styles={{
          modal: {
            maxWidth: '90vw',
            height: '90vh'
          },
          title: {
            display: 'none'
          },
          body: {
            paddingTop: 0
          }
        }}
      >
        <WorkoutBuilder
          initialWorkoutPlan={workoutPlan}
          onSave={handleSaveWorkoutPlan}
          onCancel={handleCancelWorkoutBuilder}
        />
      </Modal>
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