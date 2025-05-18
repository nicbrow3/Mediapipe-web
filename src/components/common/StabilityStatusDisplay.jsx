import React from 'react';
import { Text } from '@mantine/core';

const StabilityStatusDisplay = ({ enableStationaryTracking, stabilityState }) => {
  if (!enableStationaryTracking) {
    return null;
  }

  let message = '';
  let color = 'dimmed';

  switch (stabilityState) {
    case 'stabilizing':
      message = 'Stabilizing...';
      color = 'yellow';
      break;
    case 'stable':
      message = 'Stable';
      color = 'green';
      break;
    case 'unstable':
      message = 'Too much movement!';
      color = 'red';
      break;
    case 'idle':
      message = 'Position yourself for tracking.';
      color = 'dimmed';
      break;
    default:
      message = '';
  }

  if (!message) {
    return null;
  }

  return (
    <Text c={color} ta="center" fw={500} size="sm">
      {message}
    </Text>
  );
};

export default StabilityStatusDisplay; 