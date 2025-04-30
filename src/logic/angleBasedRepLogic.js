/**
 * Angle-based rep logic function for pipeline architecture.
 * Processes angle-based logic and updates the state accordingly.
 * @param {Object} params
 * @param {Array} params.landmarks - Current pose landmarks
 * @param {Object} params.config - Exercise config
 * @param {Object} params.prevState - Previous state
 * @param {Object} params.utils - Utility functions (e.g., calculateAngle)
 * @param {Object} params.state - The evolving state object (from previous pipeline step)
 * @returns {Object} Updated state object
 */

import { LANDMARK_MAP } from './landmarkUtils';

export function angleBasedRepLogic({ landmarks, config, prevState, utils, state }) {
  const anglesToTrack = config?.logicConfig?.anglesToTrack || [];
  const isTwoSided = config?.isTwoSided;
  const sides = isTwoSided ? ['left', 'right'] : ['left'];

  // Initialize state if not present
  const prevAngleLogic = prevState?.angleLogic || {};
  let angleLogic = { ...prevAngleLogic };

  // Helper to get angle for a config and side
  function getAngle(angleConfig, side) {
    // If side is not specified in config, use as is (for one-sided)
    const points = angleConfig.points.map(pt => {
      // If already has side prefix, use as is
      if (pt.startsWith('left_') || pt.startsWith('right_')) return pt;
      return isTwoSided ? `${side}_${pt}` : `left_${pt}`;
    });
    const indices = points.map(name => LANDMARK_MAP[name]);
    if (indices.some(idx => idx === undefined)) return null;
    const [a, b, c] = indices.map(idx => landmarks[idx]);
    if (!a || !b || !c) return null;
    return utils.calculateAngle(a, b, c);
  }

  // Track rep count and phase per side
  const DEBOUNCE_DURATION_MS = (config?.logicConfig?.repDebounceDuration ?? 200); // Use dynamic debounce duration
  const now = Date.now();
  sides.forEach(side => {
    // Find the angle config for this side
    const angleConfig = anglesToTrack.find(a => (a.side ? a.side === side : true) && a.isRepCounter);
    if (!angleConfig) return;
    const angle = getAngle(angleConfig, side);
    if (angle == null) return;

    // Get thresholds
    const min = angleConfig.minThreshold;
    const max = angleConfig.maxThreshold;
    const relaxedIsHigh = angleConfig.relaxedIsHigh !== undefined ? angleConfig.relaxedIsHigh : true; // default true for backward compatibility

    // Get previous phase and repCount
    const prev = angleLogic[side] || { phase: 'idle', repCount: 0, lastAngle: null, debounceStart: null };
    let phase = prev.phase;
    let repCount = prev.repCount;
    let debounceStart = prev.debounceStart || null;

    // Phase logic with debounce, now using relaxedIsHigh:
    if (relaxedIsHigh) {
      // Relaxed = angle > max, Contracted = angle < min (e.g., bicep curls)
      if (phase === 'idle') {
        if (angle < min) {
          phase = 'active';
          debounceStart = now;
        } else {
          debounceStart = null;
        }
      } else if (phase === 'active') {
        if (angle < min) {
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
    } else {
      // Relaxed = angle < min, Contracted = angle > max (e.g., shoulder abduction)
      if (phase === 'idle') {
        if (angle > max) {
          phase = 'active';
          debounceStart = now;
        } else {
          debounceStart = null;
        }
      } else if (phase === 'active') {
        if (angle > max) {
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
    }

    angleLogic[side] = {
      phase,
      repCount,
      lastAngle: angle,
      debounceStart,
    };
  });

  // Compose updated state
  const updatedState = {
    ...state,
    angleLogic,
  };
  return updatedState;
} 