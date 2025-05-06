import React from 'react';

const AngleDisplay = ({ selectedExercise, trackedAngles, displaySide }) => {
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
        return (
          <div key={angleConfig.id} className="angle-display-item">
            {angleConfig.name || angleConfig.id}: {angle}&deg;
          </div>
        );
      })}
    </div>
  );
};

export default AngleDisplay; 