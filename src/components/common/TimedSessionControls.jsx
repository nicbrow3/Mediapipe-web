// src/components/common/TimedSessionControls.jsx
import React, { useState } from 'react';
import { Paper, Button, Group, Stack, Collapse, ActionIcon, Text } from '@mantine/core'; // Added Text back for fallback
import TimedSessionSettings from './TimedSessionSettings';
import CircularProgressTimer from './CircularProgressTimer'; // Import the component
import { CaretCircleDown, CaretCircleUp } from 'phosphor-react';

// formatTime can be kept if needed elsewhere, or CircularProgressTimer can handle its own label formatting
// const formatTime = (totalSeconds) => { ... };

const TimedSessionControls = ({
  isSessionActive,
  currentTimerValue,
  onToggleSession,
  currentExercise,
  upcomingExercise,
  sessionPhase,
  exerciseSetDuration = 30, // Default from props
  restPeriodDuration = 15,  // Default from props
  totalSets = 10,
  onSettingsChange,
  currentSetNumber = 0,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  // Determine the total duration for the current phase
  // This is crucial for the CircularProgressTimer's totalTime prop
  const currentPhaseTotalTime = sessionPhase === 'exercising' 
    ? exerciseSetDuration 
    : sessionPhase === 'resting' 
    ? restPeriodDuration 
    : 0; // Fallback, though should ideally not be 0 if active

  // For debugging
  console.log(`[TimedSessionControls] Phase: ${sessionPhase}, currentTimerValue: ${currentTimerValue}, currentPhaseTotalTime: ${currentPhaseTotalTime}, exerciseSetDuration: ${exerciseSetDuration}, restPeriodDuration: ${restPeriodDuration}`);

  return (
    <Paper style={{width: '100%'}}>
      <Stack
      spacing="xs"
      style={{ width: '100%' }}
      >
        <Group position="apart" style={{ width: '100%', justifyContent: 'center' }}> {/* Changed justify to 'center' */}
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
        
        <Stack align="center"> {/* Center the timer and button */}
          {isSessionActive && sessionPhase !== 'idle' ? (
            <CircularProgressTimer
              currentTime={currentTimerValue}
              totalTime={currentPhaseTotalTime} // Pass the calculated total time
              thickness={25} // Example thickness
            />
          ) : isSessionActive && sessionPhase === 'idle' ? (
            // Should ideally not happen if session is active but phase is idle
            <Text size="xl" ta="center">Preparing...</Text>
          ) : null}
          <Button
            fullWidth
            onClick={onToggleSession}
            variant= "filled"
            color={isSessionActive ? 'red' : 'blue'}
            style={{marginTop: isSessionActive && sessionPhase !== 'idle' ? '10px' : '0'}} // Add some margin if timer is shown
          >
            {isSessionActive ? 'Stop Session' : 'Start Session'}
          </Button>
        </Stack>
        
        {isSessionActive && (
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