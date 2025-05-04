import { useCallback } from 'react';
import { LANDMARK_MAP, POSE_CONNECTIONS } from '../logic/landmarkUtils';
import { drawLandmarks, drawRepArc } from '../logic/drawingUtils';
import defaultConfig from '../config';

/**
 * Custom hook for rendering pose landmarks on a canvas
 * @param {Object} canvasRef - Ref to the canvas element
 * @param {Object} selectedExercise - The current selected exercise
 * @param {Object} config - Configuration including face/hand landmark settings
 * @returns {Object} - Rendering functions
 */
function useLandmarkRenderer(canvasRef, selectedExercise, config = defaultConfig) {
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
    
    // Filter landmarks based on settings (face and hand landmarks)
    const filteredLandmarks = [...landmarks]; // Create a copy of the landmarks

    // Define ranges for face/hand landmarks
    const faceLandmarkRange = { start: 0, end: 10 }; // Indices 0-10 are face landmarks
    const handLandmarkRanges = [
      { start: 17, end: 22 } // Indices 17-22 are hand landmarks
    ];

    // If face landmarks are disabled, make them invisible
    if (!config.pose.enableFaceLandmarks) {
      for (let i = faceLandmarkRange.start; i <= faceLandmarkRange.end; i++) {
        if (filteredLandmarks[i]) {
          // Keep the object but make visibility 0
          filteredLandmarks[i] = { ...filteredLandmarks[i], visibility: 0 };
        }
      }
    }

    // If hand landmarks are disabled, make them invisible
    if (!config.pose.enableHandLandmarks) {
      for (const range of handLandmarkRanges) {
        for (let i = range.start; i <= range.end; i++) {
          if (filteredLandmarks[i]) {
            // Keep the object but make visibility 0
            filteredLandmarks[i] = { ...filteredLandmarks[i], visibility: 0 };
          }
        }
      }
    }
    
    // Draw the landmarks and connections
    drawLandmarks(filteredLandmarks, POSE_CONNECTIONS, canvasRef.current, highlightedIndices, secondaryIndices);
    
    // Draw arm arc (for visualization)
    const leftShoulder = landmarks[LANDMARK_MAP.left_shoulder];
    const leftElbow = landmarks[LANDMARK_MAP.left_elbow];
    const leftWrist = landmarks[LANDMARK_MAP.left_wrist];
    
    if (leftShoulder && leftElbow && leftWrist && canvasRef.current) {
      drawRepArc(canvasRef.current.getContext('2d'), leftShoulder, leftElbow, leftWrist);
    }
  }, [canvasRef, selectedExercise, config.pose.enableFaceLandmarks, config.pose.enableHandLandmarks]);
  
  return { renderLandmarks };
}

export default useLandmarkRenderer; 