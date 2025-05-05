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
  const [memoryUsage, setMemoryUsage] = useState({ jsHeapSizeLimit: 0, totalJSHeapSize: 0, usedJSHeapSize: 0 });
  const frameTimeRef = useRef([]);
  const previousTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const memoryUpdateIntervalRef = useRef(null);
  const fpsHistoryRef = useRef([]);
  const updateCountRef = useRef(0);
  const sessionStartTimeRef = useRef(performance.now());

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
            
            // Add entry to history with more aggressive time limit (3 minutes vs 5)
            // Only store one entry per 10 seconds to reduce memory overhead
            const lastEntry = fpsHistoryRef.current[fpsHistoryRef.current.length - 1];
            if (!lastEntry || (now - lastEntry.time) > 10000) {
              fpsHistoryRef.current.push({
                time: now,
                fps: currentFps
              });
            }
            
            // Keep last 3 minutes of data (reduced from 5 minutes)
            const threeMinutesAgo = now - 3 * 60 * 1000;
            
            // More efficient filtering with less memory usage
            let validCount = 0;
            for (let i = 0; i < fpsHistoryRef.current.length; i++) {
              if (fpsHistoryRef.current[i].time >= threeMinutesAgo) {
                if (i !== validCount) {
                  fpsHistoryRef.current[validCount] = fpsHistoryRef.current[i];
                }
                validCount++;
              }
            }
            
            // Handle case where session is running for a very long time
            const sessionDuration = (now - sessionStartTimeRef.current) / 1000;
            if (sessionDuration > 20 * 60) { // More than 20 minutes
              // Keep even less history for very long sessions - just 1 minute
              const oneMinuteAgo = now - 1 * 60 * 1000;
              validCount = 0;
              for (let i = 0; i < fpsHistoryRef.current.length; i++) {
                if (fpsHistoryRef.current[i].time >= oneMinuteAgo) {
                  if (i !== validCount) {
                    fpsHistoryRef.current[validCount] = fpsHistoryRef.current[i];
                  }
                  validCount++;
                }
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