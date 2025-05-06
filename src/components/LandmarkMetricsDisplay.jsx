import React, { useEffect } from 'react';
import { LANDMARK_MAP } from '../logic/landmarkUtils';

const LandmarkMetricsDisplay = ({ selectedExercise, landmarksData, trackedAngles, displaySide }) => {
  if (!selectedExercise || 
      !selectedExercise.logicConfig || 
      selectedExercise.logicConfig.type !== 'angle' || 
      !Array.isArray(selectedExercise.logicConfig.anglesToTrack) || 
      !landmarksData) {
    return null;
  }

  const { anglesToTrack } = selectedExercise.logicConfig;

  // Filter anglesToTrack based on displaySide
  const filteredAnglesToTrack = anglesToTrack.filter(angleConfig => {
    const angleId = angleConfig.id.toLowerCase();
    const isLeftAngle = angleId.includes('left');
    // const isRightAngle = angleId.includes('right'); // We can use this if we want to be more explicit for right side

    if (displaySide === 'left') {
      return isLeftAngle;
    }
    if (displaySide === 'right') {
      // Show right-sided angles and non-specific angles (those not explicitly 'left')
      return !isLeftAngle; 
    }
    return true; // Should not happen
  });
  
  // Log the landmark data for debugging - only once for the first landmark
  useEffect(() => {
    if (landmarksData && landmarksData.length > 0) {
      // Deep inspection of the landmark object
      const sampleLandmark = landmarksData[0];
      console.log('First landmark properties:', Object.getOwnPropertyNames(sampleLandmark));
      
      // Check for nested properties
      for (const key in sampleLandmark) {
        const value = sampleLandmark[key];
        if (value && typeof value === 'object') {
          console.log(`Nested property ${key}:`, Object.getOwnPropertyNames(value));
        }
      }
      
      // Log the entire first landmark for inspection
      console.log('Complete first landmark:', JSON.stringify(sampleLandmark));
    }
  }, [landmarksData]);

  // Helper function to get visibility
  const getVisibility = (landmark) => {
    // In MediaPipe, visibility is between 0-1
    if (landmark.visibility !== undefined) {
      return (landmark.visibility * 100).toFixed(1);
    }
    
    // Try to find visibility in other potential locations
    if (landmark.z !== undefined) {
      // If no explicit visibility but we have z coordinate, it's visible
      return '100.0';
    }
    
    return 'N/A';
  };

  if (filteredAnglesToTrack.length === 0) {
    return null;
  }

  return (
    <div className="landmark-metrics-display">
      {filteredAnglesToTrack.map((angleConfig) => {
        const { id, side, points } = angleConfig;
        
        // Skip if this angle isn't being tracked
        if (trackedAngles[id] == null) {
          return null;
        }
        
        // Map points to landmark names (e.g., left_shoulder, left_elbow, left_wrist)
        const pointNames = points.map(pt => (angleConfig.side ? `${angleConfig.side}_${pt}` : pt)); // Use angleConfig.side for consistency
        
        // Get indices from LANDMARK_MAP
        const indices = pointNames.map(name => LANDMARK_MAP[name]);
        
        // Get landmark data for these points
        const landmarkMetrics = indices
          .filter(idx => idx !== undefined)
          .map((idx, i) => {
            const landmark = landmarksData[idx];
            if (!landmark) {
              return { name: pointNames[i], visibility: 'N/A' };
            }
              
            return {
              name: pointNames[i],
              visibility: getVisibility(landmark)
            };
          });
        
        if (landmarkMetrics.length === 0) {
            return null;
        }

        return (
          <div key={id} className="landmark-metrics-display-item">
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{angleConfig.name || id} Vis:</div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '2px' }}>Point</th>
                  <th style={{ textAlign: 'right', padding: '2px' }}>Vis%</th>
                </tr>
              </thead>
              <tbody>
                {landmarkMetrics.map((metric, index) => {
                  const visibilityValue = parseFloat(metric.visibility);
                  let textColor = 'inherit'; // Default color
                  if (!isNaN(visibilityValue)) {
                    if (visibilityValue < 30) {
                      textColor = 'red';
                    } else if (visibilityValue < 60) {
                      textColor = 'orange';
                    }
                  }

                  return (
                    <tr key={index}>
                      <td style={{ padding: '2px' }}>{metric.name.split('_').pop()}</td>
                      <td style={{ textAlign: 'right', padding: '2px', color: textColor }}>{metric.visibility}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default LandmarkMetricsDisplay; 