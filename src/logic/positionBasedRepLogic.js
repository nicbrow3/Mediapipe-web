/**
 * Position-based rep logic function for pipeline architecture.
 * Processes position-based logic and updates the state accordingly.
 * @param {Object} params
 * @param {Array} params.landmarks - Current pose landmarks
 * @param {Object} params.config - Exercise config
 * @param {Object} params.prevState - Previous state
 * @param {Object} params.utils - Utility functions (e.g., getDistance)
 * @param {Object} params.state - The evolving state object (from previous pipeline step)
 * @returns {Object} Updated state object
 */
export function positionBasedRepLogic({ landmarks, config, prevState, utils, state }) {
  const positionsToTrack = config?.logicConfig?.positionsToTrack || [];
  const DEBOUNCE_DURATION_MS = (config?.logicConfig?.repDebounceDuration ?? 200);
  const now = Date.now();

  // Only track one rep counter group (all repCounter positions must be satisfied)
  // For more complex logic, this could be extended
  let prevPositionLogic = prevState?.positionLogic || { phase: 'idle', repCount: 0, debounceStart: null };
  let phase = prevPositionLogic.phase;
  let repCount = prevPositionLogic.repCount;
  let debounceStart = prevPositionLogic.debounceStart || null;

  // Helper to get a landmark by name
  function getLandmark(name) {
    const idx = utils.LANDMARK_MAP ? utils.LANDMARK_MAP[name] : undefined;
    return idx !== undefined ? landmarks[idx] : undefined;
  }

  // Evaluate all repCounter positions
  let allConditionsMet = true;
  for (const posConfig of positionsToTrack.filter(p => p.isRepCounter)) {
    const [nameA, nameB] = posConfig.points;
    const a = getLandmark(nameA);
    const b = getLandmark(nameB);
    if (!a || !b) {
      allConditionsMet = false;
      break;
    }
    // Distance checks
    if (typeof posConfig.minDistance === 'number' || typeof posConfig.maxDistance === 'number') {
      const dist = utils.getDistance2D ? utils.getDistance2D(a, b) : null;
      if (dist == null) {
        allConditionsMet = false;
        break;
      }
      if (typeof posConfig.minDistance === 'number' && dist < posConfig.minDistance) {
        allConditionsMet = false;
        break;
      }
      if (typeof posConfig.maxDistance === 'number' && dist > posConfig.maxDistance) {
        allConditionsMet = false;
        break;
      }
    }
    // Vertical checks (y axis: lower value is higher on screen)
    if (typeof posConfig.minVertical === 'number') {
      if ((b.y - a.y) > posConfig.minVertical) { // b above a by at least minVertical
        allConditionsMet = false;
        break;
      }
    }
    if (typeof posConfig.maxVertical === 'number') {
      if ((b.y - a.y) < posConfig.maxVertical) {
        allConditionsMet = false;
        break;
      }
    }
  }

  // Phase logic with debounce
  if (phase === 'idle') {
    if (allConditionsMet) {
      phase = 'active';
      debounceStart = now;
    } else {
      debounceStart = null;
    }
  } else if (phase === 'active') {
    if (allConditionsMet) {
      if (!debounceStart) {
        debounceStart = now;
      } else if (now - debounceStart >= DEBOUNCE_DURATION_MS) {
        repCount += 1;
        debounceStart = now; // reset debounce for next rep
      }
    } else {
      phase = 'idle';
      debounceStart = null;
    }
  }

  const updatedState = {
    ...state,
    positionLogic: {
      phase,
      repCount,
      debounceStart,
      allConditionsMet,
    }
  };
  return updatedState;
} 