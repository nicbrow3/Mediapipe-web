import React, { useEffect, useMemo } from 'react';
import PhaseTracker from './PhaseTracker';
import { LANDMARK_MAP } from '../logic/landmarkUtils.js';
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

const PhaseTrackerDisplay = ({ selectedExercise, trackedAngles, displaySide, useThreePhases, landmarksData, workoutMode }) => {
  const [settings] = useAppSettings();
  // console.log(`[PhaseTrackerDisplay (${displaySide})] Function body. Settings from hook:`, JSON.parse(JSON.stringify(settings))); // Deep copy for reliable logging
  
  // Add useAppSettings hook to ensure this component re-renders when settings change
  // const [settings] = useAppSettings(); // Moved up
  
  // Log when settings change to track updates
  useEffect(() => {
  }, [
    displaySide,
    settings.requireAllLandmarks,
    settings.minimumVisibilityThreshold,
    settings.requireSecondaryLandmarks,
    settings.useThreePhases
  ]);
  
  const angleConfigToShow = useMemo(() => {
    if (!selectedExercise || 
        !selectedExercise.logicConfig || 
        selectedExercise.logicConfig.type !== 'angle' || 
        !Array.isArray(selectedExercise.logicConfig.anglesToTrack) ||
        selectedExercise.logicConfig.anglesToTrack.length === 0) {
      return null;
    }
    const { anglesToTrack } = selectedExercise.logicConfig;
    if (displaySide === 'left') {
      return anglesToTrack.find(a => a.id.toLowerCase().includes('left'));
    } else if (displaySide === 'right') {
      let config = anglesToTrack.find(a => a.id.toLowerCase().includes('right'));
      if (!config) {
        config = anglesToTrack.find(a => !a.id.toLowerCase().includes('left'));
      }
      return config;
    }
    return null;
  }, [selectedExercise, displaySide]);

  const displayLabel = useMemo(() => {
    if (!angleConfigToShow) return '';
    if (displaySide === 'left' && angleConfigToShow.id.toLowerCase().includes('left')) return 'Left';
    if (displaySide === 'right') {
      if (angleConfigToShow.id.toLowerCase().includes('right')) return 'Right';
      return angleConfigToShow.name || angleConfigToShow.id;
    }
    return '';
  }, [angleConfigToShow, displaySide]);

  const landmarkNamesToCheck = useMemo(() => {
    if (!angleConfigToShow || !selectedExercise.landmarks) {
      return { primary: [], secondary: [] };
    }
    const { side, points } = angleConfigToShow;
    const pointNames = points.map(pt => (side ? `${side}_${pt}` : pt));
    
    const primaryFromExercise = selectedExercise.landmarks?.primary || 
                               (selectedExercise.landmarks?.[displayLabel.toLowerCase()]?.primary) ||
                               [];
    const secondaryFromExercise = selectedExercise.landmarks?.secondary || 
                                 (selectedExercise.landmarks?.[displayLabel.toLowerCase()]?.secondary) ||
                                 getDefaultSecondaryLandmarks(displayLabel);

    return {
      primary: [...new Set([...pointNames, ...primaryFromExercise])],
      secondary: settings.requireSecondaryLandmarks ? [...new Set(secondaryFromExercise)] : []
    };
  }, [angleConfigToShow, selectedExercise.landmarks, displayLabel, settings.requireSecondaryLandmarks]);

  const landmarkVisibilityData = useMemo(() => {
    let data = {
      primaryLandmarks: { allVisible: true, minVisibility: 100 },
      secondaryLandmarks: { allVisible: true, minVisibility: 100 }
    };

    if (landmarksData && angleConfigToShow) {
      // Primary landmarks
      let allPrimaryFound = true;
      let minPrimaryVisibility = 100;
      if (landmarkNamesToCheck.primary.length > 0) {
        for (const pointName of landmarkNamesToCheck.primary) {
          const index = LANDMARK_MAP[pointName];
          if (index !== undefined && landmarksData[index]) {
            const landmark = landmarksData[index];
            const visibility = Number(landmark.visibility || 0) * 100;
            minPrimaryVisibility = Math.min(minPrimaryVisibility, visibility);
          } else {
            allPrimaryFound = false;
            minPrimaryVisibility = 0;
            break;
          }
        }
      } else if (settings.requireAllLandmarks) { // If primary landmarks are required but none are defined to check
          allPrimaryFound = false;
          minPrimaryVisibility = 0;
      }
      data.primaryLandmarks = { allVisible: allPrimaryFound, minVisibility: minPrimaryVisibility };

      // Secondary landmarks (only if required by settings and names are provided)
      if (settings.requireSecondaryLandmarks && landmarkNamesToCheck.secondary.length > 0) {
        let allSecondaryFound = true;
        let minSecondaryVisibility = 100;
        for (const pointName of landmarkNamesToCheck.secondary) {
          const index = LANDMARK_MAP[pointName];
          if (index !== undefined && landmarksData[index]) {
            const landmark = landmarksData[index];
            const visibility = Number(landmark.visibility || 0) * 100;
            minSecondaryVisibility = Math.min(minSecondaryVisibility, visibility);
          } else {
            allSecondaryFound = false;
            minSecondaryVisibility = 0;
            break;
          }
        }
        data.secondaryLandmarks = { allVisible: allSecondaryFound, minVisibility: minSecondaryVisibility };
      } else {
        // If secondary aren't required or no names, assume they are fine
        data.secondaryLandmarks = { allVisible: true, minVisibility: 100 };
      }
    }
    return data;
  }, [landmarksData, angleConfigToShow, landmarkNamesToCheck, settings.requireAllLandmarks, settings.requireSecondaryLandmarks]);

  if (!angleConfigToShow || trackedAngles[angleConfigToShow.id] == null) {
    return null;
  }
  
  const phaseTrackerKey = `${settings.requireAllLandmarks}-${settings.minimumVisibilityThreshold}-${settings.requireSecondaryLandmarks}-${settings.useThreePhases}-${angleConfigToShow.id}`;
  // console.log(`[PhaseTrackerDisplay (${displaySide})] Rendering with phaseTrackerKey:`, phaseTrackerKey);
  
  return (
    <div className={`phase-tracker-display ${displaySide}-side`}>
      <PhaseTracker 
        key={phaseTrackerKey}
        angle={trackedAngles[angleConfigToShow.id]} 
        angleConfig={angleConfigToShow} 
        side={displayLabel}
        useThreePhases={settings.useThreePhases}
        landmarkVisibility={landmarkVisibilityData}
        workoutMode={workoutMode}
      />
    </div>
  );
};

export default PhaseTrackerDisplay; 