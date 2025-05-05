import React from 'react';
import { Paper, Group, Text, Title, RingProgress, SimpleGrid, Badge, Center, Table } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import { IconClock, IconBarbell, IconActivity, IconWeight } from '@tabler/icons-react';
// Import all available exercises
import * as allExercises from '../exercises';

const WorkoutSummary = ({ workoutStats, onClose }) => {
  // If no stats provided, show placeholder data
  const stats = workoutStats || {
    totalReps: 0,
    duration: 0, // in seconds
    exercisesCompleted: 0,
    exercises: [],
    startTime: new Date(),
    endTime: new Date(),
    setCount: 0
  };
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (date) => {
    return date instanceof Date 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Create an exercise map for looking up names by ID
  const exerciseMap = Object.values(allExercises).reduce((map, exercise) => {
    if (exercise && exercise.id) {
      map[exercise.id] = exercise.name;
    }
    return map;
  }, {});

  // Helper to find exercise name by ID
  const getExerciseName = (exerciseId, fallback = "Unknown Exercise") => {
    return exerciseMap[exerciseId] || fallback;
  };
  
  // Extract muscle groups from the exercises performed
  const getMuscleGroups = () => {
    const allMuscleGroups = new Set();
    
    // Limit the number of exercises we process to avoid performance issues in very long sessions
    const maxExercisesToProcess = 20; // Only process the most recent 20 exercises
    const exercisesToProcess = stats.exercises.slice(-maxExercisesToProcess);
    
    exercisesToProcess.forEach(exercise => {
      // Find the exercise config that matches this ID
      const exerciseConfig = Object.values(allExercises).find(ex => ex.id === exercise.id);
      
      // If we found the config and it has muscle groups defined, add them to our set
      if (exerciseConfig && exerciseConfig.muscleGroups) {
        exerciseConfig.muscleGroups.forEach(group => allMuscleGroups.add(group));
      }
    });
    
    return Array.from(allMuscleGroups);
  };
  
  const muscleGroups = getMuscleGroups();
  
  return (
    <div className="workout-summary-overlay">
      <Paper 
        p="xl" 
        shadow="md" 
        radius="lg"
        styles={{
          root: {
            ...glassStyle,
            maxWidth: '800px',
            width: '90%',
            margin: '0 auto'
          }
        }}
      >
        <Title order={2} mb="md" style={{ color: 'var(--mantine-color-white)' }}>
          Workout Complete! 
          <Badge size="lg" ml="xs" color="green.7" radius="sm" variant="light">Great Job!</Badge>
        </Title>

        <Text size="sm" c="dimmed" mb="lg">
          Completed {stats.exercisesCompleted} {stats.exercisesCompleted === 1 ? 'exercise' : 'exercises'} 
          with {stats.setCount} {stats.setCount === 1 ? 'set' : 'sets'}
        </Text>
        
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Paper p="md" radius="md" style={glassStyle}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: Math.min(100, (stats.totalReps / 100) * 100), color: 'blue' }]}
                label={
                  <Center>
                    <IconBarbell size={24} style={{ color: 'var(--accent-color)' }} />
                  </Center>
                }
              />
              <div>
                <Text size="xs" c="dimmed">Total Reps</Text>
                <Title order={3}>{stats.totalReps}</Title>
              </div>
            </Group>
          </Paper>
          
          <Paper p="md" radius="md" style={glassStyle}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: Math.min(100, (stats.duration / 1800) * 100), color: 'orange' }]}
                label={
                  <Center>
                    <IconClock size={24} style={{ color: 'var(--accent-color-2)' }} />
                  </Center>
                }
              />
              <div>
                <Text size="xs" c="dimmed">Duration</Text>
                <Title order={3}>{formatDuration(stats.duration)}</Title>
                <Text size="xs" c="dimmed">Avg. {Math.round(stats.totalReps / (stats.duration / 60) || 0)} reps/min</Text>
              </div>
            </Group>
          </Paper>
          
          <Paper p="md" radius="md" style={glassStyle}>
            <Group>
              <RingProgress
                size={80}
                roundCaps
                thickness={8}
                sections={[{ value: 100, color: 'green' }]}
                label={
                  <Center>
                    <IconActivity size={24} style={{ color: 'var(--accent-color-3)' }} />
                  </Center>
                }
              />
              <div>
                <Text size="xs" c="dimmed">Muscle Groups</Text>
                <div>
                  {muscleGroups.length > 0 ? (
                    <Group gap={5} mt={5}>
                      {muscleGroups.map((group, index) => (
                        <Badge key={index} color="green.7" size="sm">
                          {group}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text size="sm" fw={500}>No muscle data</Text>
                  )}
                </div>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>
        
        {/* Exercise Breakdown */}
        {stats.exercises && stats.exercises.length > 0 && (
          <Paper p="md" radius="md" style={glassStyle} mt="lg">
            <Title order={4} mb="sm">Exercise Breakdown</Title>
            <Table striped highlightOnHover withColumnBorders style={{ width: '100%' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Exercise</Table.Th>
                  <Table.Th>Reps</Table.Th>
                  <Table.Th>Weight</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* Group exercises by ID and show combined stats - limit to 15 rows max */}
                {Object.entries(
                  stats.exercises.reduce((grouped, exercise) => {
                    const id = exercise.id;
                    
                    if (!grouped[id]) {
                      grouped[id] = {
                        id,
                        totalReps: 0,
                        weight: exercise.weight // Just use the last weight for now
                      };
                    }
                    
                    // Add reps - handle both single and two-sided
                    if (exercise.repsLeft !== null && exercise.repsRight !== null) {
                      // For two-sided exercises, use the minimum of left and right
                      const currentSetReps = Math.min(exercise.repsLeft, exercise.repsRight);
                      grouped[id].totalReps += currentSetReps;
                    } else {
                      grouped[id].totalReps += exercise.reps || 0;
                    }
                    
                    return grouped;
                  }, {})
                )
                // Sort by total reps (descending)
                .sort((a, b) => b[1].totalReps - a[1].totalReps)
                // Limit to 15 rows for performance
                .slice(0, 15)
                .map(([id, exercise]) => (
                  <Table.Tr key={id}>
                    <Table.Td>{getExerciseName(exercise.id)}</Table.Td>
                    <Table.Td>{exercise.totalReps}</Table.Td>
                    <Table.Td>
                      {exercise.weight ? `${exercise.weight} lbs` : 'N/A'}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            
            {/* Show a message if exercises were truncated */}
            {stats.exercises.length > 15 && (
              <Text size="xs" c="dimmed" mt="xs" ta="center">
                Showing top 15 of {stats.exercises.length} exercises
              </Text>
            )}
          </Paper>
        )}
        
        <Group justify="flex-end" mt="xl">
          <button 
            className="close-button"
            onClick={onClose}
            style={{
              background: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </Group>
      </Paper>
    </div>
  );
};

export default WorkoutSummary; 