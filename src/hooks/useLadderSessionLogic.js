import { useState, useCallback, useEffect, useRef } from 'react';
import { useRepCounter } from '../components/RepCounterContext';

const LADDER_SETTINGS_STORAGE_KEY = 'ladderSessionSettings';

/**
 * useLadderSessionLogic Hook
 * 
 * Manages the core logic for ladder workout sessions:
 * - Controls session state (active/inactive)
 * - Handles progression through a ladder (incrementing/decrementing reps)
 * - Maintains countdown timer for rest periods based on reps
 * - Tracks current exercise and rep count
 * - Automatically cycles through the ladder sequence
 * - Provides configuration options for ladder parameters
 * 
 * @param {Function} selectRandomExercise - Function to select a random exercise (fallback)
 * @param {Object} hookInitialSettings - Initial ladder settings passed to the hook (optional)
 * @returns {Object} Ladder session state and control functions
 */
export const useLadderSessionLogic = (
  selectRandomExercise,
  hookInitialSettings // Renamed to avoid conflict with internal defaultInitialSettings
) => {
  // Define default settings, including autoAdvance: true
  const defaultInitialSettings = {
    startReps: 1,
    topReps: 10,
    endReps: 1,
    incrementReps: 1,
    restTimePerRep: 3,
    autoAdvance: true, // Default to true
  };

  // Function to load settings from localStorage or use defaults
  const loadSettings = () => {
    try {
      const storedSettings = localStorage.getItem(LADDER_SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Merge with defaults to ensure all keys are present if localStorage had partial/old data
        return { ...defaultInitialSettings, ...parsedSettings };
      }
    } catch (error) {
      console.error("Failed to load ladder settings from localStorage", error);
    }
    // If hookInitialSettings are provided, they take precedence over defaultInitialSettings
    // Otherwise, just use defaultInitialSettings
    return hookInitialSettings ? { ...defaultInitialSettings, ...hookInitialSettings } : defaultInitialSettings;
  };

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState('idle'); // 'idle', 'exercising', 'resting', 'completed'
  const [currentTimerValue, setCurrentTimerValue] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null); // Store the selected exercise
  const [currentReps, setCurrentReps] = useState(loadSettings().startReps);
  const [direction, setDirection] = useState('up'); // 'up' or 'down'
  const [ladderSettings, setLadderSettings] = useState(loadSettings);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  
  // Session stats
  const [sessionStats, setSessionStats] = useState({
    exercise: '',
    totalReps: 0,
    totalSets: 0,
    peakReps: 0,
    totalTime: 0,
  });
  
  // Reference to track total workout time
  const sessionStartTimeRef = useRef(null);
  const totalRepsPerformedRef = useRef(0);
  
  // Get rep count data from context
  const { repCount, resetRepCounts } = useRepCounter();

  // Calculate where we are in the ladder sequence (for progress display)
  const calculateTotalSets = useCallback(() => {
    const { startReps, topReps, endReps, incrementReps } = ladderSettings;
    
    // Calculate steps going up
    const stepsUp = Math.ceil((topReps - startReps) / incrementReps) + 1; // +1 to include the top
    
    // Calculate steps going down
    const stepsDown = Math.ceil((topReps - endReps) / incrementReps);
    
    return stepsUp + stepsDown;
  }, [ladderSettings]);

  const [totalSets, setTotalSets] = useState(calculateTotalSets());
  const [currentSetNumber, setCurrentSetNumber] = useState(0);

  // Recalculate total sets when settings change
  useEffect(() => {
    setTotalSets(calculateTotalSets());
  }, [ladderSettings, calculateTotalSets]);

  // Effect to update currentReps if startReps changes in settings when session is not active
  useEffect(() => {
    if (!isSessionActive) {
      setCurrentReps(ladderSettings.startReps);
    }
  }, [ladderSettings.startReps, isSessionActive]);

  /**
   * Updates ladder session configuration settings
   * Only allowed when session is not active
   */
  const updateLadderSettings = useCallback((newSettings) => {
    if (!isSessionActive) {
      setLadderSettings(prevSettings => {
        const updatedSettings = {
          ...prevSettings,
          ...newSettings
        };
        try {
          localStorage.setItem(LADDER_SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
        } catch (error) {
          console.error("Failed to save ladder settings to localStorage", error);
        }
        return updatedSettings;
      });
    }
  }, [isSessionActive]);

  /**
   * Sets the selected exercise for the ladder session
   * Only allowed when session is not active
   */
  const selectExerciseForLadder = useCallback((exercise) => {
    if (!isSessionActive) {
      setSelectedExercise(exercise);
    }
  }, [isSessionActive]);

  /**
   * Calculate the next rep count in the ladder sequence
   */
  const calculateNextReps = useCallback(() => {
    const { startReps, topReps, endReps, incrementReps } = ladderSettings;
    
    if (direction === 'up') {
      const nextReps = currentReps + incrementReps;
      
      // If we've reached or exceeded the top, start going down
      if (nextReps >= topReps) {
        // Only set the direction to down when we're actually at the top
        // Don't change it when calculating, we'll do that after setting currentReps
        return topReps;
      }
      
      return nextReps;
    } else { // direction === 'down'
      const nextReps = currentReps - incrementReps;
      
      // If we've reached or gone below the end, we're done
      if (nextReps <= endReps) {
        return endReps;
      }
      
      return nextReps;
    }
  }, [currentReps, direction, ladderSettings]);

  /**
   * Check if the ladder session is complete
   */
  const isLadderComplete = useCallback(() => {
    return direction === 'down' && currentReps <= ladderSettings.endReps;
  }, [direction, currentReps, ladderSettings.endReps]);

  /**
   * Calculate rest time based on current reps
   */
  const calculateRestTime = useCallback(() => {
    return currentReps * ladderSettings.restTimePerRep;
  }, [currentReps, ladderSettings.restTimePerRep]);

  // Track total reps completed when a set is completed
  useEffect(() => {
    if (sessionPhase === 'resting') {
      // Add the completed reps to the total
      const isTwoSided = currentExercise?.isTwoSided;
      const repsToAdd = isTwoSided 
        ? Math.max(repCount.left, repCount.right) // Use the higher of the two sides
        : repCount.left;
        
      totalRepsPerformedRef.current += repsToAdd;
    }
  }, [sessionPhase, currentExercise, repCount]);

  /**
   * Handle closing the completion modal and ending the session
   */
  const handleCompletionModalClose = useCallback(() => {
    setIsCompletionModalOpen(false);
    // Now actually end the session
    setIsSessionActive(false);
    setSessionPhase('idle');
    setCurrentExercise(null);
    setCurrentSetNumber(0);
    setCurrentReps(ladderSettings.startReps);
    setDirection('up');
    // Reset the session stats
    sessionStartTimeRef.current = null;
    totalRepsPerformedRef.current = 0;
  }, [ladderSettings.startReps]);

  /**
   * Toggles the session between active and inactive states
   * Initializes session when starting
   */
  const handleToggleSession = useCallback(() => {
    setIsSessionActive(prevIsActive => {
      const newIsActive = !prevIsActive;
      if (newIsActive) {
        // Use the selected exercise or fall back to random if none is selected
        const exercise = selectedExercise || selectRandomExercise();
        console.log('[useLadderSessionLogic] Starting ladder with exercise:', exercise?.name);
        setCurrentExercise(exercise);
        setDirection('up');
        // Ensure currentReps is set to the startReps from potentially updated ladderSettings
        setCurrentReps(ladderSettings.startReps); 
        setSessionPhase('exercising');
        setCurrentTimerValue(0); // No timer for exercise phase
        setCurrentSetNumber(1); // Start with the first set
        // Start tracking workout time
        sessionStartTimeRef.current = Date.now();
        totalRepsPerformedRef.current = 0;
        // Don't call resetRepCounts here - moved outside
      } else {
        // Only end the session if not already in completed phase
        if (sessionPhase !== 'completed') {
          setSessionPhase('idle');
          setCurrentTimerValue(0);
          setCurrentExercise(null);
          setCurrentSetNumber(0);
          // Reset currentReps to startReps from settings when session stops
          setCurrentReps(ladderSettings.startReps);
          setDirection('up');
          // Reset session stats tracking
          sessionStartTimeRef.current = null;
          totalRepsPerformedRef.current = 0;
        }
      }
      return newIsActive;
    });
    
    // Call resetRepCounts in the next render cycle
    if (!isSessionActive) {
      // Only reset when activating the session
      setTimeout(() => resetRepCounts(), 0);
    }
  }, [selectRandomExercise, ladderSettings.startReps, selectedExercise, resetRepCounts, isSessionActive, sessionPhase]);

  // Function to move to next step in the ladder
  const moveToNextStep = useCallback(() => {
    if (isLadderComplete()) {
      // Complete the session but don't end it immediately
      console.log('[useLadderSessionLogic] Ladder completed. Showing completion screen.');
      
      // Calculate total session time in seconds
      const totalTimeSeconds = Math.floor((Date.now() - (sessionStartTimeRef.current || Date.now())) / 1000);
      
      // Update session stats
      setSessionStats({
        exercise: currentExercise?.name || 'Unknown Exercise',
        totalReps: totalRepsPerformedRef.current,
        totalSets: currentSetNumber,
        peakReps: ladderSettings.topReps,
        totalTime: totalTimeSeconds
      });
      
      // Show completion phase
      setSessionPhase('completed');
      setIsCompletionModalOpen(true);
      return;
    }
    
    // Move to next rep count and increment set counter
    const nextReps = calculateNextReps();
    setCurrentReps(nextReps);
    
    // Check if we need to change direction
    // Only change to down if we're at the top rep count
    if (direction === 'up' && nextReps >= ladderSettings.topReps) {
      setDirection('down');
    }
    
    setSessionPhase('exercising');
    setCurrentTimerValue(0); // No timer for exercise phase
    setCurrentSetNumber(prev => prev + 1);
    
    // Use setTimeout to avoid state updates during render
    setTimeout(() => resetRepCounts(), 0);
  }, [isLadderComplete, calculateNextReps, ladderSettings, direction, resetRepCounts, currentExercise, currentSetNumber]);

  // Handler for completing a set of reps
  const completeCurrentSet = useCallback(() => {
    if (!isSessionActive || sessionPhase !== 'exercising') return;
    
    // Check if this is the final set in the ladder
    if (direction === 'down' && currentReps <= ladderSettings.endReps) {
      // This is the last set, so skip rest and complete the ladder
      console.log(`[useLadderSessionLogic] Completed final set with ${currentReps} reps. Completing ladder.`);
      
      // Calculate total session time in seconds
      const totalTimeSeconds = Math.floor((Date.now() - (sessionStartTimeRef.current || Date.now())) / 1000);
      
      // Add the completed reps to the total before ending
      const isTwoSided = currentExercise?.isTwoSided;
      const repsToAdd = isTwoSided 
        ? Math.max(repCount.left, repCount.right) // Use the higher of the two sides
        : repCount.left;
        
      totalRepsPerformedRef.current += repsToAdd;
      
      // Update session stats
      setSessionStats({
        exercise: currentExercise?.name || 'Unknown Exercise',
        totalReps: totalRepsPerformedRef.current,
        totalSets: currentSetNumber,
        peakReps: ladderSettings.topReps,
        totalTime: totalTimeSeconds
      });
      
      // Show completion phase
      setSessionPhase('completed');
      setIsCompletionModalOpen(true);
      return;
    }
    
    // Otherwise, proceed to rest phase as normal
    setSessionPhase('resting');
    const restTime = calculateRestTime();
    setCurrentTimerValue(restTime);
    
    console.log(`[useLadderSessionLogic] Completed ${currentReps} reps. Resting for ${restTime}s.`);
  }, [isSessionActive, sessionPhase, currentReps, direction, ladderSettings.endReps, currentExercise, calculateRestTime, currentSetNumber, repCount]);

  // Check if rep count has been reached for auto-advancing
  useEffect(() => {
    if (isSessionActive && 
        sessionPhase === 'exercising' && 
        ladderSettings.autoAdvance && 
        currentExercise) {
      
      const isTwoSided = currentExercise.isTwoSided;
      const leftReached = repCount.left >= currentReps;
      const rightReached = repCount.right >= currentReps;
      
      // For two-sided exercises, both sides must reach the goal
      // For single-sided exercises, only check the left side
      if ((isTwoSided && leftReached && rightReached) || 
          (!isTwoSided && leftReached)) {
        
        console.log(`[useLadderSessionLogic] Auto-advancing: Rep goal of ${currentReps} reached.`);
        completeCurrentSet();
      }
    }
  }, [
    isSessionActive,
    sessionPhase,
    ladderSettings.autoAdvance,
    currentExercise,
    repCount.left,
    repCount.right,
    currentReps,
    completeCurrentSet
  ]);

  // Timer countdown effect
  useEffect(() => {
    let timerInterval;

    if (isSessionActive && sessionPhase === 'resting' && currentTimerValue > 0) {
      timerInterval = setInterval(() => {
        setCurrentTimerValue(prevTime => {
          const newTime = prevTime - 1;
          if (newTime < 0) {
            clearInterval(timerInterval);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isSessionActive, sessionPhase, currentTimerValue]);

  // Phase transition effect - handles rest completion and moving to next ladder step
  useEffect(() => {
    if (isSessionActive && sessionPhase === 'resting' && currentTimerValue === 0) {
      moveToNextStep();
    }
    // Ensure that if ladderSettings changes (e.g. startReps) while idle, currentReps is updated.
    // This was handled by the specific useEffect for ladderSettings.startReps already.
  }, [isSessionActive, sessionPhase, currentTimerValue, moveToNextStep]);

  return {
    isSessionActive,
    sessionPhase,
    currentTimerValue,
    handleToggleSession,
    completeCurrentSet,
    currentExercise,
    currentReps,
    totalSets,
    currentSetNumber,
    updateLadderSettings,
    ladderSettings,
    direction,
    selectedExercise,
    selectExerciseForLadder,
    calculateNextReps, // Expose calculateNextReps for UI display purposes
    isCompletionModalOpen,
    handleCompletionModalClose,
    sessionStats,
  };
}; 