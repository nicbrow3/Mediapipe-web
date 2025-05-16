// src/components/common/CircularProgressTimer.jsx
import React from 'react';
import { RingProgress, Text, Paper } from '@mantine/core';

const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const CircularProgressTimer = ({ currentTime, totalTime, thickness = 20 }) => {
  const progressPercentage = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  // Log the received props and calculated percentage
  console.log(`[CircularProgressTimer] currentTime: ${currentTime}, totalTime: ${totalTime}, progressPercentage: ${progressPercentage.toFixed(2)}`);

  let color = 'blue';
  if (progressPercentage <= 0) { // Handle 0% explicitly for color
    color = 'red'; // Or a distinct color for "finished"
  } else if (progressPercentage < 33) {
    color = 'red';
  } else if (progressPercentage < 66) {
    color = 'yellow';
  } else {
    color = 'green';
  }

  return (
    <Paper 
      radius="50%"
      p="xs"
      shadow="md"
      style={{ 
        display: 'inline-block',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <RingProgress
        size={200} // Adjusted size for potentially better fitting
        thickness={thickness}
        roundCaps
        sections={[{ value: Math.max(0, Math.min(100, progressPercentage)), color: color }]} // Clamp value between 0 and 100
        transitionDuration={200}
        label={
          <Text c={color} weight={700} ta="center" size="3rem"> {/* Adjusted text size */}
            {formatTime(currentTime)}
          </Text>
        }
      />
    </Paper>
  );
};

export default React.memo(CircularProgressTimer);