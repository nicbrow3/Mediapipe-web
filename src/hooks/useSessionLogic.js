import { useState, useCallback, useEffect } from 'react';

/**
 * useSessionLogic Hook
 * 
 * Manages the core logic for timed workout sessions:
 * - Controls session state (active/inactive)
 * - Handles phase transitions (exercising/resting)
 * - Maintains countdown timer for both exercise and rest periods
 * - Tracks current exercise, upcoming exercise, and set progress
 * - Automatically cycles through exercises and completes session after all sets
 * - Provides configuration options for durations and total sets
 * 
 * The hook is independent of UI, enabling separation of business logic from presentation.
 * 
 * @param {Function} selectRandomExercise - Function to select a random exercise
 * @param {Number} initialExerciseSetDuration - Default exercise duration in seconds
 * @param {Number} initialRestPeriodDuration - Default rest duration in seconds
 * @param {Number} initialTotalSets - Default number of sets to complete
 * @returns {Object} Session state and control functions
 */
export const useSessionLogic = (
  selectRandomExercise, 
  initialExerciseSetDuration = 30, 
  initialRestPeriodDuration = 15,
  initialTotalSets = 10
) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState('idle'); // 'idle', 'exercising', 'resting'
  const [currentTimerValue, setCurrentTimerValue] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [upcomingExercise, setUpcomingExercise] = useState(null);
  const [totalSets, setTotalSets] = useState(initialTotalSets);
  const [currentSetNumber, setCurrentSetNumber] = useState(0);
  const [sessionSettings, setSessionSettings] = useState({
    exerciseSetDuration: initialExerciseSetDuration,
    restPeriodDuration: initialRestPeriodDuration,
    totalSets: initialTotalSets
  });

  // Use the current session settings
  const EXERCISE_SET_DURATION = sessionSettings.exerciseSetDuration;
  const REST_PERIOD_DURATION = sessionSettings.restPeriodDuration;

  /**
   * Updates session configuration settings
   * Only allowed when session is not active
   */
  const updateSessionSettings = useCallback((newSettings) => {
    if (!isSessionActive) {
      setSessionSettings(prev => ({
        ...prev,
        ...newSettings
      }));
      
      if (newSettings.totalSets !== undefined) {
        setTotalSets(newSettings.totalSets);
      }
    }
  }, [isSessionActive]);

  /**
   * Toggles the session between active and inactive states
   * Initializes first exercise when starting a new session
   */
  const handleToggleSession = useCallback(() => {
    setIsSessionActive(prevIsActive => {
      const newIsActive = !prevIsActive;
      if (newIsActive) {
        const exercise = selectRandomExercise();
        console.log('[useSessionLogic] Setting initial exercise:', exercise?.name);
        setCurrentExercise(exercise);
        const nextExercise = selectRandomExercise();
        console.log('[useSessionLogic] Setting upcoming exercise:', nextExercise?.name);
        setUpcomingExercise(nextExercise);
        setSessionPhase('exercising');
        setCurrentTimerValue(EXERCISE_SET_DURATION);
        setCurrentSetNumber(1); // Start with the first set
      } else {
        setSessionPhase('idle');
        setCurrentTimerValue(0);
        setCurrentExercise(null);
        setUpcomingExercise(null);
        setCurrentSetNumber(0);
      }
      return newIsActive;
    });
  }, [selectRandomExercise, EXERCISE_SET_DURATION]);

  // Timer countdown effect
  useEffect(() => {
    let timerInterval;

    if (isSessionActive && currentTimerValue > 0) {
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
  }, [isSessionActive, currentTimerValue]);

  // Phase transition effect - handles exercise/rest switching and session completion
  useEffect(() => {
    if (isSessionActive && currentTimerValue === 0) {
      if (sessionPhase === 'exercising') {
        // Moving to rest phase
        setSessionPhase('resting');
        setCurrentTimerValue(REST_PERIOD_DURATION);
      } else if (sessionPhase === 'resting') {
        // Check if we've completed all sets
        if (currentSetNumber >= totalSets) {
          // End the session
          console.log('[useSessionLogic] All sets completed. Ending session.');
          setIsSessionActive(false);
          setSessionPhase('idle');
          setCurrentExercise(null);
          setUpcomingExercise(null);
          setCurrentSetNumber(0);
        } else {
          // Move to next exercise and increment set counter
          console.log('[useSessionLogic] Moving to next exercise:', upcomingExercise?.name);
          setCurrentExercise(upcomingExercise);
          const nextExercise = selectRandomExercise();
          console.log('[useSessionLogic] Setting new upcoming exercise:', nextExercise?.name);
          setUpcomingExercise(nextExercise);
          setSessionPhase('exercising');
          setCurrentTimerValue(EXERCISE_SET_DURATION);
          setCurrentSetNumber(prev => prev + 1);
        }
      }
    }
  }, [isSessionActive, currentTimerValue, sessionPhase, selectRandomExercise, upcomingExercise, 
      REST_PERIOD_DURATION, EXERCISE_SET_DURATION, currentSetNumber, totalSets]);

  return {
    isSessionActive,
    sessionPhase,
    currentTimerValue,
    handleToggleSession,
    currentExercise,
    upcomingExercise,
    totalSets,
    currentSetNumber,
    updateSessionSettings,
    sessionSettings,
  };
}; 