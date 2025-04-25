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
  sides.forEach(side => {
    // Find the angle config for this side
    const angleConfig = anglesToTrack.find(a => (a.side ? a.side === side : true) && a.isRepCounter);
    if (!angleConfig) return;
    const angle = getAngle(angleConfig, side);
    if (angle == null) return;

    // Get thresholds
    const min = angleConfig.minThreshold;
    const max = angleConfig.maxThreshold;

    // Get previous phase and repCount
    const prev = angleLogic[side] || { phase: 'idle', repCount: 0, lastAngle: null };
    let phase = prev.phase;
    let repCount = prev.repCount;

    // Phase logic:
    // idle: waiting for angle to go below min (start of rep)
    // active: angle is below min (rep in progress)
    // completed: angle goes above max (rep completed)
    // Only count rep when transitioning from active to completed
    if (phase === 'idle') {
      if (angle < min) {
        phase = 'active';
      }
    } else if (phase === 'active') {
      if (angle > max) {
        phase = 'completed';
        repCount += 1;
      }
    } else if (phase === 'completed') {
      if (angle >= min) {
        phase = 'idle';
      }
    }

    angleLogic[side] = {
      phase,
      repCount,
      lastAngle: angle,
    };
  });

  // Compose updated state
  const updatedState = {
    ...state,
    angleLogic,
  };
  return updatedState;
} 