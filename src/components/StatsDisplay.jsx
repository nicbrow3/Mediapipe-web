import React from 'react';

const StatsDisplay = ({ stats, cameraStarted }) => {
  if (!cameraStarted) {
    return null;
  }
  
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '16px',
      zIndex: 100,
    }}>
      FPS: {stats.fps} | Inference Time: {stats.inferenceTime}ms
    </div>
  );
};

export default StatsDisplay; 