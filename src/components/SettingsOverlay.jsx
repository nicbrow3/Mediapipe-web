import React, { useState } from 'react';
import { Modal, Box, Title, Divider, Switch, Stack, NumberInput, ColorPicker, Text, Group, ActionIcon, Popover } from '@mantine/core';

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
  onSecondaryLandmarksChange = () => {},
  cameraOpacity = 100,
  onCameraOpacityChange = () => {},
  alwaysShowConnections = false,
  onToggleAlwaysShowConnections = () => {},
  highlightExerciseConnections = false,
  onToggleHighlightExerciseConnections = () => {},
  connectionHighlightColor = "#00FF00",
  onConnectionHighlightColorChange = () => {}
}) => {
  // State to control the color picker popover
  const [colorPickerOpened, setColorPickerOpened] = useState(false);

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

          <Box>
            <NumberInput
              label="Camera Feed Opacity (%)"
              description="Adjust the transparency of the live camera feed."
              value={cameraOpacity}
              onChange={(value) => onCameraOpacityChange(Number(value))}
              min={0}
              max={100}
              step={5}
              styles={{ root: { maxWidth: '300px' } }}
            />
          </Box>

          <Title order={4} mt="md">Visuals</Title>
          <Divider my="xs" />

          <Box>
            <Switch
              checked={alwaysShowConnections}
              onChange={(event) => onToggleAlwaysShowConnections(event.currentTarget.checked)}
              label="Always Show Landmark Connections"
              description="If enabled, all connections draw regardless of landmark visibility. If disabled, connections only draw if landmarks meet the visibility threshold."
              size="md"
            />
          </Box>

          <Box>
            <Group align="center" justify="space-between" wrap="nowrap">
              <div style={{ flex: 1 }}>
                <Switch
                  checked={highlightExerciseConnections}
                  onChange={(event) => onToggleHighlightExerciseConnections(event.currentTarget.checked)}
                  label="Highlight Exercise Connections"
                  description="Highlight the landmark connections used for the current exercise"
                  size="md"
                />
              </div>
              
              {highlightExerciseConnections && (
                <Popover 
                  opened={colorPickerOpened} 
                  onClose={() => setColorPickerOpened(false)}
                  position="right"
                  withArrow
                  shadow="md"
                >
                  <Popover.Target>
                    <ActionIcon 
                      variant="outline" 
                      style={{ 
                        backgroundColor: connectionHighlightColor,
                        borderColor: '#666',
                        width: '30px',
                        height: '30px'
                      }}
                      onClick={() => setColorPickerOpened((prev) => !prev)}
                    />
                  </Popover.Target>
                  
                  <Popover.Dropdown>
                    <Text size="sm" fw={500} mb="xs">Connection Highlight Color</Text>
                    <ColorPicker
                      value={connectionHighlightColor}
                      onChange={(color) => {
                        onConnectionHighlightColorChange(color);
                        // Optional: close the popover after selecting a color
                        // setColorPickerOpened(false);
                      }}
                      format="hex"
                      swatches={['#467dcf', '#d14d4d', '#d1d152', '#bf49bf', '#5ec465']}
                    />
                  </Popover.Dropdown>
                </Popover>
              )}
            </Group>
          </Box>

        </Stack>
      </Box>
    </Modal>
  );
};

const SettingsOverlay = React.memo(SettingsOverlayInternal);

export default SettingsOverlay; 