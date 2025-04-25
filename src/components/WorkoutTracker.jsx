import React, { useState, useEffect, useRef } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import config from '../config';
import './WorkoutTracker.css';
import '../App.css'; // Import global styles
import { Listbox } from '@headlessui/react';
import RepHistoryGraph from './RepHistoryGraph';

// MediaPipe Pose landmarks mapping (name to index)
const LANDMARK_MAP = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32
};

const POSE_CONNECTIONS = [
  // Torso
  [11, 12], // shoulders
  [11, 23], // left shoulder to left hip
  [12, 24], // right shoulder to right hip
  [23, 24], // hips

  // Left arm
  [11, 13], // left shoulder to left elbow
  [13, 15], // left elbow to left wrist

  // Right arm
  [12, 14], // right shoulder to right elbow
  [14, 16], // right elbow to right wrist

  // Left leg
  [23, 25], // left hip to left knee
  [25, 27], // left knee to left ankle

  // Right leg
  [24, 26], // right hip to right knee
  [26, 28], // right knee to right ankle
];

const TRACKING_STATES = {
  IDLE: 'IDLE',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
};

// Accept props: onPoseResultUpdate, availableExercises, selectedExercise, onExerciseChange
const WorkoutTracker = ({ onPoseResultUpdate, availableExercises, selectedExercise, onExerciseChange }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [repCount, setRepCount] = useState({ left: 0, right: 0 });
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [videoOpacity, setVideoOpacity] = useState(5);
  const [trackingState, setTrackingState] = useState(TRACKING_STATES.IDLE);
  const trackingStateRef = useRef(TRACKING_STATES.IDLE);

  // Smoothing factor state
  const [smoothingFactor, setSmoothingFactor] = useState(15);

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

  // Smoothing function for rep history (exponential moving average)
  function smoothRepHistoryEMA(history, smoothingFactor = 5) {
    if (history.length === 0) return history;
    // Convert smoothingFactor to alpha (typical formula for EMA window)
    const alpha = 2 / (smoothingFactor + 1);
    let smoothed = [];
    let prevLeft = history[0].leftAngle;
    let prevRight = history[0].rightAngle;
    for (let i = 0; i < history.length; i++) {
      const left = history[i].leftAngle;
      const right = history[i].rightAngle;
      const smoothLeft = (prevLeft === null || left === null) ? left : alpha * left + (1 - alpha) * prevLeft;
      const smoothRight = (prevRight === null || right === null) ? right : alpha * right + (1 - alpha) * prevRight;
      smoothed.push({
        ...history[i],
        leftAngle: smoothLeft,
        rightAngle: smoothRight,
      });
      prevLeft = smoothLeft;
      prevRight = smoothRight;
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

  const calculateAngle = (a, b, c) => {
    const vectorBA = { x: a.x - b.x, y: a.y - b.y };
    const vectorBC = { x: c.x - b.x, y: c.y - b.y };
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
    const angle = Math.acos(dotProduct / (magnitudeBA * magnitudeBC));
    return angle * (180 / Math.PI);
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
  };

  const setTrackingStateBoth = (newState) => {
    setTrackingState(newState);
    trackingStateRef.current = newState;
  };

  // Placeholder helpers for visibility and pose logic
  function checkRequiredLandmarksVisible(landmarks, threshold) {
    if (!landmarks) return false;
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

  function updateTrackingState(landmarks, exercise) {
    const requiredVisible = checkRequiredLandmarksVisible(landmarks, 0.7);
    const secondaryVisible = checkSecondaryLandmarksVisible(landmarks, 0.4);
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
        const holdTime = (exercise?.startPosition?.holdTime || 0) * 1000;
        if (now - readyPoseHoldStartRef.current[side] >= holdTime) {
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
    const readyHoldTime = (exercise?.startPosition?.holdTime || 0) * 1000;
    // Only start the global hold timer if all required landmarks are visible and all sides are in ready pose
    if (requiredVisible && secondaryVisible && allReady) {
      if (!readyPoseGlobalHoldStartRef.current) readyPoseGlobalHoldStartRef.current = now;
      if (now - readyPoseGlobalHoldStartRef.current >= readyHoldTime) {
        nextTrackingState = TRACKING_STATES.READY;
      } else {
        // Not enough hold time yet, stay in IDLE
        nextTrackingState = TRACKING_STATES.IDLE;
      }
    } else {
      // Reset the global hold timer if not in ready pose or not visible
      readyPoseGlobalHoldStartRef.current = null;
      if (!requiredVisible || !secondaryVisible) {
        nextTrackingState = TRACKING_STATES.IDLE;
      } else if (anyActive) {
        nextTrackingState = TRACKING_STATES.ACTIVE;
      } else if (!anyReady && repCompletedSides.length > 0) {
        nextTrackingState = TRACKING_STATES.PAUSED;
      }
    }

    // --- REP COUNTING: Only count reps for sides that completed a full cycle ---
    if (repCompletedSides.length > 0 && nextTrackingState !== TRACKING_STATES.IDLE) {
      setRepCount(prev => {
        const updated = { ...prev };
        repCompletedSides.forEach(side => {
          updated[side] = prev[side] + 1;
          debugLog(`Rep incremented for ${side}: ${prev[side]} -> ${updated[side]}`);
        });
        return updated;
      });
    }

    // Update previous state ref
    prevTrackingStateRef.current = trackingStateRef.current;
    // Now update the global state
    setTrackingStateBoth(nextTrackingState);
  }

  const processResults = (results) => {
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
      // Add to buffer if at least one angle is present
      if (leftAngle !== null || rightAngle !== null) {
        const now = Date.now();
        // Compute required landmark visibility for this frame
        let requiredVisibility = 1;
        if (selectedExerciseRef.current?.landmarks) {
          let requiredIndices = [];
          let primaryNames = [];
          if (selectedExerciseRef.current.isTwoSided) {
            const leftPrimary = selectedExerciseRef.current.landmarks.left?.primary || [];
            const rightPrimary = selectedExerciseRef.current.landmarks.right?.primary || [];
            primaryNames = [...leftPrimary, ...rightPrimary];
          } else {
            primaryNames = selectedExerciseRef.current.landmarks.primary || [];
          }
          requiredIndices = primaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
          if (requiredIndices.length > 0) {
            requiredVisibility = Math.min(...requiredIndices.map(idx => (landmarks[idx]?.visibility ?? 1)));
          }
        }
        const newEntry = { timestamp: now, leftAngle, rightAngle, requiredVisibility };
        // Keep REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS worth of data
        const maxAge = (REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS) * 1000;
        repHistoryRef.current = [
          ...repHistoryRef.current.filter(d => now - d.timestamp <= maxAge),
          newEntry
        ];
        setRepHistory(repHistoryRef.current);
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

      // --- State Tracking Logic ---
      updateTrackingState(landmarks, selectedExerciseRef.current);
      // Rep counting is now handled in state logic
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
        console.error('Error in detectForVideo:', error);
        debugLog('Error in detectForVideo: ' + error.message);
      }
    }
    requestAnimationFrame(renderLoop);
  };

  // Initialize webcam and MediaPipe
  useEffect(() => {
    const setupMediaPipe = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      try {
        setIsLoading(true);
        // Access webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        debugLog('Webcam access successful');

        // Wait for video metadata to be loaded
        await new Promise((resolve) => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            video.addEventListener('loadedmetadata', resolve);
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

    setupMediaPipe();

    // Cleanup function
    return () => {
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // --- Handlers ---
  const handleDebugToggle = (e) => {
    setShowDebug(e.target.checked);
    if (e.target.checked) {
      setDebugLogs("Debug logging enabled.\n");
    } else {
      setDebugLogs("Debug logging disabled.\n");
    }
  };

  const handleOpacityChange = (e) => {
    setVideoOpacity(e.target.value);
  };

  return (
    <div className="workout-tracker-container">
      {isLoading && <div className="loading-overlay">Loading Camera & Model...</div>}
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <div className="video-canvas-container">
        {/* State Indicator */}
        <div className="tracking-state-indicator ui-text-preset ui-box-preset">
          State: {trackingState}
        </div>
        <video ref={videoRef} className="input_video" autoPlay playsInline style={{ opacity: videoOpacity / 100 }}></video>
        <canvas ref={canvasRef} className="output_canvas"></canvas>
        {/* --- Rep History Graph --- */}
        <div style={{ position: 'absolute', top: 10, right: 10, width: '40%', minWidth: 320, zIndex: 3 }}>
          <RepHistoryGraph
            data={smoothRepHistoryEMA(repHistory, smoothingFactor)
              .filter(d => d.requiredVisibility === undefined || d.requiredVisibility >= 0.7)
              .filter(d => Date.now() - d.timestamp <= REP_WINDOW_SECONDS * 1000)}
            showLeft={selectedExercise.isTwoSided || (!selectedExercise.isTwoSided && repHistory.some(d => d.leftAngle !== null))}
            showRight={selectedExercise.isTwoSided && repHistory.some(d => d.rightAngle !== null)}
            windowSeconds={REP_WINDOW_SECONDS}
          />
        </div>
        <div className="rep-counter ui-text-preset ui-box-preset">
          {selectedExercise.isTwoSided ? (
            <>
              <span>Left Reps: {repCount.left}</span> <br />
              <span>Right Reps: {repCount.right}</span>
            </>
          ) : (
            <>Reps: {repCount.left}</>
          )}
        </div>
        {/* --- Exercise Selector --- */}
        <div className="exercise-selector-container ui-text-preset ui-box-preset">
          <label htmlFor="exercise-select">Exercise:</label>
          <Listbox
            value={selectedExercise}
            onChange={exercise => {
              // Synthesize a change event for compatibility
              const event = { target: { value: exercise.id } };
              onExerciseChange(event);
            }}
          >
            {({ open }) => (
              <div className="custom-listbox-wrapper">
                <Listbox.Button className="custom-listbox-button">
                  {selectedExercise.name}
                  <span className="custom-listbox-arrow" aria-hidden>
                    {/* Modern chevron-down SVG icon */}
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </Listbox.Button>
                <Listbox.Options className="custom-listbox-options">
                  {availableExercises.map(exercise => (
                    <Listbox.Option
                      key={exercise.id}
                      value={exercise}
                      className={({ active, selected }) =>
                        `custom-listbox-option${active ? ' active' : ''}${selected ? ' selected' : ''}`
                      }
                    >
                      {exercise.name}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            )}
          </Listbox>
        </div>
        {/* --- End Exercise Selector --- */}
      </div>

      <div className="controls">
        <div className="slider-section ui-text-preset ui-box-preset">
          <label htmlFor="videoOpacity">Camera Feed Visibility:</label>
          <input
            type="range"
            id="videoOpacity"
            name="videoOpacity"
            min="0.0"
            max="100.0"
            step="0.5"
            value={videoOpacity}
            onChange={handleOpacityChange}
          />
          <span>{Math.round(videoOpacity)}%</span>
        </div>
        {/* Smoothing Factor Slider */}
        <div className="slider-section ui-text-preset ui-box-preset">
          <label htmlFor="smoothingFactor">Smoothing Factor:</label>
          <input
            type="range"
            id="smoothingFactor"
            name="smoothingFactor"
            min="1"
            max="30"
            step="1"
            value={smoothingFactor}
            onChange={e => setSmoothingFactor(Number(e.target.value))}
          />
          <span>{smoothingFactor}</span>
        </div>
        <div className="debug-section">
          <div className="debug-toggle">
            <input type="checkbox" id="debugToggle" checked={showDebug} onChange={handleDebugToggle} />
            <label htmlFor="debugToggle">Show Debug Logs</label>
          </div>
          {showDebug && (
            <div className="debug-window" style={{ background: 'black', color: 'white', padding: '8px', borderRadius: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              <pre>{debugLogs}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutTracker;
