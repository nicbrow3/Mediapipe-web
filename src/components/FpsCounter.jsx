import React, { useState, useEffect, useRef } from 'react';
import { Text, Box } from '@mantine/core';
import { glassStyle } from '../styles/uiStyles';

/**
 * FpsCounter component displays the current frames per second
 * @param {Object} props Component props
 * @param {string} props.position Position (e.g., 'top-left', 'bottom-right')
 * @param {boolean} props.showDetails Show additional timing details
 * @returns {JSX.Element} FPS counter UI component
 */
const FpsCounter = ({ position = 'bottom-left', showDetails = false }) => {
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const frameTimeRef = useRef([]);
  const previousTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);

  // Get position styles based on position prop
  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return { top: 10, left: 10 };
      case 'top-right':
        return { top: 10, right: 10 };
      case 'bottom-right':
        return { bottom: 10, right: 10 };
      case 'bottom-left':
      default:
        return { bottom: 10, left: 10 };
    }
  };

  // Update FPS counter
  useEffect(() => {
    const updateFPS = (timestamp) => {
      if (previousTimeRef.current) {
        // Calculate time difference since last frame
        const deltaTime = timestamp - previousTimeRef.current;
        
        // Add to rolling average (last 30 frames)
        frameTimeRef.current.push(deltaTime);
        if (frameTimeRef.current.length > 30) {
          frameTimeRef.current.shift();
        }
        
        // Calculate average frame time
        const averageFrameTime = frameTimeRef.current.reduce((sum, time) => sum + time, 0) / 
                               frameTimeRef.current.length;
        
        // Convert to FPS (1000ms / frame time)
        const currentFps = Math.round(1000 / averageFrameTime);
        
        // Update once per second to avoid too many renders
        frameCountRef.current++;
        if (timestamp - lastUpdateTimeRef.current > 500) {
          setFps(currentFps);
          setRenderTime(averageFrameTime.toFixed(2));
          lastUpdateTimeRef.current = timestamp;
          frameCountRef.current = 0;
        }
      }
      
      previousTimeRef.current = timestamp;
      requestAnimationFrame(updateFPS);
    };
    
    const animationId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

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
      <Text fw={500} style={{ fontSize: '14px' }}>
        {fps} FPS
      </Text>
      {showDetails && (
        <Text size="xs" c="dimmed">
          Frame time: {renderTime}ms
        </Text>
      )}
    </Box>
  );
};

export default FpsCounter; 