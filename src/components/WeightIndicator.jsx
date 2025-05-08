import React from 'react';
import { Group, Text, Paper } from '@mantine/core';
import StyledButton from './common/StyledButton';

const WeightIndicator = ({ weight, setWeight }) => {
  const handleAdjustWeight = (amount) => {
    setWeight(w => {
      const newWeight = w + amount;
      if (newWeight < 0) return 0;
      if (newWeight > 500) return 500;
      return newWeight;
    });
  };

  return (
    <Paper 
      shadow="md" 
      p="sm"
    >
      <Group position="center" spacing="sm">
        <StyledButton
          variant="secondary"
          square={true}
          size="xl"
          onClick={() => handleAdjustWeight(-10)}
          aria-label="Decrease weight by 10"
        >
          -10
        </StyledButton>
        <StyledButton
          variant="secondary"
          square={true}
          size="xl"
          onClick={() => handleAdjustWeight(-5)}
          aria-label="Decrease weight by 5"
        >
          -5
        </StyledButton>
        <Text 
          style={{
            minWidth: 70, 
            textAlign: 'center', 
            fontWeight: 700, 
          }}
          fz="xl"
        >
          {weight} lb
        </Text>
        <StyledButton
          variant="secondary"
          square={true}
          size="xl"
          onClick={() => handleAdjustWeight(5)}
          aria-label="Increase weight by 5"
        >
          +5
        </StyledButton>
        <StyledButton
          variant="secondary"
          square={true}
          size="xl"
          onClick={() => handleAdjustWeight(10)}
          aria-label="Increase weight by 10"
        >
          +10
        </StyledButton>
      </Group>
    </Paper>
  );
};

export default WeightIndicator; 