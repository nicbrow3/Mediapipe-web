import React from 'react';
import PhaseTracker from './PhaseTracker';

const PhaseTrackerDisplay = ({ selectedExercise, trackedAngles, displaySide, useThreePhases }) => {
  if (!selectedExercise || 
      !selectedExercise.logicConfig || 
      selectedExercise.logicConfig.type !== 'angle' || 
      !Array.isArray(selectedExercise.logicConfig.anglesToTrack) ||
      selectedExercise.logicConfig.anglesToTrack.length === 0) {
    return null;
  }

  const { anglesToTrack } = selectedExercise.logicConfig;
  let angleConfigToShow = null;
  let displayLabel = '';

  if (displaySide === 'left') {
    angleConfigToShow = anglesToTrack.find(a => a.id.toLowerCase().includes('left'));
    if (angleConfigToShow) displayLabel = 'Left';
  } else if (displaySide === 'right') {
    angleConfigToShow = anglesToTrack.find(a => a.id.toLowerCase().includes('right'));
    if (angleConfigToShow) {
      displayLabel = 'Right';
    } else {
      // If no specific 'right' angle, try to find a non-'left' angle for the right display
      angleConfigToShow = anglesToTrack.find(a => !a.id.toLowerCase().includes('left'));
      if (angleConfigToShow) {
        // Determine label: if it's explicitly right, use 'Right', otherwise 'Center' or angle name
        if (angleConfigToShow.id.toLowerCase().includes('right')) {
          displayLabel = 'Right';
        } else {
          displayLabel = angleConfigToShow.name || angleConfigToShow.id;
        }
      }
    }
  }

  // If no suitable angle config found for the current side, or angle not tracked, render nothing
  if (!angleConfigToShow || trackedAngles[angleConfigToShow.id] == null) {
    return null;
  }
  
  return (
    <div className={`phase-tracker-display ${displaySide}-side`}>
      <PhaseTracker 
        angle={trackedAngles[angleConfigToShow.id]} 
        angleConfig={angleConfigToShow} 
        side={displayLabel}
        useThreePhases={useThreePhases}
      />
    </div>
  );
};

export default PhaseTrackerDisplay; 