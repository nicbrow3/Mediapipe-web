import React, { useMemo } from 'react';
import { Stack, SegmentedControl, Box } from '@mantine/core'; // Removed Group as it might not be needed directly here now
import ExerciseSelector from '../ExerciseSelector'; // Assuming path
import StatsDisplay from '../StatsDisplay';     // Assuming path
import { globalStyles } from '../../styles/globalStyles';
import TimedSessionControls from './TimedSessionControls'; // Import the new component
import LadderSessionControls from './LadderSessionControls'; // Import the ladder session component
import StabilityStatusDisplay from './StabilityStatusDisplay'; // Import the new stability display

const TrackerControlsBar = ({
  // Props from MinimalTracker that StatsDisplay needs
  stats,
  landmarksData,
  smoothingWindow, // Still needed for StatsDisplay
  // Props for ExerciseSelector
  exerciseOptions,
  selectedExercise,
  onExerciseChange,
  // Props for SessionControls
  isSessionActive,
  currentTimerValue,
  onToggleSession,
  // Prop to control visibility (passed from MinimalTracker)
  cameraStarted,
  smoothingEnabled, // Keep for StatsDisplay
  // New props for workout mode
  workoutMode,
  onWorkoutModeChange,
  currentExercise,
  upcomingExercise,
  sessionPhase,
  // New props for session configuration
  totalSets,
  currentSetNumber,
  onSessionSettingsChange,
  sessionSettings,
  // Ladder session props
  currentReps,
  onCompleteSet,
  onLadderSettingsChange,
  ladderSettings,
  direction, // New prop for ladder direction
  // New props for ladder exercise selection
  selectedLadderExercise,
  onLadderExerciseChange,
  // New props for stability display
  enableStationaryTracking,
  stabilityState,
  // Completion modal props
  isCompletionModalOpen,
  onCompletionModalClose,
  sessionStats,
}) => {
  if (!cameraStarted) {
    return null; // Don't render if camera hasn't started
  }

  // Memoize the workout mode options to prevent recreation on each render
  const workoutModeOptions = useMemo(() => [
    { label: 'Manual', value: 'manual' },
    { label: 'Timed', value: 'session' },
    { label: 'Ladder', value: 'ladder' },
  ], []);

  // Memoize mode-specific controls to prevent unnecessary re-renders
  const modeSpecificControls = useMemo(() => {
    if (workoutMode === 'manual') {
      return (
        <Box style={{ width: '100%', maxWidth: '400px' }}>
          <ExerciseSelector 
            exerciseOptions={exerciseOptions}
            selectedExercise={selectedExercise}
            onChange={onExerciseChange}
          />
        </Box>
      );
    } else if (workoutMode === 'session') {
      return (
        <TimedSessionControls 
          isSessionActive={isSessionActive}
          currentTimerValue={currentTimerValue}
          onToggleSession={onToggleSession}
          currentExercise={currentExercise}
          upcomingExercise={upcomingExercise}
          sessionPhase={sessionPhase}
          exerciseSetDuration={sessionSettings?.exerciseSetDuration}
          restPeriodDuration={sessionSettings?.restPeriodDuration}
          totalSets={totalSets}
          currentSetNumber={currentSetNumber}
          onSettingsChange={onSessionSettingsChange}
          exerciseOptions={exerciseOptions}
          selectedExercise={selectedExercise}
          onExerciseChange={onExerciseChange}
          useRandomExercises={sessionSettings?.useRandomExercises !== undefined ? sessionSettings.useRandomExercises : true}
        />
      );
    } else if (workoutMode === 'ladder') {
      return (
        <LadderSessionControls
          isSessionActive={isSessionActive}
          currentTimerValue={currentTimerValue}
          onToggleSession={onToggleSession}
          onCompleteSet={onCompleteSet}
          currentExercise={currentExercise}
          currentReps={currentReps}
          sessionPhase={sessionPhase}
          totalSets={totalSets}
          currentSetNumber={currentSetNumber}
          onSettingsChange={onLadderSettingsChange}
          ladderSettings={ladderSettings}
          direction={direction}
          exerciseOptions={exerciseOptions}
          selectedExercise={selectedLadderExercise}
          onExerciseChange={onLadderExerciseChange}
          isCompletionModalOpen={isCompletionModalOpen}
          onCompletionModalClose={onCompletionModalClose}
          sessionStats={sessionStats}
        />
      );
    }
    return null;
  }, [
    workoutMode,
    // Manual mode dependencies
    exerciseOptions, 
    selectedExercise, 
    onExerciseChange,
    // Session mode dependencies
    isSessionActive,
    currentTimerValue,
    onToggleSession,
    currentExercise,
    upcomingExercise,
    sessionPhase,
    sessionSettings,
    totalSets,
    currentSetNumber,
    onSessionSettingsChange,
    // Ladder mode dependencies
    onCompleteSet,
    currentReps,
    onLadderSettingsChange,
    ladderSettings,
    direction,
    selectedLadderExercise,
    onLadderExerciseChange,
    // Completion modal dependencies
    isCompletionModalOpen,
    onCompletionModalClose,
    sessionStats
  ]);

  // Use consistent styling objects to prevent recreation on each render
  const stackStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: `${globalStyles.controlPaddings.md} 0`,
    gap: globalStyles.controlPaddings.md,
    zIndex: 200,
  }), []);

  const segmentedControlStyle = useMemo(() => ({
    maxWidth: '35%', 
    width: '100%'
  }), []);

  const boxStyle = useMemo(() => ({ 
    minHeight: '50px', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px'
  }), []);

  return (
    <Stack style={stackStyle}>
      {/* Stats display at top */}
      <StatsDisplay 
        stats={stats} 
        cameraStarted={cameraStarted}
        landmarksData={landmarksData} 
        smoothingEnabled={smoothingEnabled}
        smoothingWindow={smoothingWindow}
      />

      {/* Stability Status Display */}
      <StabilityStatusDisplay 
        enableStationaryTracking={enableStationaryTracking} 
        stabilityState={stabilityState} 
      />
      
      {/* Workout Mode Toggle */}
      <SegmentedControl
        value={workoutMode}
        onChange={onWorkoutModeChange}
        data={workoutModeOptions}
        color="blue"
        disabled={isSessionActive}
        style={segmentedControlStyle}
      />

      {/* Conditional Controls based on workoutMode */}
      <Box style={boxStyle}>
        {modeSpecificControls}
      </Box>
    </Stack>
  );
};

export default React.memo(TrackerControlsBar); 