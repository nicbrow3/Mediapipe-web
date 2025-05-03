/**
 * Angle-based rep logic function for pipeline architecture.
 * Now tracks detailed state: relaxed → concentric → peak → eccentric → relaxed.
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
    const points = angleConfig.points.map(pt => {
      if (pt.startsWith('left_') || pt.startsWith('right_')) return pt;
      return isTwoSided ? `${side}_${pt}` : `left_${pt}`;
    });
    const indices = points.map(name => LANDMARK_MAP[name]);
    if (indices.some(idx => idx === undefined)) return null;
    const [a, b, c] = indices.map(idx => landmarks[idx]);
    if (!a || !b || !c) return null;
    return utils.calculateAngle(a, b, c);
  }

  // Track detailed phase per side
  const now = Date.now();
  sides.forEach(side => {
    const angleConfig = anglesToTrack.find(a => (a.side ? a.side === side : true) && a.isRepCounter);
    if (!angleConfig) return;
    const angle = getAngle(angleConfig, side);
    if (angle == null) return;

    // Get thresholds
    const min = angleConfig.minThreshold;
    const max = angleConfig.maxThreshold;
    const relaxedIsHigh = angleConfig.relaxedIsHigh !== undefined ? angleConfig.relaxedIsHigh : true;
    
    // Get previous state
    const prev = angleLogic[side] || {
      phase: 'relaxed',
      lastAngle: null,
      lastTransitionTime: now,
    };
    let phase = prev.phase;
    let lastTransitionTime = prev.lastTransitionTime || now;

    // State machine logic
    if (relaxedIsHigh) {
      // For exercises like bicep curls:
      // Relaxed = angle is high (near 180°, straight arm)
      // Peak = angle is low (near 90°, arm bent)
      switch (phase) {
        case 'relaxed':
          if (angle < max && angle > min) {
            phase = 'concentric';
            lastTransitionTime = now;
          } else if (angle <= min) {
            phase = 'peak';
            lastTransitionTime = now;
          }
          break;
        case 'concentric':
          if (angle <= min) {
            phase = 'peak';
            lastTransitionTime = now;
          } else if (angle >= max) {
            phase = 'relaxed';
            lastTransitionTime = now;
          }
          break;
        case 'peak':
          if (angle > min && angle < max) {
            phase = 'eccentric';
            lastTransitionTime = now;
          } else if (angle >= max) {
            phase = 'relaxed';
            lastTransitionTime = now;
          }
          break;
        case 'eccentric':
          if (angle >= max) {
            phase = 'relaxed';
            lastTransitionTime = now;
          } else if (angle <= min) {
            phase = 'peak';
            lastTransitionTime = now;
          }
          break;
        default:
          phase = 'relaxed';
          lastTransitionTime = now;
      }
    } else {
      // For exercises like tricep kickbacks:
      // Relaxed = angle is low (near 90°, arm bent)
      // Peak = angle is high (near 180°, arm straight)
      switch (phase) {
        case 'relaxed':
          if (angle > min && angle < max) {
            phase = 'concentric';
            lastTransitionTime = now;
          } else if (angle >= max) {
            phase = 'peak';
            lastTransitionTime = now;
          }
          break;
        case 'concentric':
          if (angle >= max) {
            phase = 'peak';
            lastTransitionTime = now;
          } else if (angle <= min) {
            phase = 'relaxed';
            lastTransitionTime = now;
          }
          break;
        case 'peak':
          if (angle < max && angle > min) {
            phase = 'eccentric';
            lastTransitionTime = now;
          } else if (angle <= min) {
            phase = 'relaxed';
            lastTransitionTime = now;
          }
          break;
        case 'eccentric':
          if (angle <= min) {
            phase = 'relaxed';
            lastTransitionTime = now;
          } else if (angle >= max) {
            phase = 'peak';
            lastTransitionTime = now;
          }
          break;
        default:
          phase = 'relaxed';
          lastTransitionTime = now;
      }
    }

    angleLogic[side] = {
      ...prev,
      phase,
      lastAngle: angle,
      lastTransitionTime,
    };
  });

  // Compose updated state
  const updatedState = {
    ...state,
    angleLogic,
  };
  return updatedState;
} 