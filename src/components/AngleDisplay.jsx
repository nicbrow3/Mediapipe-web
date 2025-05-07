import React from 'react';
import AngleIndicator from './AngleIndicator';
import './AngleDisplay.css';

const AngleDisplay = ({ selectedExercise, trackedAngles, rawAngles, smoothingEnabled, displaySide }) => {
  // Only render if we have a valid exercise with angle tracking
  if (!selectedExercise || selectedExercise.logicConfig?.type !== 'angle' || !Array.isArray(selectedExercise.logicConfig.anglesToTrack)) {
    return null;
  }

  const angleConfigs = selectedExercise.logicConfig.anglesToTrack;
  
  // Filter angles based on displaySide
  const filteredAngleConfigs = angleConfigs.filter(angleConfig => {
    const angleId = angleConfig.id.toLowerCase();
    const isLeftAngle = angleId.includes('left');
    const isRightAngle = angleId.includes('right');

    if (displaySide === 'left') {
      return isLeftAngle;
    }
    // For the right side, show right-sided angles and non-specific angles (those not explicitly 'left')
    if (displaySide === 'right') {
      return isRightAngle || !isLeftAngle;
    }
    return true; // Should not happen if displaySide is always 'left' or 'right'
  });

  // Only show angle displays for valid tracked angles from the filtered list
  const validAngles = filteredAngleConfigs.filter(angleConfig => trackedAngles[angleConfig.id] != null);
  
  if (validAngles.length === 0) {
    return null;
  }

  return (
    <div className="angle-display">
      {validAngles.map(angleConfig => {
        const angle = trackedAngles[angleConfig.id];
        const raw = rawAngles?.[angleConfig.id];
        
        // Determine indicator color based on side
        const indicatorColor = displaySide === 'left' ? '#45a29e' : '#e84545';
        
        // Decide which value to show: smoothed (angle) or raw
        const displayValue = smoothingEnabled ? angle : raw;
        
        return (
          <div key={angleConfig.id} className="angle-display-item">
            {/* Add the angle indicator component */}
            <AngleIndicator 
              angle={displayValue} 
              maxAngle={180} 
              size={80}
              minSize={80}
              color={indicatorColor}
              backgroundColor={`${indicatorColor}33`} // Add transparency to the background
              angleConfig={angleConfig} // Pass the full angleConfig
            />
            
            {/* Show only the relevant angle value */}
            <div>
              <span style={{color: 'white'}}>
                {angleConfig.name || angleConfig.id}:
              </span>
              <span style={{color: indicatorColor}}> {displayValue}°</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AngleDisplay; 