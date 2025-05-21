import { useState, useCallback, useMemo } from 'react';
import * as exercises from '../exercises';

/**
 * Custom hook to manage the state and logic for structured workouts
 * 
 * This hook tracks the current position in a workout plan, calculates
 * the next exercise, manages circuit repetitions, and provides functions
 * to advance through the workout.
 */
const useStructuredWorkoutLogic = () => {
  // State for the current workout
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [isActive, setIsActive] = useState(false);
  
  // State for tracking progress
  const [flattenedPlan, setFlattenedPlan] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State to track circuit repetitions
  const [circuitRepetitions, setCircuitRepetitions] = useState({});
  
  /**
   * Initialize a new workout with the given plan
   */
  const initializeWorkout = useCallback((plan) => {
    if (!plan || plan.length === 0) {
      console.warn('Cannot initialize workout with empty plan');
      return false;
    }
    
    setWorkoutPlan(plan);
    
    // Create flattened version of the plan for easy iteration
    const flattened = [];
    const circuitReps = {};
    
    plan.forEach(item => {
      if (item.type === 'set') {
        flattened.push({ ...item, parentCircuit: null });
      } else if (item.type === 'circuit') {
        circuitReps[item.id] = { current: 1, total: item.repetitions };
        
        // Add all elements from the circuit
        item.elements.forEach(set => {
          flattened.push({
            ...set,
            parentCircuit: {
              id: item.id,
              name: item.name,
              repetition: 1,
              totalRepetitions: item.repetitions,
              setNumber: flattened.filter(s => s.parentCircuit?.id === item.id).length + 1,
              totalSets: item.elements.length
            }
          });
        });
      }
    });
    
    setFlattenedPlan(flattened);
    setCircuitRepetitions(circuitReps);
    setCurrentIndex(0);
    
    return true;
  }, []);
  
  /**
   * Get details about the current exercise in the workout
   */
  const getCurrentExerciseDetails = useCallback(() => {
    if (!flattenedPlan || flattenedPlan.length === 0 || currentIndex >= flattenedPlan.length) {
      return null;
    }
    
    const currentSet = flattenedPlan[currentIndex];
    const currentExercise = exercises[currentSet.exerciseId] || 
      Object.values(exercises).find(e => e.id === currentSet.exerciseId);
    
    const nextIndex = currentIndex + 1 < flattenedPlan.length ? currentIndex + 1 : null;
    const nextSet = nextIndex !== null ? flattenedPlan[nextIndex] : null;
    const nextExercise = nextSet ? (exercises[nextSet.exerciseId] || 
      Object.values(exercises).find(e => e.id === nextSet.exerciseId)) : null;
    
    return {
      exerciseId: currentSet.exerciseId,
      exerciseName: currentExercise?.name || 'Unknown Exercise',
      targetReps: currentSet.reps,
      weight: currentSet.weight,
      inCircuit: !!currentSet.parentCircuit,
      circuitName: currentSet.parentCircuit?.name,
      circuitSetNumber: currentSet.parentCircuit?.setNumber,
      circuitTotalSets: currentSet.parentCircuit?.totalSets,
      circuitRepetition: currentSet.parentCircuit?.repetition,
      circuitTotalRepetitions: currentSet.parentCircuit?.totalRepetitions,
      overallSetNumber: currentIndex + 1,
      overallTotalSets: flattenedPlan.length,
      nextExerciseName: nextExercise?.name
    };
  }, [flattenedPlan, currentIndex]);
  
  /**
   * Advance to the next exercise in the workout
   */
  const advanceToNextSet = useCallback(() => {
    if (!flattenedPlan || currentIndex >= flattenedPlan.length - 1) {
      // Workout is complete
      setIsActive(false);
      return false;
    }
    
    const nextIndex = currentIndex + 1;
    const nextSet = flattenedPlan[nextIndex];
    
    // Check if we're transitioning between circuits
    const currentSet = flattenedPlan[currentIndex];
    const currentCircuitId = currentSet.parentCircuit?.id;
    const nextCircuitId = nextSet.parentCircuit?.id;
    
    // Handle circuit repetitions
    if (currentCircuitId && (!nextCircuitId || currentCircuitId !== nextCircuitId)) {
      // We've reached the end of a circuit
      const currentRep = circuitRepetitions[currentCircuitId].current;
      const totalReps = circuitRepetitions[currentCircuitId].total;
      
      if (currentRep < totalReps) {
        // We need to repeat the circuit
        const updatedReps = {
          ...circuitRepetitions,
          [currentCircuitId]: { 
            current: currentRep + 1, 
            total: totalReps 
          }
        };
        setCircuitRepetitions(updatedReps);
        
        // Find the index of the first set in this circuit
        const firstCircuitSetIndex = flattenedPlan.findIndex(
          set => set.parentCircuit?.id === currentCircuitId
        );
        
        if (firstCircuitSetIndex >= 0) {
          // Create updated flattened plan with incremented repetition numbers
          const updatedPlan = [...flattenedPlan];
          
          // Update repetition count for all sets in the circuit
          for (let i = firstCircuitSetIndex; i <= currentIndex; i++) {
            if (updatedPlan[i].parentCircuit?.id === currentCircuitId) {
              updatedPlan[i] = {
                ...updatedPlan[i],
                parentCircuit: {
                  ...updatedPlan[i].parentCircuit,
                  repetition: currentRep + 1
                }
              };
            }
          }
          
          setFlattenedPlan(updatedPlan);
          setCurrentIndex(firstCircuitSetIndex);
          return true;
        }
      }
    }
    
    // Normal case - advance to next set
    setCurrentIndex(nextIndex);
    return true;
  }, [flattenedPlan, currentIndex, circuitRepetitions]);
  
  /**
   * Toggle the active state of the workout
   */
  const toggleWorkout = useCallback(() => {
    setIsActive(prev => !prev);
    return !isActive;
  }, [isActive]);
  
  /**
   * Check if the workout is complete
   */
  const isWorkoutComplete = useMemo(() => {
    if (!flattenedPlan || flattenedPlan.length === 0) {
      return false;
    }
    
    return currentIndex >= flattenedPlan.length;
  }, [flattenedPlan, currentIndex]);
  
  /**
   * Reset the workout to the beginning
   */
  const resetWorkout = useCallback(() => {
    setCurrentIndex(0);
    setIsActive(false);
    
    // Reset circuit repetitions
    const resetReps = {};
    Object.keys(circuitRepetitions).forEach(id => {
      resetReps[id] = { current: 1, total: circuitRepetitions[id].total };
    });
    setCircuitRepetitions(resetReps);
    
    // Reset repetition counters in flattened plan
    const resetPlan = flattenedPlan.map(set => {
      if (set.parentCircuit) {
        return {
          ...set,
          parentCircuit: {
            ...set.parentCircuit,
            repetition: 1
          }
        };
      }
      return set;
    });
    setFlattenedPlan(resetPlan);
  }, [circuitRepetitions, flattenedPlan]);
  
  return {
    initializeWorkout,
    getCurrentExerciseDetails,
    advanceToNextSet,
    toggleWorkout,
    isActive,
    isWorkoutComplete,
    resetWorkout
  };
};

export default useStructuredWorkoutLogic; 