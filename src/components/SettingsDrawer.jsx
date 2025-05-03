import React from 'react';
import { Switch, Slider, Button, Stack, Title, Box, Text, Tooltip } from '@mantine/core';
import { glassStyle } from '../styles/uiStyles.js';

const SettingsDrawer = ({
  colorScheme,
  setColorScheme,
  videoOpacity,
  setVideoOpacity,
  smoothingFactor,
  setSmoothingFactor,
  strictLandmarkVisibility,
  setStrictLandmarkVisibility,
  showDebug,
  setShowDebug,
  resetSettings,
  repDebounceDuration,
  setRepDebounceDuration,
  useSmoothedRepCounting,
  setUseSmoothedRepCounting,
  showRepFlowDiagram,
  setShowRepFlowDiagram,
  visibilityThreshold,
  setVisibilityThreshold,
}) => {
  // Tooltip content for rep flow diagram explanation
  const repFlowTooltip = (
    <div style={{ maxWidth: '300px', textAlign: 'left' }}>
      <Text fw={500} mb="xs">Rep Counting Method</Text>
      <Text size="sm" mb="xs">
        Reps are counted using a state-based approach, tracking your movement through a complete sequence:
      </Text>
      <Text size="sm" mb="xs">
        <span style={{ color: '#3498db' }}>Relaxed</span> → 
        <span style={{ color: '#f39c12' }}> Concentric</span> → 
        <span style={{ color: '#27ae60' }}> Peak</span> → 
        <span style={{ color: '#9b59b6' }}> Eccentric</span> → 
        <span style={{ color: '#3498db' }}> Relaxed</span>
      </Text>
      <Text size="sm">
        A rep is only counted when you complete the full motion cycle and hold the peak position.
      </Text>
    </div>
  );

  return (
    <Stack spacing="xl">
      {/* Light/Dark Mode Toggle */}
      <Box p="md" style={glassStyle} mb="xs">
        <Title order={4} mb="xs">Theme</Title>
        <Switch
          checked={colorScheme === 'dark'}
          onChange={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          label={colorScheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          size="md"
          radius="xl"
          color="grape.6"
        />
      </Box>

      {/* Camera Feed Visibility Slider */}
      <Box p="md" style={glassStyle} mb="xs">
        <Title order={4} mb="xs">Camera Feed</Title>
        <Text size="md" mb={2}>Visibility: {Math.round(videoOpacity)}%</Text>
        <Text size="sm" c="dimmed" mb="xs">
          Adjust how visible the camera feed is in the background.
        </Text>
        <Slider
          id="videoOpacity"
          min={0}
          max={100}
          step={0.5}
          value={videoOpacity}
          onChange={setVideoOpacity}
          label={null}
          color="grape.6"
        />
      </Box>

      {/* Smoothing Factor Slider */}
      <Box p="md" style={glassStyle} mb="xs">
        <Title order={4} mb="xs">Rep Graph</Title>
         <Text size="md" mb="xs">Smoothing Factor: {smoothingFactor}</Text>
         <Text size="sm" c="dimmed" mb="xs">
          Reduce noise in the rep data.
        </Text>
        <Slider
          id="smoothingFactor"
          min={0}
          max={30}
          step={1}
          value={smoothingFactor}
          onChange={setSmoothingFactor}
          label={null} // Label is above now
          color="grape.6"
        />
         {/* Use Smoothed Data Switch */}
         <Switch
           checked={useSmoothedRepCounting}
           onChange={() => setUseSmoothedRepCounting(!useSmoothedRepCounting)}
           label="Use Smoothed Data for Rep Counting"
           size="md"
           radius="xl"
           color="grape.6"
           mt="md"
         />
      </Box>

      {/* Strict Landmark Visibility Toggle */}
      <Box p="md" style={glassStyle} mb="xs">
         <Title order={4} mb="xs">Rep Counting</Title>
        <Switch
          checked={strictLandmarkVisibility}
          onChange={() => setStrictLandmarkVisibility(!strictLandmarkVisibility)}
          label="Require ALL primary landmarks visible"
          description="Only count reps if all required pose landmarks are clearly visible."
          size="md"
          radius="xl"
          color="grape.6"
        />
        
        {/* Visibility Threshold Slider */}
        <Text size="md" mt="md">Landmark Visibility Threshold: {(visibilityThreshold * 100).toFixed(0)}%</Text>
        <Text size="sm" c="dimmed" mb="xs">
          Adjust how visible a landmark needs to be before it's tracked. Lower values reduce pauses but may decrease accuracy.
        </Text>
        <Slider
          id="visibilityThreshold"
          min={0.3}
          max={0.9}
          step={0.05}
          value={visibilityThreshold}
          onChange={setVisibilityThreshold}
          label={(value) => `${(value * 100).toFixed(0)}%`}
          color="grape.6"
          mb="md"
        />
        
        {/* Rep Debounce Duration Slider */}
        <Text size="sm" mt="md">Debounce Duration: {repDebounceDuration} ms</Text>
        <Slider
          id="repDebounceDuration"
          min={0}
          max={1000}
          step={10}
          value={repDebounceDuration}
          onChange={setRepDebounceDuration}
          color="grape.6"
        />
        
        {/* Show Rep Flow Diagram Toggle with Tooltip */}
        <Tooltip 
          label={repFlowTooltip}
          multiline
          width={300}
          withArrow
          position="right"
        >
          <div>
            <Switch
              checked={showRepFlowDiagram}
              onChange={() => setShowRepFlowDiagram(!showRepFlowDiagram)}
              label="Show Rep Flow Diagram"
              description="Display the sequence of movements needed to complete a rep."
              size="md"
              radius="xl"
              color="grape.6"
              mt="md"
            />
          </div>
        </Tooltip>
       </Box>

      {/* Debug Toggle */}
      <Box p="md" style={glassStyle} mb="xs">
        <Title order={4} mb="xs">Debugging</Title>
        <Switch
          checked={showDebug}
          onChange={() => setShowDebug(!showDebug)}
          label="Show Debug Logs"
          description="Enable to view technical debug output in the console and below."
          size="md"
          radius="xl"
          color="grape.6"
        />
      </Box>

      {/* Reset Settings Button */}
       <Box p="md" style={glassStyle} mt="md">
        <Button
          variant="filled"
          color="grape.6"
          radius="md"
          fullWidth
          onClick={resetSettings}
        >
          Reset Settings to Default
        </Button>
       </Box>
    </Stack>
  );
};

export default SettingsDrawer; 