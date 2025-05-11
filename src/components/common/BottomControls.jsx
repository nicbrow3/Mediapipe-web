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
}) => {
  // Only show if camera has started, not loading, and no error
  if (!cameraStarted || isLoading || errorMessage) {
    console.log('BottomControls - Not rendering because camera not started, loading, or error');
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
      <RepGoalIndicator repGoal={repGoal} setRepGoal={setRepGoal} />
      {console.log('BottomControls - Rendering RepGoalIndicator and WeightIndicator')}
      {selectedExercise?.hasWeight && (
        <WeightIndicator weight={weight} setWeight={onWeightChange} />
      )}
    </Stack>
  );
};

export default BottomControls; 