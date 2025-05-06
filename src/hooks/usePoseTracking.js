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
  confidenceThreshold = 0.8,
  minimalTrackingMode = false
}) {
  // State tracking
  const [trackingData, setTrackingData] = useState({
    trackingState: TRACKING_STATES.IDLE,
    repCount: { left: 0, right: 0 },
    repHistory: [],
    sideStatus: { left: { inReadyPose: false, repInProgress: false }, right: { inReadyPose: false, repInProgress: false } },
    repEngineState: null,
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
  const frameSamplingRateRef = useRef(frameSamplingRate);
  const frameCounterRef = useRef(0);
  const animationFrameRef = useRef(null);
  const gcIntervalRef = useRef(null);
  const frameProcessedCountRef = useRef(0);
  const trackingStateRef = useRef(TRACKING_STATES.IDLE);
  const minimalTrackingModeRef = useRef(minimalTrackingMode);
  
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
    trackingData.repHistory = [];
    resetRepCounts();
  }, [selectedExercise, resetRepCounts]);
  
  // Update minimalTrackingMode ref when prop changes
  useEffect(() => {
    minimalTrackingModeRef.current = minimalTrackingMode;
  }, [minimalTrackingMode]);
  
  // Function to force garbage collection (if gc is available via Chrome flags)
  const tryForceGC = useCallback(() => {
    if (showDebug) {
      console.log('[DEBUG] Requesting garbage collection');
    }
    
    // Clear latest landmarks to free memory
    latestLandmarksRef.current = null;
    
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
    
    // Set up periodic garbage collection every 30 seconds
    gcIntervalRef.current = setInterval(() => {
      tryForceGC();
    }, 30000);
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Clear garbage collection interval
      if (gcIntervalRef.current) {
        clearInterval(gcIntervalRef.current);
        gcIntervalRef.current = null;
      }
      
      // Clear all refs that could be causing memory leaks
      trackingData.repHistory = [];
      latestLandmarksRef.current = null;
      repEnginePrevStateRef.current = null;
      readyPoseHoldStartRef.current = { left: null, right: null };
      readyPoseGlobalHoldStartRef.current = null;
      lostVisibilityTimestampRef.current = null;
      
      // Clear state
      setTrackingData(prev => ({ ...prev, repEngineState: null }));
      
      // Try to force a garbage collection
      tryForceGC();
    };
  }, [tryForceGC]);
  
  // Add this above processResults:
  const createMinimalLandmarks = useCallback((landmarks) => {
    if (!landmarks || !Array.isArray(landmarks)) return null;
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
    // if (showDebug) {
    //   console.log('[DEBUG] processResults called: strictLandmarkVisibility=', 
    //     strictLandmarkVisibilityRef.current, 
    //     'visibilityThreshold=', 
    //     visibilityThresholdRef.current,
    //     'useConfidenceAsFallback=',
    //     useConfidenceAsFallback);
    // }
    
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
    
    // In minimal tracking mode, we just want to draw landmarks - no rep counting or complex logic
    if (minimalTrackingModeRef.current) {
      // Just set the tracking state to ACTIVE for rendering
      setTrackingDataWithRef(prev => ({
        ...prev,
        trackingState: TRACKING_STATES.ACTIVE
      }));
      return;
    }
    
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
    
    // if (showDebug && useConfidenceAsFallback) {
    //   console.log('[DEBUG] Visibility vs Confidence:', {
    //     requiredVisibility,
    //     requiredConfidence,
    //     secondaryVisibility,
    //     secondaryConfidence,
    //     useConfidenceAsFallback,
    //     confidenceThreshold
    //   });
    // }
    
    // Update tracking state
    const trackingResult = updateTrackingState(
      landmarks,
      selectedExerciseRef.current,
      strictLandmarkVisibilityRef.current,
      visibilityThresholdRef.current,
      trackingStateRef,
      trackingData.sideStatus,
      readyPoseHoldStartRef,
      readyPoseGlobalHoldStartRef,
      repInProgressRef,
      wasInReadyPoseRef,
      lostVisibilityTimestampRef,
      prevTrackingStateRef,
      useConfidenceAsFallback,
      confidenceThreshold
    );
    
    // Run the rep state engine to update the exercise state if we're tracking
    let newRepEngineState = null;
    if (trackingResult.nextTrackingState === TRACKING_STATES.ACTIVE) {
      // Call the rep state engine to get updated state
      newRepEngineState = runRepStateEngine(
        landmarks,
        selectedExerciseRef.current,
        repEnginePrevStateRef.current
      );
      
      // Store the new state for next frame
      repEnginePrevStateRef.current = newRepEngineState;
    } else {
      // If not tracking, use the last known state
      newRepEngineState = repEnginePrevStateRef.current;
    }
    
    // Update the tracking data with the new state
    setTrackingDataWithRef(prev => ({
      ...prev,
      trackingState: trackingResult.nextTrackingState,
      sideStatus: trackingResult.newSideStatus,
      repHistory: updateRepHistoryBuffer(
        trackingData.repHistory,
        leftAngle,
        rightAngle,
        requiredVisibility,
        secondaryVisibility,
        trackingResult.nextTrackingState
      ),
      repEngineState: trackingResult.nextTrackingState === TRACKING_STATES.PAUSED ? null : newRepEngineState
    }));
    
    // Only add to buffer and count reps if not paused
    if ((leftAngle !== null || rightAngle !== null) && 
        trackingResult.nextTrackingState !== TRACKING_STATES.PAUSED) {
      
      // Limit the size of the rep history array to prevent memory leaks
      const MAX_HISTORY_LENGTH = 300; // About 10 seconds at 30fps
      if (trackingData.repHistory.length > MAX_HISTORY_LENGTH) {
        trackingData.repHistory = trackingData.repHistory.slice(-MAX_HISTORY_LENGTH);
      }
      
      // Only update state every 5 frames to reduce React renders
      if (frameProcessedCountRef.current % 5 === 0) {
        setTrackingDataWithRef(prev => ({ ...prev, repHistory: trackingData.repHistory }));
      }
      
      // Use state-based rep counting based on phases
      if (trackingResult.nextTrackingState === TRACKING_STATES.ACTIVE && newRepEngineState) {
        // Process left side phase if it exists
        if (newRepEngineState.angleLogic?.left?.phase) {
          processPhase('left', newRepEngineState.angleLogic.left.phase);
        }
        
        // Process right side phase if it exists
        if (newRepEngineState.angleLogic?.right?.phase) {
          processPhase('right', newRepEngineState.angleLogic.right.phase);
        }
        
        // Get updated rep counts from the state-based counter
        // Only update state every 5 frames to reduce React renders
        if (frameProcessedCountRef.current % 5 === 0) {
          setTrackingDataWithRef(prev => ({ ...prev, repCount: getRepCounts() }));
        }
      }
      
      // Try to perform memory cleanup every 200 frames
      if (frameProcessedCountRef.current % 200 === 0) {
        // Free the results landmarks since we've already processed them
        results.landmarks = null;
        
        // Remove original landmark references after processing to allow for garbage collection
        setTimeout(() => {
          latestLandmarksRef.current = null;
          
          // Reset frame counter to prevent integer overflow
          if (frameProcessedCountRef.current > 10000) {
            frameProcessedCountRef.current = 0;
          }
        }, 0);
      }
    }
    
    return landmarks;
  }, [createMinimalLandmarks, onPoseResultUpdate, showDebug, useConfidenceAsFallback, confidenceThreshold, smoothingFactor, getRepCounts, processPhase, minimalTrackingModeRef]);
  
  // Main render loop for pose detection
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    
    if (!video) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    
    // Measure loop timing
    const loopStartTime = performance.now();
    
    // In minimal tracking mode, we want to maximize frame rate
    const isMinimalMode = minimalTrackingModeRef.current;
    
    // Track recent frame times to adaptively adjust sampling
    if (!videoRef.current._recentFrameTimes) {
      videoRef.current._recentFrameTimes = [];
      videoRef.current._frameTimeIndex = 0;
      videoRef.current._adaptiveSamplingRate = frameSamplingRateRef.current;
    }
    
    // In minimal mode, we always sample every frame
    const currentSamplingRate = isMinimalMode 
      ? 1 // Always sample every frame in minimal mode for max performance measurement
      : Math.max(frameSamplingRateRef.current, videoRef.current._adaptiveSamplingRate || 1);
    
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
        
        // Add performance marks for measuring inference time
        if (typeof performance.mark === 'function') {
          performance.mark('mediapipe-detect-start');
        }
        
        // Run MediaPipe detection
        const poseLandmarkerResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
        
        // Add performance marks for measuring inference time
        if (typeof performance.mark === 'function') {
          performance.mark('mediapipe-detect-end');
          performance.measure('detectForVideo', 'mediapipe-detect-start', 'mediapipe-detect-end');
        }
        
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
        
        // Adjust sampling rate based on average processing time (skip in minimal mode)
        if (!isMinimalMode && recentTimes.length >= 5) {
          const avgProcessingTime = recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length;
          
          // If processing is taking too long, increase the sampling rate
          // Target is to keep processing under 16ms (60fps)
          if (avgProcessingTime > 30) { // Over 30ms (under 33fps)
            videoRef.current._adaptiveSamplingRate = Math.min(5, videoRef.current._adaptiveSamplingRate + 1);
            if (showDebug) {
              console.log(`Adaptive sampling: increased to ${videoRef.current._adaptiveSamplingRate} (avg=${avgProcessingTime.toFixed(1)}ms)`);
            }
          } 
          // If we're processing quickly, gradually decrease sampling rate to default
          else if (avgProcessingTime < 16 && videoRef.current._adaptiveSamplingRate > frameSamplingRateRef.current) {
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
    
    // In minimal mode, always request next frame immediately
    if (isMinimalMode) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    
    // For regular mode, apply throttling if needed
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
  }, [processResults, showDebug, frameSamplingRateRef, minimalTrackingModeRef]);
  
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
        trackingData.sideStatus,
        readyPoseHoldStartRef,
        readyPoseGlobalHoldStartRef,
        repInProgressRef,
        wasInReadyPoseRef,
        lostVisibilityTimestampRef,
        prevTrackingStateRef,
        useConfidenceAsFallback,
        confidenceThreshold
      );
      
      // Run the rep state engine if we're tracking
      let newRepEngineState = null;
      if (trackingResult.nextTrackingState === TRACKING_STATES.ACTIVE) {
        // Call the rep state engine to get updated state
        newRepEngineState = runRepStateEngine(
          latestLandmarksRef.current,
          selectedExerciseRef.current,
          repEnginePrevStateRef.current
        );
        
        // Store the new state for next frame
        repEnginePrevStateRef.current = newRepEngineState;
      } else {
        // If not tracking, use the last known state
        newRepEngineState = repEnginePrevStateRef.current;
      }
      
      setTrackingDataWithRef(prev => ({
        ...prev,
        trackingState: trackingResult.nextTrackingState,
        sideStatus: trackingResult.newSideStatus,
        repHistory: updateRepHistoryBuffer(
          trackingData.repHistory,
          trackingResult.leftAngle,
          trackingResult.rightAngle,
          trackingResult.requiredVisibility,
          trackingResult.secondaryVisibility,
          trackingResult.nextTrackingState
        ),
        repEngineState: trackingResult.nextTrackingState === TRACKING_STATES.PAUSED ? null : newRepEngineState
      }));
    }
  }, [strictLandmarkVisibility, visibilityThreshold, showDebug, useConfidenceAsFallback, confidenceThreshold]);
  
  const setTrackingDataWithRef = (updater) => {
    setTrackingData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.trackingState !== prev.trackingState) {
        trackingStateRef.current = next.trackingState;
      }
      return next;
    });
  };
  
  return {
    trackingState: trackingData.trackingState,
    repCount: trackingData.repCount,
    repHistory: trackingData.repHistory,
    sideStatus: trackingData.sideStatus,
    latestLandmarksRef,
    repEngineState: trackingData.repEngineState,
    processResults,
    renderLoop
  };
}

export default usePoseTracking; 