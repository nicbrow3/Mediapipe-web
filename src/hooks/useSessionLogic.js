import { useState, useCallback, useEffect } from 'react';

// This custom hook manages the logic for a session-based exercise timer.
// It handles the session state (active/inactive), phases (exercising/resting),
// and the countdown timer for both exercise sets and rest periods.
// The hook provides a function to toggle the session and exposes relevant state values.

export const useSessionLogic = (selectRandomExercise, initialExerciseSetDuration = 30, initialRestPeriodDuration = 15) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionPhase, setSessionPhase] = useState('idle'); // 'idle', 'exercising', 'resting'
  const [currentTimerValue, setCurrentTimerValue] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(null);
  const [upcomingExercise, setUpcomingExercise] = useState(null);

  // Use the passed-in durations or default
  const EXERCISE_SET_DURATION = initialExerciseSetDuration;
  const REST_PERIOD_DURATION = initialRestPeriodDuration;

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
      } else {
        setSessionPhase('idle');
        setCurrentTimerValue(0);
        setCurrentExercise(null);
        setUpcomingExercise(null);
      }
      return newIsActive;
    });
  }, [selectRandomExercise, EXERCISE_SET_DURATION]);

  // Separate effect for timer
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

  // Separate effect for phase transitions
  useEffect(() => {
    if (isSessionActive && currentTimerValue === 0) {
      if (sessionPhase === 'exercising') {
        setSessionPhase('resting');
        setCurrentTimerValue(REST_PERIOD_DURATION);
      } else if (sessionPhase === 'resting') {
        console.log('[useSessionLogic] Moving to next exercise:', upcomingExercise?.name);
        setCurrentExercise(upcomingExercise);
        const nextExercise = selectRandomExercise();
        console.log('[useSessionLogic] Setting new upcoming exercise:', nextExercise?.name);
        setUpcomingExercise(nextExercise);
        setSessionPhase('exercising');
        setCurrentTimerValue(EXERCISE_SET_DURATION);
      }
    }
  }, [isSessionActive, currentTimerValue, sessionPhase, selectRandomExercise, upcomingExercise, REST_PERIOD_DURATION, EXERCISE_SET_DURATION]);

  return {
    isSessionActive,
    sessionPhase,
    currentTimerValue,
    handleToggleSession,
    currentExercise,
    upcomingExercise,
    EXERCISE_SET_DURATION,
    REST_PERIOD_DURATION,
  };
}; 