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
    incrementReps: 1,
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
    const numValue = Number(value);

    // Initial prospective settings from current state
    let prospectiveSettings = { ...localSettings };

    // Apply the incoming change and auto-adjustments
    if (key === 'incrementReps') {
        if (isNaN(numValue) || numValue <= 0) { 
            // console.warn('Invalid increment value'); 
            return; 
        }
        prospectiveSettings.incrementReps = numValue;
        const newIncrement = numValue;

        // Adjust topReps to be the closest multiple of the new increment
        let adjustedTopReps = Math.max(
            newIncrement, // Ensures topReps is at least the increment value itself
            Math.round(localSettings.topReps / newIncrement) * newIncrement
        );

        // Clamp adjustedTopReps: must be >= (startReps + newIncrement) and <= system max (50)
        const minTopRepsBasedOnStart = localSettings.startReps + newIncrement;
        adjustedTopReps = Math.max(minTopRepsBasedOnStart, adjustedTopReps);
        adjustedTopReps = Math.min(50, adjustedTopReps); // System max for topReps
        prospectiveSettings.topReps = adjustedTopReps;

    } else if (['startReps', 'topReps', 'endReps'].includes(key)) {
        if (isNaN(numValue) || numValue <= 0) { 
            // console.warn(`Invalid value for ${key}`);
             return; 
        }
        prospectiveSettings[key] = numValue;
    } else if (key === 'restTimePerRep') {
        if (isNaN(numValue) || numValue < 0) { // Allow 0 for rest time
            // console.warn('Invalid rest time'); 
            return; 
        }
        prospectiveSettings[key] = numValue;
    } else { // For boolean toggles like autoAdvance
        prospectiveSettings[key] = value;
    }

    // --- Validation based on the fully formed prospectiveSettings ---
    // Base validation from NumberInput min/max should handle most direct input errors.
    // These are relational validations.

    if (prospectiveSettings.startReps > prospectiveSettings.topReps) {
        // console.warn("Validation Fail: Start Reps cannot be greater than Top Reps");
        return;
    }
    if (prospectiveSettings.endReps > prospectiveSettings.topReps) {
        // console.warn("Validation Fail: End Reps cannot be greater than Top Reps");
        return;
    }

    // Validation for reachability if incrementReps > 1
    if (prospectiveSettings.incrementReps > 1) {
      if ((prospectiveSettings.topReps - prospectiveSettings.startReps) % prospectiveSettings.incrementReps !== 0) {
        // console.warn('Top reps not reachable from start reps with current increment.');
        return; // Prevent change
      }
      if ((prospectiveSettings.topReps - prospectiveSettings.endReps) % prospectiveSettings.incrementReps !== 0) {
        // console.warn('End reps not reachable from top reps with current increment.');
        return; // Prevent change
      }
    }

    // If all validations pass, apply the changes
    setLocalSettings(prospectiveSettings);
    if (onSettingsChange) {
      onSettingsChange(prospectiveSettings);
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
          step={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Top Reps"
          value={localSettings.topReps}
          onChange={(value) => handleSettingChange('topReps', value)}
          min={localSettings.startReps + (localSettings.incrementReps > 0 ? localSettings.incrementReps : 1)}
          max={50}
          step={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
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
          max={localSettings.topReps}
          step={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <NumberInput
          label="Increment"
          value={localSettings.incrementReps}
          onChange={(value) => handleSettingChange('incrementReps', value)}
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