import React, { useMemo } from 'react';
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

  // Memoize the derivation of primary and secondary landmark names
  const { primaryLandmarkNames, secondaryLandmarkNames } = useMemo(() => {
    const prim = [];
    const sec = [];
    const sideForFiltering = displaySide === 'left' ? 'left' : 'right';

    if (selectedExercise.landmarks) {
        // Simplified existing logic for brevity - ensure this logic correctly extracts names
        if (selectedExercise.isTwoSided && selectedExercise.landmarks[sideForFiltering]) {
            const sideLmarks = selectedExercise.landmarks[sideForFiltering];
            if (sideLmarks.primary) prim.push(...sideLmarks.primary);
            if (sideLmarks.secondary) sec.push(...sideLmarks.secondary);
        } else if (!selectedExercise.isTwoSided) {
             // Logic for non-two-sided exercises considering displaySide
            const landmarksConfig = selectedExercise.landmarks.left || selectedExercise.landmarks.primary ? 
                                   (selectedExercise.landmarks.left || selectedExercise.landmarks) 
                                   : {};

            if (displaySide === 'left') {
                if (landmarksConfig.primary) {
                    prim.push(...(landmarksConfig.primary.filter(name => name.includes('left_') || !name.includes('right_'))));
                }
                if (landmarksConfig.secondary) {
                    sec.push(...(landmarksConfig.secondary.filter(name => name.includes('left_') || !name.includes('right_'))));
                }
            } else { // displaySide === 'right' for non-two-sided. Show neutral or right-specific.
                 if (landmarksConfig.primary) {
                    prim.push(...(landmarksConfig.primary.filter(name => name.includes('right_') || !name.includes('left_'))));
                }
                if (landmarksConfig.secondary) {
                    sec.push(...(landmarksConfig.secondary.filter(name => name.includes('right_') || !name.includes('left_'))));
                }
            }
        }
    }

    // Add landmarks from tracked angles
    if (selectedExercise.logicConfig && selectedExercise.logicConfig.anglesToTrack) {
        const angles = selectedExercise.logicConfig.anglesToTrack;
        const filteredAngles = angles.filter(angleConfig => {
            const angleId = angleConfig.id.toLowerCase();
            const isLeft = angleId.includes('left');
            const isRight = angleId.includes('right');
            if (displaySide === 'left') return isLeft;
            if (displaySide === 'right') return isRight || (!isLeft && !isRight);
            return true;
        });

        for (const angleConfig of filteredAngles) {
            const { side: angleSide, points } = angleConfig;
            const pointNames = points.map(pt => (angleSide ? `${angleSide}_${pt}` : pt));
            for (const pointName of pointNames) {
                if (!prim.includes(pointName)) {
                    prim.push(pointName);
                }
            }
        }
    }
    return { primaryLandmarkNames: [...new Set(prim)], secondaryLandmarkNames: [...new Set(sec)] };
  }, [selectedExercise, displaySide]);

  // Memoize the final list of landmark details (name + visibility)
  const { primaryLandmarks, secondaryLandmarks } = useMemo(() => {
    const primDetails = [];
    const secDetails = [];
    const processedNames = new Set();
    const getVisibility = (lm) => (lm && typeof lm.visibility === 'number' ? lm.visibility : 0);

    if (props.landmarksData) {
        primaryLandmarkNames.forEach(pointName => {
            if (processedNames.has(pointName)) return;
            processedNames.add(pointName);
            const index = LANDMARK_MAP[pointName];
            if (index !== undefined && props.landmarksData[index]) {
                const landmark = props.landmarksData[index];
                const visibility = getVisibility(landmark);
                primDetails.push({ name: pointName, visibility, visibilityPercent: (visibility * 100).toFixed(0) + "%" });
            }
        });
        secondaryLandmarkNames.forEach(pointName => {
            if (processedNames.has(pointName)) return;
            processedNames.add(pointName);
            const index = LANDMARK_MAP[pointName];
            if (index !== undefined && props.landmarksData[index]) {
                const landmark = props.landmarksData[index];
                const visibility = getVisibility(landmark);
                secDetails.push({ name: pointName, visibility, visibilityPercent: (visibility * 100).toFixed(0) + "%" });
            }
        });
    }
    return { primaryLandmarks: primDetails, secondaryLandmarks: secDetails };
  }, [props.landmarksData, primaryLandmarkNames, secondaryLandmarkNames]);

  // Helper to get color based on visibility
  const getVisibilityColor = (visibility) => {
    if (visibility < 0.25) return '#ff5555'; // Red for low visibility
    if (visibility < 0.5) return '#ffaa55';  // Orange for medium visibility
    if (visibility < 0.75) return '#ffff55'; // Yellow for decent visibility
    return '#55ff55'; // Green for good visibility
  };

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