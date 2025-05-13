import React, { useState } from 'react';
import { Stack, Group, Text, NumberInput, Button } from '@mantine/core';
import { globalStyles } from '../../styles/globalStyles';

/**
 * SessionSettings Component
 * 
 * Provides a user interface for configuring timed workout session parameters:
 * - Exercise duration (seconds)
 * - Rest duration (seconds)
 * - Total number of sets to perform
 * 
 * Settings are disabled during active sessions to prevent mid-session changes.
 * Changes are communicated to parent components via onSettingsChange callback.
 */
const SessionSettings = ({
  exerciseSetDuration = 30,
  restPeriodDuration = 15,
  totalSets = 10,
  onSettingsChange,
  onStartSession,
  isSessionActive = false,
}) => {
  const [sessionConfig, setSessionConfig] = useState({
    exerciseSetDuration,
    restPeriodDuration,
    totalSets,
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
    <Stack spacing="xs" p="md" style={{ maxWidth: '100%' }}>
      <Text weight={500} size="sm">Session Configuration</Text>
      
      <Group spacing="xs" grow style={{ alignItems: 'flex-start' }}>
        <NumberInput
          label="Exercise Time (sec)"
          value={sessionConfig.exerciseSetDuration}
          onChange={(value) => handleConfigChange('exerciseSetDuration', value)}
          min={5}
          max={300}
          step={5}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Rest Time (sec)"
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
      </Group>
      
      {onStartSession && (
        <Button 
          onClick={() => onStartSession(sessionConfig)}
          variant={globalStyles.buttonVariants.default}
          color={isSessionActive ? 'red' : 'blue'}
          fullWidth
        >
          {isSessionActive ? 'Stop Session' : 'Start Random Session'}
        </Button>
      )}
    </Stack>
  );
};

export default SessionSettings; 