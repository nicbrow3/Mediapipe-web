import React, { useMemo } from 'react';
import AngleIndicator from './AngleIndicator';
import './AngleDisplay.css';
import { Paper } from '@mantine/core';
import { useAppSettings } from '../hooks/useAppSettings';

const AngleDisplay = ({ selectedExercise, trackedAngles, rawAngles, smoothingEnabled, displaySide, cameraStarted, hasLandmarksData, landmarkVisibility }) => {
  // Get app settings to use the visibility threshold value
  const [appSettings] = useAppSettings();

  // console.log(`[AngleDisplay] Side: ${displaySide} - Received selectedExercise:`, JSON.parse(JSON.stringify(selectedExercise))); // Deep log
  if (selectedExercise && selectedExercise.logicConfig && selectedExercise.logicConfig.anglesToTrack && selectedExercise.logicConfig.anglesToTrack.length > 0) {
    // console.log(`[AngleDisplay] Side: ${displaySide} - DIRECT CHECK minThreshold from prop:`, selectedExercise.logicConfig.anglesToTrack[0].minThreshold, "for angle ID:", selectedExercise.logicConfig.anglesToTrack[0].id);
  }
  // console.log(`[AngleDisplay] Side: ${displaySide} - Tracked Angles:`, JSON.parse(JSON.stringify(trackedAngles)));
  // Only render if we have a valid exercise with angle tracking
  if (!selectedExercise || selectedExercise.logicConfig?.type !== 'angle' || !Array.isArray(selectedExercise.logicConfig.anglesToTrack)) {
    return null;
  }

  // Check if we have valid exercise data for this side
  const hasValidExerciseConfigForSide = selectedExercise && 
                                        selectedExercise.logicConfig?.type === 'angle' && 
                                        Array.isArray(selectedExercise.logicConfig.anglesToTrack) &&
                                        selectedExercise.logicConfig.anglesToTrack.some(angleConfig => {
                                          const angleId = angleConfig.id.toLowerCase();
                                          const isLeftAngle = angleId.includes('left');
                                          const isRightAngle = angleId.includes('right');
                                          return displaySide === 'left' ? isLeftAngle : isRightAngle || (!isLeftAngle && !isRightAngle);
                                        });
  
  // Find the angle config relevant to this side
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

  const angle = angleConfigToShow && trackedAngles ? trackedAngles[angleConfigToShow.id] : null;
  const raw = angleConfigToShow && rawAngles ? rawAngles[angleConfigToShow.id] : null;

  // Determine indicator color based on side
  const indicatorColor = displaySide === 'left' ? '#45a29e' : '#e84545';

  // Decide which value to show: smoothed (angle) or raw, only if angle is valid
  const displayValue = angle != null ? (smoothingEnabled ? angle : raw) : null;

  // Determine if we should show the indicator line based on landmark visibility
  const hasAcceptableVisibility = useMemo(() => {
    if (!landmarkVisibility) return true; // Default to showing if no visibility data
    
    const { primaryLandmarks } = landmarkVisibility;
    if (!primaryLandmarks) return true;
    
    // Use the app settings threshold for visibility
    const threshold = appSettings.minimumVisibilityThreshold || 50;
    return primaryLandmarks.allVisible && primaryLandmarks.minVisibility >= threshold;
  }, [landmarkVisibility, appSettings.minimumVisibilityThreshold]);

  // Always render the container for consistent layout
  return (
    <Paper>

      <div className="angle-display">
        {hasValidExerciseConfigForSide ? (
          // Render the AngleIndicator (half-circle background) and conditional content
          <div className="angle-display-item">
            <AngleIndicator 
              angle={displayValue} // Pass the potentially null displayValue
              maxAngle={180} 
              size={140}
              minSize={80}
              color={indicatorColor}
              backgroundColor={`${indicatorColor}33`} // Add transparency to the background
              angleConfig={angleConfigToShow} // Pass the angleConfig
              showIndicatorLine={displayValue != null && hasAcceptableVisibility} // Only show line when visibility is acceptable
              />
            
            {/* Show the angle value only if it's valid */}
            {displayValue != null && angleConfigToShow && (
              <div>
                <span style={{color: 'white'}}>
                  {angleConfigToShow.name || angleConfigToShow.id}:
                </span>
                <span style={{color: indicatorColor}}> {displayValue}°</span>
              </div>
            )}
            {/* Add a placeholder if angle value is null but config is valid */}
            {displayValue == null && angleConfigToShow && ( // Use angleConfigToShow to ensure config is valid
              <div style={{
                opacity: 0.5,
                color: 'white',
                fontSize: '14px',
                textAlign: 'center',
                marginTop: '5px'
              }}>
                Waiting for angle data...
              </div>
            )}
          </div>
        ) : (
          // Render placeholder if no valid exercise config for this side
          <div className="angle-display-placeholder" style={{ 
            opacity: 0.3, 
            padding: '10px', 
            textAlign: 'center',
            fontSize: '14px'
          }}>
            No angle configuration for {displaySide.toLowerCase()} side
          </div>
        )}
      </div>
    </Paper>
  );
};

export default AngleDisplay; 