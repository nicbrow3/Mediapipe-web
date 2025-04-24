import React from 'react';
import './Sidebar.css'; // We'll create this next
// import { bicepCurls } from '../exercises/bicepCurls'; // Remove direct import

// Mapping from MediaPipe landmark names to indices (based on PoseLandmarker model)
const landmarkNameMap = {
  'nose': 0,
  'left_eye_inner': 1, 'left_eye': 2, 'left_eye_outer': 3,
  'right_eye_inner': 4, 'right_eye': 5, 'right_eye_outer': 6,
  'left_ear': 7, 'right_ear': 8,
  'mouth_left': 9, 'mouth_right': 10,
  'left_shoulder': 11, 'right_shoulder': 12,
  'left_elbow': 13, 'right_elbow': 14,
  'left_wrist': 15, 'right_wrist': 16,
  'left_pinky': 17, 'right_pinky': 18,
  'left_index': 19, 'right_index': 20,
  'left_thumb': 21, 'right_thumb': 22,
  'left_hip': 23, 'right_hip': 24,
  'left_knee': 25, 'right_knee': 26,
  'left_ankle': 27, 'right_ankle': 28,
  'left_heel': 29, 'right_heel': 30,
  'left_foot_index': 31, 'right_foot_index': 32
};

// Accept selectedExercise prop
const Sidebar = ({ isOpen, latestPoseData, selectedExercise }) => {

  // Handle case where selectedExercise might not be available initially
  if (!selectedExercise) {
    return <div className={`sidebar ${isOpen ? 'open' : ''}`}>Loading exercise info...</div>;
  }

  // Extract landmark names from the selected exercise config
  const { left: leftLandmarkNames, right: rightLandmarkNames } = selectedExercise.landmarks;

  // Helper function to get visibility for a landmark name
  const getVisibility = (landmarkName) => {
    const index = landmarkNameMap[landmarkName];
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
    return landmarks.map(name => (
      <li key={`${side}-${name}`}>
        {name}: <span className="visibility-score">({getVisibility(name)})</span>
      </li>
    ));
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Use selectedExercise.name for the title */}
      <h2>{selectedExercise.name} Info</h2>
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