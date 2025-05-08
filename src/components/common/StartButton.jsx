import React from 'react';
import { Box } from '@mantine/core';
import { globalStyles } from '../../styles/globalStyles';
import StyledButton from './StyledButton'; // Import the new StyledButton

const StartButton = ({ onClick, disabled }) => {
  return (
    <Box style={{ ...globalStyles.centeredOverlay, top: '40%' }}> {/* Adjust top as needed */}
      <StyledButton
        onClick={onClick}
        disabled={disabled}
        variant="primary" 
        size="xl"
        // radius is handled by StyledButton default or can be overridden if needed
        // Specific style overrides for backgroundColor, color, fontSize, padding, boxShadow 
        // are now handled by StyledButton based on variant and size. 
        // We can pass additional style props if absolutely necessary.
      >
        Start Minimal Tracking
      </StyledButton>
    </Box>
  );
};

export default StartButton; 