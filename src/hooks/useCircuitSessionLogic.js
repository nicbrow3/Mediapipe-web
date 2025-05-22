import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as exercises from '../exercises';

/**
 * Hook for managing circuit workout sessions
 * This hook tracks the current state of a circuit workout, including:
 * - Current exercise
 * - Current set within the workout
 * - Progress through the workout
 * - Circuit repetitions and sets
 */
const useCircuitSessionLogic = () => {
  // Store the workout plan
  const [workoutPlan, setWorkoutPlan] = useState([]);
  
  // State for controlling the workout session
  const [isActive, setIsActive] = useState(false);
  const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);
  const [hasBeenStarted, setHasBeenStarted] = useState(false);
  
  // State to track the current position in the workout
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  
  // For circuits, we need to track which repetition and element we're on
  const [circuitRepetition, setCircuitRepetition] = useState(1);
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  
  // Keep track of sets completed and total sets for progress calculation
  const [completedSets, setCompletedSets] = useState(0);
  const [totalSets, setTotalSets] = useState(0);
  
  // Track workout timing for stats
  const workoutStartTime = useRef(null);
  const workoutTotalTimeMs = useRef(0);
  const lastPauseTime = useRef(null);
  
  // Track total reps completed
  const [totalReps, setTotalReps] = useState(0);
  
  // Function to calculate the total number of sets in the workout plan
  const calculateTotalSets = useCallback((plan) => {
    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      return 0;
    }
    
    let totalSetsCount = 0;
    
    plan.forEach(item => {
      if (item.type === 'set') {
        totalSetsCount += 1;
      } else if (item.type === 'circuit' && item.elements && Array.isArray(item.elements)) {
        // For circuits, count repetitions * number of exercises
        const circuitSets = (item.repetitions || 1) * item.elements.length;
        totalSetsCount += circuitSets;
      }
    });
    
    return totalSetsCount;
  }, []);
  
  // Helper function to calculate the overall set number based on position in workout
  const calculateOverallSetNumber = useCallback((plan, itemIndex, elementIndex, repetition) => {
    if (!plan || !Array.isArray(plan) || itemIndex >= plan.length) {
      return 1;
    }
    
    let setNumber = 1;
    
    // Count sets from all previous items
    for (let i = 0; i < itemIndex; i++) {
      const item = plan[i];
      if (item.type === 'set') {
        setNumber += 1;
      } else if (item.type === 'circuit' && item.elements && Array.isArray(item.elements)) {
        setNumber += (item.repetitions || 1) * item.elements.length;
      }
    }
    
    // If current item is a circuit, add the position within the circuit
    const currentItem = plan[itemIndex];
    if (currentItem.type === 'circuit') {
      // Add sets from previous repetitions
      setNumber += (repetition - 1) * currentItem.elements.length;
      // Add current element position
      setNumber += elementIndex;
    }
    
    return setNumber;
  }, []);

  // Helper function to get exercise details for a position
  const getExerciseDetailsForCurrentPosition = useCallback((
    plan, 
    itemIndex, 
    elementIndex, 
    repetition,
    currentCompletedSets,
    currentTotalSets
  ) => {
    if (!plan || !Array.isArray(plan) || plan.length === 0 || itemIndex >= plan.length) {
      console.warn('[useCircuitSessionLogic] Invalid plan or item index:', { plan, itemIndex });
      return null;
    }
    
    try {
      const currentItem = plan[itemIndex];
      console.log('[useCircuitSessionLogic] Getting details for item:', currentItem);
      
      // For simple set
      if (currentItem.type === 'set') {
        const nextItemIndex = itemIndex + 1;
        const nextItem = nextItemIndex < plan.length ? plan[nextItemIndex] : null;
        
        // Look up the current exercise
        const exercise = Object.values(exercises).find(e => e.id === currentItem.exerciseId);
        if (!exercise) {
          console.warn(`[useCircuitSessionLogic] Could not find exercise with ID: ${currentItem.exerciseId}`);
          return null;
        }
        
        // Look up the next exercise name
        let nextExerciseName = null;
        if (nextItem) {
          if (nextItem.type === 'set') {
            const nextExercise = Object.values(exercises).find(e => e.id === nextItem.exerciseId);
            nextExerciseName = nextExercise?.name;
          } else if (nextItem.type === 'circuit' && nextItem.elements && nextItem.elements.length > 0) {
            const nextExercise = Object.values(exercises).find(e => e.id === nextItem.elements[0].exerciseId);
            nextExerciseName = nextExercise?.name;
          }
        }
        
        const details = {
          exerciseId: currentItem.exerciseId,
          exerciseName: exercise.name,
          targetReps: currentItem.reps,
          weight: currentItem.weight,
          inCircuit: false,
          overallSetNumber: calculateOverallSetNumber(plan, itemIndex, elementIndex, repetition),
          overallTotalSets: currentTotalSets,
          nextExerciseName
        };
        
        console.log('[useCircuitSessionLogic] Returning set details:', details);
        return details;
      }
      
      // For circuit
      if (currentItem.type === 'circuit' && 
          currentItem.elements && 
          Array.isArray(currentItem.elements) && 
          elementIndex < currentItem.elements.length) {
        
        const currentElement = currentItem.elements[elementIndex];
        
        // Look up the current exercise
        const exercise = Object.values(exercises).find(e => e.id === currentElement.exerciseId);
        if (!exercise) {
          console.warn(`[useCircuitSessionLogic] Could not find exercise with ID: ${currentElement.exerciseId}`);
          return null;
        }
        
        // Calculate the next exercise name (if there is one)
        let nextExerciseName = null;
        
        // If we're not at the last element in this circuit
        if (elementIndex < currentItem.elements.length - 1) {
          const nextExercise = Object.values(exercises).find(e => e.id === currentItem.elements[elementIndex + 1].exerciseId);
          nextExerciseName = nextExercise?.name;
        } 
        // If we're at the last element but not the last repetition
        else if (repetition < currentItem.repetitions) {
          const nextExercise = Object.values(exercises).find(e => e.id === currentItem.elements[0].exerciseId);
          nextExerciseName = nextExercise?.name;
        }
        // If we're at the last element and last repetition, look for the next item
        else if (itemIndex + 1 < plan.length) {
          const nextItem = plan[itemIndex + 1];
          if (nextItem.type === 'set') {
            const nextExercise = Object.values(exercises).find(e => e.id === nextItem.exerciseId);
            nextExerciseName = nextExercise?.name;
          } else if (nextItem.type === 'circuit' && nextItem.elements && nextItem.elements.length > 0) {
            const nextExercise = Object.values(exercises).find(e => e.id === nextItem.elements[0].exerciseId);
            nextExerciseName = nextExercise?.name;
          }
        }
        
        const details = {
          exerciseId: currentElement.exerciseId,
          exerciseName: exercise.name,
          targetReps: currentElement.reps,
          weight: currentElement.weight,
          inCircuit: true,
          circuitName: currentItem.name || `Circuit ${itemIndex + 1}`,
          circuitSetNumber: elementIndex + 1,
          circuitTotalSets: currentItem.elements.length,
          circuitRepetition: repetition,
          circuitTotalRepetitions: currentItem.repetitions,
          overallSetNumber: calculateOverallSetNumber(plan, itemIndex, elementIndex, repetition),
          overallTotalSets: currentTotalSets,
          nextExerciseName
        };
        
        console.log('[useCircuitSessionLogic] Returning circuit details:', details);
        return details;
      }
      
      // If we get here, something went wrong
      console.warn('[useCircuitSessionLogic] Unable to get exercise details for current position:', {
        itemIndex, elementIndex, repetition
      });
      return null;
    } catch (error) {
      console.error('[useCircuitSessionLogic] Error getting exercise details:', error);
      return null;
    }
  }, [calculateOverallSetNumber]);
  
  // Reset the workout state when initializing a new workout
  const resetWorkout = useCallback(() => {
    setWorkoutPlan([]);
    setIsActive(false);
    setIsWorkoutComplete(false);
    setHasBeenStarted(false);
    setCurrentItemIndex(0);
    setCircuitRepetition(1);
    setCurrentElementIndex(0);
    setCompletedSets(0);
    setTotalSets(0);
    workoutStartTime.current = null;
    workoutTotalTimeMs.current = 0;
    lastPauseTime.current = null;
    setTotalReps(0);
  }, []);
  
  // Initialize a new workout with the given plan
  const initializeWorkout = useCallback((plan) => {
    console.log('[useCircuitSessionLogic] Initializing workout with plan:', plan);
    
    if (!plan || !Array.isArray(plan) || plan.length === 0) {
      console.warn('[useCircuitSessionLogic] Cannot initialize workout: Invalid or empty plan');
      return { success: false };
    }
    
    try {
      // Reset the workout state
      resetWorkout();
      
      // Store the new workout plan
      setWorkoutPlan(plan);
      
      // Calculate and store the total number of sets
      const totalSetsCount = calculateTotalSets(plan);
      console.log(`[useCircuitSessionLogic] Total sets in workout: ${totalSetsCount}`);
      setTotalSets(totalSetsCount);
      
      // Reset completed sets to 0
      setCompletedSets(0);
      
      // We don't auto-start the workout, just initialize it
      setCurrentItemIndex(0);
      setCircuitRepetition(1);
      setCurrentElementIndex(0);
      
      // Get the initial exercise details to return
      const initialDetails = getExerciseDetailsForCurrentPosition(plan, 0, 0, 1, 0, totalSetsCount);
      console.log('[useCircuitSessionLogic] Initial exercise details:', initialDetails);
      
      return { 
        success: true,
        initialExerciseDetails: initialDetails
      };
    } catch (error) {
      console.error('[useCircuitSessionLogic] Error initializing workout:', error);
      return { success: false, error };
    }
  }, [resetWorkout, calculateTotalSets, getExerciseDetailsForCurrentPosition]);
  
  // Get the exercise details for the current position in the workout
  const getCurrentExerciseDetails = useCallback(() => {
    if (isWorkoutComplete) {
      return null;
    }
    
    return getExerciseDetailsForCurrentPosition(
      workoutPlan,
      currentItemIndex,
      currentElementIndex,
      circuitRepetition,
      completedSets,
      totalSets
    );
  }, [
    workoutPlan, 
    currentItemIndex, 
    currentElementIndex, 
    circuitRepetition, 
    isWorkoutComplete,
    getExerciseDetailsForCurrentPosition,
    completedSets,
    totalSets
  ]);
  
  // Start or pause the workout
  const toggleWorkout = useCallback(() => {
    // Handle case where workout is complete
    if (isWorkoutComplete) {
      // Attempt to restart the workout
      setIsWorkoutComplete(false);
      setHasBeenStarted(false);
      setCurrentItemIndex(0);
      setCircuitRepetition(1);
      setCurrentElementIndex(0);
      setCompletedSets(0);
      workoutStartTime.current = null;
      workoutTotalTimeMs.current = 0;
      lastPauseTime.current = null;
      setTotalReps(0);
      setIsActive(true);
      setHasBeenStarted(true);
      return true;
    }
    
    if (isActive) {
      // Pause the workout
      setIsActive(false);
      
      // Record pause time for timing calculations
      if (workoutStartTime.current !== null) {
        lastPauseTime.current = new Date();
      }
    } else {
      // Start or resume the workout
      setIsActive(true);
      
      // If this is the first start, record the start time and mark as started
      if (workoutStartTime.current === null) {
        workoutStartTime.current = new Date();
        setHasBeenStarted(true);
      } 
      // If we're resuming, adjust the total time
      else if (lastPauseTime.current !== null) {
        const pauseDuration = new Date() - lastPauseTime.current;
        lastPauseTime.current = null;
      }
    }
    
    return !isActive; // Return the new state
  }, [isActive, isWorkoutComplete]);
  
  // Advance to the next set in the workout
  const advanceToNextSet = useCallback((completedReps) => {
    if (!isActive || isWorkoutComplete) {
      console.warn('[useCircuitSessionLogic] Cannot advance: workout not active or already complete');
      return { success: false };
    }
    
    if (!workoutPlan || workoutPlan.length === 0) {
      console.warn('[useCircuitSessionLogic] Cannot advance: no workout plan');
      return { success: false };
    }
    
    // Update total reps with the actual completed reps
    if (typeof completedReps === 'number') {
      setTotalReps(prev => prev + completedReps);
    }
    
    // Now determine the next position in the workout
    const currentItem = workoutPlan[currentItemIndex];
    
    // Increase completed sets counter
    setCompletedSets(prev => prev + 1);
    
    let nextItemIndex = currentItemIndex;
    let nextElementIndex = currentElementIndex;
    let nextRepetition = circuitRepetition;
    
    if (currentItem.type === 'set') {
      // Simple case: move to the next item
      nextItemIndex = currentItemIndex + 1;
      
      // If we've reached the end of the workout
      if (nextItemIndex >= workoutPlan.length) {
        console.log('[useCircuitSessionLogic] Workout complete!');
        setIsWorkoutComplete(true);
        setIsActive(false);
        return { success: false, isComplete: true };
      }
      
      // Check if the next item is a circuit
      const nextItem = workoutPlan[nextItemIndex];
      if (nextItem.type === 'circuit') {
        // Moving into a circuit, set up circuit state
        nextElementIndex = 0;
        nextRepetition = 1;
      }
      
      // Update state
      setCurrentItemIndex(nextItemIndex);
      setCurrentElementIndex(nextElementIndex);
      setCircuitRepetition(nextRepetition);
      
      // Calculate and return the new exercise details immediately
      const newDetails = getExerciseDetailsForCurrentPosition(
        workoutPlan,
        nextItemIndex,
        nextElementIndex,
        nextRepetition,
        completedSets + 1, // Use the new completed sets count
        totalSets
      );
      
      return { success: true, newExerciseDetails: newDetails };
    }
    
    if (currentItem.type === 'circuit') {
      // Handle circuit: need to manage elements and repetitions
      const totalElements = currentItem.elements.length;
      const totalRepetitions = currentItem.repetitions || 1;
      
      // Calculate the next position
      nextElementIndex = currentElementIndex + 1;
      nextRepetition = circuitRepetition;
      
      // If we've reached the end of the elements for this repetition
      if (nextElementIndex >= totalElements) {
        nextElementIndex = 0;  // Reset to the first element
        nextRepetition++;      // Increment the repetition
      }
      
      // If we've completed all repetitions of the circuit
      if (nextRepetition > totalRepetitions) {
        // Move to the next item in the workout
        nextItemIndex = currentItemIndex + 1;
        
        // If we've reached the end of the workout
        if (nextItemIndex >= workoutPlan.length) {
          console.log('[useCircuitSessionLogic] Workout complete!');
          setIsWorkoutComplete(true);
          setIsActive(false);
          return { success: false, isComplete: true };
        }
        
        // Check if the next item is another circuit
        const nextItem = workoutPlan[nextItemIndex];
        if (nextItem.type === 'circuit') {
          // Moving to another circuit, reset circuit state but keep circuit context
          nextElementIndex = 0;
          nextRepetition = 1;
        } else {
          // Moving to a regular set, clear circuit state
          nextElementIndex = 0;
          nextRepetition = 1;
        }
      }
      
      // Update state
      setCurrentItemIndex(nextItemIndex);
      setCurrentElementIndex(nextElementIndex);
      setCircuitRepetition(nextRepetition);
      
      // Calculate and return the new exercise details immediately
      const newDetails = getExerciseDetailsForCurrentPosition(
        workoutPlan,
        nextItemIndex,
        nextElementIndex,
        nextRepetition,
        completedSets + 1, // Use the new completed sets count
        totalSets
      );
      
      return { success: true, newExerciseDetails: newDetails };
    }
    
    // If we get here, something went wrong
    console.warn('[useCircuitSessionLogic] Unknown item type or structure:', currentItem);
    return { success: false };
  }, [
    isActive, 
    isWorkoutComplete, 
    workoutPlan, 
    currentItemIndex, 
    currentElementIndex, 
    circuitRepetition,
    completedSets,
    totalSets,
    getExerciseDetailsForCurrentPosition
  ]);
  
  // Calculate workout duration in seconds
  const calculateWorkoutDuration = useCallback(() => {
    if (!workoutStartTime.current) {
      return 0;
    }
    
    // If workout is active, calculate from start time to now
    if (isActive) {
      return Math.floor((new Date() - workoutStartTime.current) / 1000);
    }
    
    // If workout is paused, calculate from start to last pause
    if (lastPauseTime.current) {
      return Math.floor((lastPauseTime.current - workoutStartTime.current) / 1000);
    }
    
    // Otherwise, workout is complete or not started
    return workoutTotalTimeMs.current > 0 
      ? Math.floor(workoutTotalTimeMs.current / 1000) 
      : 0;
  }, [isActive]);
  
  // Get summary stats for the workout
  const getCurrentWorkoutStats = useCallback(() => {
    return {
      totalReps,
      completedSets,
      totalSets,
      totalTimeSeconds: calculateWorkoutDuration(),
      isComplete: isWorkoutComplete
    };
  }, [totalReps, completedSets, totalSets, calculateWorkoutDuration, isWorkoutComplete]);
  
  // Update the total time when the workout completes or is paused
  useEffect(() => {
    if (!isActive && workoutStartTime.current && lastPauseTime.current) {
      workoutTotalTimeMs.current = lastPauseTime.current - workoutStartTime.current;
    }
  }, [isActive]);
  
  return {
    initializeWorkout,
    getCurrentExerciseDetails,
    advanceToNextSet,
    toggleWorkout,
    isActive,
    isWorkoutComplete,
    hasBeenStarted,
    completedSets,
    totalSets,
    resetWorkout,
    getCurrentWorkoutStats
  };
};

export default useCircuitSessionLogic; 