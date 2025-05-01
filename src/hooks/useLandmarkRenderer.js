import { useCallback } from 'react';
import { LANDMARK_MAP, POSE_CONNECTIONS } from '../logic/landmarkUtils';
import { drawLandmarks, drawRepArc } from '../logic/drawingUtils';

/**
 * Custom hook for rendering pose landmarks on a canvas
 * @param {Object} canvasRef - Ref to the canvas element
 * @param {Object} selectedExercise - The current selected exercise
 * @returns {Object} - Rendering functions
 */
function useLandmarkRenderer(canvasRef, selectedExercise) {
  /**
   * Render landmarks on the canvas
   * @param {Array} landmarks - Pose landmarks
   */
  const renderLandmarks = useCallback((landmarks) => {
    if (!landmarks || !canvasRef.current) return;
    
    // Get landmark indices to highlight based on the selected exercise
    let highlightedIndices = [];
    let secondaryIndices = [];
    
    if (selectedExercise?.landmarks) {
      let primaryNames = [];
      let secondaryNames = [];
      
      if (selectedExercise.isTwoSided) {
        // Two-sided structure
        const leftPrimary = selectedExercise.landmarks.left?.primary || [];
        const rightPrimary = selectedExercise.landmarks.right?.primary || [];
        const leftSecondary = selectedExercise.landmarks.left?.secondary || [];
        const rightSecondary = selectedExercise.landmarks.right?.secondary || [];
        primaryNames = [...leftPrimary, ...rightPrimary];
        secondaryNames = [...leftSecondary, ...rightSecondary];
      } else {
        // Flat structure
        primaryNames = selectedExercise.landmarks.primary || [];
        secondaryNames = selectedExercise.landmarks.secondary || [];
      }
      
      highlightedIndices = primaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
      secondaryIndices = secondaryNames.map(name => LANDMARK_MAP[name]).filter(index => index !== undefined);
    }
    
    // Draw the landmarks and connections
    drawLandmarks(landmarks, POSE_CONNECTIONS, canvasRef.current, highlightedIndices, secondaryIndices);
    
    // Draw arm arc (for visualization)
    const leftShoulder = landmarks[LANDMARK_MAP.left_shoulder];
    const leftElbow = landmarks[LANDMARK_MAP.left_elbow];
    const leftWrist = landmarks[LANDMARK_MAP.left_wrist];
    
    if (leftShoulder && leftElbow && leftWrist && canvasRef.current) {
      drawRepArc(canvasRef.current.getContext('2d'), leftShoulder, leftElbow, leftWrist);
    }
  }, [canvasRef, selectedExercise]);
  
  return { renderLandmarks };
}

export default useLandmarkRenderer; 