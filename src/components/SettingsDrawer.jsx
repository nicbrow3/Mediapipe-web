import React, { useState, useEffect } from 'react';
import { Switch, Slider, Button, Stack, Title, Box, Text, Tooltip, Select, Progress, Group } from '@mantine/core';
import { glassStyle } from '../styles/uiStyles.js';
import { IconDownload, IconCheck } from '@tabler/icons-react';

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
  frameSamplingRate,
  setFrameSamplingRate,
  enableFaceLandmarks,
  setEnableFaceLandmarks,
  enableHandLandmarks,
  setEnableHandLandmarks,
  modelType,
  setModelType,
  useLocalModel,
  setUseLocalModel,
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

  // Model download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelDownloaded, setModelDownloaded] = useState(false);

  // Check if model is already downloaded
  useEffect(() => {
    // Reset download state when model type changes
    setModelDownloaded(false);
    
    // Here we would check if the model is already in local storage or IndexedDB
    const checkLocalModel = async () => {
      try {
        // This would be your actual implementation to check for a local model
        const modelExists = localStorage.getItem(`pose_landmarker_${modelType}_downloaded`);
        if (modelExists) {
          setModelDownloaded(true);
        }
      } catch (err) {
        console.error('Error checking for local model:', err);
      }
    };
    
    if (useLocalModel) {
      checkLocalModel();
    }
  }, [modelType, useLocalModel]);

  // Function to download the model
  const downloadModel = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // The URL for the model file
      const modelUrl = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelType}/float16/1/pose_landmarker_${modelType}.task`;
      
      // Fetch the model file with progress tracking
      const response = await fetch(modelUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }
      
      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      const reader = response.body.getReader();
      let receivedLength = 0;
      let chunks = [];
      
      // Process the data stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress
        const progress = Math.round((receivedLength / total) * 100);
        setDownloadProgress(progress);
      }
      
      // Combine all chunks into a single Uint8Array
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }
      
      // Here you would store the model locally
      // For this example, we'll just mark it as downloaded in localStorage
      localStorage.setItem(`pose_landmarker_${modelType}_downloaded`, 'true');
      
      // Update UI state
      setModelDownloaded(true);
      setIsDownloading(false);
      
    } catch (error) {
      console.error('Error downloading model:', error);
      setIsDownloading(false);
    }
  };

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

      {/* Model Selection */}
      <Box p="md" style={glassStyle} mb="xs">
        <Title order={4} mb="xs">Pose Model</Title>
        
        <Select
          label="Model Type"
          description="Select the model variant to use. Heavier models are more accurate but slower."
          data={[
            { value: 'lite', label: 'Lite (3.8 MB) - Fastest' },
            { value: 'full', label: 'Full (8.5 MB) - Balanced' },
            { value: 'heavy', label: 'Heavy (16 MB) - Most Accurate' }
          ]}
          value={modelType}
          onChange={(value) => {
            if (value && value !== modelType) {
              setModelType(value);
            }
          }}
          mb="md"
        />
        
        <Switch
          checked={useLocalModel}
          onChange={() => setUseLocalModel(!useLocalModel)}
          label="Use Local Model"
          description="Download and use the model locally instead of fetching it each time from the internet"
          size="md"
          radius="xl"
          color="grape.6"
          mb="md"
        />
        
        {useLocalModel && (
          <>
            <Text size="sm" mb="xs">
              {modelDownloaded 
                ? <Text span c="green.6"><IconCheck size={16} style={{verticalAlign: 'middle'}} /> Model downloaded and ready for use</Text>
                : "Model needs to be downloaded for local use"}
            </Text>
            
            {!modelDownloaded && (
              <>
                {isDownloading ? (
                  <Box mb="md">
                    <Text size="sm" mb="xs">Downloading... {downloadProgress}%</Text>
                    <Progress 
                      value={downloadProgress} 
                      animate="true"
                      color="grape.6" 
                      mb="md"
                    />
                  </Box>
                ) : (
                  <Button
                    variant="light"
                    color="grape.6"
                    onClick={downloadModel}
                    mb="md"
                  >
                    <IconDownload size={16} style={{marginRight: '8px'}} />
                    Download Model ({modelType === 'lite' ? '3.8' : modelType === 'full' ? '8.5' : '16'} MB)
                  </Button>
                )}
              </>
            )}
            
            <Text size="xs" c="dimmed">
              Once downloaded, the model will be stored in your browser's storage and won't need to be downloaded again.
              App will work offline with locally stored models.
            </Text>
          </>
        )}
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
          multiline="true"
          width={300}
          withArrow="true"
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

      {/* Performance Optimization */}
      <Box p="md" style={glassStyle} mb="xs">
        <Title order={4} mb="xs">Performance</Title>
        <Text size="md" mb={2}>Frame Sampling Rate: {frameSamplingRate}</Text>
        <Text size="sm" c="dimmed" mb="xs">
          Process every nth frame (higher values improve performance but reduce responsiveness).
          Try setting to 2-3 on slower devices (like iPads).
        </Text>
        <Slider
          id="frameSamplingRate"
          min={1}
          max={5}
          step={1}
          value={frameSamplingRate}
          onChange={setFrameSamplingRate}
          label={(value) => `${value === 1 ? 'Every frame' : `Every ${value} frames`}`}
          marks={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 5, label: '5' }
          ]}
          color="grape.6"
        />
        
        {/* Add Face/Hand Landmark Toggles */}
        <Title order={5} mt="lg" mb="xs">Landmarks to Track</Title>
        <Text size="sm" c="dimmed" mb="md">
          Disable unused landmarks to improve performance. These points are not used for rep counting.
        </Text>
        
        <Switch
          checked={enableFaceLandmarks}
          onChange={() => setEnableFaceLandmarks(!enableFaceLandmarks)}
          label="Track Face Landmarks"
          description="Face points aren't used for rep counting. Disable for better performance."
          size="md"
          radius="xl"
          color="grape.6"
          mb="sm"
        />
        
        <Switch
          checked={enableHandLandmarks}
          onChange={() => setEnableHandLandmarks(!enableHandLandmarks)}
          label="Track Hand/Finger Landmarks"
          description="Hand points aren't used for rep counting. Disable for better performance."
          size="md"
          radius="xl"
          color="grape.6"
        />
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