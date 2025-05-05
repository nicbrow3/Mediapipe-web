import { useCallback, useRef } from 'react';
import { LANDMARK_MAP, POSE_CONNECTIONS } from '../logic/landmarkUtils';
import { drawLandmarks } from '../logic/drawingUtils';
import defaultConfig from '../config';

/**
 * Custom hook for rendering pose landmarks on a canvas
 * @param {Object} canvasRef - Ref to the canvas element
 * @param {Object} selectedExercise - The current selected exercise
 * @param {Object} config - Configuration including face/hand landmark settings
 * @returns {Object} - Rendering functions
 */
function useLandmarkRenderer(canvasRef, selectedExercise, config = defaultConfig) {
  // Cache highlighted indices to avoid recreating arrays on every render
  const highlightedIndicesRef = useRef([]);
  const secondaryIndicesRef = useRef([]);
  const visibilityMapRef = useRef(new Map());
  
  // Update the cached indices when exercise changes
  const updateIndices = useCallback(() => {
    if (!selectedExercise?.landmarks) {
      highlightedIndicesRef.current = [];
      secondaryIndicesRef.current = [];
      return;
    }
    
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
    
    highlightedIndicesRef.current = primaryNames
      .map(name => LANDMARK_MAP[name])
      .filter(index => index !== undefined);
    
    secondaryIndicesRef.current = secondaryNames
      .map(name => LANDMARK_MAP[name])
      .filter(index => index !== undefined);
  }, [selectedExercise]);
  
  /**
   * Render landmarks on the canvas
   * @param {Array} landmarks - Pose landmarks
   */
  const renderLandmarks = useCallback((landmarks) => {
    if (!landmarks || !canvasRef.current) return;
    
    // Update indices if needed
    updateIndices();
    
    // Create visibility map based on settings (face and hand landmarks)
    // This avoids creating new landmark objects
    visibilityMapRef.current.clear();
    
    // Define ranges for face/hand landmarks
    const faceLandmarkRange = { start: 0, end: 10 }; // Indices 0-10 are face landmarks
    const handLandmarkRanges = [
      { start: 17, end: 22 } // Indices 17-22 are hand landmarks
    ];

    // If face landmarks are disabled, mark them invisible in the map
    if (!config.pose.enableFaceLandmarks) {
      for (let i = faceLandmarkRange.start; i <= faceLandmarkRange.end; i++) {
        if (landmarks[i]) {
          visibilityMapRef.current.set(i, 0); // Mark as invisible
        }
      }
    }

    // If hand landmarks are disabled, mark them invisible in the map
    if (!config.pose.enableHandLandmarks) {
      for (const range of handLandmarkRanges) {
        for (let i = range.start; i <= range.end; i++) {
          if (landmarks[i]) {
            visibilityMapRef.current.set(i, 0); // Mark as invisible
          }
        }
      }
    }
    
    // Draw the landmarks and connections
    drawLandmarks(
      landmarks, 
      POSE_CONNECTIONS, 
      canvasRef.current, 
      highlightedIndicesRef.current, 
      secondaryIndicesRef.current,
      visibilityMapRef.current
    );
    
  }, [canvasRef, config.pose.enableFaceLandmarks, config.pose.enableHandLandmarks, updateIndices]);
  
  return { renderLandmarks };
}

export default useLandmarkRenderer; 