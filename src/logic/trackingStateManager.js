import { calculateAngle, LANDMARK_MAP } from './landmarkUtils';

const TRACKING_STATES = {
  IDLE: 'IDLE',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
};

const VISIBILITY_GRACE_PERIOD_MS = 300;

// Checks if required landmarks for an exercise are visible
function checkRequiredLandmarksVisible(landmarks, threshold, requireAll, selectedExercise) {
  if (!landmarks) return false;
  if (requireAll) {
    // Require ALL pose landmarks to be visible above threshold
    return landmarks.every(lm => (lm?.visibility ?? 1) > threshold);
  }
  // Get required indices for current exercise
  let requiredIndices = [];
  if (selectedExercise?.landmarks) {
    let primaryNames = [];
    if (selectedExercise.isTwoSided) {
      const leftPrimary = selectedExercise.landmarks.left?.primary || [];
      const rightPrimary = selectedExercise.landmarks.right?.primary || [];
      primaryNames = [...leftPrimary, ...rightPrimary];
    } else {
      primaryNames = selectedExercise.landmarks.primary || [];
    }
    requiredIndices = primaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
  }
  return requiredIndices.length > 0 && requiredIndices.every(idx => (landmarks[idx]?.visibility ?? 1) > threshold);
}

// Checks if secondary landmarks for an exercise are visible
function checkSecondaryLandmarksVisible(landmarks, threshold, selectedExercise) {
  if (!landmarks) return false;
  let secondaryIndices = [];
  if (selectedExercise?.landmarks) {
    let secondaryNames = [];
    if (selectedExercise.isTwoSided) {
      const leftSecondary = selectedExercise.landmarks.left?.secondary || [];
      const rightSecondary = selectedExercise.landmarks.right?.secondary || [];
      secondaryNames = [...leftSecondary, ...rightSecondary];
    } else {
      secondaryNames = selectedExercise.landmarks.secondary || [];
    }
    secondaryIndices = secondaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
  }
  // If there are no secondary, treat as true
  if (secondaryIndices.length === 0) return true;
  return secondaryIndices.every(idx => (landmarks[idx]?.visibility ?? 1) > threshold);
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

// Function to update tracking state based on landmarks and exercise configuration
function updateTrackingState(
  landmarks, 
  exercise, 
  strictLandmarkVisibility, 
  visibilityThreshold, 
  trackingStateRef, 
  sideStatus,
  readyPoseHoldStartRef,
  readyPoseGlobalHoldStartRef,
  repInProgressRef,
  wasInReadyPoseRef,
  lostVisibilityTimestampRef,
  prevTrackingStateRef
) {
  const requiredVisible = checkRequiredLandmarksVisible(landmarks, visibilityThreshold, strictLandmarkVisibility, exercise);
  const secondaryVisible = checkSecondaryLandmarksVisible(landmarks, visibilityThreshold, exercise);
  
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
      if (!readyPoseHoldStartRef[side]) readyPoseHoldStartRef[side] = now;
      const readyPositionHoldTime = (exercise?.startPosition?.readyPositionHoldTime || 0) * 1000;
      if (now - readyPoseHoldStartRef[side] >= readyPositionHoldTime) {
        newSideStatus[side].inReadyPose = true;
        wasInReadyPoseRef[side] = true; // Mark that this side has been in ready pose
      } else {
        newSideStatus[side].inReadyPose = false;
      }
    } else {
      readyPoseHoldStartRef[side] = null;
      newSideStatus[side].inReadyPose = false;
    }

    // Rep start logic (track if user leaves ready pose and starts movement)
    if (!newSideStatus[side].inReadyPose && repStartedSide(landmarks, exercise, side)) {
      repInProgressRef[side] = true;
    }

    // Rep complete logic (only count if was in ready pose before this rep cycle)
    if (
      repInProgressRef[side] &&
      repCompletedSide(landmarks, exercise, side) &&
      wasInReadyPoseRef[side]
    ) {
      repCompletedSides.push(side);
      repInProgressRef[side] = false;
      wasInReadyPoseRef[side] = false; // Reset for next cycle
    }

    if (newSideStatus[side].inReadyPose) anyReady = true;
    else anyActive = true;
    allReady = allReady && newSideStatus[side].inReadyPose;
  }

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
  
  return {
    nextTrackingState,
    newSideStatus,
    repCompletedSides
  };
}

export {
  TRACKING_STATES,
  VISIBILITY_GRACE_PERIOD_MS,
  checkRequiredLandmarksVisible,
  checkSecondaryLandmarksVisible,
  inReadyPoseSide,
  repStartedSide,
  repCompletedSide,
  getAngle,
  updateTrackingState
}; 