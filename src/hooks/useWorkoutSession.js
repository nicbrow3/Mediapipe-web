import { useState, useRef, useEffect } from 'react';
import { startNewWorkoutSession, endWorkoutSession, addExerciseSet } from '../services/db';

/**
 * Custom hook for managing workout sessions
 * @param {Object} selectedExercise - Current selected exercise
 * @param {Object} repCount - Current rep count object with left/right values
 * @param {boolean} showDebug - Flag to show debug information
 * @returns {Object} - Session state and functions
 */
function useWorkoutSession(selectedExercise, repCount, showDebug = false) {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const lastExerciseSetTimeRef = useRef(0);
  const sessionStartTimeRef = useRef(null);
  const [workoutStats, setWorkoutStats] = useState(null);
  const [showWorkoutSummary, setShowWorkoutSummary] = useState(false);
  
  const SET_RECORDING_INTERVAL_MS = 60000; // Record a set every minute
  
  // Start a new workout session
  const startWorkout = async () => {
    try {
      const sessionId = await startNewWorkoutSession();
      setCurrentSessionId(sessionId);
      setIsSessionActive(true);
      lastExerciseSetTimeRef.current = Date.now();
      sessionStartTimeRef.current = new Date(); // Store start time as Date object
      
      if (showDebug) {
        console.log('[DEBUG] Started new workout session:', sessionId);
      }
      
      return sessionId;
    } catch (error) {
      console.error('Failed to start workout session:', error);
      throw error;
    }
  };
  
  // Record current exercise set
  const recordExerciseSet = async () => {
    if (!currentSessionId || !isSessionActive || !selectedExercise) return;
    
    const now = Date.now();
    if (now - lastExerciseSetTimeRef.current < SET_RECORDING_INTERVAL_MS) return;
    
    try {
      const setData = {
        sessionId: currentSessionId,
        exerciseId: selectedExercise.id,
        startTime: lastExerciseSetTimeRef.current || now - 60000, // Default to 1 minute ago if no previous time
        endTime: now,
        reps: selectedExercise.isTwoSided ? Math.max(repCount.left, repCount.right) : repCount.left,
        repsLeft: selectedExercise.isTwoSided ? repCount.left : null,
        repsRight: selectedExercise.isTwoSided ? repCount.right : null,
      };
      
      await addExerciseSet(setData);
      lastExerciseSetTimeRef.current = now;
      
      if (showDebug) {
        console.log('[DEBUG] Recorded exercise set:', setData);
      }
    } catch (error) {
      console.error('Failed to record exercise set:', error);
    }
  };
  
  // End the current workout session
  const endWorkout = async () => {
    if (!isSessionActive || !currentSessionId) return;
    
    try {
      // Record the final set
      await recordExerciseSet();
      
      const endTime = new Date(); // Current time as end time
      
      // Calculate session stats
      const sessionDuration = Math.round((Date.now() - lastExerciseSetTimeRef.current) / 1000);
      
      // Get exercise-specific data
      const isTwoSided = selectedExercise.isTwoSided;
      const totalReps = isTwoSided 
        ? repCount.left + repCount.right
        : repCount.left;
      
      // Create comprehensive stats object
      const stats = {
        totalReps,
        duration: sessionDuration,
        exercisesCompleted: 1, // For now just counting the current exercise
        exerciseName: selectedExercise.name,
        isTwoSided, // Keep this for future use
        startTime: sessionStartTimeRef.current, // Add start time
        endTime: endTime, // Add end time
      };
      
      // End the workout session
      await endWorkoutSession(currentSessionId);
      setIsSessionActive(false);
      
      // Set stats and show summary
      setWorkoutStats(stats);
      setShowWorkoutSummary(true);
      
      if (showDebug) {
        console.log('[DEBUG] Ended workout session:', currentSessionId);
        console.log('[DEBUG] Workout stats:', stats);
      }
    } catch (error) {
      console.error('Failed to end workout session:', error);
    }
  };

  // Close the workout summary
  const handleCloseSummary = () => {
    setShowWorkoutSummary(false);
  };

  // Set up periodic recording of exercise sets
  useEffect(() => {
    let intervalId;
    
    if (isSessionActive && currentSessionId) {
      intervalId = setInterval(() => {
        recordExerciseSet();
      }, SET_RECORDING_INTERVAL_MS);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionActive, currentSessionId, selectedExercise, repCount]);

  // Clean up session on unmount if still active
  useEffect(() => {
    return () => {
      if (isSessionActive && currentSessionId) {
        endWorkoutSession(currentSessionId)
          .catch(error => console.error('Error ending workout session:', error));
      }
    };
  }, [isSessionActive, currentSessionId]);
  
  return {
    isSessionActive,
    currentSessionId, 
    workoutStats,
    showWorkoutSummary,
    startWorkout,
    recordExerciseSet,
    endWorkout,
    handleCloseSummary
  };
}

export default useWorkoutSession; 