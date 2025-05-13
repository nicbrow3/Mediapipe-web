import React from 'react';
import { Text, RingProgress, Paper, Group, Stack, Box } from '@mantine/core';

/**
 * Large Rep Goal Display component
 * Shows current rep count vs. goal with visual progress indicator
 * Designed to be clearly visible from a distance during workouts
 * 
 * @param {Object} props
 * @param {number} props.currentReps - Current repetition count
 * @param {number} props.goalReps - Target repetition goal
 * @param {string} props.side - Optional side identifier ('left' or 'right')
 */
const LargeRepGoalDisplay = ({ currentReps = 0, goalReps = 10, side = null }) => {
  // Calculate progress percentage
  const progress = goalReps > 0 ? Math.min(100, (currentReps / goalReps) * 100) : 0;
  
  // Determine color based on progress
  const getColor = () => {
    if (progress >= 100) return '#8AFF8A'; // Light green when complete
    if (progress >= 75) return '#66CDAA'; // Medium aquamarine
    if (progress >= 50) return '#20B2AA'; // Light sea green
    if (progress >= 25) return '#5F9EA0'; // Cadet blue
    return '#4682B4'; // Steel blue
  };

  // Use a highly controlled rendering with Mantine components
  return (
    <Paper
      p="md"
      radius="md"
      bg="rgba(38, 50, 56, 0.64)"
      sx={{
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        width: '100%',
        // height: 'fit-content',
        overflow: 'hidden'
      }}
    >
      <Group spacing="xs">
        {/* Side indicator (if present) */}
        {side && (
          <Box w={24} ta="center">
            <Text fz="lg" sx={{ lineHeight: 1.2, userSelect: 'none' }}>{side}</Text>
          </Box>
        )}
        
        {/* Progress ring */}
        <RingProgress
          size={120}
          thickness={10}
          roundCaps
          sections={[{ value: progress, color: getColor() }]}
          // label={
          //   <Text align="center" size={40} sx={{ lineHeight: 1.2, userSelect: 'none' }}>
          //     {currentReps}
          //   </Text>
          // }
          label={
            <Text c="white" ta="center" size="xl">
              {currentReps}
            </Text>
          }
        />
        
        {/* Goal display */}
        <Box w={80} h={120} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid red' }}>
          <Text c="white" size="lg" sx={{ lineHeight: 1.2, userSelect: 'none' }}>
            GOAL
          </Text>
          <Text c="white" ta="center" size="xl">
            {goalReps}
          </Text>
          {/* <Text color="white" size={40} sx={{ lineHeight: 1.2, userSelect: 'none' }}>
            {goalReps}
          </Text> */}
          
          {/* Show complete indicator if goal reached */}
          {progress >= 100 && (
            <Text
              ta="center"
              c="#8AFF8A"
              weight={700}
              size="xs"
              sx={{ lineHeight: 1, marginTop: '2px', userSelect: 'none' }}
            >
              COMPLETE!
            </Text>
          )}
        </Box>
      </Group>
    </Paper>
  );
};

export default LargeRepGoalDisplay; 