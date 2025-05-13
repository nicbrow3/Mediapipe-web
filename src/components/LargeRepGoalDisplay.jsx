import React, { useState, useEffect, useRef } from 'react';
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
  // Calculate target progress percentage
  const targetProgress = goalReps > 0 ? Math.min(100, (currentReps / goalReps) * 100) : 0;
  
  // State for animated progress
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isInitialized = useRef(false);
  
  // Set initial progress without animation on first render
  useEffect(() => {
    if (!isInitialized.current) {
      setAnimatedProgress(targetProgress);
      isInitialized.current = true;
    }
  }, [targetProgress]);
  
  // Animate progress when currentReps/goalReps changes (after initial render)
  useEffect(() => {
    if (!isInitialized.current) {
      return; // Skip if not initialized yet
    }
    
    // Start from current animated value
    let start = animatedProgress;
    const end = targetProgress;
    
    // If they're very close, just jump to end value
    if (Math.abs(end - start) < 0.5) {
      setAnimatedProgress(end);
      return;
    }
    
    const duration = 200; // Duration in ms (matching the transition time)
    const startTime = performance.now();
    
    // Animation function
    const animateProgress = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      
      if (elapsedTime < duration) {
        const progress = start + ((end - start) * (elapsedTime / duration));
        setAnimatedProgress(progress);
        requestAnimationFrame(animateProgress);
      } else {
        setAnimatedProgress(end);
      }
    };
    
    // Start animation
    requestAnimationFrame(animateProgress);
    
    return () => {
      // Cleanup if needed
    };
  }, [currentReps, goalReps, targetProgress]);
  
  // Determine color based on progress
  const getColor = () => {
    if (animatedProgress >= 100) return '#8AFF8A'; // Light green when complete
    if (animatedProgress >= 75) return '#66CDAA'; // Medium aquamarine
    if (animatedProgress >= 50) return '#20B2AA'; // Light sea green
    if (animatedProgress >= 25) return '#5F9EA0'; // Cadet blue
    return '#4682B4'; // Steel blue
  };

  // Use a highly controlled rendering with Mantine components
  return (
    <Paper>
      <Group>
        {/* Side indicator (if present) */}
        {side && (
          <Box
          w={30} 
          ta="center">
            <Text fz="h3">
              {side}
              </Text>
          </Box>
        )}
        
        {/* Progress ring */}
        <RingProgress
          size={120}
          thickness={10}
          roundCaps
          sections={[{ value: animatedProgress, color: getColor() }]}
          label={
            <Text c="white" ta="center" size="h1">
              {currentReps}
            </Text>
          }
        />
        
        {/* Goal display */}
        <Box w={60} h={100}>
          <Text c="white" size="lg" sx={{ lineHeight: 1.2, userSelect: 'none' }}>
            GOAL
          </Text>
          <Text c="white" ta="center" size="h1">
            {goalReps}
          </Text>
          
          {/* Show complete indicator if goal reached */}
          {targetProgress >= 100 && (
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