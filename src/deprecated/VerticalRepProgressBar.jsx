import React from 'react';
import { Box } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles'; // Assuming glassStyle is accessible

const VerticalRepProgressBar = ({
  currentReps,
  repGoal,
  height = '300px', // Default height
  width = '35px',  // Default width
  barColor = 'rgba(136, 105, 244, 0.6)', // Default grape-like color with opacity
  notchColor = 'rgba(255, 255, 255, 0.3)',
  highlightNotchColor = 'rgba(255, 255, 255, 0.9)',
  highlightNotchHeight = '3px',
  showValue = true, // Option to show value at the top
}) => {
  const progressPercent = repGoal > 0 ? Math.min(100, (currentReps / repGoal) * 100) : 0;

  // Calculate notch positions
  const notches = [];
  if (repGoal > 0) {
    for (let i = 1; i <= repGoal; i++) {
      const isCurrent = i === currentReps;
      const isFilled = i <= currentReps;
      notches.push(
        <Box
          key={`notch-${i}`}
          style={{
            position: 'absolute',
            bottom: `${(i / repGoal) * 100}%`,
            left: '10%', // Indent notches slightly
            width: '80%',
            height: isCurrent ? highlightNotchHeight : '1.5px',
            backgroundColor: isCurrent ? highlightNotchColor : notchColor,
            opacity: isFilled ? 1 : 0.5, // Make unfilled notches dimmer
            zIndex: 2, // Ensure notches are above the progress fill
            transition: 'background-color 0.3s ease, height 0.3s ease',
          }}
        />
      );
    }
  }

  return (
    <Box
      style={{
        ...glassStyle, // Apply glass effect to the background
        position: 'relative',
        height: height,
        width: width,
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden', // Hide overflow from progress bar fill
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5px 0', // Add some vertical padding
      }}
    >
      {/* Optional Value Display at Top */}
      {showValue && (
         <Box style={{
           color: 'white',
           fontWeight: 600,
           fontSize: '1.1em',
           textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
           zIndex: 3,
           position: 'absolute',
           top: '8px', // Position near the top
           textAlign: 'center',
           width: '100%'
         }}>
           {currentReps}
         </Box>
      )}

      {/* Progress Fill */}
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${progressPercent}%`,
          backgroundColor: barColor,
          zIndex: 1, // Below notches
          transition: 'height 0.3s ease-out', // Smooth height transition
        }}
      />

      {/* Notches Container (for positioning) */}
      <Box
        style={{
          position: 'absolute',
          bottom: 0, // Align notches from the bottom
          left: 0,
          width: '100%',
          height: '100%', // Full height to position notches correctly
          zIndex: 2,
        }}
      >
        {notches}
      </Box>
    </Box>
  );
};

export default VerticalRepProgressBar; 