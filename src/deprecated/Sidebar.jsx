import React from 'react';
import './Sidebar.css'; // We'll create this next
import { LANDMARK_MAP } from '../logic/landmarkUtils';

// Accept selectedExercise prop and visibilityThreshold
const Sidebar = ({ isOpen, latestPoseData, selectedExercise, visibilityThreshold }) => {

  // Handle case where selectedExercise might not be available initially
  if (!selectedExercise) {
    return <div className={`sidebar ${isOpen ? 'open' : ''}`}>Loading exercise info...</div>;
  }

  // Extract landmark names from the selected exercise config
  const { left: leftLandmarkNames, right: rightLandmarkNames } = selectedExercise.landmarks;

  // Helper function to get visibility for a landmark name
  const getVisibility = (landmarkName) => {
    const index = LANDMARK_MAP[landmarkName];
    if (index === undefined) return 'N/A (Unknown)';

    // Check if data exists and has at least one pose with landmarks
    if (!latestPoseData || !latestPoseData.landmarks || latestPoseData.landmarks.length === 0 || !latestPoseData.landmarks[0][index]) {
      return 'N/A';
    }
    // Assuming we only care about the first detected pose (index 0)
    const visibilityScore = latestPoseData.landmarks[0][index]?.visibility;
    return typeof visibilityScore === 'number' ? visibilityScore.toFixed(2) : 'N/A';
  };

  // Helper to render landmarks list with visibility
  const renderLandmarkList = (landmarks, side) => {
    return landmarks.map(name => {
      const visibility = getVisibility(name);
      const visibilityNumber = parseFloat(visibility);
      
      // Check if the visibility is below the threshold
      const isBelowThreshold = !isNaN(visibilityNumber) && visibilityNumber < visibilityThreshold;
      
      return (
        <li key={`${side}-${name}`}>
          {name}: <span 
            className="visibility-score" 
            style={{ color: isBelowThreshold ? '#e74c3c' : 'inherit' }}
          >
            ({visibility})
            {isBelowThreshold && " ⚠️"}
          </span>
        </li>
      );
    });
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Use selectedExercise.name for the title */}
      <h2>{selectedExercise.name} Info</h2>
      
      {/* Display Threshold Info */}
      <div className="threshold-info" style={{ marginBottom: '15px' }}>
        <p>Visibility Threshold: <span style={{ fontWeight: 'bold' }}>{(visibilityThreshold * 100).toFixed(0)}%</span></p>
        <p style={{ fontSize: '0.8em', opacity: 0.8 }}>Landmarks below this threshold will pause tracking</p>
      </div>
      
      {/* Display Landmark Requirements */}
      <div className="landmark-section">
        <h3>Required Landmarks</h3>
        {/* Conditionally render based on isTwoSided */}
        {selectedExercise.isTwoSided ? (
          <>
            <h4>Left Side:</h4>
            <ul>
              <li className="landmark-category">Primary:</li>
              {renderLandmarkList(leftLandmarkNames.primary, 'left-primary')}
              {leftLandmarkNames.secondary && leftLandmarkNames.secondary.length > 0 && (
                <>
                  <li className="landmark-category">Secondary:</li>
                  {renderLandmarkList(leftLandmarkNames.secondary, 'left-secondary')}
                </>
              )}
            </ul>
            <h4>Right Side:</h4>
            <ul>
              <li className="landmark-category">Primary:</li>
              {renderLandmarkList(rightLandmarkNames.primary, 'right-primary')}
              {rightLandmarkNames.secondary && rightLandmarkNames.secondary.length > 0 && (
                <>
                  <li className="landmark-category">Secondary:</li>
                  {renderLandmarkList(rightLandmarkNames.secondary, 'right-secondary')}
                </>
              )}
            </ul>
          </>
        ) : (
          /* Handle non-two-sided exercises (assuming landmarks structure might differ) */
          /* For now, assume a structure like landmarks.primary/secondary directly */
          <ul>
            <li className="landmark-category">Primary:</li>
            {renderLandmarkList(selectedExercise.landmarks.primary || [], 'primary')}
            {selectedExercise.landmarks.secondary && selectedExercise.landmarks.secondary.length > 0 && (
              <>
                <li className="landmark-category">Secondary:</li>
                {renderLandmarkList(selectedExercise.landmarks.secondary || [], 'secondary')}
              </>
            )}
          </ul>
        )}
      </div>
      {/* Add other components or controls later */}
    </div>
  );
};

export default Sidebar; 