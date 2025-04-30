import React, { useState, useEffect, useRef } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import config from '../config';
import './WorkoutTracker.css';
import '../App.css'; // Import global styles
import RepHistoryGraph from './RepHistoryGraph';
import { LANDMARK_MAP, POSE_CONNECTIONS, calculateAngle } from '../logic/landmarkUtils';
import { runRepStateEngine } from '../logic/repStateEngine';
import { Select } from '@mantine/core';

const TRACKING_STATES = {
  IDLE: 'IDLE',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
};

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
  const REP_WINDOW_SECONDS = 10;
  const EXTRA_BUFFER_SECONDS = 5; // Extra buffer for smoothing

  // Add a ref to track when visibility was lost for grace period
  const lostVisibilityTimestampRef = useRef(null);
  const VISIBILITY_GRACE_PERIOD_MS = 300;

  const [cameraStarted, setCameraStarted] = useState(false);

  const strictLandmarkVisibilityRef = useRef(strictLandmarkVisibility);
  const visibilityThresholdRef = useRef(visibilityThreshold);

  const repDebounceDurationRef = useRef(repDebounceDuration);
  const useSmoothedRepCountingRef = useRef(useSmoothedRepCounting);


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

  // Smoothing function for rep history (exponential moving average)
  function smoothRepHistoryEMA(history, smoothingFactor = 5) {
    if (history.length === 0) return history;
    if (smoothingFactor === 0) return history; // No smoothing if 0
    // Convert smoothingFactor to alpha (typical formula for EMA window)
    const alpha = 2 / (smoothingFactor + 1);
    let smoothed = [];
    let prevLeft = history[0].leftAngle;
    let prevRight = history[0].rightAngle;
    for (let i = 0; i < history.length; i++) {
      const left = history[i].leftAngle;
      const right = history[i].rightAngle;
      let smoothLeft, smoothRight;
      if (left === null) {
        smoothLeft = null;
      } else if (prevLeft === null) {
        smoothLeft = left;
        prevLeft = left; // resume smoothing from here
      } else {
        smoothLeft = alpha * left + (1 - alpha) * prevLeft;
        prevLeft = smoothLeft;
      }
      if (right === null) {
        smoothRight = null;
      } else if (prevRight === null) {
        smoothRight = right;
        prevRight = right; // resume smoothing from here
      } else {
        smoothRight = alpha * right + (1 - alpha) * prevRight;
        prevRight = smoothRight;
      }
      smoothed.push({
        ...history[i],
        leftAngle: smoothLeft,
        rightAngle: smoothRight,
      });
    }
    return smoothed;
  }

  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
    // Clear rep history when exercise changes
    repHistoryRef.current = [];
    setRepHistory([]);
  }, [selectedExercise]);

  const debugLog = (msg) => {
    if (!showDebug) return;
    setDebugLogs(prev => prev + msg + '\n');
  };

  const drawLandmarks = (landmarks, highlightedLandmarkIndices = [], secondaryLandmarkIndices = []) => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Add check for canvas existence
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get the computed color values from the CSS variables
    const computedStyle = getComputedStyle(canvas);
    const accentColorValue = computedStyle.getPropertyValue('--accent-color').trim();
    const accentColorValue2 = computedStyle.getPropertyValue('--accent-color-2').trim();
    const accentColorValue3 = computedStyle.getPropertyValue('--accent-color-3').trim(); // Color for highlight

    // Draw the connecting lines
    ctx.strokeStyle = accentColorValue2 || '#6a55be';
    ctx.lineWidth = 2;
    POSE_CONNECTIONS.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      }
    });

    // Draw the landmark points
    landmarks.forEach((landmark, index) => {
      // Draw the standard small filled circle for all landmarks
      ctx.fillStyle = accentColorValue || '#6a55be';
      ctx.beginPath();
      ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 4, 0, 2 * Math.PI);
      ctx.fill();

      // If this landmark index is in the secondary list, draw the outer circle in accentColorValue2
      if (secondaryLandmarkIndices.includes(index)) {
        ctx.strokeStyle = accentColorValue2 || '#3a8ad3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 8, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // If this landmark index is in the highlighted (primary) list, draw the outer circle in accentColorValue3
      else if (highlightedLandmarkIndices.includes(index)) {
        ctx.strokeStyle = accentColorValue3 || '#cf912e'; // Use accent-3 or fallback
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 8, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

    // Draw the arc for the left arm (shoulder, elbow, wrist)
    const leftShoulder = landmarks[LANDMARK_MAP.left_shoulder];
    const leftElbow = landmarks[LANDMARK_MAP.left_elbow];
    const leftWrist = landmarks[LANDMARK_MAP.left_wrist];
    if (leftShoulder && leftElbow && leftWrist) {
      drawRepArc(ctx, leftShoulder, leftElbow, leftWrist);
    }
  };

  // Draw an arc from the midpoint of the upper arm to the midpoint of the forearm (left arm only for now)
  function drawRepArc(ctx, a, b, c) {
    // a, b, c are {x, y} in normalized coordinates (0-1)
    // b is the elbow, a is shoulder, c is wrist

    // Calculate midpoints
    const midUpperArm = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const midForearm = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };

    // Convert to canvas coordinates
    const toCanvas = (pt) => ({
      x: pt.x * ctx.canvas.width,
      y: pt.y * ctx.canvas.height,
    });
    const p1 = toCanvas(midUpperArm);
    const p3 = toCanvas(midForearm);

    // Calculate the vector from p1 to p3
    const vx = p3.x - p1.x;
    const vy = p3.y - p1.y;

    // Find the midpoint between p1 and p3
    const mx = (p1.x + p3.x) / 2;
    const my = (p1.y + p3.y) / 2;

    // Calculate a perpendicular vector (normalize and scale)
    const perpLength = Math.sqrt(vx * vx + vy * vy);
    const perpNorm = { x: -vy / perpLength, y: vx / perpLength };
    // Move the control point farther away from the elbow, outward from the arm
    const arcHeight = 0.5 * perpLength; // adjust 0.5 for more/less curve
    const cx = mx + perpNorm.x * arcHeight;
    const cy = my + perpNorm.y * arcHeight;

    // Draw arc from p1 to p3 with (cx, cy) as the control point
    ctx.save();
    ctx.strokeStyle = '#3a8ad3'; // Simple blue for now
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(cx, cy, p3.x, p3.y);
    ctx.stroke();
    ctx.restore();
  }

  const setTrackingStateBoth = (newState) => {
    if (showDebug) {
      console.log('[DEBUG] setTrackingStateBoth: newState =', newState);
    }
    setTrackingState(newState);
    trackingStateRef.current = newState;
  };

  // Placeholder helpers for visibility and pose logic
  function checkRequiredLandmarksVisible(landmarks, threshold, requireAll) {
    if (!landmarks) return false;
    if (requireAll) {
      // Require ALL pose landmarks to be visible above threshold
      return landmarks.every(lm => (lm?.visibility ?? 1) > threshold);
    }
    // Get required indices for current exercise
    let requiredIndices = [];
    if (selectedExerciseRef.current?.landmarks) {
      let primaryNames = [];
      if (selectedExerciseRef.current.isTwoSided) {
        const leftPrimary = selectedExerciseRef.current.landmarks.left?.primary || [];
        const rightPrimary = selectedExerciseRef.current.landmarks.right?.primary || [];
        primaryNames = [...leftPrimary, ...rightPrimary];
      } else {
        primaryNames = selectedExerciseRef.current.landmarks.primary || [];
      }
      requiredIndices = primaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
    }
    return requiredIndices.length > 0 && requiredIndices.every(idx => (landmarks[idx]?.visibility ?? 1) > threshold);
  }

  function checkSecondaryLandmarksVisible(landmarks, threshold) {
    if (!landmarks) return false;
    let secondaryIndices = [];
    if (selectedExerciseRef.current?.landmarks) {
      let secondaryNames = [];
      if (selectedExerciseRef.current.isTwoSided) {
        const leftSecondary = selectedExerciseRef.current.landmarks.left?.secondary || [];
        const rightSecondary = selectedExerciseRef.current.landmarks.right?.secondary || [];
        secondaryNames = [...leftSecondary, ...rightSecondary];
      } else {
        secondaryNames = selectedExerciseRef.current.landmarks.secondary || [];
      }
      secondaryIndices = secondaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
    }
    // If there are no secondary, treat as true
    if (secondaryIndices.length === 0) return true;
    return secondaryIndices.every(idx => (landmarks[idx]?.visibility ?? 1) > threshold);
  }

  function getAngle(landmarks, points, side) {
    if (!landmarks) return null;
    let indices = points.map(name => {
      let sideName = `${side}_${name}`;
      if (LANDMARK_MAP[sideName] !== undefined) return LANDMARK_MAP[sideName];
      // fallback to just the name
      return LANDMARK_MAP[name];
    });
    if (indices.some(idx => idx === undefined)) return null;
    const [a, b, c] = indices.map(idx => landmarks[idx]);
    if (!a || !b || !c) return null;
    return calculateAngle(a, b, c);
  }

  function inReadyPoseSide(landmarks, exercise, side) {
    if (!landmarks || !exercise?.startPosition?.requiredAngles) return false;
    // Only check angles for this side
    return exercise.startPosition.requiredAngles.filter(a => a.side === side).every(angleReq => {
      let points = angleReq.points.map(pt => `${side}_${pt}`);
      let indices = points.map(name => LANDMARK_MAP[name]).filter(idx => idx !== undefined);
      if (indices.length !== 3) return false;
      const [a, b, c] = indices.map(idx => landmarks[idx]);
      if (!a || !b || !c) return false;
      const angle = calculateAngle(a, b, c);
      return Math.abs(angle - angleReq.targetAngle) <= angleReq.tolerance;
    });
  }

  function repStartedSide(landmarks, exercise, side) {
    if (!landmarks || !exercise?.logicConfig?.anglesToTrack) return false;
    // Only check angles for this side
    return exercise.logicConfig.anglesToTrack.some(angleConfig => {
      let points = angleConfig.points.map(pt => `${side}_${pt}`);
      let indices = points.map(name => LANDMARK_MAP[name]).filter(idx => idx !== undefined);
      if (indices.length !== 3) return false;
      const [a, b, c] = indices.map(idx => landmarks[idx]);
      if (!a || !b || !c) return false;
      const angle = calculateAngle(a, b, c);
      return angle < angleConfig.maxThreshold;
    });
  }

  function repCompletedSide(landmarks, exercise, side) {
    if (!landmarks || !exercise?.logicConfig?.anglesToTrack) return false;
    // Only check angles for this side
    return exercise.logicConfig.anglesToTrack.some(angleConfig => {
      let points = angleConfig.points.map(pt => `${side}_${pt}`);
      let indices = points.map(name => LANDMARK_MAP[name]).filter(idx => idx !== undefined);
      if (indices.length !== 3) return false;
      const [a, b, c] = indices.map(idx => landmarks[idx]);
      if (!a || !b || !c) return false;
      const angle = calculateAngle(a, b, c);
      return angle > angleConfig.maxThreshold;
    });
  }

  // Add a ref to store the previous state for the rep engine
  const repEnginePrevStateRef = useRef(null);
  const [repEngineState, setRepEngineState] = useState(null);

  function updateTrackingState(landmarks, exercise, strictLandmarkVisibilityArg, visibilityThresholdArg) {
    const requiredVisible = checkRequiredLandmarksVisible(landmarks, visibilityThresholdArg, strictLandmarkVisibilityArg);
    const secondaryVisible = checkSecondaryLandmarksVisible(landmarks, visibilityThresholdArg);
    if (showDebug) {
      console.log('[DEBUG] updateTrackingState: requiredVisible =', requiredVisible, 'secondaryVisible =', secondaryVisible, 'strictLandmarkVisibility =', strictLandmarkVisibilityArg, 'visibilityThreshold =', visibilityThresholdArg);
    }
    const now = Date.now();
    let isTwoSided = exercise?.isTwoSided;
    let sides = isTwoSided ? ['left', 'right'] : ['left'];

    // Per-side ready pose and rep logic
    let newSideStatus = { ...sideStatus };
    let repCompletedSides = [];
    let allReady = true;
    let anyReady = false;
    let anyActive = false;

    for (const side of sides) {
      // Ready pose hold logic (per side)
      if (inReadyPoseSide(landmarks, exercise, side)) {
        if (!readyPoseHoldStartRef.current[side]) readyPoseHoldStartRef.current[side] = now;
        const readyPositionHoldTime = (exercise?.startPosition?.readyPositionHoldTime || 0) * 1000;
        if (now - readyPoseHoldStartRef.current[side] >= readyPositionHoldTime) {
          newSideStatus[side].inReadyPose = true;
          wasInReadyPoseRef.current[side] = true; // Mark that this side has been in ready pose
        } else {
          newSideStatus[side].inReadyPose = false;
        }
      } else {
        readyPoseHoldStartRef.current[side] = null;
        newSideStatus[side].inReadyPose = false;
      }

      // Rep start logic (track if user leaves ready pose and starts movement)
      if (!newSideStatus[side].inReadyPose && repStartedSide(landmarks, exercise, side)) {
        repInProgressRef.current[side] = true;
      }

      // Rep complete logic (only count if was in ready pose before this rep cycle)
      if (
        repInProgressRef.current[side] &&
        repCompletedSide(landmarks, exercise, side) &&
        wasInReadyPoseRef.current[side]
      ) {
        repCompletedSides.push(side);
        repInProgressRef.current[side] = false;
        wasInReadyPoseRef.current[side] = false; // Reset for next cycle
      }

      if (newSideStatus[side].inReadyPose) anyReady = true;
      else anyActive = true;
      allReady = allReady && newSideStatus[side].inReadyPose;
    }

    setSideStatus(newSideStatus);

    // --- GLOBAL READY POSE HOLD LOGIC ---
    let nextTrackingState = trackingStateRef.current;
    const readyPositionHoldTime = (exercise?.startPosition?.readyPositionHoldTime || 0) * 1000;

    // Visibility grace period logic
    if (!requiredVisible || !secondaryVisible) {
      if (!lostVisibilityTimestampRef.current) {
        lostVisibilityTimestampRef.current = now;
      }
      if (now - lostVisibilityTimestampRef.current >= VISIBILITY_GRACE_PERIOD_MS) {
        nextTrackingState = TRACKING_STATES.PAUSED;
      } else {
        // Remain in previous state during grace period
        nextTrackingState = trackingStateRef.current;
      }
      // Reset global ready pose hold timer
      readyPoseGlobalHoldStartRef.current = null;
    } else {
      // Visibility restored, reset lost visibility timer
      lostVisibilityTimestampRef.current = null;
      if (allReady) {
        if (!readyPoseGlobalHoldStartRef.current) readyPoseGlobalHoldStartRef.current = now;
        if (now - readyPoseGlobalHoldStartRef.current >= readyPositionHoldTime) {
          nextTrackingState = TRACKING_STATES.READY;
        } else {
          // Not enough hold time yet, stay in previous state
          nextTrackingState = trackingStateRef.current;
        }
      } else if (anyActive) {
        nextTrackingState = TRACKING_STATES.ACTIVE;
      } else if (!anyReady && repCompletedSides.length > 0) {
        nextTrackingState = TRACKING_STATES.PAUSED;
      }
    }

    // Update previous state ref
    prevTrackingStateRef.current = trackingStateRef.current;
    // Now update the global state
    if (showDebug) {
      console.log('[DEBUG] updateTrackingState: nextTrackingState =', nextTrackingState);
    }
    setTrackingStateBoth(nextTrackingState);
  }

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
      // Compute required landmark visibility for this frame (primary)
      let requiredVisibility = 1;
      let secondaryVisibility = 1;
      if (selectedExerciseRef.current?.landmarks) {
        let requiredIndices = [];
        let primaryNames = [];
        let secondaryIndices = [];
        let secondaryNames = [];
        if (selectedExerciseRef.current.isTwoSided) {
          const leftPrimary = selectedExerciseRef.current.landmarks.left?.primary || [];
          const rightPrimary = selectedExerciseRef.current.landmarks.right?.primary || [];
          primaryNames = [...leftPrimary, ...rightPrimary];
          const leftSecondary = selectedExerciseRef.current.landmarks.left?.secondary || [];
          const rightSecondary = selectedExerciseRef.current.landmarks.right?.secondary || [];
          secondaryNames = [...leftSecondary, ...rightSecondary];
        } else {
          primaryNames = selectedExerciseRef.current.landmarks.primary || [];
          secondaryNames = selectedExerciseRef.current.landmarks.secondary || [];
        }
        requiredIndices = primaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
        secondaryIndices = secondaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
        if (requiredIndices.length > 0) {
          requiredVisibility = Math.min(...requiredIndices.map(idx => (landmarks[idx]?.visibility ?? 1)));
        }
        if (secondaryIndices.length > 0) {
          secondaryVisibility = Math.min(...secondaryIndices.map(idx => (landmarks[idx]?.visibility ?? 1)));
        }
      }
      // --- State Tracking Logic ---
      updateTrackingState(landmarks, selectedExerciseRef.current, strictLandmarkVisibilityRef.current, visibilityThresholdRef.current);
      // Only add to buffer and count reps if trackingState is not PAUSED
      if (
        (leftAngle !== null || rightAngle !== null) &&
        trackingStateRef.current !== TRACKING_STATES.PAUSED
      ) {
        const now = Date.now();
        const newEntry = { timestamp: now, leftAngle, rightAngle, requiredVisibility, secondaryVisibility, trackingState: trackingStateRef.current };
        // Keep REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS worth of data
        const maxAge = (REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS) * 1000;
        repHistoryRef.current = [
          ...repHistoryRef.current.filter(d => now - d.timestamp <= maxAge),
          newEntry
        ];
        setRepHistory(repHistoryRef.current);
        // --- Rep Engine Integration ---
        // Use smoothed or raw data for rep counting
        let repEngineInputHistory = useSmoothedRepCountingRef.current ? smoothRepHistoryEMA(repHistoryRef.current, smoothingFactor) : repHistoryRef.current;
        // Use the most recent entry for landmarks, but run rep logic over the smoothed/latest data
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
      drawLandmarks(landmarks, highlightedIndices, secondaryIndices);
    }
  };

  const renderLoop = () => {
    // debugLog('Render loop running...'); // Comment out for less noise
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
        // debugLog('Calling detectForVideo...'); // Comment out for less noise
        const timestamp = performance.now();
        const poseLandmarkerResult = poseLandmarkerRef.current.detectForVideo(video, timestamp);
        // debugLog('detectForVideo result: ' + JSON.stringify(poseLandmarkerResult)); // Comment out for less noise

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
        // Consider adding logic to potentially pause or stop the loop if errors persist
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
      // Polyfill for getUserMedia (for iOS/Safari/legacy support)
      const getUserMediaCompat = (constraints) => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          return navigator.mediaDevices.getUserMedia(constraints);
        }
        const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (getUserMedia) {
          // Promisify the legacy getUserMedia
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
        return Promise.reject(new Error('getUserMedia is not supported in this browser.'));
      };

      // Access webcam
      const stream = await getUserMediaCompat({ video: true });
      video.srcObject = stream;
      debugLog('Webcam access successful');

      // Wait for video metadata to be loaded
      await new Promise((resolve) => {
        if (video.readyState >= 2) {
          resolve();
        } else {
          video.addEventListener('loadedmetadata', resolve, { once: true });
        }
      });

      // Adjust canvas size to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Initialize MediaPipe
      debugLog('Setting up MediaPipe...');
      debugLog(`Using WASM path: ${config.mediapipe.wasmPath}`);
      const vision = await FilesetResolver.forVisionTasks(
        config.mediapipe.wasmPath
      );

      // Check if vision was successfully created
      if (!vision) {
        throw new Error('Failed to initialize FilesetResolver');
      }

      debugLog('FilesetResolver initialized successfully');

      // First try with GPU
      try {
        debugLog('Attempting to initialize with GPU delegate...');
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: config.mediapipe.modelPath,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numPoses: config.pose.numPoses,
          minPoseDetectionConfidence: config.pose.minPoseDetectionConfidence,
          minPosePresenceConfidence: config.pose.minPosePresenceConfidence,
          minTrackingConfidence: config.pose.minTrackingConfidence,
          outputSegmentationMasks: false
        });
        debugLog('Successfully initialized with GPU delegate');
      } catch (gpuError) {
        // If GPU fails, try with CPU
        debugLog('GPU initialization failed: ' + gpuError.message);
        debugLog('Falling back to CPU delegate...');

        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: config.mediapipe.modelPath,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: config.pose.numPoses,
          minPoseDetectionConfidence: config.pose.minPoseDetectionConfidence,
          minPosePresenceConfidence: config.pose.minPosePresenceConfidence,
          minTrackingConfidence: config.pose.minTrackingConfidence,
          outputSegmentationMasks: false
        });
        debugLog('Successfully initialized with CPU delegate');
      }

      if (!poseLandmarkerRef.current) {
        throw new Error('Failed to initialize PoseLandmarker');
      }

      debugLog('MediaPipe setup complete!');
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
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // --- Handlers ---
  const handleStartCamera = () => {
    setCameraStarted(true);
    setupMediaPipe();
  };

  useEffect(() => {
    // Debug log to confirm effect fires
    if (showDebug) {
      console.log('[DEBUG] useEffect fired: strictLandmarkVisibility=', strictLandmarkVisibility, 'visibilityThreshold=', visibilityThreshold, 'latestLandmarksRef.current=', !!latestLandmarksRef.current);
    }
    // When strictLandmarkVisibility or visibilityThreshold changes, re-check state logic
    if (latestLandmarksRef.current) {
      updateTrackingState(latestLandmarksRef.current, selectedExerciseRef.current, strictLandmarkVisibility, visibilityThreshold);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictLandmarkVisibility, visibilityThreshold]);

  return (
    <div className="workout-tracker-container">
      {isLoading && <div className="loading-overlay">Loading Camera & Model...</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      {/* Show Start Camera button if not started */}
      {!cameraStarted && (
        <button onClick={handleStartCamera} className="start-camera-btn" style={{ zIndex: 10, position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', fontSize: 24, padding: '1em 2em', borderRadius: 8, background: '#6a55be', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          Start Camera
        </button>
      )}

      <div className="video-canvas-container">
        {/* State Indicator */}
        <div className={`tracking-state-indicator ui-text-preset ui-box-preset state-${trackingState.toLowerCase()}`}>
          State: {trackingState}
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
        <div className="rep-goal ui-text-preset ui-box-preset">
          Rep Goal: 12
        </div>
        {/* --- Rep Counters --- */}
        {selectedExercise.isTwoSided ? (
          <div style={{ position: 'absolute', bottom: 'var(--overlay-padding)', right: 'var(--overlay-padding)', display: 'flex', flexDirection: 'column', gap: 'var(--overlay-padding)', zIndex: 2 }}>
            <div className="rep-counter-box ui-text-preset ui-box-preset">
              <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
                <div
                  className="rep-progress-outline"
                  style={{ width: `${Math.min(100, (repCount.left / 12) * 100)}%`, top: 0, height: '100%', left: 0 }}
                />
                <span>Left Reps: {repCount.left}</span>
              </div>
            </div>
            <div className="rep-counter-box ui-text-preset ui-box-preset">
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
          <div className="rep-counter ui-text-preset ui-box-preset">
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
        <div className="exercise-selector-container ui-text-preset ui-box-preset">
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
            styles={{ dropdown: { zIndex: 1000 } }}
            radius="md"
            color="grape.6"
          />
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