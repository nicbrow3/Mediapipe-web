import React from 'react';
import { Stack, SegmentedControl, Box } from '@mantine/core'; // Removed Group as it might not be needed directly here now
import ExerciseSelector from '../ExerciseSelector'; // Assuming path
import StatsDisplay from '../StatsDisplay';     // Assuming path
// import StyledButton from './StyledButton'; // No longer needed for smoothing toggle
import { globalStyles } from '../../styles/globalStyles';
import SessionControls from './SessionControls'; // Import the new component

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
}) => {
  if (!cameraStarted) {
    return null; // Don't render if camera hasn't started
  }

  let modeSpecificControls = null;
  if (workoutMode === 'manual') {
    modeSpecificControls = (
      <ExerciseSelector 
        exerciseOptions={exerciseOptions}
        selectedExercise={selectedExercise}
        onChange={onExerciseChange}
      />
    );
  } else if (workoutMode === 'session') {
    modeSpecificControls = (
      <SessionControls 
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
      />
    );
  }

  return (
    <Stack 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        padding: `${globalStyles.controlPaddings.md} 0`, // Use global padding
        gap: globalStyles.controlPaddings.md, // Increased gap slightly for the new control
        zIndex: 200,
      }}
    >
      {/* Stats display at top */}
      <StatsDisplay 
        stats={stats} 
        cameraStarted={cameraStarted} // Pass through needed props
        landmarksData={landmarksData} 
        smoothingEnabled={smoothingEnabled} // StatsDisplay still needs this
        smoothingWindow={smoothingWindow}
      />
      
      {/* Workout Mode Toggle */}
      <SegmentedControl
        value={workoutMode}
        onChange={onWorkoutModeChange} // This will pass 'manual' or 'session' string directly
        data={[
          { label: 'Manual Exercise', value: 'manual' },
          { label: 'Timed Session', value: 'session' },
        ]}
        color="blue"
        disabled={isSessionActive} // Disable mode switch if a session is active
      />

      {/* Conditional Controls based on workoutMode */}
      <Box style={{ minHeight: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {modeSpecificControls}
      </Box>
    </Stack>
  );
};

export default TrackerControlsBar; 