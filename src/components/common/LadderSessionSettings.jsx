import React, { useState, useEffect } from 'react';
import { Stack, Group, Text, NumberInput, Checkbox } from '@mantine/core';

/**
 * LadderSessionSettings Component
 * 
 * Provides a user interface for configuring ladder workout session parameters:
 * - Starting rep count (usually 1, but could be 2-5)
 * - Top of the ladder rep count (the maximum reps to reach)
 * - Ending rep count (usually 1, but could be 2-5)
 * - Increment amount (how many reps to add/subtract between sets)
 * - Rest time per rep (e.g., 3 seconds per rep in the current set)
 * - Auto-advance when rep count is reached (automatically moves to next level)
 * 
 * Settings are disabled during active sessions to prevent mid-session changes.
 */
const LadderSessionSettings = ({
  ladderSettings = {
    startReps: 1,
    topReps: 10,
    endReps: 1,
    increment: 1,
    restTimePerRep: 3,
    autoAdvance: true,
  },
  onSettingsChange,
  isSessionActive = false,
}) => {
  const [localSettings, setLocalSettings] = useState(ladderSettings);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(ladderSettings);
  }, [ladderSettings]);

  const handleSettingChange = (key, value) => {
    // Handle special validation cases
    if (key === 'topReps' && value <= localSettings.startReps) {
      // Top reps must be greater than start reps
      return;
    }
    
    // Apply changes
    const updatedSettings = {
      ...localSettings,
      [key]: value,
    };
    
    setLocalSettings(updatedSettings);
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  };

  return (
    <Stack spacing="xs" p="md" style={{ maxWidth: '100%' }}>
      {/* <Text weight={500} size="sm">Ladder Configuration</Text> */}
      
      <Group spacing="xs" grow style={{ alignItems: 'flex-start' }}>
        <NumberInput
          label="Start Reps"
          value={localSettings.startReps}
          onChange={(value) => handleSettingChange('startReps', value)}
          min={1}
          max={10}
          step={1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Top Reps"
          value={localSettings.topReps}
          onChange={(value) => handleSettingChange('topReps', value)}
          min={localSettings.startReps + 1}
          max={50}
          step={1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
      </Group>
      
      <Group spacing="xs" grow style={{ alignItems: 'flex-start' }}>
        <NumberInput
          label="End Reps"
          value={localSettings.endReps}
          onChange={(value) => handleSettingChange('endReps', value)}
          min={1}
          max={10}
          step={1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Increment"
          value={localSettings.increment}
          onChange={(value) => handleSettingChange('increment', value)}
          min={1}
          max={5}
          step={1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
      </Group>
      
      <NumberInput
        label="Rest Time per Rep (seconds)"
        description="Rest time will be this value multiplied by current reps"
        value={localSettings.restTimePerRep}
        onChange={(value) => handleSettingChange('restTimePerRep', value)}
        min={1}
        max={10}
        step={1}
        disabled={isSessionActive}
        style={{ width: '100%' }}
      />
      
      <Checkbox
        label="Auto-advance to next level when rep count is reached"
        checked={localSettings.autoAdvance}
        onChange={(event) => handleSettingChange('autoAdvance', event.currentTarget.checked)}
        disabled={isSessionActive}
        style={{ marginTop: '10px' }}
      />
    </Stack>
  );
};

export default LadderSessionSettings; 