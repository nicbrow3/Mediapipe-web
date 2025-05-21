import React from 'react';
import { Text, Box } from '@mantine/core';

const FpsDisplay = ({ fps, inferenceTime }) => {
  return (
    <Box 
      bg="rgba(0, 0, 0, 0.7)" 
      px="md" 
      py="xs" 
      style={{ 
        borderRadius: '5px', 
        display: 'flex', 
        alignItems: 'center', 
        height: '42px' // Match ActionIcon size 'lg'
      }}
    >
      <Text c="white" style={{ fontFamily: 'monospace', fontWeight: 500 }}>
        FPS: {fps || 0} | {inferenceTime || 0}ms
      </Text>
    </Box>
  );
};

export default FpsDisplay; 