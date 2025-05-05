import React, { useState, useEffect, useRef } from 'react';
import defaultConfig from '../config';
import './WorkoutTracker.css';
import '../App.css'; // Import global styles
import RepHistoryGraph from './RepHistoryGraph';
import WorkoutSummary from './WorkoutSummary';
import { Select, Paper, ActionIcon, Tooltip, Box } from '@mantine/core';
import {
  IconMaximize,
  IconMinimize,
  IconPlayerPause, // Relaxed
  IconArrowNarrowUp, // Concentric
  IconTarget, // Peak
  IconArrowNarrowDown, // Eccentric
  IconMinus, // Paused
} from '@tabler/icons-react';
import { glassStyle } from '/src/styles/uiStyles';
import { REP_WINDOW_SECONDS, EXTRA_BUFFER_SECONDS } from '../logic/repHistoryProcessor';
import { getTrackingStateStyle } from '../logic/drawingUtils';
import { TRACKING_STATES } from '../logic/trackingStateManager';

// Import custom hooks
import useMediaPipe from '../hooks/useMediaPipe';
import useWorkoutSession from '../hooks/useWorkoutSession';
import usePoseTracking from '../hooks/usePoseTracking';
import useLandmarkRenderer from '../hooks/useLandmarkRenderer';

// Import the new component
import VerticalRepProgressBar from './VerticalRepProgressBar';
import FpsCounter from './FpsCounter';

