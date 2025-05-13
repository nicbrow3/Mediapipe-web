import React from 'react';
import { Text, Box, RingProgress, Group, Paper } from '@mantine/core';

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

  return (
    <Paper
      p="md"
      radius="lg"
      sx={(theme) => ({
        backgroundColor: 'rgba(38, 50, 56, 0.85)', // Dark semi-transparent background
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        width: '300px', // Wider fixed width
        maxHeight: '150px', // Control height
        display: 'block',
        pointerEvents: 'auto', // Make sure controls within are clickable
        '&:hover': {
          backgroundColor: 'rgba(38, 50, 56, 0.9)',
        },
      })}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {side && (
          <Text
            align="center"
            fw={700}
            fz="lg"
            color="#FFF"
            mb={5}
            sx={{ textTransform: 'uppercase' }}
          >
            {side}
          </Text>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <RingProgress
            size={100} // Slightly smaller for better layout
            thickness={8}
            roundCaps
            sections={[{ value: progress, color: getColor() }]}
            label={
              <Text color="white" weight={700} align="center" size={24}>
                {currentReps}
              </Text>
            }
          />
          
          <Box sx={{ textAlign: 'center', width: '100px' }}>
            <Text color="white" size="xs" weight={700}>
              GOAL
            </Text>
            <Text color="white" weight={700} size={28}>
              {goalReps}
            </Text>
          </Box>
        </div>
        
        {progress >= 100 && (
          <Text
            align="center"
            color="#8AFF8A"
            weight={700}
            mt={5}
            size="sm"
          >
            COMPLETE!
          </Text>
        )}
      </div>
    </Paper>
  );
};

export default LargeRepGoalDisplay; 