import React from 'react';
import { Text, Button, Group, Stack, Paper, Modal, Badge } from '@mantine/core';
import { Trophy } from "@phosphor-icons/react";

/**
 * Component displayed when any session is completed
 * Shows a congratulatory message and session stats
 * Allows user to dismiss and return to normal mode
 * 
 * @param {Object} props
 * @param {boolean} props.opened - Whether the modal is open
 * @param {Function} props.onClose - Function to call when user dismisses the modal
 * @param {Object} props.sessionStats - Statistics about the completed session
 * @param {string} props.sessionStats.exercise - Name of the exercise used
 * @param {number} props.sessionStats.totalReps - Total reps completed in session
 * @param {number} props.sessionStats.totalSets - Total sets completed
 * @param {number} props.sessionStats.peakReps - Maximum reps in a set (for ladder)
 * @param {number} props.sessionStats.totalTime - Total workout time in seconds
 * @param {string} props.message - Custom message to display
 * @param {string} props.title - Title to display in the modal header
 * @param {React.ReactNode} props.icon - Custom icon to display in the header
 */
const SessionCompletionModal = ({ 
  opened, 
  onClose,
  sessionStats = {
    exercise: 'Unknown Exercise',
    totalReps: 0,
    totalSets: 0,
    peakReps: 0,
    totalTime: 0
  },
  message = 'Workout Complete!',
  title = 'Workout Complete!',
  icon = <Trophy size={28} weight="duotone" color="#FFD700" />
}) => {
  // Format time from seconds to MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose}
      title={
        <Group position="center" spacing="xs">
          {icon}
          <Text size="xl" weight={700}>{title}</Text>
        </Group>
      }
      centered
      size="md"
    >
      <Paper p="md" withBorder>
        <Stack spacing="md" align="center">
          <Text size="lg" weight={500} align="center" color="cyan">
            {message}
          </Text>
          
          <Stack spacing="xs" style={{ width: '100%' }}>
            <Group position="apart">
              <Text>Exercise:</Text>
              <Text weight={500}>{sessionStats.exercise}</Text>
            </Group>
            
            <Group position="apart">
              <Text>Total Sets:</Text>
              <Badge size="lg" color="blue">{sessionStats.totalSets}</Badge>
            </Group>
            
            {sessionStats.peakReps > 0 && (
              <Group position="apart">
                <Text>Peak Reps:</Text>
                <Badge size="lg" color="green">{sessionStats.peakReps}</Badge>
              </Group>
            )}
            
            <Group position="apart">
              <Text>Total Reps:</Text>
              <Badge size="lg" color="cyan">{sessionStats.totalReps}</Badge>
            </Group>
            
            <Group position="apart">
              <Text>Workout Time:</Text>
              <Badge size="lg" color="grape">{formatTime(sessionStats.totalTime)}</Badge>
            </Group>
          </Stack>
          
          <Button 
            onClick={onClose} 
            size="lg" 
            fullWidth
            mt="md"
          >
            Finish Workout
          </Button>
        </Stack>
      </Paper>
    </Modal>
  );
};

export default SessionCompletionModal; 