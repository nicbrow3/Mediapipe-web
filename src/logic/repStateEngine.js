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
    return state;
  } else {
    // Fallback: single logic function (legacy support)
    const logicFn = exerciseConfig.logicConfig.stateCalculationFunction;
    if (typeof logicFn !== 'function') throw new Error('No valid logic function provided in config');
    return logicFn({ landmarks, config: exerciseConfig, prevState, utils });
  }
}