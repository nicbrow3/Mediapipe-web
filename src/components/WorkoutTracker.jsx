import React, { useState, useEffect, useRef } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import config from '../config';
import './WorkoutTracker.css';
import '../App.css'; // Import global styles
import RepHistoryGraph from './RepHistoryGraph';
import WorkoutSummary from './WorkoutSummary';
import { LANDMARK_MAP, POSE_CONNECTIONS, calculateAngle } from '../logic/landmarkUtils';
import { runRepStateEngine } from '../logic/repStateEngine';
import { Select, Paper, Button } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import { startNewWorkoutSession, endWorkoutSession, addExerciseSet } from '../services/db';

// Import the extracted utilities
import { TRACKING_STATES, getAngle, updateTrackingState } from '../logic/trackingStateManager';
import { REP_WINDOW_SECONDS, EXTRA_BUFFER_SECONDS, smoothRepHistoryEMA, updateRepHistoryBuffer, getLandmarkVisibilityScores } from '../logic/repHistoryProcessor';
import { drawLandmarks, drawRepArc, getTrackingStateStyle } from '../logic/drawingUtils';
import { initializePoseLandmarker, setupCamera, waitForVideoReady, cleanupVideoStream } from '../logic/mediaSetup';

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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [repCount, setRepCount] = useState({ left: 0, right: 0 });
  const [debugLogs, setDebugLogs] = useState(''); // Debug logs remain local
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [trackingState, setTrackingState] = useState(TRACKING_STATES.IDLE);
  const trackingStateRef = useRef(TRACKING_STATES.IDLE);
  
  // Session tracking state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const lastExerciseSetTimeRef = useRef(0);
  const sessionStartTimeRef = useRef(null); // Store session start time
  const SET_RECORDING_INTERVAL_MS = 60000; // Record a set every minute

  // Visibility threshold state (single source of truth)
  const [visibilityThreshold, setVisibilityThreshold] = useState(0.7); // Keep this local for now, could be lifted if needed

  // Store these values in refs to avoid re-renders
  const poseLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  // Store stage per angle id for multi-angle support
  const stageRef = useRef({});
  // Store the latest pose landmarks for redraw on exercise change
  const latestLandmarksRef = useRef(null);
  const selectedExerciseRef = useRef(selectedExercise);

  // --- Per-side status for two-sided exercises ---
  const [sideStatus, setSideStatus] = useState({ left: { inReadyPose: false, repInProgress: false }, right: { inReadyPose: false, repInProgress: false } });

  // --- State Tracking Helpers ---
  // Replace repInProgressRef and readyPoseHoldStartRef with per-side refs
  const readyPoseHoldStartRef = useRef({ left: null, right: null });
  const repInProgressRef = useRef({ left: false, right: false });

  // Add a global ready pose hold timer and previous state ref
  const readyPoseGlobalHoldStartRef = useRef(null);
  const prevTrackingStateRef = useRef(TRACKING_STATES.IDLE);

  // Add per-side wasInReadyPose ref for rep cycle
  const wasInReadyPoseRef = useRef({ left: false, right: false });

  // --- Rep History Buffer ---
  const [repHistory, setRepHistory] = useState([]);
  const repHistoryRef = useRef([]);

  // Add a ref to track when visibility was lost for grace period
  const lostVisibilityTimestampRef = useRef(null);

  const [cameraStarted, setCameraStarted] = useState(false);

  const strictLandmarkVisibilityRef = useRef(strictLandmarkVisibility);
  const visibilityThresholdRef = useRef(visibilityThreshold);

  const repDebounceDurationRef = useRef(repDebounceDuration);
  const useSmoothedRepCountingRef = useRef(useSmoothedRepCounting);

  // Add state for workout summary
  const [showWorkoutSummary, setShowWorkoutSummary] = useState(false);
  const [workoutStats, setWorkoutStats] = useState(null);

  // --- Effect Hooks --- Needed to track the values during the lifecycle of the component, not just on initial render
  useEffect(() => {
    strictLandmarkVisibilityRef.current = strictLandmarkVisibility;
  }, [strictLandmarkVisibility]);

  useEffect(() => {
    visibilityThresholdRef.current = visibilityThreshold;
  }, [visibilityThreshold]);

  useEffect(() => {
    repDebounceDurationRef.current = repDebounceDuration;
  }, [repDebounceDuration]);

  useEffect(() => {
    useSmoothedRepCountingRef.current = useSmoothedRepCounting;
  }, [useSmoothedRepCounting]);

  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
    // Clear rep history when exercise changes
    repHistoryRef.current = [];
    setRepHistory([]);
  }, [selectedExercise]);

  // Record exercise set data to the database
  const recordExerciseSet = async () => {
    if (!currentSessionId || !isSessionActive) return;
    
    const now = Date.now();
    if (now - lastExerciseSetTimeRef.current < SET_RECORDING_INTERVAL_MS) return;
    
    try {
      const setData = {
        sessionId: currentSessionId,
        exerciseId: selectedExerciseRef.current.id,
        startTime: lastExerciseSetTimeRef.current || now - 60000, // Default to 1 minute ago if no previous time
        endTime: now,
        reps: selectedExerciseRef.current.isTwoSided ? Math.max(repCount.left, repCount.right) : repCount.left,
        repsLeft: selectedExerciseRef.current.isTwoSided ? repCount.left : null,
        repsRight: selectedExerciseRef.current.isTwoSided ? repCount.right : null,
      };
      
      await addExerciseSet(setData);
      lastExerciseSetTimeRef.current = now;
      
      if (showDebug) {
        console.log('[DEBUG] Recorded exercise set:', setData);
      }
    } catch (error) {
      console.error('Failed to record exercise set:', error);
    }
  };

  // Set up an interval to periodically record exercise sets
  useEffect(() => {
    let intervalId;
    
    if (isSessionActive && currentSessionId) {
      intervalId = setInterval(() => {
        recordExerciseSet();
      }, SET_RECORDING_INTERVAL_MS);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionActive, currentSessionId]);

  const debugLog = (msg) => {
    if (!showDebug) return;
    setDebugLogs(prev => prev + msg + '\n');
  };

  // Draw landmarks helper function
  const renderLandmarks = (landmarks, highlightedLandmarkIndices = [], secondaryLandmarkIndices = []) => {
    if (!landmarks) return;
    drawLandmarks(landmarks, POSE_CONNECTIONS, canvasRef.current, highlightedLandmarkIndices, secondaryLandmarkIndices);
    
    // Draw the arc for the left arm (shoulder, elbow, wrist)
    const leftShoulder = landmarks[LANDMARK_MAP.left_shoulder];
    const leftElbow = landmarks[LANDMARK_MAP.left_elbow];
    const leftWrist = landmarks[LANDMARK_MAP.left_wrist];
    if (leftShoulder && leftElbow && leftWrist && canvasRef.current) {
      drawRepArc(canvasRef.current.getContext('2d'), leftShoulder, leftElbow, leftWrist);
    }
  };

  const setTrackingStateBoth = (newState) => {
    if (showDebug) {
      console.log('[DEBUG] setTrackingStateBoth: newState =', newState);
    }
    setTrackingState(newState);
    trackingStateRef.current = newState;
  };

  // Add a ref to store the previous state for the rep engine
  const repEnginePrevStateRef = useRef(null);
  const [repEngineState, setRepEngineState] = useState(null);

  const processResults = (results) => {
    if (showDebug) {
      console.log('[DEBUG] processResults called: strictLandmarkVisibility=', strictLandmarkVisibilityRef.current, 'visibilityThreshold=', visibilityThresholdRef.current);
    }
    // Call the callback prop with the raw results
    if (onPoseResultUpdate) {
      onPoseResultUpdate(results);
    }

    if (results.landmarks && results.landmarks[0]) {
      const landmarks = results.landmarks[0];
      latestLandmarksRef.current = landmarks; // Store for redraw on exercise change
      
      // --- Rep History Buffer Logic ---
      let leftAngle = null;
      let rightAngle = null;
      // For two-sided, get both; for one-sided, just left
      if (selectedExerciseRef.current?.isTwoSided) {
        // Try to get the first angle config for each side
        const leftConfig = selectedExerciseRef.current.logicConfig?.anglesToTrack?.find(a => a.side === 'left');
        const rightConfig = selectedExerciseRef.current.logicConfig?.anglesToTrack?.find(a => a.side === 'right');
        if (leftConfig) {
          leftAngle = getAngle(landmarks, leftConfig.points, 'left');
        }
        if (rightConfig) {
          rightAngle = getAngle(landmarks, rightConfig.points, 'right');
        }
      } else if (selectedExerciseRef.current?.logicConfig?.anglesToTrack?.length > 0) {
        // One-sided: just use the first config
        const config = selectedExerciseRef.current.logicConfig.anglesToTrack[0];
        leftAngle = getAngle(landmarks, config.points, 'left');
      }
      
      // Get landmark visibility scores
      const { requiredVisibility, secondaryVisibility } = getLandmarkVisibilityScores(
        landmarks,
        selectedExerciseRef.current,
        LANDMARK_MAP
      );
      
      // --- State Tracking Logic ---
      const trackingResult = updateTrackingState(
        landmarks,
        selectedExerciseRef.current,
        strictLandmarkVisibilityRef.current,
        visibilityThresholdRef.current,
        trackingStateRef,
        sideStatus,
        readyPoseHoldStartRef.current,
        readyPoseGlobalHoldStartRef,
        repInProgressRef.current,
        wasInReadyPoseRef.current,
        lostVisibilityTimestampRef,
        prevTrackingStateRef
      );
      
      // Update tracking state from the result
      setTrackingStateBoth(trackingResult.nextTrackingState);
      setSideStatus(trackingResult.newSideStatus);
      
      // Only add to buffer and count reps if trackingState is not PAUSED
      if (
        (leftAngle !== null || rightAngle !== null) &&
        trackingStateRef.current !== TRACKING_STATES.PAUSED
      ) {
        // Update rep history buffer
        repHistoryRef.current = updateRepHistoryBuffer(
          repHistoryRef.current, 
          leftAngle, 
          rightAngle, 
          requiredVisibility, 
          secondaryVisibility, 
          trackingStateRef.current
        );
        setRepHistory(repHistoryRef.current);
        
        // --- Rep Engine Integration ---
        // Use smoothed or raw data for rep counting
        let repEngineInputHistory = useSmoothedRepCountingRef.current 
          ? smoothRepHistoryEMA(repHistoryRef.current, smoothingFactor) 
          : repHistoryRef.current;
        
        // We'll simulate the rep logic as if it was running frame-by-frame on the chosen data
        let lastRepState = repEnginePrevStateRef.current;
        let finalRepState = null;
        
        for (const entry of repEngineInputHistory) {
          // Patch debounce duration into config for this run
          const patchedConfig = {
            ...selectedExerciseRef.current,
            logicConfig: {
              ...selectedExerciseRef.current.logicConfig,
              repDebounceDuration: repDebounceDurationRef.current,
            },
          };
          
          finalRepState = runRepStateEngine(
            landmarks, // still pass current landmarks for utility functions
            patchedConfig,
            lastRepState
          );
          
          lastRepState = finalRepState;
        }
        
        repEnginePrevStateRef.current = finalRepState;
        setRepEngineState(finalRepState);
        
        // Update rep count from repState
        if (finalRepState && finalRepState.angleLogic) {
          setRepCount({
            left: finalRepState.angleLogic.left?.repCount || 0,
            right: finalRepState.angleLogic.right?.repCount || 0,
          });
        }
      }

      // Extract landmark indices to highlight from the selected exercise's landmarks config
      let highlightedIndices = [];
      let secondaryIndices = [];
      
      if (selectedExerciseRef.current?.landmarks) {
        let primaryNames = [];
        let secondaryNames = [];
        
        if (selectedExerciseRef.current.isTwoSided) {
          // Two-sided structure
          const leftPrimary = selectedExerciseRef.current.landmarks.left?.primary || [];
          const rightPrimary = selectedExerciseRef.current.landmarks.right?.primary || [];
          const leftSecondary = selectedExerciseRef.current.landmarks.left?.secondary || [];
          const rightSecondary = selectedExerciseRef.current.landmarks.right?.secondary || [];
          primaryNames = [...leftPrimary, ...rightPrimary];
          secondaryNames = [...leftSecondary, ...rightSecondary];
        } else {
          // Flat structure
          primaryNames = selectedExerciseRef.current.landmarks.primary || [];
          secondaryNames = selectedExerciseRef.current.landmarks.secondary || [];
        }
        
        highlightedIndices = primaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
        secondaryIndices = secondaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
      }
      
      renderLandmarks(landmarks, highlightedIndices, secondaryIndices);
    }
  };

  const renderLoop = () => {
    const video = videoRef.current;

    if (!video) {
      requestAnimationFrame(renderLoop);
      return;
    }

    // Only run detection if the video is ready and has valid dimensions
    if (
      poseLandmarkerRef.current &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      video.currentTime !== lastVideoTimeRef.current
    ) {
      try {
        const timestamp = performance.now();
        const poseLandmarkerResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);

        // Process results internally (drawing, rep counting) AND pass them up
        processResults(poseLandmarkerResult);

        lastVideoTimeRef.current = video.currentTime;
      } catch (error) {
        console.error('Error in detectForVideo:', error); // Log the full error object
        debugLog('Error in detectForVideo: ' + (error?.message || 'Unknown error'));
        // Optionally log stack trace if available
        if (error?.stack) {
          debugLog('Stack trace: ' + error.stack);
        }
      }
    }
    requestAnimationFrame(renderLoop);
  };

  // --- Camera and MediaPipe Setup ---
  const setupMediaPipe = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    try {
      setIsLoading(true);
      
      // Access webcam
      const stream = await setupCamera();
      video.srcObject = stream;
      debugLog('Webcam access successful');

      // Wait for video metadata to be loaded
      await waitForVideoReady(video);

      // Adjust canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Initialize MediaPipe
      poseLandmarkerRef.current = await initializePoseLandmarker(config, debugLog);
      debugLog(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);

      // Start the render loop
      requestAnimationFrame(renderLoop);
      setIsLoading(false);
    } catch (error) {
      console.error('Error during setup:', error);
      debugLog('Error during setup: ' + error.message);
      setErrorMessage(`Setup error: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      // End workout session if it's still active
      if (isSessionActive && currentSessionId) {
        endWorkoutSession(currentSessionId)
          .catch(error => console.error('Error ending workout session:', error));
      }
      
      cleanupVideoStream(videoRef.current);
    };
  }, [isSessionActive, currentSessionId]);

  // --- Handlers ---
  const handleStartCamera = async () => {
    setCameraStarted(true);
    
    try {
      // Start a new workout session
      const sessionId = await startNewWorkoutSession();
      setCurrentSessionId(sessionId);
      setIsSessionActive(true);
      lastExerciseSetTimeRef.current = Date.now();
      sessionStartTimeRef.current = new Date(); // Store start time as Date object
      
      if (showDebug) {
        console.log('[DEBUG] Started new workout session:', sessionId);
      }
      
      setupMediaPipe();
    } catch (error) {
      console.error('Failed to start workout session:', error);
      setErrorMessage(`Failed to start workout session: ${error.message}`);
    }
  };
  
  const handleEndWorkout = async () => {
    if (!isSessionActive || !currentSessionId) return;
    
    try {
      // Record the final set
      await recordExerciseSet();
      
      const endTime = new Date(); // Current time as end time
      
      // Calculate session stats
      const sessionDuration = Math.round((Date.now() - lastExerciseSetTimeRef.current) / 1000);
      
      // Get exercise-specific data
      const isTwoSided = selectedExercise.isTwoSided;
      const totalReps = isTwoSided 
        ? repCount.left + repCount.right
        : repCount.left;
      
      // Create comprehensive stats object
      const stats = {
        totalReps,
        duration: sessionDuration,
        exercisesCompleted: 1, // For now just counting the current exercise
        exerciseName: selectedExercise.name,
        isTwoSided, // Keep this for future use
        startTime: sessionStartTimeRef.current, // Add start time
        endTime: endTime, // Add end time
      };
      
      // End the workout session
      await endWorkoutSession(currentSessionId);
      setIsSessionActive(false);
      
      // Set stats and show summary
      setWorkoutStats(stats);
      setShowWorkoutSummary(true);
      
      if (showDebug) {
        console.log('[DEBUG] Ended workout session:', currentSessionId);
        console.log('[DEBUG] Workout stats:', stats);
      }
    } catch (error) {
      console.error('Failed to end workout session:', error);
    }
  };

  // Add handler to close the summary
  const handleCloseSummary = () => {
    setShowWorkoutSummary(false);
  };

  useEffect(() => {
    // Debug log to confirm effect fires
    if (showDebug) {
      console.log('[DEBUG] useEffect fired: strictLandmarkVisibility=', strictLandmarkVisibility, 'visibilityThreshold=', visibilityThreshold, 'latestLandmarksRef.current=', !!latestLandmarksRef.current);
    }
    // When strictLandmarkVisibility or visibilityThreshold changes, re-check state logic
    if (latestLandmarksRef.current) {
      const trackingResult = updateTrackingState(
        latestLandmarksRef.current,
        selectedExerciseRef.current,
        strictLandmarkVisibility,
        visibilityThreshold,
        trackingStateRef,
        sideStatus,
        readyPoseHoldStartRef.current,
        readyPoseGlobalHoldStartRef,
        repInProgressRef.current,
        wasInReadyPoseRef.current,
        lostVisibilityTimestampRef,
        prevTrackingStateRef
      );
      
      setTrackingStateBoth(trackingResult.nextTrackingState);
      setSideStatus(trackingResult.newSideStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictLandmarkVisibility, visibilityThreshold]);

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
        <button onClick={handleStartCamera} className="start-camera-btn" style={{ zIndex: 10, position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', fontSize: 24, padding: '1em 2em', borderRadius: 8, background: '#6a55be', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
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
            <div className="ui-text-preset ui-box-preset" style={{ ...glassStyle, borderColor: '#e74c3c' }}>
              <div 
                style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', cursor: 'pointer' }} 
                onClick={handleEndWorkout}
              >
                End Workout
              </div>
            </div>
          )}
        </div>

        <video ref={videoRef} className="input_video" autoPlay playsInline muted style={{ opacity: videoOpacity / 100 }}></video>
        <canvas ref={canvasRef} className="output_canvas"></canvas>
        {/* --- Rep History Graph --- */}
        <div style={{ position: 'absolute', top: 10, right: 10, width: '40%', minWidth: 320, zIndex: 3 }}>
          <RepHistoryGraph
            data={smoothRepHistoryEMA(repHistory, smoothingFactor)
              .filter(d => d.trackingState === TRACKING_STATES.ACTIVE || d.trackingState === TRACKING_STATES.READY)
              .filter(d => Date.now() - d.timestamp <= REP_WINDOW_SECONDS * 1000)}
            showLeft={selectedExercise.isTwoSided || (!selectedExercise.isTwoSided && repHistory.some(d => d.leftAngle !== null))}
            showRight={selectedExercise.isTwoSided && repHistory.some(d => d.rightAngle !== null)}
            windowSeconds={REP_WINDOW_SECONDS}
            exerciseConfig={selectedExercise}
            visibilityThreshold={visibilityThreshold}
          />
        </div>
        <div className="rep-goal ui-text-preset ui-box-preset" style={glassStyle}>
          Rep Goal: 12
        </div>
        {/* --- Rep Counters --- */}
        {selectedExercise.isTwoSided ? (
          <div style={{ position: 'absolute', bottom: 'var(--mantine-spacing-md)', right: 'var(--mantine-spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-md)', zIndex: 2 }}>
            <div className="rep-counter-box ui-text-preset ui-box-preset" style={glassStyle}>
              <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                <div
                  className="rep-progress-outline"
                  style={{ width: `${Math.min(100, (repCount.left / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
                />
                <span>Left Reps: {repCount.left}</span>
              </div>
            </div>
            <div className="rep-counter-box ui-text-preset ui-box-preset" style={glassStyle}>
              <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                <div
                  className="rep-progress-outline"
                  style={{ width: `${Math.min(100, (repCount.right / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
                />
                <span>Right Reps: {repCount.right}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rep-counter ui-text-preset ui-box-preset" style={glassStyle}>
            <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
              <div
                className="rep-progress-outline"
                style={{ width: `${Math.min(100, (repCount.left / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
              />
              Reps: {repCount.left}
            </div>
          </div>
        )}
        
        {/* --- Exercise Selector --- */}
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
        {/* --- End Exercise Selector --- */}
      </div>

      {/* Optionally keep the debug window if needed, controlled by showDebug prop */}
      {showDebug && (
        <div className="debug-window" style={{ background: 'black', color: 'white', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto', marginTop: '15px' }}>
          <pre>{debugLogs}</pre>
        </div>
      )}
    </div>
  );
};

export default WorkoutTracker;