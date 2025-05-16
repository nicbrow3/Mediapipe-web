import React, { useState, useMemo, useCallback } from 'react';
import { Text, Button, Group, Stack, Collapse, ActionIcon, Badge, Select, Paper, Box, Transition } from '@mantine/core';
import LadderSessionSettings from './LadderSessionSettings';
import { CaretCircleDown, CaretCircleUp, ListBullets } from 'phosphor-react';
import LadderSetList from './LadderSetList';

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
  const [showSetList, setShowSetList] = useState(false);
  
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

  // Memoize the toggle set list handler
  const handleToggleSetList = useCallback(() => {
    setShowSetList(prev => !prev);
  }, []);

  return (
    <Group
    wrap='nowrap'
    align="flex-start"
    style={{width: '100%', maxHeight: '450px'}}
    >
      <Paper 
        p="md" 
        shadow="xs" 
        // withBorder 
        style={{
          flexGrow: 0,
          width: '380px',
          minWidth: '380px',
          display: 'flex', 
          flexDirection: 'column'
        }}
      >
        <Stack spacing="xs" align="stretch" style={{ width: '100%' }}>
          <Group position="apart" style={{ width: '100%', alignItems: 'center' }}>
            <Text size="md" weight={500}>Ladder Session</Text>
            <Group spacing="xs">
              <ActionIcon 
                onClick={handleToggleSetList}
                variant={showSetList ? "filled" : "light"}
                color={showSetList ? "blue" : "gray"}
                title={showSetList ? "Hide Set List" : "Show Set List"}
              >
                <ListBullets size={18} />
              </ActionIcon>
              <ActionIcon 
                onClick={handleToggleSettings}
                variant={showSettings ? "filled" : "light"}
                color={showSettings ? "blue" : "gray"}
                title={showSettings ? "Hide Settings" : "Show Settings"}
              >
                {showSettings ? <CaretCircleUp size={18} /> : <CaretCircleDown size={18} />}
              </ActionIcon>
            </Group>
          </Group>
          
          <Collapse in={showSettings} style={{ width: '100%' }}>
            <LadderSessionSettings 
              ladderSettings={ladderSettings}
              onSettingsChange={onSettingsChange}
              isSessionActive={isSessionActive}
            />
          </Collapse>
          
          <Select
            placeholder="Choose an exercise"
            data={formattedExerciseOptions}
            value={selectedExercise?.id || ''}
            onChange={handleExerciseChange}
            style={{ width: '100%', marginBottom: '10px' }}
            disabled={isSessionActive}
          />

          <Group
            position="center"
            style={{ alignItems: 'center', minHeight: '36px', width: '100%' }}
          >
            {isSessionActive && sessionPhase === 'resting' && (
              <Text size="xl" weight={700} color="blue" style={{ textAlign: 'center' }}>
                {formatTime(currentTimerValue)}
              </Text>
            )}
          </Group>

          <Button
            fullWidth
            variant= "filled"
            onClick={onToggleSession}
            color={isSessionActive ? 'red' : 'blue'}
            disabled={!isSessionActive && !selectedExercise}
          >
            {isSessionActive ? 'Stop Ladder' : 'Start Ladder'}
          </Button>
          
          {isSessionActive && sessionPhase === 'exercising' && (
            <Button
              fullWidth
              onClick={onCompleteSet}
              variant="outline"
            >
              Complete Set ({currentReps} reps)
            </Button>
          )}
        
          {isSessionActive && (
            <Stack spacing="xs" align="center" mt="sm">
              
              <Group position="center" spacing={8}>
                <Badge variant="filled" size="lg" color={sessionPhase === 'exercising' ? 'green' : 'gray'}>
                  {currentReps} reps
                </Badge>
                
                {isAtPeak ? (
                  <Badge variant="filled" size="lg" color="orange">
                    PEAK
                  </Badge>
                ) : (
                  <Badge size="lg" color="blue">
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

      <Transition mounted={showSetList} transition="slide-right" duration={200} timingFunction="ease">
        {(styles) => (
          showSetList && ladderSettings ? (
            <Box 
              style={{
                ...styles, 
                marginLeft: '16px',
                flexGrow: 1,
                height: '100%',
                minHeight: 0
              }}
            >
              <LadderSetList ladderSettings={ladderSettings} />
            </Box>
          ) : null
        )}
      </Transition>
    </Group>
  );
};

export default React.memo(LadderSessionControls); 