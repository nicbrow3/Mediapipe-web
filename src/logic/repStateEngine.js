// Calls the logic and utilities that are defined in the exercise config
// file for each exercise.
// We don't have to touch this file even if we add new logic types in the configs.

/**
 * Runs the rep/phase logic for the current frame.
 * Supports a pipeline of logic functions for compound movements.
 * @param {Array} landmarks - The current pose landmarks
 * @param {Object} exerciseConfig - The exercise config object
 * @param {Object} prevState - The previous state for this exercise
 * @returns {Object} - The new state (e.g., rep count, phase, etc.)
 */
export function runRepStateEngine(landmarks, exerciseConfig, prevState) {
  const utils = exerciseConfig.logicConfig.utilityFunctions || {};
  const pipeline = exerciseConfig.logicConfig.pipeline;

  if (Array.isArray(pipeline) && pipeline.length > 0) {
    // Start with an initial state (can be customized as needed)
    let state = { prevState };
    for (const logicFn of pipeline) {
      if (typeof logicFn !== 'function') throw new Error('Invalid logic function in pipeline');
      state = logicFn({ landmarks, config: exerciseConfig, prevState, utils, state });
    }
    
    // Ensure each side has a phase property for state-based rep counting
    if (state.angleLogic) {
      if (state.angleLogic.left && !state.angleLogic.left.phase) {
        state.angleLogic.left.phase = determinePhaseFromAngle(
          state.angleLogic.left.angle,
          exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'left' || !a.side),
          prevState?.angleLogic?.left?.phase || 'relaxed'
        );
      }
      
      if (state.angleLogic.right && !state.angleLogic.right.phase) {
        state.angleLogic.right.phase = determinePhaseFromAngle(
          state.angleLogic.right.angle,
          exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'right'),
          prevState?.angleLogic?.right?.phase || 'relaxed'
        );
      }
    }
    
    return state;
  } else {
    // Fallback: single logic function (legacy support)
    const logicFn = exerciseConfig.logicConfig.stateCalculationFunction;
    if (typeof logicFn !== 'function') throw new Error('No valid logic function provided in config');
    
    const state = logicFn({ landmarks, config: exerciseConfig, prevState, utils });
    
    // Ensure each side has a phase property for state-based rep counting
    if (state.angleLogic) {
      if (state.angleLogic.left && !state.angleLogic.left.phase) {
        state.angleLogic.left.phase = determinePhaseFromAngle(
          state.angleLogic.left.angle,
          exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'left' || !a.side),
          prevState?.angleLogic?.left?.phase || 'relaxed'
        );
      }
      
      if (state.angleLogic.right && !state.angleLogic.right.phase) {
        state.angleLogic.right.phase = determinePhaseFromAngle(
          state.angleLogic.right.angle,
          exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'right'),
          prevState?.angleLogic?.right?.phase || 'relaxed'
        );
      }
    }
    
    return state;
  }
}

/**
 * Determines the current phase based on angle and thresholds
 * @param {number} angle - The current angle
 * @param {Object} angleConfig - Config for this angle
 * @param {string} prevPhase - The previous phase
 * @returns {string} The current phase
 */
function determinePhaseFromAngle(angle, angleConfig, prevPhase) {
  if (!angle || !angleConfig) return prevPhase || 'relaxed';
  
  const min = angleConfig.minThreshold || 45;
  const max = angleConfig.maxThreshold || 160;
  const relaxedIsHigh = angleConfig.relaxedIsHigh !== undefined ? angleConfig.relaxedIsHigh : true;
  
  // Calculate thresholds
  const relaxedThreshold = relaxedIsHigh ? max * 0.95 : min * 1.05;
  const peakThreshold = relaxedIsHigh ? min * 1.05 : max * 0.95;
  const midRange = (max + min) / 2;
  
  // For relaxedIsHigh (like bicep curl), angle decreases during concentric
  if (relaxedIsHigh) {
    if (angle >= relaxedThreshold) {
      return 'relaxed';
    } else if (angle <= peakThreshold) {
      return 'peak';
    } else if (prevPhase === 'relaxed' || prevPhase === 'concentric') {
      return 'concentric';
    } else {
      return 'eccentric';
    }
  } 
  // For !relaxedIsHigh (like squat), angle increases during concentric
  else {
    if (angle <= relaxedThreshold) {
      return 'relaxed';
    } else if (angle >= peakThreshold) {
      return 'peak';
    } else if (prevPhase === 'relaxed' || prevPhase === 'concentric') {
      return 'concentric';
    } else {
      return 'eccentric';
    }
  }
}