import React, { useState, useEffect } from 'react';
import { Stack, Group, Text, Checkbox } from '@mantine/core';
import CustomNumberInput from './CustomNumberInput';

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
            return; 
        }
        const newIncrement = numValue;
        prospectiveSettings.incrementReps = newIncrement;

        let currentStartReps = localSettings.startReps;
        let currentTopReps = localSettings.topReps;
        let currentEndReps = localSettings.endReps;

        // Adjust Start Reps
        const min_S_prop = newIncrement > 1 ? newIncrement : 1;
        let k_S = Math.max(0, Math.round((currentStartReps - min_S_prop) / newIncrement));
        let adjustedStartReps = min_S_prop + k_S * newIncrement;
        adjustedStartReps = Math.min(adjustedStartReps, 10); // Max for startReps
        adjustedStartReps = Math.max(adjustedStartReps, min_S_prop); // Ensure startReps' own min
        prospectiveSettings.startReps = adjustedStartReps;

        // Adjust Top Reps
        const min_T_prop_effective = prospectiveSettings.startReps + (newIncrement > 0 ? newIncrement : 1);
        let k_T = Math.max(0, Math.round((currentTopReps - min_T_prop_effective) / newIncrement));
        let adjustedTopReps = min_T_prop_effective + k_T * newIncrement;
        adjustedTopReps = Math.min(adjustedTopReps, 50); // Max for topReps
        adjustedTopReps = Math.max(adjustedTopReps, min_T_prop_effective);
        
        if (adjustedTopReps < min_T_prop_effective && newIncrement > 0) {
             adjustedTopReps = prospectiveSettings.startReps;
        }
        prospectiveSettings.topReps = adjustedTopReps;
        
        if (prospectiveSettings.startReps + newIncrement > prospectiveSettings.topReps && newIncrement > 0) {
            let targetMaxStart = prospectiveSettings.topReps - newIncrement;
            k_S = Math.max(0, Math.floor((targetMaxStart - min_S_prop) / newIncrement)); 
            adjustedStartReps = min_S_prop + k_S * newIncrement;
            adjustedStartReps = Math.min(adjustedStartReps, 10); 
            adjustedStartReps = Math.max(adjustedStartReps, min_S_prop); 
            prospectiveSettings.startReps = adjustedStartReps;
        }

        // Adjust End Reps
        const min_E_prop = newIncrement > 1 ? newIncrement : 1;
        let k_E = Math.max(0, Math.round((currentEndReps - min_E_prop) / newIncrement));
        let adjustedEndReps = min_E_prop + k_E * newIncrement;
        adjustedEndReps = Math.min(adjustedEndReps, prospectiveSettings.topReps); 
        adjustedEndReps = Math.max(adjustedEndReps, min_E_prop);
        prospectiveSettings.endReps = adjustedEndReps;

    } else if (['startReps', 'topReps', 'endReps'].includes(key)) {
        if (isNaN(numValue) || numValue <= 0) { 
             return; 
        }

        const currentIncrement = prospectiveSettings.incrementReps;
        if ((key === 'startReps' || key === 'endReps') && currentIncrement > 1) {
            if (numValue % currentIncrement !== 0) {
                return;
            }
            if (numValue < currentIncrement) {
                return;
            }
        }
        prospectiveSettings[key] = numValue;
    } else if (key === 'restTimePerRep') {
        if (isNaN(numValue) || numValue < 0) { // Allow 0 for rest time
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
        return;
    }
    if (prospectiveSettings.endReps > prospectiveSettings.topReps) {
        return;
    }

    // Validation for reachability if incrementReps > 1
    if (prospectiveSettings.incrementReps > 1) {
      if ((prospectiveSettings.topReps - prospectiveSettings.startReps) % prospectiveSettings.incrementReps !== 0) {
        return; // Prevent change
      }
      if ((prospectiveSettings.topReps - prospectiveSettings.endReps) % prospectiveSettings.incrementReps !== 0) {
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
        <CustomNumberInput
          label="Start Reps"
          value={localSettings.startReps}
          onChange={(value) => handleSettingChange('startReps', value)}
          min={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
          max={10}
          step={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <CustomNumberInput
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
        <CustomNumberInput
          label="End Reps"
          value={localSettings.endReps}
          onChange={(value) => handleSettingChange('endReps', value)}
          min={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
          max={localSettings.topReps}
          step={localSettings.incrementReps > 1 ? localSettings.incrementReps : 1}
          disabled={isSessionActive}
          style={{ flex: 1 }}
        />
        
        <CustomNumberInput
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
      
      <CustomNumberInput
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