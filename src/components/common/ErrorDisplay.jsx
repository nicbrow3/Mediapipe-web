import React from 'react';
import { Box, Text } from '@mantine/core';
import { globalStyles } from '../../styles/globalStyles'; // Adjust path as needed
import StyledButton from './StyledButton'; // Import the new StyledButton

const ErrorDisplay = ({ message, onRetry }) => {
  if (!message) return null;

  return (
    <Box 
      style={{
        ...globalStyles.centeredOverlay,
        backgroundColor: globalStyles.colors.errorBackground,
        padding: globalStyles.controlPaddings.lg, // Using our global padding for consistency
        borderRadius: globalStyles.defaultBorderRadius,
        maxWidth: '80%',
        textAlign: 'center',
      }}
    >
      <Text style={{ color: globalStyles.colors.error, fontWeight: 'bold', marginBottom: '15px' }}>
        {message}
      </Text>
      {onRetry && (
        <StyledButton
          onClick={onRetry}
          variant="primary" // Or choose another variant if more appropriate, e.g., secondary
          size="md"
          // radius is handled by StyledButton default
          // Specific style overrides are handled by StyledButton
        >
          Try Again
        </StyledButton>
      )}
    </Box>
  );
};

export default ErrorDisplay; 