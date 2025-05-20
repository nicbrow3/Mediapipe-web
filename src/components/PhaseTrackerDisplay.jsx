import React, { useEffect, useMemo, useState } from 'react';
import PhaseTracker from './PhaseTracker';
import { LANDMARK_MAP } from '../logic/landmarkUtils.js';
import { useAppSettings } from '../hooks/useAppSettings';
import { Paper } from '@mantine/core';

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

const PhaseTrackerDisplay = ({ selectedExercise, trackedAngles, displaySide, landmarksData, workoutMode, isRepCountingAllowed, cameraStarted, hasLandmarksData, sessionPhase = 'exercising' }) => {
  const [settings] = useAppSettings();
  
  // Use a state to maintain the last valid angleConfigToShow to prevent flickering
  const [lastValidAngleConfig, setLastValidAngleConfig] = useState(null);
  const [lastValidAngle, setLastValidAngle] = useState(null);
  
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

  // Keep track of the last valid angle config
  useEffect(() => {
    if (angleConfigToShow) {
      setLastValidAngleConfig(angleConfigToShow);
    }
  }, [angleConfigToShow]);

  // Keep track of the last valid angle value when it's available
  useEffect(() => {
    if (angleConfigToShow && trackedAngles && trackedAngles[angleConfigToShow.id] != null) {
      setLastValidAngle(trackedAngles[angleConfigToShow.id]);
    }
  }, [angleConfigToShow, trackedAngles]);

  const displayLabel = useMemo(() => {
    const configToUse = angleConfigToShow || lastValidAngleConfig;
    if (!configToUse) return displaySide === 'left' ? 'Left' : 'Right'; // Default labels
    if (displaySide === 'left' && configToUse.id.toLowerCase().includes('left')) return 'Left';
    if (displaySide === 'right') {
      if (configToUse.id.toLowerCase().includes('right')) return 'Right';
      return configToUse.name || configToUse.id;
    }
    return displaySide === 'left' ? 'Left' : 'Right'; // Fallback
  }, [angleConfigToShow, lastValidAngleConfig, displaySide]);

  const landmarkNamesToCheck = useMemo(() => {
    const configToUse = angleConfigToShow || lastValidAngleConfig;
    if (!configToUse || !selectedExercise?.landmarks) {
      return { primary: [], secondary: [] };
    }
    const { side, points } = configToUse;
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
  }, [angleConfigToShow, lastValidAngleConfig, selectedExercise, displayLabel, settings.requireSecondaryLandmarks]);

  const landmarkVisibilityData = useMemo(() => {
    let data = {
      primaryLandmarks: { allVisible: true, minVisibility: 100 },
      secondaryLandmarks: { allVisible: true, minVisibility: 100 }
    };

    const configToUse = angleConfigToShow || lastValidAngleConfig;
    if (landmarksData && configToUse) {
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
  }, [landmarksData, angleConfigToShow, lastValidAngleConfig, landmarkNamesToCheck, settings.requireAllLandmarks, settings.requireSecondaryLandmarks]);

  // Determine if we have a valid angle config for this side and tracked angle data
  const hasValidAngleDataForDisplay = angleConfigToShow && trackedAngles && trackedAngles[angleConfigToShow.id] != null;

  // Always render a container with a fixed or minimum height to prevent layout shifts
  const phaseTrackerKey = `${settings.requireAllLandmarks}-${settings.minimumVisibilityThreshold}-${settings.requireSecondaryLandmarks}-${settings.useThreePhases}-${angleConfigToShow?.id || 'placeholder'}`;

  // Determine if we should show real data or a placeholder
  const configToUse = angleConfigToShow || lastValidAngleConfig;
  const angleToUse = configToUse && trackedAngles && trackedAngles[configToUse.id] != null 
                     ? trackedAngles[configToUse.id] 
                     : lastValidAngle || 0;

  const showPlaceholder = !configToUse || !hasValidAngleDataForDisplay;

  return (
    <Paper>
      <div className={`phase-tracker-display ${displaySide}-side`} style={{ minHeight: '120px' }}>
        {showPlaceholder ? (
          <div className="phase-tracker-placeholder" style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // backgroundColor: 'rgba(40, 40, 40, 0.7)',
            color: 'rgba(255, 255, 255, 0.5)',
            // borderRadius: '8px',
            fontSize: '14px'
          }}>
            {angleConfigToShow ? 'Waiting for movement data...' : `No phase tracking configuration for ${displaySide.toLowerCase()} side`}
          </div>
        ) : (
          <PhaseTracker 
            key={phaseTrackerKey}
            angle={angleToUse} 
            angleConfig={configToUse} 
            side={displayLabel}
            useThreePhases={settings.useThreePhases}
            landmarkVisibility={landmarkVisibilityData}
            workoutMode={workoutMode}
            isRepCountingAllowed={isRepCountingAllowed}
            sessionPhase={sessionPhase}
          />
        )}
      </div>
    </Paper>
  );
};

export default PhaseTrackerDisplay; 