import React from 'react';
import { Group, Text, Paper } from '@mantine/core';
import StyledButton from './common/StyledButton';
// import { globalStyles } from '../styles/globalStyles'; // No longer needed

const RepGoalIndicator = ({ repGoal, setRepGoal }) => {
  const handleAdjustRepGoal = (amount) => {
    setRepGoal(g => {
      const newGoal = g + amount;
      if (newGoal < 1) return 1;
      if (newGoal > 99) return 99;
      return newGoal;
    });
  };

  return (
    <Paper 
      shadow="md" 
      // radius will use theme default
      p="sm" // Use theme spacing key for padding
      // backgroundColor and boxShadow will come from Paper theme styles in src/theme/index.js
    >
      <Group position="center" spacing="sm"> {/* Use theme spacing key */}
        <StyledButton
          variant="secondary"
          square={true}
          size="xl" // Keep xl size
          onClick={() => handleAdjustRepGoal(-5)}
          aria-label="Decrease rep goal by 5"
        >
          -5
        </StyledButton>
        <StyledButton
          variant="secondary"
          square={true}
          size="xl" // Keep xl size
          onClick={() => handleAdjustRepGoal(-1)}
          aria-label="Decrease rep goal by 1"
        >
          -1
        </StyledButton>
        <Text 
          style={{
            minWidth: 90, // Adjusted minWidth for larger text + "reps"
            textAlign: 'center',
            // color: globalStyles.colors.lightText, // Will come from Paper theme
            fontWeight: 700,
            // fontSize: globalStyles.fontSizes.xl // Will come from Paper theme or default Text
          }}
          fz="xl" // Use Mantine font size prop, inherits color from Paper
        >
          {repGoal} reps
        </Text>
        <StyledButton
          variant="secondary"
          square={true}
          size="xl" // Keep xl size
          onClick={() => handleAdjustRepGoal(1)}
          aria-label="Increase rep goal by 1"
        >
          +1
        </StyledButton>
        <StyledButton
          variant="secondary"
          square={true}
          size="xl" // Keep xl size
          onClick={() => handleAdjustRepGoal(5)}
          aria-label="Increase rep goal by 5"
        >
          +5
        </StyledButton>
      </Group>
    </Paper>
  );
};

export default RepGoalIndicator; 