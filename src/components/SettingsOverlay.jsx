import React from 'react';
import { Modal, Box, Title, Divider, Switch, Stack, NumberInput } from '@mantine/core';

const SettingsOverlayInternal = ({ 
  isOpen, 
  onClose, 
  smoothingEnabled = false, 
  onSmoothingChange = () => {}, 
  useThreePhases = false, 
  onPhaseModeChange = () => {},
  // used in PhaseTracker.jsx and PhaseTrackerDisplay.jsx
  requireAllLandmarks = false, 
  onLandmarkVsibilityModeChange = () => {},
  minimumVisibilityThreshold = 25,
  onMinimumVisibilityChange = () => {},
  requireSecondaryLandmarks = false,
  onSecondaryLandmarksChange = () => {}
// routed to the minimalTracker component
// used in useAppSettings.js


}) => {
  // console.log('SettingsOverlay rendering with threshold:', minimumVisibilityThreshold);
  // Commented out the log as per user's observation that it should only log when settings change,
  // and with React.memo it should render less often. 
  // If needed for debugging, it can be re-enabled.

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Settings"
      padding="xl"
      size="md"
      centered
    >
      <Box>
        <Title order={3}>Application Settings</Title>
        <Divider my="sm" />
        
        <Stack gap="md">
          <Box>
            <Switch
              checked={smoothingEnabled}
              onChange={(event) => onSmoothingChange(event.currentTarget.checked)}
              label="Angle Smoothing"
              description="Smooth angle measurements to reduce jitter"
              size="md"
            />
          </Box>
          <Box>
            <Switch
              checked={useThreePhases}
              onChange={(event) => onPhaseModeChange(event.currentTarget.checked)}
              label="Use 3 Phases"
              description="Simplify movement tracking to 3 phases instead of 4"
              size="md"
            />
          </Box>
          <Box>
            <Switch
              checked={requireAllLandmarks}
              onChange={(event) => onLandmarkVsibilityModeChange(event.currentTarget.checked)}
              label="Require primary landmarks visibility"
              description="Only track reps if primary angle landmarks meet visibility threshold"
              size="md"
            />
            
            {requireAllLandmarks && (
              <>
                <Box mt="sm" ml="md">
                  <NumberInput
                    label="Minimum Visibility Threshold (%)"
                    description="Landmarks must have at least this visibility level (0-80%)"
                    value={minimumVisibilityThreshold}
                    onChange={(value) => onMinimumVisibilityChange(Number(value))}
                    min={0}
                    max={80}
                    step={5}
                    styles={{ root: { maxWidth: '300px' } }}
                  />
                </Box>
                
                <Box mt="sm" ml="md">
                  <Switch
                    checked={requireSecondaryLandmarks}
                    onChange={(event) => onSecondaryLandmarksChange(event.currentTarget.checked)}
                    label="Also require secondary landmarks"
                    description="Check visibility of non-angle landmarks too"
                    size="md"
                  />
                </Box>
              </>
            )}
          </Box>
        </Stack>
      </Box>
    </Modal>
  );
};

const SettingsOverlay = React.memo(SettingsOverlayInternal);

export default SettingsOverlay; 