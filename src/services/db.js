import Dexie from 'dexie';

/**
 * Dexie database instance for storing workout data.
 */
export const db = new Dexie('WorkoutTrackerDB');

// Define the database schema
db.version(1).stores({
  /**
   * Stores overall workout session information.
   * - ++id: Auto-incrementing primary key
   * - startTime: Indexed for potential sorting/querying
   */
  workoutSessions: '++id, startTime, endTime',
  /**
   * Stores details of individual exercise sets within a session.
   * - ++id: Auto-incrementing primary key
   * - sessionId: Foreign key to workoutSessions, indexed for efficient lookup
   * - exerciseId: Identifier for the type of exercise
   * - startTime: Indexed for sorting sets within a session
   */
  exerciseSets: '++id, sessionId, exerciseId, startTime',
});

/**
 * Starts a new workout session in the database.
 * @returns {Promise<number>} The ID of the newly created session.
 */
export const startNewWorkoutSession = async () => {
  try {
    const newSession = {
      startTime: Date.now(),
      endTime: null,
      durationMillis: null,
      notes: '' // Initialize notes as empty
    };
    const id = await db.workoutSessions.add(newSession);
    // console.log(`Started new workout session with ID: ${id}`); // Debug log removed
    return id;
  } catch (error) {
    console.error("Failed to start new workout session:", error);
    throw error; // Re-throw the error for the caller to handle
  }
};

/**
 * Marks a workout session as ended and calculates its duration.
 * @param {number} sessionId The ID of the session to end.
 * @returns {Promise<void>}
 */
export const endWorkoutSession = async (sessionId) => {
  if (!sessionId) {
    console.error("endWorkoutSession called without a valid sessionId.");
    return; // Or throw an error?
  }
  try {
    const endTime = Date.now();
    const session = await db.workoutSessions.get(sessionId);
    if (!session) {
      console.error(`Workout session with ID ${sessionId} not found.`);
      return; // Or throw?
    }

    // Avoid updating if already ended
    if (session.endTime) {
        console.warn(`Session ${sessionId} was already ended.`);
        return;
    }

    const durationMillis = endTime - session.startTime;

    await db.workoutSessions.update(sessionId, {
      endTime: endTime,
      durationMillis: durationMillis,
    });
    // console.log(`Ended workout session ${sessionId}. Duration: ${durationMillis}ms`); // Debug log removed
  } catch (error) {
    console.error(`Failed to end workout session ${sessionId}:`, error);
    throw error; // Re-throw
  }
};

/**
 * Adds a completed exercise set to the database.
 * @param {object} setData The data for the exercise set.
 * @param {number} setData.sessionId The ID of the parent workout session.
 * @param {string} setData.exerciseId The identifier of the exercise performed.
 * @param {number} setData.startTime Timestamp when the set started.
 * @param {number} setData.endTime Timestamp when the set ended.
 * @param {number} setData.reps The number of repetitions completed.
 * @param {number} [setData.repsLeft] Reps for the left side (if applicable).
 * @param {number} [setData.repsRight] Reps for the right side (if applicable).
 * @param {number} [setData.weight] Weight used (if applicable).
 * @returns {Promise<number>} The ID of the newly added exercise set.
 */
export const addExerciseSet = async (setData) => {
  // Basic validation for required fields
  if (!setData || !setData.sessionId || !setData.exerciseId || !setData.startTime || !setData.endTime || setData.reps === undefined) {
    console.error("addExerciseSet called with incomplete data:", setData);
    throw new Error("Incomplete data provided for addExerciseSet");
  }

  try {
    // Prepare the record, ensuring only expected fields are included
    const setRecord = {
      sessionId: setData.sessionId,
      exerciseId: setData.exerciseId,
      startTime: setData.startTime,
      endTime: setData.endTime,
      reps: setData.reps,
      repsLeft: setData.repsLeft, // Optional
      repsRight: setData.repsRight, // Optional
      weight: setData.weight || null, // Default to null if not provided yet
      // landmarkData: null, // Placeholder for future implementation (Task 7)
    };

    const id = await db.exerciseSets.add(setRecord);
    // console.log(`Added new exercise set with ID: ${id} for session ${setData.sessionId}`); // Debug log removed
    return id;
  } catch (error) {
    console.error("Failed to add exercise set:", error);
    throw error; // Re-throw
  }
};

/**
 * Retrieves all workout sessions, sorted by start time (newest first).
 * @returns {Promise<Array<object>>} A list of workout session objects.
 */
export const getAllWorkoutSessions = async () => {
  try {
    // Get all sessions, ordered by startTime descending
    const sessions = await db.workoutSessions.orderBy('startTime').reverse().toArray();
    // console.log(`Retrieved ${sessions.length} workout sessions.`); // Debug log removed
    return sessions;
  } catch (error) {
    console.error("Failed to get all workout sessions:", error);
    throw error; // Re-throw
  }
};

/**
 * Retrieves all exercise sets for a specific workout session, sorted by start time.
 * @param {number} sessionId The ID of the workout session.
 * @returns {Promise<Array<object>>} A list of exercise set objects for the session.
 */
export const getSetsForSession = async (sessionId) => {
  if (!sessionId) {
    console.error("getSetsForSession called without a valid sessionId.");
    return [];
  }
  try {
    // Use the index on sessionId for efficient querying, then sort by time
    const sets = await db.exerciseSets
      .where('sessionId').equals(sessionId)
      .sortBy('startTime');
    // console.log(`Retrieved ${sets.length} sets for session ${sessionId}.`); // Debug log removed
    return sets;
  } catch (error) {
    console.error(`Failed to get sets for session ${sessionId}:`, error);
    throw error; // Re-throw
  }
}; 