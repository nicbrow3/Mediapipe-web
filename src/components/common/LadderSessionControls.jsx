import React, { useState, useMemo, useCallback } from 'react';
import { Text, Button, Group, Stack, Collapse, ActionIcon, Badge, Select, Paper } from '@mantine/core';
import LadderSessionSettings from './LadderSessionSettings';
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
 * LadderSessionControls Component
 * 
 * Manages the interface for ladder workout sessions:
 * 1. Displays a collapsible settings panel for configuring ladder parameters
 * 2. Shows the current rep count during active sessions
 * 3. Shows rest timer countdown during rest phases
 * 4. Provides start/stop button for session control
 * 5. Includes a "complete set" button during exercise phase
 */
const LadderSessionControls = ({
  isSessionActive,
  currentTimerValue,
  onToggleSession,
  onCompleteSet,
  currentExercise,
  currentReps,
  sessionPhase,
  totalSets,
  currentSetNumber,
  onSettingsChange,
  ladderSettings,
  direction,
  exerciseOptions, // Available exercises
  selectedExercise, // Currently selected exercise for ladder
  onExerciseChange, // Callback to change selected exercise
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  // Check if we're at the peak (top reps)
  const isAtPeak = currentReps === ladderSettings.topReps;
  
  // Memoize the formatted and sorted options to prevent recalculation on every render
  const formattedExerciseOptions = useMemo(() => {
    if (!exerciseOptions || exerciseOptions.length === 0) return [];
    
    return [...exerciseOptions]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(exercise => ({
        value: exercise.id,
        label: exercise.name
      }));
  }, [exerciseOptions]); // Only recalculate when exerciseOptions changes
  
  // Memoize the onChange handler to prevent new function creation on every render
  const handleExerciseChange = useCallback((exerciseId) => {
    const exercise = exerciseOptions?.find(ex => ex.id === exerciseId);
    if (exercise) {
      onExerciseChange(exercise);
    }
  }, [exerciseOptions, onExerciseChange]);

  // Memoize the toggle settings handler
  const handleToggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  return (
    <Paper style={{width: '100%'}}>
    <Stack spacing="xs" align="center" style={{ width: '100%' }}>
      <Group position="apart" style={{ width: '100%', alignItems: 'center' }}>
        <Text size="md" weight={500}>Ladder Session</Text>
        <ActionIcon 
          onClick={handleToggleSettings}
          variant="subtle"
          disabled={isSessionActive}
        >
          {showSettings ? <CaretCircleUp size={18} /> : <CaretCircleDown size={18} />}
        </ActionIcon>
      </Group>
      
      <Collapse in={showSettings} style={{ width: '100%' }}>
          <LadderSessionSettings 
            ladderSettings={ladderSettings}
            onSettingsChange={onSettingsChange}
            isSessionActive={isSessionActive}
          />
      </Collapse>
      
      {/* Exercise Selector - only shown when session is not active */}
      {!isSessionActive && (
        <Select
        //   label="Select Exercise for Ladder"
          placeholder="Choose an exercise"
          data={formattedExerciseOptions}
          value={selectedExercise?.id || ''}
          onChange={handleExerciseChange}
          style={{ width: '100%', marginBottom: '10px' }}
        />
      )}
      <Group style={{ alignItems: 'center'}}>
        {isSessionActive && sessionPhase === 'resting' && (
          <Text size="lg" weight={500} style={{ minWidth: '70px', textAlign: 'center' }}>
            {formatTime(currentTimerValue)}
          </Text>
        )}
        <Button 
          onClick={onToggleSession}
          color={isSessionActive ? 'error' : 'primary'}
          disabled={!isSessionActive && !selectedExercise}
        >
          {isSessionActive ? 'Stop Ladder' : 'Start Ladder'}
        </Button>
        
        {isSessionActive && sessionPhase === 'exercising' && (
          <Button
            onClick={onCompleteSet}
          >
            Completed Set
          </Button>
        )}
      </Group>
      
      {isSessionActive && (
        <Stack spacing="xs" align="center">
          <Text size="sm" weight={500}>
            Exercise: {currentExercise?.name || 'None'}
          </Text>
          
          <Group spacing={8}>
            <Badge size="lg" color={sessionPhase === 'exercising' ? 'green' : 'gray'}>
              {currentReps} reps
            </Badge>
            
            {isAtPeak ? (
              <Badge size="sm" color="orange" variant="filled">
                PEAK
              </Badge>
            ) : (
              <Badge size="sm" color="blue">
                {direction === 'up' ? 'Going up ↑' : 'Going down ↓'}
              </Badge>
            )}
          </Group>
          
          <Text size="sm" color="dimmed">
            Set {currentSetNumber} of {totalSets}
          </Text>
          
          {sessionPhase === 'exercising' && (
            <Text size="sm" color={isAtPeak ? 'orange' : 'green'}>
              {isAtPeak ? 'PEAK SET!' : 'Do'} {currentReps} reps, then click "Complete Set"
            </Text>
          )}
          
          {sessionPhase === 'resting' && (
            <Text size="sm" color="blue">
              Resting: {formatTime(currentTimerValue)}
            </Text>
          )}
        </Stack>
      )}
    </Stack>
    </Paper>
  );
};

export default React.memo(LadderSessionControls); 