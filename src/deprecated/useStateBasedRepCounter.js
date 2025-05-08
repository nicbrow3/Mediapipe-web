import { useRef, useCallback } from 'react';

/**
 * Hook to count repetitions based on exercise phase state transitions
 * instead of directly tracking angles
 * 
 * @param {Object} options - Options for the rep counter
 * @param {number} options.debounceDuration - Minimum time in ms to hold at peak
 * @returns {Object} Functions and state for rep counting
 */
const useStateBasedRepCounter = ({ debounceDuration = 500 }) => {
  // Store the rep counting state for each side
  const repStateRef = useRef({
    left: {
      currentPhase: 'relaxed',
      lastPhaseChange: 0,
      repCount: 0,
      completedSequence: false,
      heldPeakLongEnough: false,
    },
    right: {
      currentPhase: 'relaxed',
      lastPhaseChange: 0,
      repCount: 0,
      completedSequence: false,
      heldPeakLongEnough: false,
    }
  });

  // Define the valid sequence of states for a rep
  const validSequence = ['relaxed', 'concentric', 'peak', 'eccentric', 'relaxed'];
  
  /**
   * Process phase changes and count reps
   * @param {string} side - 'left' or 'right' side
   * @param {string} newPhase - The new phase from state engine
   * @returns {Object} Updated rep state
   */
  const processPhase = useCallback((side, newPhase) => {
    const now = Date.now();
    const state = repStateRef.current[side];
    const currentPhase = state.currentPhase;
    
    // Return early if phase hasn't changed
    if (newPhase === currentPhase) {
      // Special case: if in peak phase, check if we've held it long enough
      if (newPhase === 'peak' && !state.heldPeakLongEnough) {
        const timeInPeak = now - state.lastPhaseChange;
        if (timeInPeak >= debounceDuration) {
          repStateRef.current[side] = {
            ...state,
            heldPeakLongEnough: true
          };
        }
      }
      return repStateRef.current[side];
    }
    
    // Phase has changed, get current phase index in the sequence
    const currentIndex = validSequence.indexOf(currentPhase);
    const newIndex = validSequence.indexOf(newPhase);
    
    // Initialize new state with phase change info
    let newState = {
      ...state,
      currentPhase: newPhase,
      lastPhaseChange: now,
    };
    
    // If moving to peak phase, reset the peak hold flag
    if (newPhase === 'peak') {
      newState.heldPeakLongEnough = false;
    }
    
    // Check if we're moving in the correct sequence
    if (newIndex === currentIndex + 1) {
      // Moving forward in the sequence
      newState.completedSequence = newIndex === validSequence.length - 1;
    } else if (currentPhase === 'peak' && newPhase === 'eccentric' && state.heldPeakLongEnough) {
      // Valid transition from peak to eccentric after holding long enough
      newState.completedSequence = false;
    } else if (newPhase === 'relaxed' && currentPhase === 'eccentric') {
      // Completed the sequence, increment rep count
      newState.repCount = state.repCount + 1;
      newState.completedSequence = true;
    } else {
      // Invalid sequence, reset sequence tracking
      newState.completedSequence = false;
    }
    
    // Update the state ref
    repStateRef.current[side] = newState;
    return newState;
  }, [debounceDuration]);
  
  /**
   * Reset the rep counters
   */
  const resetRepCounts = useCallback(() => {
    repStateRef.current = {
      left: {
        currentPhase: 'relaxed',
        lastPhaseChange: 0,
        repCount: 0,
        completedSequence: false,
        heldPeakLongEnough: false,
      },
      right: {
        currentPhase: 'relaxed',
        lastPhaseChange: 0,
        repCount: 0,
        completedSequence: false,
        heldPeakLongEnough: false,
      }
    };
  }, []);
  
  /**
   * Get the current rep counts
   */
  const getRepCounts = useCallback(() => {
    return {
      left: repStateRef.current.left.repCount,
      right: repStateRef.current.right.repCount
    };
  }, []);

  return {
    processPhase,
    resetRepCounts,
    getRepCounts,
    repStateRef
  };
};

export default useStateBasedRepCounter; 