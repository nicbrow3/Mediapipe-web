import React, { useState, useEffect, useRef } from 'react';
import { Text, Box, Stack } from '@mantine/core';
import { glassStyle } from '../styles/uiStyles';

/**
 * FpsCounter component displays the current frames per second
 * @param {Object} props Component props
 * @param {string} props.position Position (e.g., 'top-left', 'top-center', 'bottom-right')
 * @param {boolean} props.showDetails Show additional timing details
 * @returns {JSX.Element} FPS counter UI component
 */
const FpsCounter = ({ position = 'bottom-left', showDetails = false }) => {
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState({ jsHeapSizeLimit: 0, totalJSHeapSize: 0, usedJSHeapSize: 0 });
  const frameTimeRef = useRef([]);
  const previousTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const memoryUpdateIntervalRef = useRef(null);
  const fpsHistoryRef = useRef([]);
  const updateCountRef = useRef(0);
  const inferenceTimesRef = useRef([]);

  // Get position styles based on position prop
  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return { top: 10, left: 10 };
      case 'top-right':
        return { top: 10, right: 10 };
      case 'top-center':
        return { top: 10, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
        return { bottom: 10, right: 10 };
      case 'bottom-left':
      default:
        return { bottom: 10, left: 10 };
    }
  };

  // Update memory usage if available
  useEffect(() => {
    // Check if performance.memory is available (Chrome only)
    if (window.performance && window.performance.memory) {
      const updateMemoryInfo = () => {
        setMemoryUsage({
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          usedJSHeapSize: window.performance.memory.usedJSHeapSize
        });
      };
      
      // Update once immediately
      updateMemoryInfo();
      
      // Then update every 3 seconds (increased from 2 to reduce overhead)
      memoryUpdateIntervalRef.current = setInterval(updateMemoryInfo, 3000);
    }
    
    return () => {
      if (memoryUpdateIntervalRef.current) {
        clearInterval(memoryUpdateIntervalRef.current);
      }
    };
  }, []);

  // Monitor MediaPipe performance for inference time
  useEffect(() => {
    // Set up observer for MediaPipe inference time
    const MAX_INFERENCE_SAMPLES = 20;
    inferenceTimesRef.current = new Array(MAX_INFERENCE_SAMPLES).fill(0);
    let inferenceIndex = 0;
    
    // Function to handle performance entries
    const handlePerfEntries = (entries) => {
      for (const entry of entries) {
        // Look for MediaPipe detection measure
        if (entry.name.includes('detectForVideo')) {
          // Add to circular buffer
          inferenceTimesRef.current[inferenceIndex] = entry.duration;
          inferenceIndex = (inferenceIndex + 1) % MAX_INFERENCE_SAMPLES;
          
          // Calculate average inference time
          const sum = inferenceTimesRef.current.reduce((a, b) => a + b, 0);
          const validSamples = inferenceTimesRef.current.filter(t => t > 0).length;
          if (validSamples > 0) {
            const avgInferenceTime = sum / validSamples;
            setInferenceTime(avgInferenceTime.toFixed(1));
          }
        }
      }
    };
    
    // Create observer if browser supports it
    if (window.PerformanceObserver) {
      try {
        const observer = new PerformanceObserver(list => {
          handlePerfEntries(list.getEntries());
        });
        
        // Observe measure entries
        observer.observe({ entryTypes: ['measure'] });
        
        return () => observer.disconnect();
      } catch (e) {
        console.error('Performance observer error:', e);
      }
    }
  }, []);

  // Update FPS counter
  useEffect(() => {
    // Circular buffer for frame times
    const MAX_SAMPLES = 30;
    frameTimeRef.current = new Array(MAX_SAMPLES).fill(16.67); // Initialize with 60fps values
    let sampleIndex = 0;
    
    const updateFPS = (timestamp) => {
      if (previousTimeRef.current) {
        // Calculate time difference since last frame
        const deltaTime = timestamp - previousTimeRef.current;
        
        // Add to circular buffer
        frameTimeRef.current[sampleIndex] = deltaTime;
        sampleIndex = (sampleIndex + 1) % MAX_SAMPLES;
        
        // Only update state every 5th frame to reduce React overhead
        updateCountRef.current++;
        
        // Update once per half second to avoid too many renders
        if (timestamp - lastUpdateTimeRef.current > 500) {
          // Calculate average frame time more efficiently
          let sum = 0;
          for (let i = 0; i < MAX_SAMPLES; i++) {
            sum += frameTimeRef.current[i];
          }
          const averageFrameTime = sum / MAX_SAMPLES;
          
          // Convert to FPS (1000ms / frame time)
          const currentFps = Math.round(1000 / averageFrameTime);
          
          // Only update state if FPS has changed by more than 1
          if (Math.abs(currentFps - fps) > 1 || updateCountRef.current >= 30) {
            setFps(currentFps);
            setRenderTime(averageFrameTime.toFixed(1));
            updateCountRef.current = 0;
            
            // Track FPS history to detect degradation
            const now = Date.now();
            fpsHistoryRef.current.push({
              time: now,
              fps: currentFps
            });
            
            // Keep last 5 minutes of data
            const fiveMinutesAgo = now - 5 * 60 * 1000;
            // More efficient filtering that doesn't create a new array
            let validCount = 0;
            for (let i = 0; i < fpsHistoryRef.current.length; i++) {
              if (fpsHistoryRef.current[i].time >= fiveMinutesAgo) {
                if (i !== validCount) {
                  fpsHistoryRef.current[validCount] = fpsHistoryRef.current[i];
                }
                validCount++;
              }
            }
            fpsHistoryRef.current.length = validCount;
          }
          
          lastUpdateTimeRef.current = timestamp;
          frameCountRef.current = 0;
        }
      }
      
      previousTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(updateFPS);
    };
    
    // Start the animation frame loop
    animationFrameRef.current = requestAnimationFrame(updateFPS);
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clear the frame time array
      frameTimeRef.current = [];
      fpsHistoryRef.current = [];
      inferenceTimesRef.current = [];
      previousTimeRef.current = 0;
      frameCountRef.current = 0;
      lastUpdateTimeRef.current = 0;
    };
  }, [fps]);

  // Format memory size in MB
  const formatMemory = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box
      style={{
        ...glassStyle,
        position: 'absolute',
        ...getPositionStyle(),
        padding: '5px 10px',
        borderRadius: '4px',
        zIndex: 1000,
        fontSize: '12px',
      }}
    >
      <Stack spacing={2}>
        <Text fw={500} style={{ fontSize: '14px' }}>
          {fps} FPS
        </Text>
        {showDetails && (
          <>
            <Text size="xs" c="dimmed">
              Frame time: {renderTime}ms
            </Text>
            <Text size="xs" c="dimmed">
              Inference time: {inferenceTime}ms
            </Text>
            {window.performance && window.performance.memory && (
              <>
                <Text size="xs" c="dimmed">
                  Memory: {formatMemory(memoryUsage.usedJSHeapSize)} / {formatMemory(memoryUsage.jsHeapSizeLimit)}
                </Text>
                <Text size="xs" c="dimmed">
                  Total Heap: {formatMemory(memoryUsage.totalJSHeapSize)}
                </Text>
              </>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
};

export default FpsCounter; 