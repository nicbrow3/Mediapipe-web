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

  try {
    // Create a minimal version of the previous state to avoid memory growth
    let cleanPrevState = null;
    if (prevState) {
      cleanPrevState = {
        angleLogic: prevState.angleLogic ? {
          left: prevState.angleLogic.left ? {
            phase: prevState.angleLogic.left.phase,
            lastAngle: prevState.angleLogic.left.lastAngle,
            lastTransitionTime: prevState.angleLogic.left.lastTransitionTime
          } : undefined,
          right: prevState.angleLogic.right ? {
            phase: prevState.angleLogic.right.phase,
            lastAngle: prevState.angleLogic.right.lastAngle,
            lastTransitionTime: prevState.angleLogic.right.lastTransitionTime
          } : undefined
        } : undefined
      };
    }

    if (Array.isArray(pipeline) && pipeline.length > 0) {
      // Start with an initial state (can be customized as needed)
      let state = { prevState: cleanPrevState };
      for (const logicFn of pipeline) {
        if (typeof logicFn !== 'function') throw new Error('Invalid logic function in pipeline');
        state = logicFn({ landmarks, config: exerciseConfig, prevState: cleanPrevState, utils, state });
      }
      
      // Ensure each side has a phase property for state-based rep counting
      if (state.angleLogic) {
        if (state.angleLogic.left && !state.angleLogic.left.phase) {
          state.angleLogic.left.phase = determinePhaseFromAngle(
            state.angleLogic.left.angle,
            exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'left' || !a.side),
            cleanPrevState?.angleLogic?.left?.phase || 'relaxed'
          );
        }
        
        if (state.angleLogic.right && !state.angleLogic.right.phase) {
          state.angleLogic.right.phase = determinePhaseFromAngle(
            state.angleLogic.right.angle,
            exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'right'),
            cleanPrevState?.angleLogic?.right?.phase || 'relaxed'
          );
        }
      }
      
      // Return a clean copy of the state with only the needed properties
      return createCleanStateObject(state);
    } else {
      // Fallback: single logic function (legacy support)
      const logicFn = exerciseConfig.logicConfig.stateCalculationFunction;
      if (typeof logicFn !== 'function') throw new Error('No valid logic function provided in config');
      
      const state = logicFn({ landmarks, config: exerciseConfig, prevState: cleanPrevState, utils });
      
      // Ensure each side has a phase property for state-based rep counting
      if (state.angleLogic) {
        if (state.angleLogic.left && !state.angleLogic.left.phase) {
          state.angleLogic.left.phase = determinePhaseFromAngle(
            state.angleLogic.left.angle,
            exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'left' || !a.side),
            cleanPrevState?.angleLogic?.left?.phase || 'relaxed'
          );
        }
        
        if (state.angleLogic.right && !state.angleLogic.right.phase) {
          state.angleLogic.right.phase = determinePhaseFromAngle(
            state.angleLogic.right.angle,
            exerciseConfig.logicConfig.anglesToTrack?.find(a => a.side === 'right'),
            cleanPrevState?.angleLogic?.right?.phase || 'relaxed'
          );
        }
      }
      
      // Return a clean copy of the state with only the needed properties
      return createCleanStateObject(state);
    }
  } catch (error) {
    console.error('Error in rep state engine:', error);
    return prevState || {}; // Return previous state on error to maintain stability
  }
}

/**
 * Creates a clean state object with only the essential properties needed for rep counting
 * to prevent memory leaks due to accumulating state objects
 * @param {Object} state - The full state object
 * @returns {Object} - A clean state object with only essential properties
 */
function createCleanStateObject(state) {
  if (!state) return {};
  
  return {
    angleLogic: state.angleLogic ? {
      left: state.angleLogic.left ? {
        phase: state.angleLogic.left.phase,
        lastAngle: state.angleLogic.left.lastAngle,
        lastTransitionTime: state.angleLogic.left.lastTransitionTime,
        angle: state.angleLogic.left.angle,
      } : undefined,
      right: state.angleLogic.right ? {
        phase: state.angleLogic.right.phase,
        lastAngle: state.angleLogic.right.lastAngle,
        lastTransitionTime: state.angleLogic.right.lastTransitionTime,
        angle: state.angleLogic.right.angle,
      } : undefined
    } : undefined
  };
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
  
  // Calculate thresholds based on relaxedIsHigh setting
  // For relaxedIsHigh=true (like bicep curls):
  //   - relaxed state is when angle is high (near 180°)
  //   - peak state is when angle is low (near 90°)
  // For relaxedIsHigh=false (like tricep kickbacks):
  //   - relaxed state is when angle is low (near 90°)
  //   - peak state is when angle is high (near 180°)
  const relaxedThreshold = relaxedIsHigh ? max * 0.95 : min * 1.05;
  const peakThreshold = relaxedIsHigh ? min * 1.05 : max * 0.95;
  
  if (relaxedIsHigh) {
    // For exercises like bicep curls
    if (angle >= relaxedThreshold) {
      return 'relaxed';
    } else if (angle <= peakThreshold) {
      return 'peak';
    } else if (prevPhase === 'relaxed' || prevPhase === 'concentric') {
      return 'concentric';
    } else {
      return 'eccentric';
    }
  } else {
    // For exercises like tricep kickbacks
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