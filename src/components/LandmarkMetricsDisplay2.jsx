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

  const { selectedExercise, displaySide } = props;
  
  // For single-sided exercises, only show landmarks on the left side
  if (!selectedExercise.isTwoSided && displaySide === 'right') {
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

  // Helper to get color based on visibility
  const getVisibilityColor = (visibility) => {
    if (visibility < 0.25) return '#ff5555'; // Red for low visibility
    if (visibility < 0.5) return '#ffaa55';  // Orange for medium visibility
    if (visibility < 0.75) return '#ffff55'; // Yellow for decent visibility
    return '#55ff55'; // Green for good visibility
  };

  // Get landmarks from exercise config
  const primaryLandmarkNames = [];
  const secondaryLandmarkNames = [];
  
  // Helper to normalize display side string
  const side = displaySide === 'left' ? 'left' : 'right';
  
  // Get landmarks from exercise configuration - handle different config formats
  if (selectedExercise.landmarks) {
    // Format 1: Two-sided exercises with separate left/right landmark definitions
    if (selectedExercise.isTwoSided && selectedExercise.landmarks[side]) {
      const sideLandmarks = selectedExercise.landmarks[side];
      if (sideLandmarks.primary) {
        primaryLandmarkNames.push(...sideLandmarks.primary);
      }
      if (sideLandmarks.secondary) {
        secondaryLandmarkNames.push(...sideLandmarks.secondary);
      }
    } 
    // Format 2: Single-sided exercises with side-specific landmarks (like squats.js)
    else if (!selectedExercise.isTwoSided && selectedExercise.landmarks.left) {
      // For exercises like squats that have landmarks under "left" key but aren't two-sided
      if (side === 'left' && selectedExercise.landmarks.left) {
        if (selectedExercise.landmarks.left.primary) {
          primaryLandmarkNames.push(...selectedExercise.landmarks.left.primary);
        }
        if (selectedExercise.landmarks.left.secondary) {
          secondaryLandmarkNames.push(...selectedExercise.landmarks.left.secondary);
        }
      } else if (side === 'right' && selectedExercise.landmarks.right) {
        // If there's a right side defined (rarely used for non-two-sided)
        if (selectedExercise.landmarks.right.primary) {
          primaryLandmarkNames.push(...selectedExercise.landmarks.right.primary);
        }
        if (selectedExercise.landmarks.right.secondary) {
          secondaryLandmarkNames.push(...selectedExercise.landmarks.right.secondary);
        }
      }
    }
    // Format 3: Single-sided exercises with top-level primary/secondary (like leftShoulder.js)
    else if (!selectedExercise.isTwoSided && selectedExercise.landmarks.primary) {
      if (side === 'left') {
        // Filter primary landmarks that are left-specific or neutral
        const leftOrNeutralPrimary = selectedExercise.landmarks.primary.filter(
          landmark => landmark.includes('left_') || !landmark.includes('right_')
        );
        primaryLandmarkNames.push(...leftOrNeutralPrimary);
        
        // Filter secondary landmarks that are left-specific or neutral
        if (selectedExercise.landmarks.secondary) {
          const leftOrNeutralSecondary = selectedExercise.landmarks.secondary.filter(
            landmark => landmark.includes('left_') || !landmark.includes('right_')
          );
          secondaryLandmarkNames.push(...leftOrNeutralSecondary);
        }
      } else { // right side
        // Filter primary landmarks that are right-specific or neutral
        const rightOrNeutralPrimary = selectedExercise.landmarks.primary.filter(
          landmark => landmark.includes('right_') || !landmark.includes('left_')
        );
        primaryLandmarkNames.push(...rightOrNeutralPrimary);
        
        // Filter secondary landmarks that are right-specific or neutral
        if (selectedExercise.landmarks.secondary) {
          const rightOrNeutralSecondary = selectedExercise.landmarks.secondary.filter(
            landmark => landmark.includes('right_') || !landmark.includes('left_')
          );
          secondaryLandmarkNames.push(...rightOrNeutralSecondary);
        }
      }
    }
  }
  
  // Build lists of primary and secondary landmarks
  const primaryLandmarks = [];
  const secondaryLandmarks = [];
  const processedLandmarkNames = new Set(); // Track which landmarks we've already processed
  
  // Also get the landmarks from the tracked angles
  if (props.landmarksData && Array.isArray(filteredAnglesToTrack)) {
    for (const angleConfig of filteredAnglesToTrack) {
      const { side, points, id } = angleConfig;
      const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
      
      // Add these angle point landmarks to primary landmarks if they're not already in the list
      for (const pointName of pointNames) {
        if (!primaryLandmarkNames.includes(pointName)) {
          primaryLandmarkNames.push(pointName);
        }
      }
    }
  }
  
  // Process primary landmarks
  if (props.landmarksData && primaryLandmarkNames.length > 0) {
    for (const pointName of primaryLandmarkNames) {
      if (processedLandmarkNames.has(pointName)) continue;
      processedLandmarkNames.add(pointName);
      
      const index = LANDMARK_MAP[pointName];
      if (index !== undefined && props.landmarksData[index]) {
        const landmark = props.landmarksData[index];
        const visibility = getVisibility(landmark);
        
        primaryLandmarks.push({
          name: pointName,
          visibility: visibility,
          visibilityPercent: (visibility * 100).toFixed(0) + "%"
        });
      }
    }
  }
  
  // Process secondary landmarks
  if (props.landmarksData && secondaryLandmarkNames.length > 0) {
    for (const pointName of secondaryLandmarkNames) {
      if (processedLandmarkNames.has(pointName)) continue;
      processedLandmarkNames.add(pointName);
      
      const index = LANDMARK_MAP[pointName];
      if (index !== undefined && props.landmarksData[index]) {
        const landmark = props.landmarksData[index];
        const visibility = getVisibility(landmark);
        
        secondaryLandmarks.push({
          name: pointName,
          visibility: visibility,
          visibilityPercent: (visibility * 100).toFixed(0) + "%"
        });
      }
    }
  }

  return (
    <div style={{ padding: '10px', backgroundColor: 'rgba(40, 40, 40, 0.7)' }}>
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Landmark Visibility</div>
      
      {primaryLandmarks.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Primary Landmarks:</div>
          <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
            {primaryLandmarks.map((detail, index) => (
              <li key={`primary-${index}`} style={{ color: getVisibilityColor(detail.visibility) }}>
                {detail.name}: {detail.visibilityPercent}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {secondaryLandmarks.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Secondary Landmarks:</div>
          <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
            {secondaryLandmarks.map((detail, index) => (
              <li key={`secondary-${index}`} style={{ color: getVisibilityColor(detail.visibility) }}>
                {detail.name}: {detail.visibilityPercent}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default React.memo(LandmarkMetricsDisplay2); 