import React from 'react';
import { Stack } from '@mantine/core';
import RepGoalIndicator from '../RepGoalIndicator'; // Adjust path if needed
import WeightIndicator from '../WeightIndicator';   // Adjust path if needed
import { globalStyles } from '../../styles/globalStyles';

const BottomControls = ({
  repGoal,
  setRepGoal,
  selectedExercise,
  weight,
  onWeightChange, // Renamed for clarity, maps to handleWeightChange
  cameraStarted,  // To control visibility
  isLoading,
  errorMessage,
  workoutMode, // Add workoutMode prop
}) => {
  // Only show if camera has started, not loading, and no error
  if (!cameraStarted || isLoading || errorMessage) {
    return null;
  }

  return (
    <Stack
      style={{
        position: 'fixed',
        left: '50%',
        bottom: globalStyles.controlPaddings.md.split(' ')[0], // Use the first value for bottom spacing
        transform: 'translateX(-50%)',
        alignItems: 'center',
        gap: globalStyles.controlPaddings.md, // Use global style for gap
        zIndex: 400,
      }}
    >
      {workoutMode !== 'ladder' && ( // Conditionally render RepGoalIndicator
        <RepGoalIndicator repGoal={repGoal} setRepGoal={setRepGoal} />
      )}
      {selectedExercise?.hasWeight && (
        <WeightIndicator weight={weight} setWeight={onWeightChange} />
      )}
    </Stack>
  );
};

export default BottomControls; 