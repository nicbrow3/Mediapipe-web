import React from 'react';
import { Paper, Stack, Text, Badge, Button, Group, Box, Progress } from '@mantine/core';
import { IconPlayerPlayFilled, IconEdit, IconCheck } from '@tabler/icons-react';

/**
 * Component for controlling structured workouts
 * This displays the current exercise, progress, and controls for structured workout mode
 */
const StructuredWorkoutControls = ({
  workoutPlan,
  currentExerciseDetails,
  onCompleteSetOrAdvance,
  onEditWorkout,
  isSessionActive,
  onToggleSession
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

  if (!currentExerciseDetails) {
    return (
      <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
        <Stack align="center" spacing="md">
          <Text>Ready to start workout</Text>
          <Group>
            <Button 
              leftSection={<IconPlayerPlayFilled size={16} />}
              onClick={onToggleSession}
              color={isSessionActive ? "red" : "blue"}
            >
              {isSessionActive ? "Pause Workout" : "Start Workout"}
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

  // Calculate progress percentage
  const progressPercentage = Math.round((overallSetNumber / overallTotalSets) * 100);

  return (
    <Paper p="md" shadow="sm" style={{ width: '100%', maxWidth: '400px' }}>
      <Stack spacing="md">
        {/* Current exercise info */}
        <Box>
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
            <Text size="sm" weight={500}>Set {overallSetNumber} of {overallTotalSets}</Text>
          </Group>
          <Progress value={progressPercentage} size="sm" />
        </Box>

        {/* Next exercise preview */}
        {nextExerciseName && (
          <Box>
            <Text size="sm" color="dimmed">Next exercise:</Text>
            <Text size="sm">{nextExerciseName}</Text>
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

export default StructuredWorkoutControls; 