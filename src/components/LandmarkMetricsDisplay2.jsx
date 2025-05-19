import React, { useMemo, useEffect, useState } from 'react';
import { LANDMARK_MAP } from '../logic/landmarkUtils';
import { Paper } from '@mantine/core';

const LandmarkMetricsDisplay2 = (props) => {
  // Use state to track the most recent valid landmarks - Keep these at the top
  const [lastValidSelectedExercise, setLastValidSelectedExercise] = useState(null);
  const [lastValidLandmarksData, setLastValidLandmarksData] = useState(null);
  
  // Update last valid selected exercise when available - Keep these hooks at the top
  useEffect(() => {
    if (props.selectedExercise && 
        props.selectedExercise.logicConfig && 
        props.selectedExercise.logicConfig.type === 'angle' && 
        Array.isArray(props.selectedExercise.logicConfig.anglesToTrack)) {
      setLastValidSelectedExercise(props.selectedExercise);
    }
  }, [props.selectedExercise]);
  
  // Update last valid landmarks data when available - Keep these hooks at the top
  useEffect(() => {
    if (props.landmarksData) {
      setLastValidLandmarksData(props.landmarksData);
    }
  }, [props.landmarksData]);

  // Determine which data to use - current or last valid
  const selectedExercise = props.selectedExercise || lastValidSelectedExercise;
  const landmarksData = props.landmarksData || lastValidLandmarksData;
  const { displaySide } = props;

  // Memoize the derivation of primary and secondary landmark names - Keep this hook called unconditionally
  const { primaryLandmarkNames, secondaryLandmarkNames } = useMemo(() => {
    const prim = [];
    const sec = [];
    const sideForFiltering = displaySide === 'left' ? 'left' : 'right';

    // Only proceed with landmark name derivation if we have a valid exercise config
    // This logic is inside the useMemo, so the hook is always called, but the expensive computation is conditional
    if (selectedExercise && 
        selectedExercise.logicConfig?.type === 'angle' && 
        Array.isArray(selectedExercise.logicConfig.anglesToTrack) &&
        selectedExercise.landmarks) {

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

    // Add landmarks from tracked angles (only if valid exercise config exists)
    if (selectedExercise && selectedExercise.logicConfig && selectedExercise.logicConfig.anglesToTrack) {
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
  }, [selectedExercise, displaySide]); // Dependencies for the memoization

  // Memoize the final list of landmark details (name + visibility) - Keep this hook called unconditionally
  const { primaryLandmarks, secondaryLandmarks } = useMemo(() => {
    const primDetails = [];
    const secDetails = [];
    const processedNames = new Set();
    const getVisibility = (lm) => (lm && typeof lm.visibility === 'number' ? lm.visibility : 0);

    // Only proceed with landmark details if landmarksData is available
    // This logic is inside the useMemo, so the hook is always called, but the expensive computation is conditional
    if (landmarksData) {
        primaryLandmarkNames.forEach(pointName => {
            if (processedNames.has(pointName)) return;
            processedNames.add(pointName);
            const index = LANDMARK_MAP[pointName];
            if (index !== undefined && landmarksData[index]) {
                const landmark = landmarksData[index];
                const visibility = getVisibility(landmark);
                primDetails.push({ name: pointName, visibility, visibilityPercent: (visibility * 100).toFixed(0) + "%" });
            }
        });
        secondaryLandmarkNames.forEach(pointName => {
            if (processedNames.has(pointName)) return;
            processedNames.add(pointName);
            const index = LANDMARK_MAP[pointName];
            if (index !== undefined && landmarksData[index]) {
                const landmark = landmarksData[index];
                const visibility = getVisibility(landmark);
                secDetails.push({ name: pointName, visibility, visibilityPercent: (visibility * 100).toFixed(0) + "%" });
            }
        });
    }
    return { primaryLandmarks: primDetails, secondaryLandmarks: secDetails };
  }, [landmarksData, primaryLandmarkNames, secondaryLandmarkNames]); // Dependencies for the memoization

  // Helper to get color based on visibility
  const getVisibilityColor = (visibility) => {
    if (visibility < 0.25) return '#ff5555'; // Red for low visibility
    if (visibility < 0.5) return '#ffaa55';  // Orange for medium visibility
    if (visibility < 0.75) return '#ffff55'; // Yellow for decent visibility
    return '#55ff55'; // Green for good visibility
  };

  // Determine if we have enough data AND it's the correct side for a single-sided exercise
  const shouldRenderLandmarkLists = selectedExercise && 
                                  selectedExercise.logicConfig?.type === 'angle' && 
                                  Array.isArray(selectedExercise.logicConfig.anglesToTrack) &&
                                  landmarksData &&
                                  (selectedExercise.isTwoSided || displaySide === 'left' || 
                                   (displaySide === 'right' && selectedExercise.connections?.right?.length > 0));

  return (
    <Paper>
      <div style={{
        padding: '10px',
        // backgroundColor: 'rgba(40, 40, 40, 0.7)'
        }}>
        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>Landmark Visibility</div>
        
        {shouldRenderLandmarkLists ? (
          // Render landmark lists only if we meet the criteria
          <>
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

            {primaryLandmarks.length === 0 && secondaryLandmarks.length === 0 && (
              <div style={{ 
                fontSize: '12px', 
                color: 'rgba(255, 255, 255, 0.5)', 
                textAlign: 'center', 
                padding: '10px 0' 
              }}>
                No visible landmarks detected for this side/exercise
              </div>
            )}
          </>
        ) : (
          // Render placeholder if not enough data or incorrect side for a single-sided exercise
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px 0' }}>
            {!selectedExercise || selectedExercise.logicConfig?.type !== 'angle' || !Array.isArray(selectedExercise.logicConfig.anglesToTrack)
              ? 'Waiting for exercise configuration...'
              : !landmarksData
                ? 'Waiting for landmark data...'
                : (!selectedExercise.isTwoSided && displaySide === 'right')
                  ? 'No right side landmarks for this exercise'
                  : 'Loading...' // Default placeholder if none of the specific conditions match
            }
          </div>
        )}
      </div>
    </Paper>
  );
};

export default React.memo(LandmarkMetricsDisplay2); 