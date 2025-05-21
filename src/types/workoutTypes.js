/**
 * Workout Type Definitions
 * 
 * This file contains type definitions for structured workouts in the application.
 */

/**
 * @typedef {Object} ExerciseSet
 * @property {'set'} type - Type identifier for an exercise set
 * @property {string} id - Unique identifier for the set
 * @property {string} exerciseId - ID of the exercise (referencing exercise configs)
 * @property {number} reps - Number of repetitions for this set
 * @property {number|null} weight - Weight used for this set (null if not applicable)
 * @property {string} [notes] - Optional notes for this set
 */

/**
 * @typedef {Object} CircuitElement
 * @property {'circuit'} type - Type identifier for a circuit
 * @property {string} id - Unique identifier for the circuit
 * @property {string} name - Display name for the circuit
 * @property {number} repetitions - Number of times to repeat this circuit
 * @property {Array<ExerciseSet>} elements - Exercise sets included in this circuit
 */

/**
 * @typedef {Array<ExerciseSet|CircuitElement>} WorkoutPlan
 * A workout plan is an array containing a mix of individual exercise sets and circuits
 */

// Export empty object for module compatibility
export {}; 