import React, { useState, useEffect } from 'react';
import config from '../config';
import './WorkoutTracker.css';
import '../App.css'; // Import global styles
import RepHistoryGraph from './RepHistoryGraph';
import WorkoutSummary from './WorkoutSummary';
import { Select, Paper } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import { REP_WINDOW_SECONDS } from '../logic/repHistoryProcessor';
import { getTrackingStateStyle } from '../logic/drawingUtils';

// Import custom hooks
import useMediaPipe from '../hooks/useMediaPipe';
import useWorkoutSession from '../hooks/useWorkoutSession';
import usePoseTracking from '../hooks/usePoseTracking';
import useLandmarkRenderer from '../hooks/useLandmarkRenderer';

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
}) => {
  // Debug logging
  const [debugLogs, setDebugLogs] = useState('');
  const [visibilityThreshold, setVisibilityThreshold] = useState(0.7);
  
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
  } = useMediaPipe(config, debugLog);
  
  // Initialize pose tracking hook
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
    showDebug
  });
  
  // Initialize workout session hook
  const {
    isSessionActive,
    workoutStats,
    showWorkoutSummary,
    startWorkout,
    endWorkout,
    handleCloseSummary
  } = useWorkoutSession(selectedExercise, repCount, showDebug);
  
  // Initialize landmark renderer hook
  const { renderLandmarks } = useLandmarkRenderer(canvasRef, selectedExercise);
  
  // Start render loop when everything is set up
  useEffect(() => {
    if (cameraStarted && poseLandmarkerRef.current) {
      requestAnimationFrame(renderLoop);
    }
  }, [cameraStarted, poseLandmarkerRef, renderLoop]);
  
  // Render landmarks when they update
  useEffect(() => {
    if (latestLandmarksRef.current) {
      renderLandmarks(latestLandmarksRef.current);
    }
  }, [latestLandmarksRef.current, renderLandmarks]);
  
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
    endWorkout();
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
      default:
        return styles;
    }
  };
  
  return (
    <div className="workout-tracker-container">
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
              .filter(d => Date.now() - d.timestamp <= REP_WINDOW_SECONDS * 1000)}
            showLeft={selectedExercise.isTwoSided || (!selectedExercise.isTwoSided && repHistory.some(d => d.leftAngle !== null))}
            showRight={selectedExercise.isTwoSided && repHistory.some(d => d.rightAngle !== null)}
            windowSeconds={REP_WINDOW_SECONDS}
            exerciseConfig={selectedExercise}
            visibilityThreshold={visibilityThreshold}
          />
        </div>
        
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
            minWidth: '120px',
            maxWidth: '200px',
            textAlign: 'center'
          }}
        >
          Rep Goal: 12
        </div>
        
        {/* Rep Counters */}
        {selectedExercise.isTwoSided ? (
          <div style={{ 
            position: 'absolute', 
            bottom: 'var(--mantine-spacing-md)', 
            right: 'var(--mantine-spacing-md)', 
            display: 'flex', 
            flexDirection: 'row',
            gap: 'var(--mantine-spacing-md)', 
            zIndex: 2 
          }}>
            {/* Rep Counter Column */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--mantine-spacing-md)'
            }}>
              {/* Left Rep Counter */}
              <div className="rep-counter-box ui-text-preset ui-box-preset" style={{
                ...glassStyle,
                minWidth: '140px',
                minHeight: '40px'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                  <div
                    className="rep-progress-outline"
                    style={{ width: `${Math.min(100, (repCount.left / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
                  />
                  <span>Left Reps: {repCount.left}</span>
                </div>
              </div>
              
              {/* Right Rep Counter */}
              <div className="rep-counter-box ui-text-preset ui-box-preset" style={{
                ...glassStyle,
                minWidth: '140px',
                minHeight: '40px'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                  <div
                    className="rep-progress-outline"
                    style={{ width: `${Math.min(100, (repCount.right / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
                  />
                  <span>Right Reps: {repCount.right}</span>
                </div>
              </div>
            </div>
            
            {/* State Indicator Column */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--mantine-spacing-md)'
            }}>
              {/* Left State Indicator */}
              <div className="rep-counter-box ui-text-preset ui-box-preset" style={{
                ...getPhaseStyle(repEngineState?.angleLogic?.left?.phase || 'relaxed', glassStyle),
                minWidth: '185px',
                minHeight: '40px'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                  <span>Left: {repEngineState?.angleLogic?.left?.phase || 'relaxed'}</span>
                </div>
              </div>
              
              {/* Right State Indicator */}
              <div className="rep-counter-box ui-text-preset ui-box-preset" style={{
                ...getPhaseStyle(repEngineState?.angleLogic?.right?.phase || 'relaxed', glassStyle),
                minWidth: '185px',
                minHeight: '40px'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                  <span>Right: {repEngineState?.angleLogic?.right?.phase || 'relaxed'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            position: 'absolute', 
            bottom: 'var(--mantine-spacing-md)', 
            right: 'var(--mantine-spacing-md)', 
            display: 'flex', 
            flexDirection: 'row',
            gap: 'var(--mantine-spacing-md)', 
            zIndex: 2 
          }}>
            {/* Rep Counter Column */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--mantine-spacing-md)'
            }}>
              {/* Rep Counter */}
              <div className="rep-counter-box ui-text-preset ui-box-preset" style={{
                ...glassStyle,
                minWidth: '105px',
                minHeight: '40px'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                  <div
                    className="rep-progress-outline"
                    style={{ width: `${Math.min(100, (repCount.left / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
                  />
                  <span>Reps: {repCount.left}</span>
                </div>
              </div>
            </div>
            
            {/* State Indicator Column */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--mantine-spacing-md)'
            }}>
              {/* State Indicator for Single-sided Exercises */}
              <div className="rep-counter-box ui-text-preset ui-box-preset" style={{
                ...getPhaseStyle(repEngineState?.angleLogic?.left?.phase || 'relaxed', glassStyle),
                minWidth: '185px',
                minHeight: '40px'
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                  <span>State: {repEngineState?.angleLogic?.left?.phase || 'relaxed'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Exercise Selector */}
        <div className="exercise-selector-container">
          <Paper 
            p="lg" 
            radius="md" 
            styles={{
              root: glassStyle
            }}
            className="ui-text-preset"
          >
            <Select
              label="Exercise"
              placeholder="Pick exercise"
              searchable
              data={availableExercises.map(ex => ({ value: ex.id, label: ex.name }))}
              value={selectedExercise.id}
              onChange={value => {
                if (value) {
                  onExerciseChange({ target: { value } });
                }
              }}
              nothingFoundMessage="No exercises found"
              styles={{ 
                dropdown: { zIndex: 1000 },
                label: { color: 'var(--mantine-color-white)' }
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