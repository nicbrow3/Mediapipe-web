import React from 'react';
import { LANDMARK_MAP } from '../logic/landmarkUtils';

const LandmarkMetricsDisplay2 = (props) => {
  // Accept props directly without destructuring at the top level
  // Perform null checks
  if (!props.selectedExercise || 
      !props.selectedExercise.logicConfig || 
      props.selectedExercise.logicConfig.type !== 'angle' || 
      !Array.isArray(props.selectedExercise.logicConfig.anglesToTrack) ||
      !props.landmarksData) {
    return null;
  }

  // Get angles to track
  const anglesToTrack = props.selectedExercise.logicConfig.anglesToTrack;
  
  // Filter angles based on display side
  const filteredAnglesToTrack = anglesToTrack.filter(angleConfig => {
    const angleId = angleConfig.id.toLowerCase();
    const isLeftAngle = angleId.includes('left');
    const isRightAngle = angleId.includes('right');
    
    if (props.displaySide === 'left') {
      return isLeftAngle;
    }
    if (props.displaySide === 'right') {
      return isRightAngle || (!isLeftAngle && !isRightAngle);
    }
    return true; // Fallback
  });

  // Simple helper function to check visibility
  const getVisibility = (landmark) => {
    if (landmark && typeof landmark.visibility === 'number') {
      return landmark.visibility;
    }
    return 0;
  };

  // Build table of landmark data (without useEffect)
  const landmarkDetails = [];
  
  if (props.landmarksData && Array.isArray(filteredAnglesToTrack)) {
    for (const angleConfig of filteredAnglesToTrack) {
      const { side, points, id } = angleConfig;
      const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
      
      for (const pointName of pointNames) {
        const index = LANDMARK_MAP[pointName];
        if (index !== undefined && props.landmarksData[index]) {
          const landmark = props.landmarksData[index];
          const visibility = getVisibility(landmark);
          
          landmarkDetails.push({
            name: pointName,
            visibility: visibility.toFixed(2)
          });
        }
      }
    }
  }

  return (
    <div style={{ padding: '10px', backgroundColor: 'rgba(40, 40, 40, 0.7)' }}>
      <p>Metrics Display</p>
      {filteredAnglesToTrack && (
        <p>Number of tracked angles: {filteredAnglesToTrack.length}</p>
      )}
      
      {landmarkDetails.length > 0 && (
        <div>
          <p>Landmark Visibility:</p>
          <ul style={{ fontSize: '0.8rem', margin: 0, paddingLeft: '20px' }}>
            {landmarkDetails.map((detail, index) => (
              <li key={index}>{detail.name}: {detail.visibility}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default React.memo(LandmarkMetricsDisplay2); 