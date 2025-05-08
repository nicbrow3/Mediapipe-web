import { useState, useRef, useEffect } from 'react';
import { startNewWorkoutSession, endWorkoutSession, addExerciseSet, getSetsForSession } from '../services/db';

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
  const sessionSetsRef = useRef([]); // Keep track of sets in the current session
  
  const SET_RECORDING_INTERVAL_MS = 60000; // Record a set every minute
  
  // Start a new workout session
  const startWorkout = async () => {
    try {
      const sessionId = await startNewWorkoutSession();
      setCurrentSessionId(sessionId);
      setIsSessionActive(true);
      lastExerciseSetTimeRef.current = Date.now();
      sessionStartTimeRef.current = new Date(); // Store start time as Date object
      sessionSetsRef.current = []; // Reset sets for the new session
      
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
        reps: selectedExercise.isTwoSided ? Math.min(repCount.left, repCount.right) : repCount.left,
        repsLeft: selectedExercise.isTwoSided ? repCount.left : null,
        repsRight: selectedExercise.isTwoSided ? repCount.right : null,
        weight: selectedExercise.hasWeight ? null : null, // Weight not currently tracked in periodic recording
      };
      
      const setId = await addExerciseSet(setData);
      lastExerciseSetTimeRef.current = now;
      
      // Add to our local cache of sets
      sessionSetsRef.current.push({
        ...setData,
        id: setId
      });
      
      if (showDebug) {
        console.log('[DEBUG] Recorded exercise set:', setData);
      }
    } catch (error) {
      console.error('Failed to record exercise set:', error);
    }
  };

  // Save an exercise set on demand (when changing exercises or ending workout)
  const saveExerciseSet = async (setData) => {
    if (!currentSessionId || !isSessionActive) return;
    
    try {
      const now = Date.now();
      const completeSetData = {
        ...setData,
        sessionId: currentSessionId,
        startTime: lastExerciseSetTimeRef.current || now - 60000,
        endTime: now,
      };
      
      const setId = await addExerciseSet(completeSetData);
      lastExerciseSetTimeRef.current = now;
      
      // Add to our local cache of sets
      sessionSetsRef.current.push({
        ...completeSetData,
        id: setId
      });
      
      if (showDebug) {
        console.log('[DEBUG] Saved exercise set on demand:', completeSetData);
      }
      
      return setId;
    } catch (error) {
      console.error('Failed to save exercise set:', error);
    }
  };
  
  // Calculate total reps from all sets in the session
  const calculateTotalSessionReps = (sets) => {
    return sets.reduce((total, set) => {
      // For two-sided exercises, use the minimum of left and right reps
      if (set.repsLeft !== null && set.repsRight !== null) {
        return total + Math.min(set.repsLeft, set.repsRight);
      }
      // For single-sided exercises, use the reps field
      return total + (set.reps || 0);
    }, 0);
  };

  // Count unique exercises completed in the session
  const countUniqueExercises = (sets) => {
    const uniqueExercises = new Set(sets.map(set => set.exerciseId));
    return uniqueExercises.size;
  };
  
  // End the current workout session
  const endWorkout = async () => {
    if (!isSessionActive || !currentSessionId) return;
    
    try {
      // Record the final set using the periodic recorder
      await recordExerciseSet();
      
      const endTime = new Date(); // Current time as end time
      
      // Get all sets for this session from the database
      let allSets = await getSetsForSession(currentSessionId);
      
      // If for some reason we can't get sets from the database, use our local cache
      if (!allSets || allSets.length === 0) {
        allSets = sessionSetsRef.current;
      }
      
      // Calculate session stats
      const sessionDuration = Math.round((endTime - sessionStartTimeRef.current) / 1000);
      
      // Calculate total reps across all sets
      const totalReps = calculateTotalSessionReps(allSets);
      
      // Count unique exercises completed
      const exercisesCompleted = countUniqueExercises(allSets);
      
      // Create comprehensive stats object
      const stats = {
        totalReps,
        duration: sessionDuration,
        exercisesCompleted,
        exercises: allSets.map(set => ({
          id: set.exerciseId,
          reps: set.reps,
          repsLeft: set.repsLeft,
          repsRight: set.repsRight,
          weight: set.weight
        })),
        startTime: sessionStartTimeRef.current,
        endTime: endTime,
        setCount: allSets.length
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
    saveExerciseSet,
    endWorkout,
    handleCloseSummary
  };
}

export default useWorkoutSession; 