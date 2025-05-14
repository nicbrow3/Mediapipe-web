import React, { useState } from 'react';
import { Paper, Text, Button, Group, Stack, Collapse, ActionIcon, Center } from '@mantine/core';
import TimedSessionSettings from './TimedSessionSettings';
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
const TimedSessionControls = ({
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
    <Paper style={{width: '100%'}}>
      <Stack
      spacing="xs"
      style={{ width: '100%' }}
      >
        <Group position="apart" style={{ width: '100%', justify: 'center' }}>
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
          <TimedSessionSettings 
            exerciseSetDuration={exerciseSetDuration}
            restPeriodDuration={restPeriodDuration}
            totalSets={totalSets}
            onSettingsChange={onSettingsChange}
            isSessionActive={isSessionActive}
          />
        </Collapse>
        
        <Stack
        >
          {isSessionActive && (
            <Text
            size="h1"
            ta='center'
            >
              {formatTime(currentTimerValue)}
            </Text>
          )}
          <Button
          fullWidth
            onClick={onToggleSession}
            variant= "filled"
            color={isSessionActive ? 'red' : 'blue'} // Example: Red for stop, Blue for start
          >
            {isSessionActive ? 'Stop Session' : 'Start Session'}
          </Button>
        </Stack>
        
        
        {isSessionActive && (// Text when the session is active
          <Stack
          spacing="xs"
          align="center"
          >
            <Text size="lg" weight={500}>
              Current: {currentExercise?.name || 'None'}
            </Text>
            {sessionPhase === 'resting' && (
              <Text size="sm" c="dimmed">
                Next: {upcomingExercise?.name || 'None'}
              </Text>
            )}
            <Text size="sm" c="dimmed">
              Set {currentSetNumber} of {totalSets}
            </Text>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
};

export default TimedSessionControls; 