// Accept props: onPoseResultUpdate, availableExercises, selectedExercise, onExerciseChange, 
// Settings props: videoOpacity, smoothingFactor, strictLandmarkVisibility, showDebug
const WorkoutTracker = ({
  onPoseResultUpdate,
  availableExercises,
  selectedExercise,
  onExerciseChange,
  videoOpacity, // Received from App
  smoothingFactor, // Received from App
  strictLandmarkVisibility, // Received from App
  showDebug, // Received from App
  repDebounceDuration, // New prop
  useSmoothedRepCounting, // New prop
  showRepFlowDiagram, // New prop for toggling the rep flow diagram
  frameSamplingRate = 1, // New prop for MediaPipe frame sampling (default: process every frame)
  config = null, // Receive configuration with face/hands landmark settings
  useLocalModel, // New prop for local model
}) => {
  // Debug logging
  const [debugLogs, setDebugLogs] = useState('');
  const [visibilityThreshold, setVisibilityThreshold] = useState(0.7);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [repGoal, setRepGoal] = useState(12); // Add state for rep goal
  const [weight, setWeight] = useState(5); // Add weight state with default of 5
  const containerRef = useRef(null);
  const previousExerciseRef = useRef(null); // Store previous exercise to detect changes
  const [modelDownloadProgress, setModelDownloadProgress] = useState(0);
  
  // Use imported default config if none provided via props
  const actualConfig = config || defaultConfig;
  
  // Handle fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement !== null);
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);
  
  // Toggle fullscreen function
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  const debugLog = (msg) => {
    if (!showDebug) return;
    setDebugLogs(prev => prev + msg + '\n');
  };
  
  // Initialize MediaPipe hook
  const {
    videoRef,
    canvasRef,
    isLoading,
    errorMessage,
    poseLandmarkerRef,
    lastVideoTimeRef,
    cameraStarted,
    setCameraStarted,
    setupMediaPipe
  } = useMediaPipe(
    actualConfig, 
    showDebug ? console.log : () => {},
    // Pass progress callback if using local model
    useLocalModel ? (progress) => setModelDownloadProgress(progress) : null
  );
  
  // Initialize pose tracking hook with frame sampling rate
  const {
    trackingState,
    repCount,
    repHistory,
    latestLandmarksRef,
    repEngineState,
    renderLoop
  } = usePoseTracking({
    selectedExercise,
    poseLandmarkerRef,
    videoRef,
    lastVideoTimeRef,
    strictLandmarkVisibility,
    visibilityThreshold,
    smoothingFactor,
    repDebounceDuration,
    useSmoothedRepCounting,
    onPoseResultUpdate,
    showDebug,
    frameSamplingRate, // Pass the new prop to the hook
  });
  
  // Initialize workout session hook with expanded functionality
  const {
    isSessionActive,
    workoutStats,
    showWorkoutSummary,
    startWorkout,
    endWorkout,
    handleCloseSummary,
    saveExerciseSet // Make sure this function exists in useWorkoutSession
  } = useWorkoutSession(selectedExercise, repCount, showDebug);
  
  // Initialize landmark renderer hook
  const { renderLandmarks } = useLandmarkRenderer(canvasRef, selectedExercise, actualConfig);
  
  // Start render loop when everything is set up
  useEffect(() => {
    if (cameraStarted && poseLandmarkerRef.current) {
      requestAnimationFrame(renderLoop);
    }
  }, [cameraStarted, poseLandmarkerRef, renderLoop]);
  
  // Auto-increase rep goal when rep count exceeds goal
  useEffect(() => {
    if (selectedExercise.isTwoSided) {
      // For two-sided exercises, use the maximum of both sides
      const currentReps = Math.max(repCount.left, repCount.right);
      if (currentReps > repGoal) {
        setRepGoal(currentReps);
      }
    } else {
      // For single-sided exercises
      if (repCount.left > repGoal) {
        setRepGoal(repCount.left);
      }
    }
  }, [repCount, repGoal, selectedExercise.isTwoSided]);
  
  // Render landmarks when they update
  useEffect(() => {
    if (latestLandmarksRef.current) {
      renderLandmarks(latestLandmarksRef.current);
    }
  }, [latestLandmarksRef.current, renderLandmarks]);

  // When exercise changes, save the previous exercise's reps as a set
  useEffect(() => {
    // Skip on initial mount
    if (previousExerciseRef.current && isSessionActive) {
      const prevExercise = previousExerciseRef.current;
      
      // Check if there are any completed reps to save
      const totalReps = prevExercise.isTwoSided 
        ? Math.min(repCount.left, repCount.right) 
        : repCount.left;
      
      if (totalReps > 0) {
        debugLog(`Saving set for ${prevExercise.name} with ${totalReps} reps`);
        
        // Save the previous exercise as a completed set
        saveExerciseSet({
          exerciseId: prevExercise.id,
          reps: prevExercise.isTwoSided ? null : repCount.left,
          repsLeft: prevExercise.isTwoSided ? repCount.left : null,
          repsRight: prevExercise.isTwoSided ? repCount.right : null,
          weight: prevExercise.hasWeight ? weight : null
        });
      }
    }
    
    // Update the previous exercise ref
    previousExerciseRef.current = selectedExercise;
  }, [selectedExercise, isSessionActive]);
  
  // Handle starting camera and workout
  const handleStartCamera = async () => {
    try {
      // Start a new workout session
      await startWorkout();
      
      // Set up camera and MediaPipe
      const success = await setupMediaPipe();
      
      if (!success) {
        debugLog('Failed to set up MediaPipe');
      }
    } catch (error) {
      console.error('Failed to start workout:', error);
      debugLog('Error starting workout: ' + error.message);
    }
  };
  
  // Handle ending the workout
  const handleEndWorkout = () => {
    // Before ending workout, save the current exercise as a set if it has reps
    if (isSessionActive) {
      const totalReps = selectedExercise.isTwoSided 
        ? Math.min(repCount.left, repCount.right)
        : repCount.left;
      
      if (totalReps > 0) {
        debugLog(`Saving final set for ${selectedExercise.name} with ${totalReps} reps`);
        
        // Save the current exercise as a completed set
        saveExerciseSet({
          exerciseId: selectedExercise.id,
          reps: selectedExercise.isTwoSided ? null : repCount.left,
          repsLeft: selectedExercise.isTwoSided ? repCount.left : null,
          repsRight: selectedExercise.isTwoSided ? repCount.right : null,
          weight: selectedExercise.hasWeight ? weight : null
        });
      }
    }
    
    endWorkout();
  };
  
  // Custom exercise change handler that saves current exercise as a set first
  const handleExerciseChange = (event) => {
    const newExerciseId = event.target.value;
    
    // Standard handler provided by parent
    onExerciseChange(event);
  };
  
  // Add getPhaseStyle function to color-code different phases
  const getPhaseStyle = (phase, baseStyle) => {
    const styles = {
      ...baseStyle,
      borderWidth: '2px',
    };

    switch (phase) {
      case 'relaxed':
        return { ...styles, borderColor: '#3498db' }; // Blue for relaxed
      case 'concentric':
        return { ...styles, borderColor: '#f39c12' }; // Orange for concentric (contracting)
      case 'peak':
        return { ...styles, borderColor: '#27ae60' }; // Green for peak (max contraction)
      case 'eccentric':
        return { ...styles, borderColor: '#9b59b6' }; // Purple for eccentric (releasing)
      case '-':
        return { ...styles, borderColor: '#95a5a6' }; // Gray for paused/unknown
      default:
        return styles;
    }
  };
  
  // Map rep phase to corresponding icon
  const phaseIcons = {
    relaxed: <IconPlayerPause size={24} />,
    concentric: <IconArrowNarrowUp size={24} />,
    peak: <IconTarget size={24} />,
    eccentric: <IconArrowNarrowDown size={24} />,
    '-': <IconMinus size={24} />,
  };

  const getPhaseIcon = (phase, side) => {
    // Get the angle config for this side to determine if relaxedIsHigh
    const angleConfig = selectedExercise?.logicConfig?.anglesToTrack?.find(
      a => (a.side ? a.side === side : side === 'left') && a.isRepCounter
    );
    const relaxedIsHigh = angleConfig?.relaxedIsHigh !== undefined ? angleConfig.relaxedIsHigh : true;

    // For exercises like tricep kickbacks where relaxedIsHigh is false:
    // - relaxed is at low angle (bent arm) - should show PlayerPause
    // - peak is at high angle (extended arm) - should show Target
    // 
    // For exercises like bicep curls where relaxedIsHigh is true:
    // - relaxed is at high angle (straight arm) - should show PlayerPause
    // - peak is at low angle (bent arm) - should show Target
    
    if (relaxedIsHigh) {
      // Standard icons for bicep curls etc.
      return phaseIcons[phase] || null;
    } else {
      // Adjusted icons for tricep kickbacks etc.
      const adjustedPhaseIcons = {
        relaxed: phaseIcons.relaxed, // Same icon for relaxed
        concentric: phaseIcons.eccentric, // Reverse the direction
        peak: phaseIcons.peak, // Same icon for peak
        eccentric: phaseIcons.concentric, // Reverse the direction
        '-': phaseIcons['-'], // Same icon for paused
      };
      return adjustedPhaseIcons[phase] || null;
    }
  };
  
  // Helper to get the appropriate phase display based on tracking state
  const getPhaseDisplay = (sidePhase) => {
    return trackingState === TRACKING_STATES.PAUSED ? '-' : (sidePhase || 'relaxed');
  };

  // Helper to determine which phase should pulse in the rep flow
  const getPhaseClassName = (phase, currentPhase) => {
    return phase === currentPhase ? 'pulse' : '';
  };
  
  // Check if the exercise uses relaxedIsHigh=false (like tricep kickbacks)
  const exerciseHasLowRelaxed = () => {
    // For single-sided, check the left side config
    // For two-sided, we assume both sides have the same pattern (could be enhanced if needed)
    const angleConfig = selectedExercise?.logicConfig?.anglesToTrack?.find(
      a => (a.side ? a.side === 'left' : true) && a.isRepCounter
    );
    return angleConfig?.relaxedIsHigh === false;
  };
  
  // Add handler for rep goal adjustment
  const adjustRepGoal = (adjustment) => {
    setRepGoal(prevGoal => {
      const newGoal = prevGoal + adjustment;
      return newGoal > 0 ? newGoal : 1; // Ensure rep goal doesn't go below 1
    });
  };

  // Add handler for weight adjustment
  const adjustWeight = (adjustment) => {
    setWeight(prevWeight => {
      const newWeight = prevWeight + adjustment;
      return newWeight >= 0 ? newWeight : 0; // Ensure weight doesn't go below 0
    });
  };
  
  return (
    <div className="workout-tracker-container" ref={containerRef}>
      {isLoading && <div className="loading-overlay">Loading Camera & Model...</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}
      
      {/* Workout Summary Overlay */}
      {showWorkoutSummary && (
        <div className="summary-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <WorkoutSummary 
            workoutStats={workoutStats} 
            onClose={handleCloseSummary} 
          />
        </div>
      )}

      {/* Show Start Camera button if not started */}
      {!cameraStarted && (
        <button 
          onClick={handleStartCamera} 
          className="start-camera-btn" 
          style={{ 
            zIndex: 10, 
            position: 'absolute', 
            left: '50%', 
            top: '40%', 
            transform: 'translate(-50%, -50%)', 
            fontSize: 24, 
            padding: '1em 2em', 
            borderRadius: 8, 
            background: '#6a55be', 
            color: 'white', 
            border: 'none', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
          }}
        >
          Start Camera
        </button>
      )}

      <div className="video-canvas-container">
        {/* Add FPS Counter when debug is enabled */}
        {showDebug && <FpsCounter position="top-right" showDetails />}
        
        {/* Top Left Controls Container */}
        <div style={{ 
          position: 'absolute', 
          top: 'var(--mantine-spacing-md)', 
          left: 'var(--mantine-spacing-md)', 
          zIndex: 5, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--mantine-spacing-md)'
        }}>
          {/* State Indicator */}
          <div className="ui-text-preset ui-box-preset" style={getTrackingStateStyle(trackingState, glassStyle)}>
            <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
              <span>State: {trackingState}</span>
            </div>
          </div>
          
          {/* End Workout Button */}
          {isSessionActive && (
            <div 
              className="ui-text-preset ui-box-preset" 
              style={{ ...glassStyle, borderColor: '#e74c3c' }}
            >
              <div 
                style={{ 
                  position: 'relative', 
                  overflow: 'hidden', 
                  width: '100%', 
                  height: '100%', 
                  cursor: 'pointer' 
                }} 
                onClick={handleEndWorkout}
              >
                End Workout
              </div>
            </div>
          )}
        </div>
        
        {/* Fullscreen Button - Top Right */}
        <Tooltip label={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"} position="left" withArrow>
          <ActionIcon
            variant="filled"
            color="grape.6"
            size="lg"
            radius="xl"
            onClick={toggleFullScreen}
            style={{
              position: 'absolute',
              top: 'var(--mantine-spacing-md)',
              right: 'var(--mantine-spacing-md)',
              zIndex: 10
            }}
          >
            {isFullScreen ? <IconMinimize size={20} /> : <IconMaximize size={20} />}
          </ActionIcon>
        </Tooltip>

        <video 
          ref={videoRef} 
          className="input_video" 
          autoPlay 
          playsInline 
          muted 
          style={{ opacity: videoOpacity / 100 }}
        />
        <canvas ref={canvasRef} className="output_canvas" />
        
        {/* Rep History Graph */}
        <div style={{ position: 'absolute', top: 10, right: 10, width: '40%', minWidth: 320, zIndex: 3 }}>
          <RepHistoryGraph
            data={repHistory
              .filter(d => d.trackingState === 'ACTIVE' || d.trackingState === 'READY')
              .filter(d => Date.now() - d.timestamp <= (REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS) * 1000)}
            showLeft={selectedExercise.isTwoSided || (!selectedExercise.isTwoSided && repHistory.some(d => d.leftAngle !== null))}
            showRight={selectedExercise.isTwoSided && repHistory.some(d => d.rightAngle !== null)}
            windowSeconds={REP_WINDOW_SECONDS}
            exerciseConfig={selectedExercise}
            visibilityThreshold={visibilityThreshold}
            smoothingFactor={smoothingFactor}
            useSmoothing={useSmoothedRepCounting}
          />
        </div>
        
        {/* Weight Indicator - positioned above rep goal (only for exercises with weights) */}
        {selectedExercise.hasWeight && (
          <div 
            className="weight-indicator ui-text-preset ui-box-preset" 
            style={{
              ...glassStyle,
              position: 'absolute',
              bottom: 'calc(var(--mantine-spacing-md) + 60px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              width: '375px', // Fixed width matching user adjustment
              maxWidth: '380px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between', // Push buttons to edges
              gap: '8px',
              padding: '8px 12px'
            }}
          >
            {/* Left Button Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                onClick={() => adjustWeight(-10)} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: 'none', 
                  borderRadius: '4px', 
                  padding: '4px 8px', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  minWidth: '36px'
                }}
              >
                -10
              </button>
              <button 
                onClick={() => adjustWeight(-5)} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: 'none', 
                  borderRadius: '4px', 
                  padding: '4px 8px', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  minWidth: '36px'
                }}
              >
                -5
              </button>
            </div>
            
            {/* Center Text Area */}
            <div style={{ 
              flexGrow: 1, 
              minWidth: '100px', 
              textAlign: 'center', 
              margin: '0 8px' 
            }}>
              Weight: {weight} lbs
            </div>
            
            {/* Right Button Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                onClick={() => adjustWeight(5)} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: 'none', 
                  borderRadius: '4px', 
                  padding: '4px 8px', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  minWidth: '36px'
                }}
              >
                +5
              </button>
              <button 
                onClick={() => adjustWeight(10)} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  border: 'none', 
                  borderRadius: '4px', 
                  padding: '4px 8px', 
                  color: 'white', 
                  cursor: 'pointer',
                  fontSize: '14px',
                  minWidth: '36px'
                }}
              >
                +10
              </button>
            </div>
          </div>
        )}
        
        {/* State Flow Indicator - positioned above rep goal but below weight indicator if present */}
        {showRepFlowDiagram && (
          <div 
            className="rep-flow ui-text-preset ui-box-preset" 
            style={{
              ...glassStyle,
              position: 'absolute',
              bottom: `calc(var(--mantine-spacing-md) + ${selectedExercise.hasWeight ? '120px' : '60px'})`,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              minWidth: '320px',
              maxWidth: '550px',
              textAlign: 'center',
              padding: 'var(--mantine-spacing-sm)',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--mantine-spacing-md)',
            }}
          >
            {exerciseHasLowRelaxed() ? (
              // Flow for exercises where relaxedIsHigh=false (tricep kickbacks)
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span className={getPhaseClassName('relaxed', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#3498db' }}
                >
                  Relaxed
                </span>
                <span>→</span>
                <span className={getPhaseClassName('concentric', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#f39c12' }}
                >
                  Extend
                </span>
                <span>→</span>
                <span className={getPhaseClassName('peak', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#27ae60' }}
                >
                  Peak
                </span>
                <span>→</span>
                <span className={getPhaseClassName('eccentric', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#9b59b6' }}
                >
                  Return
                </span>
                <span>→</span>
                <span className={getPhaseClassName('relaxed', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)}
                  style={{ color: '#3498db' }}
                >
                  Relaxed
                </span>
                <span style={{ fontSize: '0.9em', marginLeft: '10px', opacity: 0.7 }}>= 1 rep</span>
              </div>
            ) : (
              // Standard flow for exercises where relaxedIsHigh=true (bicep curls)
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span className={getPhaseClassName('relaxed', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#3498db' }}
                >
                  Relaxed
                </span>
                <span>→</span>
                <span className={getPhaseClassName('concentric', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#f39c12' }}
                >
                  Concentric
                </span>
                <span>→</span>
                <span className={getPhaseClassName('peak', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#27ae60' }}
                >
                  Peak
                </span>
                <span>→</span>
                <span className={getPhaseClassName('eccentric', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)} 
                  style={{ color: '#9b59b6' }}
                >
                  Eccentric
                </span>
                <span>→</span>
                <span className={getPhaseClassName('relaxed', !selectedExercise.isTwoSided ? 
                  getPhaseDisplay(repEngineState?.angleLogic?.left?.phase) : 
                  null)}
                  style={{ color: '#3498db' }}
                >
                  Relaxed
                </span>
                <span style={{ fontSize: '0.9em', marginLeft: '10px', opacity: 0.7 }}>= 1 rep</span>
              </div>
            )}
          </div>
        )}
        
        {/* Rep Goal - positioned at bottom center */}
        <div 
          className="rep-goal ui-text-preset ui-box-preset" 
          style={{
            ...glassStyle,
            position: 'absolute',
            bottom: 'var(--mantine-spacing-md)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            width: '375px', // Fixed width for the container
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between', // Push buttons to edges
            gap: '8px',
            padding: '8px 12px'
          }}
        >
          {/* Left Button Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              onClick={() => adjustRepGoal(-5)} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '4px 8px', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '32px'
              }}
            >
              -5
            </button>
            <button 
              onClick={() => adjustRepGoal(-1)} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '4px 8px', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '32px'
              }}
            >
              -1
            </button>
          </div>
          
          {/* Center Text Area */}
          <div style={{ 
            flexGrow: 1, // Allow text area to take up remaining space
            minWidth: '100px', // Ensure text has minimum space
            textAlign: 'center', // Center the text within its space
            margin: '0 8px' 
          }}>
            Rep Goal: {repGoal}
          </div>
          
          {/* Right Button Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              onClick={() => adjustRepGoal(1)} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '4px 8px', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '32px'
              }}
            >
              +1
            </button>
            <button 
              onClick={() => adjustRepGoal(5)} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                border: 'none', 
                borderRadius: '4px', 
                padding: '4px 8px', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                minWidth: '32px'
              }}
            >
              +5
            </button>
          </div>
        </div>
        
        {/* Rep Counters & State Indicators Area */}
        {selectedExercise.isTwoSided ? (
          <>
            {/* Left Vertical Rep Bar */}
            <Box style={{
              position: 'absolute',
              top: '50%',
              left: 'var(--mantine-spacing-md)',
              transform: 'translateY(-50%)',
              height: '350px', // Adjust height as needed
              width: '40px', // Adjust width as needed
              zIndex: 2
            }}>
              <VerticalRepProgressBar
                currentReps={repCount.left}
                repGoal={repGoal}
                height="100%" // Fill the container
                width="100%" // Fill the container
              />
            </Box>

            {/* Right Vertical Rep Bar */}
            <Box style={{
              position: 'absolute',
              top: '50%',
              right: 'var(--mantine-spacing-md)',
              transform: 'translateY(-50%)',
              height: '350px', // Match left bar height
              width: '40px',  // Match left bar width
              zIndex: 2
            }}>
              <VerticalRepProgressBar
                currentReps={repCount.right}
                repGoal={repGoal}
                height="100%"
                width="100%"
              />
            </Box>

            {/* State Indicators (Positioned below respective bars) */}
            {/* Left State Indicator */}
            <div className="rep-counter-box ui-text-preset ui-box-preset" style={{ // Reuse class for styling consistency
              ...getPhaseStyle(
                getPhaseDisplay(repEngineState?.angleLogic?.left?.phase),
                glassStyle
              ),
              position: 'absolute',
              top: 'calc(50% + 175px + var(--mantine-spacing-sm))', // Below bar (center + half-height + spacing)
              left: 'var(--mantine-spacing-md)', // Align with left bar's edge
              transform: 'translateX(calc(-50% + 20px))', // Center below bar (shift left by half-width, right by half-bar-width)
              width: '45px', // Make it more square
              height: '45px', // Make it more square
              zIndex: 2,
              display: 'flex', // Center the icon
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0, // Remove padding if not needed
            }}>
              {getPhaseIcon(getPhaseDisplay(repEngineState?.angleLogic?.left?.phase), 'left')}
            </div>

            {/* Right State Indicator */}
            <div className="rep-counter-box ui-text-preset ui-box-preset" style={{ // Reuse class
              ...getPhaseStyle(
                getPhaseDisplay(repEngineState?.angleLogic?.right?.phase),
                glassStyle
              ),
              position: 'absolute',
              top: 'calc(50% + 175px + var(--mantine-spacing-sm))', // Below bar (center + half-height + spacing)
              right: 'var(--mantine-spacing-md)', // Align with right bar's edge
              transform: 'translateX(calc(50% - 20px))', // Center below bar (shift right by half-width, left by half-bar-width)
              width: '45px', // Match size
              height: '45px', // Match size
              zIndex: 2,
              display: 'flex', // Center the icon
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}>
              {getPhaseIcon(getPhaseDisplay(repEngineState?.angleLogic?.right?.phase), 'right')}
            </div>
          </>
        ) : (
          <>
            {/* Single Vertical Rep Bar (Right Side) */}
             <Box style={{
              position: 'absolute',
              top: '50%',
              right: 'var(--mantine-spacing-md)',
              transform: 'translateY(-50%)',
              height: '350px', // Match height
              width: '40px',  // Match width
              zIndex: 2
            }}>
              <VerticalRepProgressBar
                currentReps={repCount.left} // Single-sided uses repCount.left
                repGoal={repGoal}
                height="100%"
                width="100%"
              />
            </Box>
            
            {/* State Indicator (Positioned below right bar) */}
            <div className="rep-counter-box ui-text-preset ui-box-preset" style={{ // Reuse class
              ...getPhaseStyle(
                getPhaseDisplay(repEngineState?.angleLogic?.left?.phase), // Single-sided uses left phase
                glassStyle
              ),
              position: 'absolute',
              top: 'calc(50% + 175px + var(--mantine-spacing-sm))', // Below bar
              right: 'var(--mantine-spacing-md)', // Align with right bar's edge
              transform: 'translateX(calc(50% - 20px))', // Center below bar
              width: '45px', // Match size
              height: '45px', // Match size
              zIndex: 2,
              display: 'flex', // Center the icon
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}>
              {getPhaseIcon(getPhaseDisplay(repEngineState?.angleLogic?.left?.phase), 'left')}
            </div>
          </>
        )}
        
        {/* Exercise Selector */}
        <div className="exercise-selector-container">
          <Paper 
            p="lg" 
            radius="md" 
            styles={{
              root: glassStyle
            }}
            className="ui-text-preset ui-box-preset"
          >
            <div style={{
              fontSize: '1.15em',
              fontWeight: 600,
              color: 'var(--mantine-color-white)',
              marginBottom: 8,
              letterSpacing: 0.5,
              textShadow: '0 1px 4px rgba(0,0,0,0.18)'
            }}>
              Exercise
            </div>
            <Select
              placeholder="Pick exercise"
              searchable
              data={availableExercises.map(ex => ({ value: ex.id, label: ex.name }))}
              value={selectedExercise.id}
              onChange={value => {
                if (value) {
                  // Use our custom handler instead of the direct prop
                  handleExerciseChange({ target: { value } });
                }
              }}
              nothingFoundMessage="No exercises found"
              styles={{ 
                dropdown: { zIndex: 1000 },
                input: {
                  fontSize: '1.08em',
                  fontWeight: 500,
                  color: 'var(--mantine-color-white)',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  minHeight: 38
                },
                item: {
                  fontSize: '1.05em',
                  fontWeight: 500
                }
              }}
              radius="md"
              color="grape.6"
            />
          </Paper>
        </div>
      </div>

      {/* Debug window */}
      {showDebug && (
        <div className="debug-window" style={{ background: 'black', color: 'white', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', marginTop: '15px' }}>
          <pre>{debugLogs}</pre>
        </div>
      )}
    </div>
  );
};

export default WorkoutTracker;