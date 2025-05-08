import React from 'react';
import { Loader, Box, Text } from '@mantine/core';
import { globalStyles } from '../../styles/globalStyles'; // Adjust path as needed

const LoadingDisplay = ({ text = 'Loading Camera & Model...' }) => {
  return (
    <Box style={globalStyles.centeredOverlay}>
      <Loader 
        size="xl" 
        color={globalStyles.colors.primary} 
      />
      <Text style={{ color: globalStyles.colors.lightText, fontWeight: 'bold' }}>
        {text}
      </Text>
    </Box>
  );
};

export default LoadingDisplay; 