import React, { useState } from 'react';
import { Text, Button, Group, Stack, Collapse, ActionIcon } from '@mantine/core';
import { globalStyles } from '../../styles/globalStyles'; // Assuming you might need this for styling
import SessionSettings from './SessionSettings';
import { CaretCircleDown, CaretCircleUp } from 'phosphor-react';

/**
 * Helper function to format time from seconds to MM:SS display format
 */
const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * SessionControls Component
 * 
 * Manages the interface for timed workout sessions:
 * 1. Displays a collapsible settings panel for configuring session parameters
 * 2. Shows a timer countdown during active sessions
 * 3. Displays current/upcoming exercise information
 * 4. Shows set progress (current set / total sets)
 * 5. Provides start/stop button for session control
 * 
 * This component bridges the UI controls with the session logic functionality.
 */
const SessionControls = ({
  isSessionActive,
  currentTimerValue,
  onToggleSession, // Handler for the start/stop button
  currentExercise,
  upcomingExercise,
  sessionPhase,
  exerciseSetDuration = 30,
  restPeriodDuration = 15,
  totalSets = 10,
  onSettingsChange,
  currentSetNumber = 0,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  // Handler for session start that includes settings
  const handleStartSession = (sessionConfig) => {
    if (onSettingsChange) {
      onSettingsChange(sessionConfig);
    }
    onToggleSession();
  };

  return (
    <Stack spacing="xs" align="center" style={{ width: '100%' }}>
      <Group position="apart" style={{ width: '100%', alignItems: 'center' }}>
        <Text size="md" weight={500}>Timed Session</Text>
        <ActionIcon 
          onClick={() => setShowSettings(!showSettings)} 
          variant="subtle"
          disabled={isSessionActive}
        >
          {showSettings ? <CaretCircleUp size={18} /> : <CaretCircleDown size={18} />}
        </ActionIcon>
      </Group>
      
      <Collapse in={showSettings} style={{ width: '100%' }}>
        <SessionSettings 
          exerciseSetDuration={exerciseSetDuration}
          restPeriodDuration={restPeriodDuration}
          totalSets={totalSets}
          onSettingsChange={onSettingsChange}
          isSessionActive={isSessionActive}
        />
      </Collapse>
      
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
          {isSessionActive ? 'Stop Session' : 'Start Session'}
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
          <Text size="sm" color="dimmed">
            Set {currentSetNumber} of {totalSets}
          </Text>
        </Stack>
      )}
    </Stack>
  );
};

export default SessionControls; 