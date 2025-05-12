import React from 'react';
import { Modal, Box, Text, Title, Divider, Switch, Stack } from '@mantine/core';

const SettingsOverlay = ({ 
  isOpen, 
  onClose, 
  smoothingEnabled = false, 
  onSmoothingChange = () => {}, 
  useThreePhases = false, 
  onPhaseModeChange = () => {} 
}) => {
  // console.log('SettingsOverlay component rendering. isOpen:', isOpen);

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
        </Stack>
      </Box>
    </Modal>
  );
};

export default SettingsOverlay; 