import React from 'react';

const AngleDisplay = ({ selectedExercise, trackedAngles }) => {
  // Only render if we have a valid exercise with angle tracking
  if (!selectedExercise || selectedExercise.logicConfig?.type !== 'angle' || !Array.isArray(selectedExercise.logicConfig.anglesToTrack)) {
    return null;
  }

  const angleConfigs = selectedExercise.logicConfig.anglesToTrack;
  // Only show angle displays for valid tracked angles
  const validAngles = angleConfigs.filter(angleConfig => trackedAngles[angleConfig.id] != null);
  
  if (validAngles.length === 0) {
    return null;
  }

  if (validAngles.length === 1) {
    // Always display the single angle on the right side (top-right)
    const angleConfig = validAngles[0];
    const angle = trackedAngles[angleConfig.id];
    return (
      <div key={angleConfig.id} style={{
        position: 'absolute',
        top: 10,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '16px',
        zIndex: 100,
        minWidth: 120,
        textAlign: 'right',
      }}>
        {angleConfig.name || angleConfig.id}: {angle}&deg;
      </div>
    );
  }

  // For multiple angles, use the original placement logic
  return (
    <>
      {validAngles.map(angleConfig => {
        const angle = trackedAngles[angleConfig.id];
        // Place left angles top-left, right angles top-right
        let style = {
          position: 'absolute',
          top: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '16px',
          zIndex: 100,
          minWidth: 120
        };
        
        if (angleConfig.side === 'left') {
          style.left = 20;
          style.textAlign = 'left';
        } else if (angleConfig.side === 'right') {
          style.right = 20;
          style.textAlign = 'right';
        } else {
          // Center angles (rare case)
          style.left = '50%';
          style.transform = 'translateX(-50%)';
          style.textAlign = 'center';
        }
        
        return (
          <div key={angleConfig.id} style={style}>
            {angleConfig.name || angleConfig.id}: {angle}&deg;
          </div>
        );
      })}
    </>
  );
};

export default AngleDisplay; 