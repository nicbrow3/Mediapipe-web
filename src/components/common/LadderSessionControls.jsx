import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Text, Button, Group, Stack, Collapse, ActionIcon, Badge, Select, Paper, Box, Transition, Affix } from '@mantine/core';
import LadderSessionSettings from './LadderSessionSettings';
import { CaretCircleDown, CaretCircleUp, ListBullets } from 'phosphor-react';
import LadderSetList from './LadderSetList';
import CircularProgressTimer from './CircularProgressTimer';

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

  // Store the total duration of the current rest period when it starts
  const [currentRestTotalTime, setCurrentRestTotalTime] = useState(0);

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

  useEffect(() => {
    if (sessionPhase === 'resting') {
        // When the rest phase begins, currentTimerValue is set to the full rest duration
        // by useLadderSessionLogic. We capture this initial value.
        // currentReps and ladderSettings.restTimePerRep are stable when this effect runs for a phase change.
        const initialRestDuration = currentReps * ladderSettings.restTimePerRep;
        setCurrentRestTotalTime(initialRestDuration);
        
        // We don't need to reset rep counts here anymore as the RepGoalDisplayContainer
        // handles showing the completed reps and then transitions to the new goal
    } else {
        // Reset when not in resting phase, or set to a value that indicates no timer
        setCurrentRestTotalTime(0); 
    }
  }, [sessionPhase, currentReps, ladderSettings.restTimePerRep]); // Dependencies ensure this updates correctly

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
            {/* Timer display is now handled by Affix below during resting phase */}
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
              
              <Text size="sm" c="dimmed">
                Set {currentSetNumber} of {totalSets}
              </Text>
              
              {/* Text indicator for rest time, can be kept or removed based on preference */}
              {sessionPhase === 'resting' && (
                <Text size="sm" color="blue">
                  Resting: {formatTime(currentTimerValue)} 
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Transition mounted={showSetList} transition={"slide-right"} duration={200} timingFunction="ease">
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

      {isSessionActive && sessionPhase === 'resting' && currentRestTotalTime > 0 && (
        <Affix position={{
          bottom: 120,
          left: 'calc(50% - 200px)' }}> 
          <CircularProgressTimer 
            currentTime={currentTimerValue} 
            totalTime={currentRestTotalTime} // Use the captured total rest time
            size={120} 
            thickness={10}
          />
        </Affix>
      )}
    </Group>
  );
};

export default React.memo(LadderSessionControls); 