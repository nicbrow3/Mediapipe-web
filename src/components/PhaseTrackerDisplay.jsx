import React from 'react';
import PhaseTracker from './PhaseTracker';

const PhaseTrackerDisplay = ({ selectedExercise, trackedAngles }) => {
  if (!selectedExercise || 
      !selectedExercise.logicConfig || 
      selectedExercise.logicConfig.type !== 'angle' || 
      !Array.isArray(selectedExercise.logicConfig.anglesToTrack)) {
    return null;
  }

  const { anglesToTrack } = selectedExercise.logicConfig;
  
  // Check if we're tracking only a single side
  const isOneSided = anglesToTrack.length === 1 || 
    anglesToTrack.every(angle => angle.side === anglesToTrack[0].side);

  // Style object for the container
  const containerStyle = {
    position: 'absolute',
    top: 70, // Position below angle display
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: isOneSided ? 'flex-end' : 'space-between', // Right-align for single side
    padding: '0 20px',
    zIndex: 100,
    pointerEvents: 'none' // Allow clicks to pass through
  };
  
  // For dual-sided tracking (e.g., both arms)
  if (!isOneSided) {
    const leftAngle = anglesToTrack.find(a => a.side === 'left');
    const rightAngle = anglesToTrack.find(a => a.side === 'right');
    
    return (
      <div style={containerStyle}>
        {leftAngle && trackedAngles[leftAngle.id] != null && (
          <div style={{ pointerEvents: 'auto', maxWidth: '40%' }}>
            <PhaseTracker 
              angle={trackedAngles[leftAngle.id]} 
              angleConfig={leftAngle} 
              side="Left"
            />
          </div>
        )}
        {rightAngle && trackedAngles[rightAngle.id] != null && (
          <div style={{ pointerEvents: 'auto', maxWidth: '40%' }}>
            <PhaseTracker 
              angle={trackedAngles[rightAngle.id]} 
              angleConfig={rightAngle}
              side="Right" 
            />
          </div>
        )}
      </div>
    );
  }
  
  // For single-sided tracking (e.g., just one arm)
  const angleConfig = anglesToTrack[0];
  const side = angleConfig.side || 'Center';
  
  return (
    <div style={containerStyle}>
      <div style={{ pointerEvents: 'auto', maxWidth: '40%' }}>
        <PhaseTracker 
          angle={trackedAngles[angleConfig.id]} 
          angleConfig={angleConfig}
          side={side.charAt(0).toUpperCase() + side.slice(1)} 
        />
      </div>
    </div>
  );
};

export default PhaseTrackerDisplay; 