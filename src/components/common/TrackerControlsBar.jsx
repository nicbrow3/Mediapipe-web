import React from 'react';
import { Group, Stack } from '@mantine/core'; // Using Group for horizontal layout, Stack for overall vertical
import ExerciseSelector from '../ExerciseSelector'; // Assuming path
import StatsDisplay from '../StatsDisplay';     // Assuming path
// import StyledButton from './StyledButton'; // No longer needed for smoothing toggle
import { globalStyles } from '../../styles/globalStyles';

const TrackerControlsBar = ({
  // Props from MinimalTracker that StatsDisplay needs
  stats,
  landmarksData,
  smoothingWindow, // Still needed for StatsDisplay
  // Props for ExerciseSelector
  exerciseOptions,
  selectedExercise,
  onExerciseChange,
  // Props for Smoothing Toggle - REMOVED
  // smoothingEnabled, // No longer needed here, but StatsDisplay still uses it
  // onToggleSmoothing,
  // Prop to control visibility (passed from MinimalTracker)
  cameraStarted,
  smoothingEnabled, // Keep for StatsDisplay
}) => {
  if (!cameraStarted) {
    return null; // Don't render if camera hasn't started
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
        gap: globalStyles.controlPaddings.sm, // Use global padding for gap
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
      
      {/* Exercise selector and controls row */}
      <Group position="center" spacing={globalStyles.controlPaddings.md}> {/* Use global padding for spacing */}
        <ExerciseSelector 
          exerciseOptions={exerciseOptions}
          selectedExercise={selectedExercise}
          onChange={onExerciseChange}
        />
        
        {/* Smoothing Toggle Button - REMOVED */}
        {/* 
        <StyledButton
          variant="toggle"
          activeToggle={smoothingEnabled}
          onClick={onToggleSmoothing}
          size="sm"
        >
          {smoothingEnabled ? 'Smoothing: ON' : 'Smoothing: OFF'}
        </StyledButton>
        */}
      </Group>
    </Stack>
  );
};

export default TrackerControlsBar; 