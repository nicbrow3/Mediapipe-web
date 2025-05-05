// Constants for history tracking
const REP_WINDOW_SECONDS = 8;
const EXTRA_BUFFER_SECONDS = 2;
const MAX_HISTORY_ENTRIES = 200;
const MAX_SMOOTHING_ENTRIES = 60;

/**
 * Smoothing function for rep history (exponential moving average)
 * @param {Array} history - Array of history data points with angle values
 * @param {number} smoothingFactor - Controls the smoothing strength (higher = more smoothing)
 * @returns {Array} - Smoothed history array
 */
function smoothRepHistoryEMA(history, smoothingFactor = 5) {
  if (!history || history.length === 0) return [];
  if (smoothingFactor === 0) return history; // No smoothing if 0
  
  // Convert smoothingFactor to alpha (typical formula for EMA window)
  const alpha = 2 / (smoothingFactor + 1);
  
  // Only process the most recent entries to save memory
  const entriesToProcess = Math.min(history.length, MAX_SMOOTHING_ENTRIES);
  const startIdx = Math.max(0, history.length - entriesToProcess);
  
  // Extract just the slice we need to process
  const historySlice = history.slice(startIdx);
  
  // Initialize smoothed with the first entry
  const smoothed = new Array(historySlice.length);
  
  // Initialize previous values
  let prevLeft = historySlice[0]?.leftAngle ?? null;
  let prevRight = historySlice[0]?.rightAngle ?? null;
  
  // Set first entry as-is
  if (historySlice.length > 0) {
    smoothed[0] = { ...historySlice[0] };
  }
  
  // Process the rest of the entries
  for (let i = 1; i < historySlice.length; i++) {
    const entry = historySlice[i];
    const left = entry.leftAngle;
    const right = entry.rightAngle;
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
    
    // Create a new object with minimal properties
    smoothed[i] = {
      timestamp: entry.timestamp,
      leftAngle: smoothLeft,
      rightAngle: smoothRight,
      // Only copy the properties we actually need
      requiredVisibility: entry.requiredVisibility,
      trackingState: entry.trackingState
    };
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
  // If buffer is null or not an array, initialize it
  if (!repHistoryBuffer || !Array.isArray(repHistoryBuffer)) {
    repHistoryBuffer = [];
  }
  
  const now = Date.now();
  
  // Create a minimal entry with only the data we need
  const newEntry = {
    timestamp: now,
    leftAngle,
    rightAngle,
    requiredVisibility,
    // Don't store secondaryVisibility if we don't need it for rep counting
    trackingState
  };
  
  // Keep REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS worth of data
  const maxAge = (REP_WINDOW_SECONDS + EXTRA_BUFFER_SECONDS) * 1000;
  
  // First filter out old entries based on timestamp
  // Use in-place filtering to avoid creating a new array
  let validCount = 0;
  for (let i = 0; i < repHistoryBuffer.length; i++) {
    if (now - repHistoryBuffer[i].timestamp <= maxAge) {
      if (i !== validCount) {
        repHistoryBuffer[validCount] = repHistoryBuffer[i];
      }
      validCount++;
    }
  }
  
  // Truncate the array to only include valid entries
  repHistoryBuffer.length = validCount;
  
  // Add the new entry
  repHistoryBuffer.push(newEntry);
  
  // If we exceed the max entries, remove oldest entries
  if (repHistoryBuffer.length > MAX_HISTORY_ENTRIES) {
    // Remove from the beginning instead of creating a new array with slice
    const removeCount = repHistoryBuffer.length - MAX_HISTORY_ENTRIES;
    repHistoryBuffer.splice(0, removeCount);
  }
  
  return repHistoryBuffer;
}

/**
 * Get the min visibility and confidence scores for an exercise's landmarks
 * @param {Array} landmarks - Pose landmarks
 * @param {Object} selectedExercise - Current exercise configuration
 * @param {Object} LANDMARK_MAP - Map of landmark names to indices
 * @returns {Object} - Object with required and secondary visibility and confidence scores
 */
function getLandmarkVisibilityScores(landmarks, selectedExercise, LANDMARK_MAP) {
  let requiredVisibility = 1;
  let secondaryVisibility = 1;
  let requiredConfidence = 1;
  let secondaryConfidence = 1;
  
  if (!landmarks || !selectedExercise?.landmarks) {
    return { 
      requiredVisibility, 
      secondaryVisibility,
      requiredConfidence,
      secondaryConfidence 
    };
  }
  
  // Find all the required landmark indices
  let requiredIndices = [];
  let secondaryIndices = [];
  
  try {
    if (selectedExercise.isTwoSided) {
      const leftPrimary = selectedExercise.landmarks.left?.primary || [];
      const rightPrimary = selectedExercise.landmarks.right?.primary || [];
      const leftSecondary = selectedExercise.landmarks.left?.secondary || [];
      const rightSecondary = selectedExercise.landmarks.right?.secondary || [];
      
      // Map the names to indices
      requiredIndices = [...leftPrimary, ...rightPrimary]
        .map(name => LANDMARK_MAP[name])
        .filter(index => index !== undefined);
      
      secondaryIndices = [...leftSecondary, ...rightSecondary]
        .map(name => LANDMARK_MAP[name])
        .filter(index => index !== undefined);
    } else {
      requiredIndices = (selectedExercise.landmarks.primary || [])
        .map(name => LANDMARK_MAP[name])
        .filter(index => index !== undefined);
      
      secondaryIndices = (selectedExercise.landmarks.secondary || [])
        .map(name => LANDMARK_MAP[name])
        .filter(index => index !== undefined);
    }
    
    // Calculate minimum visibility for required landmarks
    if (requiredIndices.length > 0) {
      let minVisibility = 1;
      let minConfidence = 1;
      
      for (let i = 0; i < requiredIndices.length; i++) {
        const idx = requiredIndices[i];
        if (!landmarks[idx]) continue;
        
        const visibility = landmarks[idx].visibility ?? 1;
        if (visibility < minVisibility) {
          minVisibility = visibility;
        }
        
        // Check presence (confidence) if available
        if (landmarks[idx].presence !== undefined) {
          const presence = landmarks[idx].presence ?? 1;
          if (presence < minConfidence) {
            minConfidence = presence;
          }
        }
      }
      
      requiredVisibility = minVisibility;
      requiredConfidence = minConfidence;
    }
    
    // Calculate minimum visibility for secondary landmarks
    if (secondaryIndices.length > 0) {
      let minVisibility = 1;
      let minConfidence = 1;
      
      for (let i = 0; i < secondaryIndices.length; i++) {
        const idx = secondaryIndices[i];
        if (!landmarks[idx]) continue;
        
        const visibility = landmarks[idx].visibility ?? 1;
        if (visibility < minVisibility) {
          minVisibility = visibility;
        }
        
        // Check presence (confidence) if available
        if (landmarks[idx].presence !== undefined) {
          const presence = landmarks[idx].presence ?? 1;
          if (presence < minConfidence) {
            minConfidence = presence;
          }
        }
      }
      
      secondaryVisibility = minVisibility;
      secondaryConfidence = minConfidence;
    }
  } catch (error) {
    console.error('Error calculating landmark visibility:', error);
  }
  
  return { 
    requiredVisibility, 
    secondaryVisibility,
    requiredConfidence,
    secondaryConfidence 
  };
}

export {
  REP_WINDOW_SECONDS,
  EXTRA_BUFFER_SECONDS,
  MAX_HISTORY_ENTRIES,
  MAX_SMOOTHING_ENTRIES,
  smoothRepHistoryEMA,
  updateRepHistoryBuffer,
  getLandmarkVisibilityScores
}; 