import React from 'react';
import { Paper, Stack, Text, Badge, Button, Group, Box, Progress } from '@mantine/core';
import { IconPlayerPlayFilled, IconEdit, IconCheck, IconRotateClockwise } from '@tabler/icons-react';
import * as exercises from '../../exercises';

/**
 * Component for controlling circuit workout sessions
 * This displays the current exercise, progress, and controls for circuit workout mode
 */
const CircuitSessionControls = ({
  workoutPlan,
  currentExerciseDetails,
  onCompleteSetOrAdvance,
  onEditWorkout,
  isSessionActive,
  onToggleSession,
  isWorkoutComplete,
  hasBeenStarted
}) => {
  if (!workoutPlan || workoutPlan.length === 0) {
    return (
      <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
        <Stack align="center" spacing="md">
          <Text>No workout plan defined</Text>
          <Button onClick={onEditWorkout}>Create Workout</Button>
        </Stack>
      </Paper>
    );
  }

  if (isWorkoutComplete) {
    return (
      <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
        <Stack spacing="md">
          <Text align="center" weight={600} size="lg" color="green">Workout Complete!</Text>
          
          <Box 
            p="sm" 
            style={{ 
              borderRadius: '6px', 
              backgroundColor: 'rgba(0, 192, 100, 0.08)',
              border: '1px solid rgba(0, 192, 100, 0.2)',
              textAlign: 'center'
            }}
          >
            <Text size="md">Great job! Ready for your next workout?</Text>
          </Box>
          
          <Group position="center">
            <Button 
              leftSection={<IconRotateClockwise size={16} />}
              onClick={onToggleSession}
              color="green"
              size="md"
            >
              Start New Workout
            </Button>
            <Button 
              variant="outline"
              leftSection={<IconEdit size={16} />}
              onClick={onEditWorkout}
            >
              Edit Workout
            </Button>
          </Group>
        </Stack>
      </Paper>
    );
  }

  // If we have no current exercise details but the session is active, 
  // we need to immediately toggle the session to start the workout
  if (!currentExerciseDetails && isSessionActive) {
    // This is a rare edge case where the session is active but no exercise details
    // We'll render a loading state briefly
    return (
      <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
        <Stack spacing="md">
          <Text align="center" weight={500} size="lg">Starting workout...</Text>
        </Stack>
      </Paper>
    );
  }

  if (!currentExerciseDetails) {
    // If no current exercise details, try to get the first exercise from the workout plan
    let firstExerciseName = null;
    if (workoutPlan && workoutPlan.length > 0) {
      // Look for the first exercise either directly or in the first circuit
      const firstItem = workoutPlan[0];
      if (firstItem.type === 'set') {
        // Find the exercise by ID
        const exercise = Object.values(exercises).find(e => e.id === firstItem.exerciseId);
        firstExerciseName = exercise?.name || 'Unknown Exercise';
      } else if (firstItem.type === 'circuit' && firstItem.elements && firstItem.elements.length > 0) {
        // Get the first exercise from the first circuit
        const exercise = Object.values(exercises).find(e => e.id === firstItem.elements[0].exerciseId);
        firstExerciseName = exercise?.name || 'Unknown Exercise';
      }
    }

    return (
      <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
        <Stack spacing="md">
          <Text align="center" weight={500} size="lg">Ready to Start Workout</Text>
          
          {firstExerciseName && (
            <Box 
              p="sm" 
              style={{ 
                borderRadius: '6px', 
                backgroundColor: 'rgba(0, 120, 212, 0.08)',
                border: '1px solid rgba(0, 120, 212, 0.2)'
              }}
            >
              <Text size="sm" color="dimmed" mb={2}>FIRST EXERCISE</Text>
              <Text weight={600} size="md">{firstExerciseName}</Text>
            </Box>
          )}
          
          <Group position="center">
            <Button 
              leftSection={<IconPlayerPlayFilled size={16} />}
              onClick={onToggleSession}
              color="green"
              size="md"
            >
              {isSessionActive ? 'Continue Workout' : hasBeenStarted ? 'Continue Workout' : 'Start Workout'}
            </Button>
            <Button 
              variant="outline"
              leftSection={<IconEdit size={16} />}
              onClick={onEditWorkout}
            >
              Edit Workout
            </Button>
          </Group>
        </Stack>
      </Paper>
    );
  }

  const { 
    exerciseName, 
    targetReps, 
    weight, 
    inCircuit, 
    circuitName, 
    circuitSetNumber, 
    circuitTotalSets,
    circuitRepetition,
    circuitTotalRepetitions, 
    overallSetNumber, 
    overallTotalSets,
    nextExerciseName
  } = currentExerciseDetails;

  // Calculate progress percentage based on completed sets
  // If we're on set 1 of 10, we've completed 0 sets (0%)
  // If we're on set 2 of 10, we've completed 1 set (10%), etc.
  const completedSets = Math.max(0, overallSetNumber - 1);
  const totalSets = overallTotalSets || 0;
  const progressPercentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
      <Stack spacing="md">
        {/* Current exercise info with more prominent display */}
        <Box 
          p="sm" 
          style={{ 
            borderRadius: '6px', 
            backgroundColor: 'rgba(0, 120, 212, 0.08)',
            border: '1px solid rgba(0, 120, 212, 0.2)'
          }}
        >
          <Text size="sm" color="dimmed" mb={2}>CURRENT EXERCISE</Text>
          <Group position="apart" mb={5}>
            <Text weight={700} size="lg">{exerciseName}</Text>
            {weight !== null && weight > 0 && (
              <Badge size="lg" color="blue">{weight} lbs</Badge>
            )}
          </Group>
          <Text size="md" color="dimmed">Target: {targetReps} reps</Text>
        </Box>

        {/* Circuit info if in a circuit */}
        {inCircuit && (
          <Box bg="rgba(0,0,0,0.03)" p="xs" style={{ borderRadius: '4px' }}>
            <Text weight={500} size="sm">{circuitName}</Text>
            <Group position="apart" mt={4}>
              <Text size="sm">Set {circuitSetNumber}/{circuitTotalSets}</Text>
              <Text size="sm">Rep {circuitRepetition}/{circuitTotalRepetitions}</Text>
            </Group>
          </Box>
        )}

        {/* Overall progress */}
        <Box>
          <Group position="apart" mb={5}>
            <Text size="sm">Overall Progress</Text>
            <Text size="sm" weight={500}>
              Set {overallSetNumber} of {overallTotalSets}
            </Text>
          </Group>
          <Progress 
            value={(overallSetNumber - 1) / overallTotalSets * 100} 
            size="sm" 
            radius="sm"
            color="blue"
          />
        </Box>

        {/* Next exercise preview with improved visibility */}
        {nextExerciseName && (
          <Box 
            p="sm" 
            style={{ 
              borderRadius: '6px', 
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              border: '1px dashed rgba(0, 0, 0, 0.15)'
            }}
          >
            <Text size="sm" color="dimmed" mb={2}>NEXT EXERCISE</Text>
            <Text size="md" weight={500}>{nextExerciseName}</Text>
          </Box>
        )}

        {/* Control buttons */}
        <Group position="apart">
          <Button 
            leftSection={<IconCheck size={16} />}
            onClick={onCompleteSetOrAdvance}
            disabled={!isSessionActive}
          >
            Complete Set
          </Button>
          <Group spacing="xs">
            <Button 
              variant="outline"
              color={isSessionActive ? "red" : "blue"}
              onClick={onToggleSession}
            >
              {isSessionActive ? "Pause" : "Resume"}
            </Button>
            <Button 
              variant="outline"
              leftSection={<IconEdit size={16} />}
              onClick={onEditWorkout}
              disabled={isSessionActive}
            >
              Edit
            </Button>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
};

export default CircuitSessionControls; 