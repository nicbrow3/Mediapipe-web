import React from 'react';
import { Text, Button, Group, Stack } from '@mantine/core';
import { globalStyles } from '../../styles/globalStyles'; // Assuming you might need this for styling

// Helper function to format time from seconds to MM:SS
const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const SessionControls = ({
  isSessionActive,
  currentTimerValue,
  onToggleSession, // Handler for the start/stop button
  currentExercise,
  upcomingExercise,
  sessionPhase,
  // We might add sessionPhase later if we want to display it or change button text based on it
}) => {
  return (
    <Stack spacing="xs" align="center">
      <Group style={{ alignItems: 'center', gap: globalStyles.controlPaddings.sm }}>
        {isSessionActive && (
          <Text size="lg" weight={500} style={{ minWidth: '70px', textAlign: 'center' }}>
            {formatTime(currentTimerValue)}
          </Text>
        )}
        <Button 
          onClick={onToggleSession}
          variant={globalStyles.buttonVariants.default}
          color={isSessionActive ? 'red' : 'blue'} // Example: Red for stop, Blue for start
        >
          {isSessionActive ? 'Stop Session' : 'Start Random Session'}
        </Button>
      </Group>
      
      {isSessionActive && (
        <Stack spacing="xs" align="center">
          <Text size="sm" weight={500}>
            Current: {currentExercise?.name || 'None'}
          </Text>
          {sessionPhase === 'resting' && (
            <Text size="sm" color="dimmed">
              Next: {upcomingExercise?.name || 'None'}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
};

export default SessionControls; 