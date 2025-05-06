import React, { useEffect } from 'react';
import { LANDMARK_MAP } from '../logic/landmarkUtils';

const LandmarkMetricsDisplay = ({ selectedExercise, landmarksData, trackedAngles }) => {
  if (!selectedExercise || 
      !selectedExercise.logicConfig || 
      selectedExercise.logicConfig.type !== 'angle' || 
      !Array.isArray(selectedExercise.logicConfig.anglesToTrack) || 
      !landmarksData) {
    return null;
  }

  const { anglesToTrack } = selectedExercise.logicConfig;
  
  // Check if we're tracking only a single side
  const isOneSided = anglesToTrack.length === 1 || 
    anglesToTrack.every(angle => angle.side === anglesToTrack[0].side);

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

  return (
    <>
      {anglesToTrack.map((angleConfig) => {
        const { id, side, points } = angleConfig;
        
        // Skip if this angle isn't being tracked
        if (trackedAngles[id] == null) {
          return null;
        }
        
        // Map points to landmark names (e.g., left_shoulder, left_elbow, left_wrist)
        const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
        
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
        
        // Position with margins instead of absolute top
        const style = {
          position: 'absolute',
          bottom: 20, // Position from bottom instead of top
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '6px 10px',
          borderRadius: '5px',
          color: 'white',
          zIndex: 100,
          fontSize: '12px',
          width: 'auto',
          minWidth: '150px'
        };
        
        // If single tracker, position on right side
        if (isOneSided) {
          style.right = 20;
          style.textAlign = 'right';
        } else {
          // For multiple trackers, position left/right based on side
          if (side === 'left') {
            style.left = 20;
            style.textAlign = 'left';
          } else if (side === 'right') {
            style.right = 20;
            style.textAlign = 'right';
          } else {
            // Center angles (rare case)
            style.left = '50%';
            style.transform = 'translateX(-50%)';
            style.textAlign = 'center';
          }
        }
        
        return (
          <div key={id} style={style}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Landmark Metrics:</div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '2px' }}>Point</th>
                  <th style={{ textAlign: 'right', padding: '2px' }}>Vis%</th>
                </tr>
              </thead>
              <tbody>
                {landmarkMetrics.map((metric, index) => (
                  <tr key={index}>
                    <td style={{ padding: '2px' }}>{metric.name.split('_').pop()}</td>
                    <td style={{ textAlign: 'right', padding: '2px' }}>{metric.visibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
};

export default LandmarkMetricsDisplay; 