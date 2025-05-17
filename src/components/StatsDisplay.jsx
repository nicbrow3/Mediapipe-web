import React from 'react';

const StatsDisplay = ({ stats, cameraStarted, smoothingEnabled, smoothingWindow }) => {
  if (!cameraStarted) {
    return null;
  }
  
  return (
    <div 
    style={{
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '16px',
      zIndex: 100,
    }}>
      FPS: {stats.fps} | Inference Time: {stats.inferenceTime}ms
      {smoothingEnabled && (
        <span> | Smoothing</span>
      )}
    </div>
  );
};

export default StatsDisplay; 