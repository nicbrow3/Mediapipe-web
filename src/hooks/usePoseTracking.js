import { useState, useRef, useEffect, useCallback } from 'react';
import { TRACKING_STATES, getAngle, updateTrackingState } from '../logic/trackingStateManager';
import { smoothRepHistoryEMA, updateRepHistoryBuffer, getLandmarkVisibilityScores } from '../logic/repHistoryProcessor';
import { LANDMARK_MAP } from '../logic/landmarkUtils';
import { runRepStateEngine } from '../logic/repStateEngine';
import useStateBasedRepCounter from './useStateBasedRepCounter';

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
  showDebug,
  frameSamplingRate = 1,
  useConfidenceAsFallback = false,
  confidenceThreshold = 0.8
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
  const frameSamplingRateRef = useRef(frameSamplingRate);
  const frameCounterRef = useRef(0);
  const animationFrameRef = useRef(null);
  const gcIntervalRef = useRef(null);
  const frameProcessedCountRef = useRef(0);
  
  // Initialize the state-based rep counter
  const { 
    processPhase, 
    resetRepCounts, 
    getRepCounts
  } = useStateBasedRepCounter({ 
    debounceDuration: repDebounceDuration 
  });
  
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
    frameSamplingRateRef.current = frameSamplingRate;
  }, [frameSamplingRate]);
  
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
    // Clear rep history when exercise changes
    repHistoryRef.current = [];
    setRepHistory([]);
    // Reset rep counters when exercise changes
    resetRepCounts();
  }, [selectedExercise, resetRepCounts]);
  
  // Function to force garbage collection (if gc is available via Chrome flags)
  const tryForceGC = useCallback(() => {
    if (showDebug) {
      console.log('[DEBUG] Requesting garbage collection');
    }
    
    // Clear latest landmarks to free memory
    latestLandmarksRef.current = null;
    
    // Clear unnecessary history data
    if (repHistoryRef.current && repHistoryRef.current.length > 0) {
      // Keep only last MAX_HISTORY_LENGTH entries (more aggressive cleanup)
      const MAX_KEEPING_LENGTH = 200; // Reduced from 300
      if (repHistoryRef.current.length > MAX_KEEPING_LENGTH) {
        repHistoryRef.current = repHistoryRef.current.slice(-MAX_KEEPING_LENGTH);
      }
    }
    
    // Force clear any unused landmarks or results objects
    repEnginePrevStateRef.current = repEnginePrevStateRef.current ? {
      angleLogic: repEnginePrevStateRef.current.angleLogic ? {
        left: repEnginePrevStateRef.current.angleLogic.left ? {
          phase: repEnginePrevStateRef.current.angleLogic.left.phase,
          lastAngle: repEnginePrevStateRef.current.angleLogic.left.lastAngle,
          lastTransitionTime: repEnginePrevStateRef.current.angleLogic.left.lastTransitionTime
        } : undefined,
        right: repEnginePrevStateRef.current.angleLogic.right ? {
          phase: repEnginePrevStateRef.current.angleLogic.right.phase,
          lastAngle: repEnginePrevStateRef.current.angleLogic.right.lastAngle,
          lastTransitionTime: repEnginePrevStateRef.current.angleLogic.right.lastTransitionTime
        } : undefined
      } : undefined
    } : null;
    
    // If window.gc is available (enabled with Chrome flags), use it
    if (window.gc) {
      try {
        window.gc();
      } catch (e) {
        if (showDebug) {
          console.log('[DEBUG] GC failed:', e);
        }
      }
    }
  }, [showDebug]);
  
  // Add cleanup function to clear memory on component unmount
  useEffect(() => {
    // Start the render loop
    if (poseLandmarkerRef?.current && videoRef?.current) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    }
    
    // Run more frequent garbage collection as session progresses
    let gcInterval = 30000; // Start with 30 seconds
    let elapsedTime = 0;
    
    const updateGCInterval = () => {
      elapsedTime += gcInterval;
      
      // Reduce GC interval as session gets longer (more aggressive cleanup)
      if (elapsedTime > 10 * 60 * 1000) { // 10 minutes
        gcInterval = 15000; // Every 15 seconds
      }
      if (elapsedTime > 20 * 60 * 1000) { // 20 minutes
        gcInterval = 10000; // Every 10 seconds
      }
      
      tryForceGC();
      
      gcIntervalRef.current = setTimeout(updateGCInterval, gcInterval);
    };
    
    // Start periodic garbage collection
    gcIntervalRef.current = setTimeout(updateGCInterval, gcInterval);
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear garbage collection interval
      if (gcIntervalRef.current) {
        clearTimeout(gcIntervalRef.current);
        gcIntervalRef.current = null;
      }
      
      // Clear all refs that could be causing memory leaks
      repHistoryRef.current = [];
      latestLandmarksRef.current = null;
      repEnginePrevStateRef.current = null;
      readyPoseHoldStartRef.current = { left: null, right: null };
      readyPoseGlobalHoldStartRef.current = null;
      lostVisibilityTimestampRef.current = null;
      
      // Clear state
      setRepEngineState(null);
      setRepHistory([]);
      
      // Try to force a garbage collection
      tryForceGC();
    };
  }, [tryForceGC]);
  
  // Update tracking state helper
  const setTrackingStateBoth = (newState) => {
    if (showDebug) {
      console.log('[DEBUG] setTrackingStateBoth: newState =', newState);
    }
    setTrackingState(newState);
    trackingStateRef.current = newState;
  };
  
  // Create a minimal version of the landmarks with only the necessary properties
  const createMinimalLandmarks = useCallback((landmarks) => {
    if (!landmarks || !Array.isArray(landmarks)) return null;
    
    // Only extract the properties we need from each landmark
    return landmarks.map(landmark => {
      if (!landmark) return null;
      return {
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
        presence: landmark.presence
      };
    });
  }, []);
  
  // Process MediaPipe results
  const processResults = useCallback((results) => {
    if (showDebug) {
      console.log('[DEBUG] processResults called: strictLandmarkVisibility=', 
        strictLandmarkVisibilityRef.current, 
        'visibilityThreshold=', 
        visibilityThresholdRef.current,
        'useConfidenceAsFallback=',
        useConfidenceAsFallback);
    }
    
    // Call callback if provided
    if (onPoseResultUpdate) {
      onPoseResultUpdate(results);
    }
    
    if (!results?.landmarks?.[0]) return;
    
    // Count processed frames for potential memory optimization
    frameProcessedCountRef.current++;
    
    // Create a minimal version of landmarks to reduce memory usage
    const landmarks = createMinimalLandmarks(results.landmarks[0]);
    
    // Store a clean copy of the landmarks
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
    const { requiredVisibility, secondaryVisibility, requiredConfidence, secondaryConfidence } = getLandmarkVisibilityScores(
      landmarks,
      selectedExerciseRef.current,
      LANDMARK_MAP
    );
    
    if (showDebug && useConfidenceAsFallback) {
      console.log('[DEBUG] Visibility vs Confidence:', {
        requiredVisibility,
        requiredConfidence,
        secondaryVisibility,
        secondaryConfidence,
        useConfidenceAsFallback,
        confidenceThreshold
      });
    }
    
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
      prevTrackingStateRef,
      useConfidenceAsFallback,
      confidenceThreshold
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
      
      // Limit the size of the rep history array to prevent memory leaks
      const MAX_HISTORY_LENGTH = 300; // About 10 seconds at 30fps
      if (repHistoryRef.current.length > MAX_HISTORY_LENGTH) {
        repHistoryRef.current = repHistoryRef.current.slice(-MAX_HISTORY_LENGTH);
      }
      
      // Only update state after a certain number of frames to reduce React renders
      if (frameProcessedCountRef.current % 5 === 0) {
        setRepHistory(repHistoryRef.current);
      }
      
      // Use smoothed data if enabled
      let repEngineInputHistory = useSmoothedRepCountingRef.current 
        ? smoothRepHistoryEMA(repHistoryRef.current, smoothingFactor) 
        : repHistoryRef.current;
      
      // Only process a limited window of history to save memory
      const PROCESS_WINDOW = 60; // Process only last 60 entries (about 2 seconds at 30fps)
      const historyToProcess = repEngineInputHistory.slice(-PROCESS_WINDOW);
      
      // Run rep engine on the history
      let lastRepState = repEnginePrevStateRef.current;
      let finalRepState = null;
      
      for (const entry of historyToProcess) {
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
      
      // Clean up the state object to prevent memory leaks
      if (finalRepState) {
        // Keep only essential properties needed for rep counting
        repEnginePrevStateRef.current = {
          angleLogic: finalRepState.angleLogic ? {
            left: finalRepState.angleLogic.left ? {
              phase: finalRepState.angleLogic.left.phase,
              lastAngle: finalRepState.angleLogic.left.lastAngle,
              lastTransitionTime: finalRepState.angleLogic.left.lastTransitionTime
            } : undefined,
            right: finalRepState.angleLogic.right ? {
              phase: finalRepState.angleLogic.right.phase,
              lastAngle: finalRepState.angleLogic.right.lastAngle,
              lastTransitionTime: finalRepState.angleLogic.right.lastTransitionTime
            } : undefined
          } : undefined
        };
      } else {
        repEnginePrevStateRef.current = null;
      }
      
      // Only update state every 5 frames to reduce React renders
      if (frameProcessedCountRef.current % 5 === 0) {
        setRepEngineState(finalRepState);
      }
      
      // Use state-based rep counting based on phases
      if (finalRepState && finalRepState.angleLogic) {
        // Process left side phase if it exists
        if (finalRepState.angleLogic.left?.phase) {
          processPhase('left', finalRepState.angleLogic.left.phase);
        }
        
        // Process right side phase if it exists
        if (finalRepState.angleLogic.right?.phase) {
          processPhase('right', finalRepState.angleLogic.right.phase);
        }
        
        // Get updated rep counts from the state-based counter
        // Only update state every 5 frames to reduce React renders
        if (frameProcessedCountRef.current % 5 === 0) {
          setRepCount(getRepCounts());
        }
      }
      
      // Try to perform memory cleanup every 100 frames instead of 200
      if (frameProcessedCountRef.current % 100 === 0) {
        // Free the results landmarks since we've already processed them
        results.landmarks = null;
        
        // Remove original landmark references after processing to allow for garbage collection
        setTimeout(() => {
          latestLandmarksRef.current = null;
          
          // Reset frame counter to prevent integer overflow
          if (frameProcessedCountRef.current > 5000) { // Changed from 10000
            frameProcessedCountRef.current = 0;
          }
        }, 0);
      }
    }
    
    return landmarks;
  }, [createMinimalLandmarks, onPoseResultUpdate, showDebug, useConfidenceAsFallback, confidenceThreshold, smoothingFactor, getRepCounts, processPhase]);
  
  // Main render loop for pose detection
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    
    if (!video) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    
    // Measure loop timing
    const loopStartTime = performance.now();
    
    // Track recent frame times to adaptively adjust sampling
    if (!videoRef.current._recentFrameTimes) {
      videoRef.current._recentFrameTimes = [];
      videoRef.current._frameTimeIndex = 0;
      videoRef.current._adaptiveSamplingRate = frameSamplingRateRef.current;
    }
    
    // Increment frame counter for sampling
    const currentSamplingRate = Math.max(
      frameSamplingRateRef.current, 
      videoRef.current._adaptiveSamplingRate || 1
    );
    
    frameCounterRef.current = (frameCounterRef.current + 1) % Math.max(1, currentSamplingRate);
    
    // Only run if video is ready, has valid dimensions, and it's time to sample a frame
    if (
      poseLandmarkerRef?.current &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      video.currentTime !== lastVideoTimeRef.current &&
      frameCounterRef.current === 0 // Only process when counter is 0 (sampling)
    ) {
      try {
        const processingStartTime = performance.now();
        const timestamp = processingStartTime;
        const poseLandmarkerResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
        processResults(poseLandmarkerResult);
        lastVideoTimeRef.current = video.currentTime;
        
        // Measure processing time
        const processingTime = performance.now() - processingStartTime;
        
        // Update the recent frame times array for adaptive sampling
        const recentTimes = videoRef.current._recentFrameTimes;
        if (recentTimes.length < 10) {
          recentTimes.push(processingTime);
        } else {
          recentTimes[videoRef.current._frameTimeIndex] = processingTime;
          videoRef.current._frameTimeIndex = (videoRef.current._frameTimeIndex + 1) % 10;
        }
        
        // Adjust sampling rate based on average processing time and session length
        if (recentTimes.length >= 5) {
          const avgProcessingTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
          
          // Get elapsed session time (approximate)
          const sessionElapsedTime = videoRef.current._sessionStartTime 
            ? (performance.now() - videoRef.current._sessionStartTime) 
            : 0;
          
          // Store session start time if not already set
          if (!videoRef.current._sessionStartTime) {
            videoRef.current._sessionStartTime = performance.now();
          }
          
          // Become more aggressive with frame sampling as session time increases
          let timeBasedSamplingAdjustment = 0;
          if (sessionElapsedTime > 10 * 60 * 1000) { // > 10 minutes
            timeBasedSamplingAdjustment = 1;
          }
          if (sessionElapsedTime > 20 * 60 * 1000) { // > 20 minutes
            timeBasedSamplingAdjustment = 2;
          }
          
          // If processing is taking too long, increase the sampling rate
          // Target is to keep processing under 16ms (60fps)
          if (avgProcessingTime > 20) { // Over 20ms (under 50fps) - more aggressive than before
            videoRef.current._adaptiveSamplingRate = Math.min(6, videoRef.current._adaptiveSamplingRate + 1 + timeBasedSamplingAdjustment);
            if (showDebug) {
              console.log(`Adaptive sampling: increased to ${videoRef.current._adaptiveSamplingRate} (avg=${avgProcessingTime.toFixed(1)}ms, session=${Math.round(sessionElapsedTime/60000)}min)`);
            }
          } 
          // If we're processing quickly, gradually decrease sampling rate to default
          else if (avgProcessingTime < 12 && videoRef.current._adaptiveSamplingRate > frameSamplingRateRef.current) {
            videoRef.current._adaptiveSamplingRate = Math.max(
              frameSamplingRateRef.current, 
              videoRef.current._adaptiveSamplingRate - 0.5
            );
            if (showDebug) {
              console.log(`Adaptive sampling: decreased to ${videoRef.current._adaptiveSamplingRate} (avg=${avgProcessingTime.toFixed(1)}ms)`);
            }
          }
        }
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
    
    // Measure total loop time
    const loopTime = performance.now() - loopStartTime;
    
    // Request next frame with potential delay if we're running too hot
    if (loopTime < 5) {
      // Running smoothly, schedule next frame immediately
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    } else {
      // Running hot, add a small delay before the next frame
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      }, 0);
    }
  }, [processResults, showDebug, frameSamplingRateRef]);
  
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
  }, [strictLandmarkVisibility, visibilityThreshold, showDebug]);
  
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