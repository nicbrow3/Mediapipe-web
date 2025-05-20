import React, { useState } from 'react';
import { Stack, Group, Text, NumberInput, Button, Flex, Switch } from '@mantine/core';

/**
 * SessionSettings Component
 * 
 * Provides a user interface for configuring timed workout session parameters:
 * - Exercise duration (seconds)
 * - Rest duration (seconds)
 * - Total number of sets to perform
 * - Random exercise toggle (enables/disables random exercise selection)
 * 
 * Settings are disabled during active sessions to prevent mid-session changes.
 * Changes are communicated to parent components via onSettingsChange callback.
 */
const TimedSessionSettings = ({
  exerciseSetDuration = 30,
  restPeriodDuration = 15,
  totalSets = 10,
  useRandomExercises = true,
  onSettingsChange,
  onStartSession,
  isSessionActive = false,
}) => {
  const [sessionConfig, setSessionConfig] = useState({
    exerciseSetDuration,
    restPeriodDuration,
    totalSets,
    useRandomExercises,
  });

  const handleConfigChange = (key, value) => {
    const updatedConfig = {
      ...sessionConfig,
      [key]: value,
    };
    setSessionConfig(updatedConfig);
    if (onSettingsChange) {
      onSettingsChange(updatedConfig);
    }
  };

  return (
    <Stack gap="sm" p="md" style={{ maxWidth: '100%' }}>
      {/* <Text weight={500} size="sm"> Configuration</Text> */}
      
      <Flex
      gap="md"
      justify='center'
      >
        <NumberInput
          label="Exercise Time"
          value={sessionConfig.exerciseSetDuration}
          onChange={(value) => handleConfigChange('exerciseSetDuration', value)}
          min={5}
          max={300}
          step={5}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Rest Time"
          value={sessionConfig.restPeriodDuration}
          onChange={(value) => handleConfigChange('restPeriodDuration', value)}
          min={5}
          max={120}
          step={5}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Total Sets"
          value={sessionConfig.totalSets}
          onChange={(value) => handleConfigChange('totalSets', value)}
          min={1}
          max={50}
          step={1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
      </Flex>

      <Group position="center" mt="xs">
        <Switch
          label="Use Random Exercises"
          checked={sessionConfig.useRandomExercises}
          onChange={(event) => handleConfigChange('useRandomExercises', event.currentTarget.checked)}
          disabled={isSessionActive}
        />
      </Group>
    </Stack>
  );
};

export default TimedSessionSettings; 