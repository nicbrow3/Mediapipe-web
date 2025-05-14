import React, { useEffect } from 'react';
import PhaseTracker from './PhaseTracker';
import { LANDMARK_MAP } from '../logic/landmarkUtils';
import { useAppSettings } from '../hooks/useAppSettings';

// This function is now a fallback only if the exercise doesn't define its own landmarks
const getDefaultSecondaryLandmarks = (side) => {
  // This is a basic set of landmarks that are important for pose stability
  // but may not be directly part of the angle calculation
  const baseLandmarks = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'
  ];
  
  // If a specific side is provided, prioritize landmarks on that side
  if (side === 'Left') {
    return ['left_shoulder', 'left_elbow', 'left_wrist', 'left_hip', 'left_knee', 'left_ankle'];
  } else if (side === 'Right') {
    return ['right_shoulder', 'right_elbow', 'right_wrist', 'right_hip', 'right_knee', 'right_ankle'];
  }
  
  return baseLandmarks;
};

const PhaseTrackerDisplay = ({ selectedExercise, trackedAngles, displaySide, useThreePhases, landmarksData }) => {
  const [settings] = useAppSettings();
  console.log(`[PhaseTrackerDisplay (${displaySide})] Function body. Settings from hook:`, JSON.parse(JSON.stringify(settings))); // Deep copy for reliable logging
  
  // Add useAppSettings hook to ensure this component re-renders when settings change
  // const [settings] = useAppSettings(); // Moved up
  
  // Log when settings change to track updates
  useEffect(() => {
    console.log(`[PhaseTrackerDisplay (${displaySide})] Effect triggered. Settings:`, {
      requireAllLandmarks: settings.requireAllLandmarks,
      minimumVisibilityThreshold: settings.minimumVisibilityThreshold,
      requireSecondaryLandmarks: settings.requireSecondaryLandmarks,
      useThreePhases: settings.useThreePhases
    });
  }, [
    displaySide,
    settings.requireAllLandmarks,
    settings.minimumVisibilityThreshold,
    settings.requireSecondaryLandmarks,
    settings.useThreePhases
  ]);
  
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
  
  // Calculate landmark visibility for primary landmarks using the angle configuration points
  let landmarkVisibilityData = {
    primaryLandmarks: { allVisible: true, minVisibility: 100 },
    secondaryLandmarks: { allVisible: true, minVisibility: 100 }
  };
  
  if (landmarksData && angleConfigToShow) {
    // Primary landmarks - first use the points from the angle config
    const { side, points } = angleConfigToShow;
    const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
    
    // If the exercise defines primary landmarks, add those too
    const primaryLandmarksFromExercise = selectedExercise.landmarks?.primary || [];
    
    // Combine the landmarks from the angle points and the exercise definition
    const allPrimaryLandmarks = [...new Set([...pointNames, ...primaryLandmarksFromExercise])];
    
    let allPrimaryLandmarksFound = true;
    let minPrimaryVisibilityValue = 100;
    
    for (const pointName of allPrimaryLandmarks) {
      const index = LANDMARK_MAP[pointName];
      if (index !== undefined && landmarksData[index]) {
        const landmark = landmarksData[index];
        const visibility = landmark.visibility || 0;
        
        // Update minimum visibility - ensure it's a number and multiply by 100
        const visibilityPercent = Number(visibility) * 100;
        minPrimaryVisibilityValue = Math.min(minPrimaryVisibilityValue, visibilityPercent);
      } else {
        // If any landmark is missing, set allVisible to false
        allPrimaryLandmarksFound = false;
        minPrimaryVisibilityValue = 0;
        break;
      }
    }
    
    // Set primary landmarks visibility data
    landmarkVisibilityData.primaryLandmarks = { 
      allVisible: allPrimaryLandmarksFound, 
      minVisibility: minPrimaryVisibilityValue 
    };
    
    // Only calculate secondary landmarks if the setting is enabled
    if (settings.requireSecondaryLandmarks) {
      // Get secondary landmarks from the exercise definition if available
      const secondaryLandmarkNames = selectedExercise.landmarks?.secondary || 
                                    getDefaultSecondaryLandmarks(displayLabel);
      
      let allSecondaryLandmarksFound = true;
      let minSecondaryVisibilityValue = 100;
      
      if (secondaryLandmarkNames && secondaryLandmarkNames.length > 0) {
        for (const pointName of secondaryLandmarkNames) {
          const index = LANDMARK_MAP[pointName];
          if (index !== undefined && landmarksData[index]) {
            const landmark = landmarksData[index];
            const visibility = landmark.visibility || 0;
            
            // Update minimum visibility - ensure it's a number and multiply by 100
            const visibilityPercent = Number(visibility) * 100;
            minSecondaryVisibilityValue = Math.min(minSecondaryVisibilityValue, visibilityPercent);
          } else {
            // If any landmark is missing, set allVisible to false
            allSecondaryLandmarksFound = false;
            minSecondaryVisibilityValue = 0;
            break;
          }
        }
      }
      
      // Set secondary landmarks visibility data
      landmarkVisibilityData.secondaryLandmarks = { 
        allVisible: allSecondaryLandmarksFound, 
        minVisibility: minSecondaryVisibilityValue 
      };
      
      // Log landmark visibility for debugging
      // console.log(`PhaseTrackerDisplay (${displaySide}) - Landmark visibility:`, {
      //   primaryLandmarks: allPrimaryLandmarks,
      //   allPrimaryLandmarksFound,
      //   minPrimaryVisibilityValue,
      //   secondaryLandmarks: secondaryLandmarkNames,
      //   allSecondaryLandmarksFound,
      //   minSecondaryVisibilityValue,
      //   requireAllLandmarks: settings.requireAllLandmarks,
      //   requireSecondaryLandmarks: settings.requireSecondaryLandmarks,
      //   minimumVisibilityThreshold: settings.minimumVisibilityThreshold
      // });
    } else {
      // If secondary landmarks aren't required, set a perfect visibility score for secondaries
      // This ensures they won't block tracking if the setting changes without a full remount
      landmarkVisibilityData.secondaryLandmarks = { 
        allVisible: true, 
        minVisibility: 100 
      };
      
      // // If secondary landmarks aren't required, log just the primary ones
      // console.log(`PhaseTrackerDisplay (${displaySide}) - Landmark visibility (secondary not required):`, {
      //   primaryLandmarks: allPrimaryLandmarks,
      //   allPrimaryLandmarksFound,
      //   minPrimaryVisibilityValue,
      //   requireAllLandmarks: settings.requireAllLandmarks,
      //   requireSecondaryLandmarks: settings.requireSecondaryLandmarks,
      //   minimumVisibilityThreshold: settings.minimumVisibilityThreshold
      // });
    }
  }
  
  // Force a key change when settings change to ensure complete remounting of the PhaseTracker
  const phaseTrackerKey = `${settings.requireAllLandmarks}-${settings.minimumVisibilityThreshold}-${settings.requireSecondaryLandmarks}-${settings.useThreePhases}-${angleConfigToShow.id}`;
  console.log(`[PhaseTrackerDisplay (${displaySide})] Rendering with phaseTrackerKey:`, phaseTrackerKey);
  
  return (
    <div className={`phase-tracker-display ${displaySide}-side`}>
      <PhaseTracker 
        key={phaseTrackerKey}
        angle={trackedAngles[angleConfigToShow.id]} 
        angleConfig={angleConfigToShow} 
        side={displayLabel}
        useThreePhases={settings.useThreePhases}
        landmarkVisibility={landmarkVisibilityData}
        requireAllLandmarks={settings.requireAllLandmarks}
        minimumVisibilityThreshold={settings.minimumVisibilityThreshold}
        requireSecondaryLandmarks={settings.requireSecondaryLandmarks}
      />
    </div>
  );
};

export default PhaseTrackerDisplay; 