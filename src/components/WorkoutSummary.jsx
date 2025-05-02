import React from 'react';
import { Paper, Group, Text, Title, RingProgress, SimpleGrid, Badge, Center } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import { IconClock, IconBarbell, IconCalendar } from '@tabler/icons-react';

const WorkoutSummary = ({ workoutStats, onClose }) => {
  // If no stats provided, show placeholder data
  const stats = workoutStats || {
    totalReps: 0,
    duration: 0, // in seconds
    exercisesCompleted: 0,
    exerciseName: 'Unknown Exercise',
    isTwoSided: false,
    startTime: new Date(),
    endTime: new Date(),
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
          Exercise: {stats.exerciseName}
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
                    <IconCalendar size={24} style={{ color: 'var(--accent-color-3)' }} />
                  </Center>
                }
              />
              <div>
                <Text size="xs" c="dimmed">Workout Time</Text>
                <Text size="sm" fw={500}>{formatTime(stats.startTime)} - {formatTime(stats.endTime)}</Text>
                <Text size="xs" c="dimmed">Today</Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>
        
        <div className="info-section">
          <h3>Rep Counting Method</h3>
          <p>
            Reps are counted using a state-based approach, tracking your movement through a complete sequence:
            <span style={{ color: '#3498db' }}>Relaxed</span> → 
            <span style={{ color: '#f39c12' }}>Concentric</span> → 
            <span style={{ color: '#27ae60' }}>Peak</span> → 
            <span style={{ color: '#9b59b6' }}>Eccentric</span> → 
            <span style={{ color: '#3498db' }}>Relaxed</span>
          </p>
          <p>
            A rep is only counted when you complete the full motion cycle and hold the peak position.
            You can toggle the rep flow diagram visibility in Settings.
          </p>
        </div>
        
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