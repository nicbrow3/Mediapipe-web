import { useState, useRef, useEffect } from 'react';
import { TRACKING_STATES, getAngle, updateTrackingState } from '../logic/trackingStateManager';
import { smoothRepHistoryEMA, updateRepHistoryBuffer, getLandmarkVisibilityScores } from '../logic/repHistoryProcessor';
import { LANDMARK_MAP } from '../logic/landmarkUtils';
import { runRepStateEngine } from '../logic/repStateEngine';

/**
 * Custom hook for tracking poses and counting reps
 * @param {Object} options - Configuration options
 * @returns {Object} - Tracking state and functions
 */
function usePoseTracking({
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
}) {
  // State tracking
  const [trackingState, setTrackingState] = useState(TRACKING_STATES.IDLE);
  const trackingStateRef = useRef(TRACKING_STATES.IDLE);
  const [repCount, setRepCount] = useState({ left: 0, right: 0 });
  const [repHistory, setRepHistory] = useState([]);
  const repHistoryRef = useRef([]);
  const [sideStatus, setSideStatus] = useState({ 
    left: { inReadyPose: false, repInProgress: false }, 
    right: { inReadyPose: false, repInProgress: false } 
  });
  
  // References
  const selectedExerciseRef = useRef(selectedExercise);
  const latestLandmarksRef = useRef(null);
  const readyPoseHoldStartRef = useRef({ left: null, right: null });
  const repInProgressRef = useRef({ left: false, right: false });
  const readyPoseGlobalHoldStartRef = useRef(null);
  const prevTrackingStateRef = useRef(TRACKING_STATES.IDLE);
  const wasInReadyPoseRef = useRef({ left: false, right: false });
  const lostVisibilityTimestampRef = useRef(null);
  const strictLandmarkVisibilityRef = useRef(strictLandmarkVisibility);
  const visibilityThresholdRef = useRef(visibilityThreshold);
  const repDebounceDurationRef = useRef(repDebounceDuration);
  const useSmoothedRepCountingRef = useRef(useSmoothedRepCounting);
  const repEnginePrevStateRef = useRef(null);
  const [repEngineState, setRepEngineState] = useState(null);
  
  // Update refs when props change
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
  
  // Update tracking state helper
  const setTrackingStateBoth = (newState) => {
    if (showDebug) {
      console.log('[DEBUG] setTrackingStateBoth: newState =', newState);
    }
    setTrackingState(newState);
    trackingStateRef.current = newState;
  };
  
  // Process MediaPipe results
  const processResults = (results) => {
    if (showDebug) {
      console.log('[DEBUG] processResults called: strictLandmarkVisibility=', 
        strictLandmarkVisibilityRef.current, 
        'visibilityThreshold=', 
        visibilityThresholdRef.current);
    }
    
    // Call callback if provided
    if (onPoseResultUpdate) {
      onPoseResultUpdate(results);
    }
    
    if (!results?.landmarks?.[0]) return;
    
    const landmarks = results.landmarks[0];
    latestLandmarksRef.current = landmarks;
    
    // Extract angles for tracking
    let leftAngle = null;
    let rightAngle = null;
    
    if (selectedExerciseRef.current?.isTwoSided) {
      const leftConfig = selectedExerciseRef.current.logicConfig?.anglesToTrack?.find(a => a.side === 'left');
      const rightConfig = selectedExerciseRef.current.logicConfig?.anglesToTrack?.find(a => a.side === 'right');
      
      if (leftConfig) {
        leftAngle = getAngle(landmarks, leftConfig.points, 'left');
      }
      if (rightConfig) {
        rightAngle = getAngle(landmarks, rightConfig.points, 'right');
      }
    } else if (selectedExerciseRef.current?.logicConfig?.anglesToTrack?.length > 0) {
      const config = selectedExerciseRef.current.logicConfig.anglesToTrack[0];
      leftAngle = getAngle(landmarks, config.points, 'left');
    }
    
    // Get landmark visibility scores
    const { requiredVisibility, secondaryVisibility } = getLandmarkVisibilityScores(
      landmarks,
      selectedExerciseRef.current,
      LANDMARK_MAP
    );
    
    // Update tracking state
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
    
    setTrackingStateBoth(trackingResult.nextTrackingState);
    setSideStatus(trackingResult.newSideStatus);
    
    // Only add to buffer and count reps if not paused
    if ((leftAngle !== null || rightAngle !== null) && 
        trackingStateRef.current !== TRACKING_STATES.PAUSED) {
      
      // Update history buffer
      repHistoryRef.current = updateRepHistoryBuffer(
        repHistoryRef.current,
        leftAngle,
        rightAngle,
        requiredVisibility,
        secondaryVisibility,
        trackingStateRef.current
      );
      setRepHistory(repHistoryRef.current);
      
      // Use smoothed data if enabled
      let repEngineInputHistory = useSmoothedRepCountingRef.current 
        ? smoothRepHistoryEMA(repHistoryRef.current, smoothingFactor) 
        : repHistoryRef.current;
      
      // Run rep engine on the history
      let lastRepState = repEnginePrevStateRef.current;
      let finalRepState = null;
      
      for (const entry of repEngineInputHistory) {
        // Add debounce duration to config
        const patchedConfig = {
          ...selectedExerciseRef.current,
          logicConfig: {
            ...selectedExerciseRef.current.logicConfig,
            repDebounceDuration: repDebounceDurationRef.current,
          },
        };
        
        finalRepState = runRepStateEngine(
          landmarks,
          patchedConfig,
          lastRepState
        );
        
        lastRepState = finalRepState;
      }
      
      repEnginePrevStateRef.current = finalRepState;
      setRepEngineState(finalRepState);
      
      // Update rep count from state
      if (finalRepState && finalRepState.angleLogic) {
        setRepCount({
          left: finalRepState.angleLogic.left?.repCount || 0,
          right: finalRepState.angleLogic.right?.repCount || 0,
        });
      }
    }
    
    return landmarks;
  };
  
  // Main render loop for pose detection
  const renderLoop = () => {
    const video = videoRef.current;
    
    if (!video) {
      requestAnimationFrame(renderLoop);
      return;
    }
    
    // Only run if video is ready and has valid dimensions
    if (
      poseLandmarkerRef?.current &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      video.currentTime !== lastVideoTimeRef.current
    ) {
      try {
        const timestamp = performance.now();
        const poseLandmarkerResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
        processResults(poseLandmarkerResult);
        lastVideoTimeRef.current = video.currentTime;
      } catch (error) {
        console.error('Error in detectForVideo:', error);
        if (showDebug) {
          console.log('Error in detectForVideo: ' + (error?.message || 'Unknown error'));
          if (error?.stack) {
            console.log('Stack trace: ' + error.stack);
          }
        }
      }
    }
    
    requestAnimationFrame(renderLoop);
  };
  
  // Re-check tracking state when settings change
  useEffect(() => {
    if (showDebug) {
      console.log('[DEBUG] useEffect fired for visibility settings: latestLandmarksRef.current=', 
        !!latestLandmarksRef.current);
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
  }, [strictLandmarkVisibility, visibilityThreshold]);
  
  return {
    trackingState,
    repCount,
    repHistory,
    sideStatus,
    latestLandmarksRef,
    repEngineState,
    processResults,
    renderLoop
  };
}

export default usePoseTracking; 