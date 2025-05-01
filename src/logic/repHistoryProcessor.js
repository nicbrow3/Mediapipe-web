// Constants for history tracking
const REP_WINDOW_SECONDS = 10;
const EXTRA_BUFFER_SECONDS = 5; // Extra buffer for smoothing

/**
 * Smoothing function for rep history (exponential moving average)
 * @param {Array} history - Array of history data points with angle values
 * @param {number} smoothingFactor - Controls the smoothing strength (higher = more smoothing)
 * @returns {Array} - Smoothed history array
 */
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

/**
 * Add a new angle entry to the rep history buffer
 * @param {Array} repHistoryBuffer - Current history buffer
 * @param {number} leftAngle - Left side angle value
 * @param {number} rightAngle - Right side angle value
 * @param {number} requiredVisibility - Visibility score for required landmarks
 * @param {number} secondaryVisibility - Visibility score for secondary landmarks
 * @param {string} trackingState - Current tracking state
 * @returns {Array} - Updated history buffer with old entries filtered out
 */
function updateRepHistoryBuffer(repHistoryBuffer, leftAngle, rightAngle, requiredVisibility, secondaryVisibility, trackingState) {
  const now = Date.now();
  const newEntry = {
    timestamp: now,
    leftAngle,
    rightAngle,
    requiredVisibility,
    secondaryVisibility,
    trackingState
  };
  
  // Keep REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS worth of data
  const maxAge = (REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS) * 1000;
  
  return [
    ...repHistoryBuffer.filter(d => now - d.timestamp <= maxAge),
    newEntry
  ];
}

/**
 * Get the min visibility scores for an exercise's landmarks
 * @param {Array} landmarks - Pose landmarks
 * @param {Object} selectedExercise - Current exercise configuration
 * @param {Object} LANDMARK_MAP - Map of landmark names to indices
 * @returns {Object} - Object with required and secondary visibility scores
 */
function getLandmarkVisibilityScores(landmarks, selectedExercise, LANDMARK_MAP) {
  let requiredVisibility = 1;
  let secondaryVisibility = 1;
  
  if (selectedExercise?.landmarks) {
    let requiredIndices = [];
    let primaryNames = [];
    let secondaryIndices = [];
    let secondaryNames = [];
    
    if (selectedExercise.isTwoSided) {
      const leftPrimary = selectedExercise.landmarks.left?.primary || [];
      const rightPrimary = selectedExercise.landmarks.right?.primary || [];
      primaryNames = [...leftPrimary, ...rightPrimary];
      
      const leftSecondary = selectedExercise.landmarks.left?.secondary || [];
      const rightSecondary = selectedExercise.landmarks.right?.secondary || [];
      secondaryNames = [...leftSecondary, ...rightSecondary];
    } else {
      primaryNames = selectedExercise.landmarks.primary || [];
      secondaryNames = selectedExercise.landmarks.secondary || [];
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
  
  return { requiredVisibility, secondaryVisibility };
}

export {
  REP_WINDOW_SECONDS,
  EXTRA_BUFFER_SECONDS,
  smoothRepHistoryEMA,
  updateRepHistoryBuffer,
  getLandmarkVisibilityScores
}; 