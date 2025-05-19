// src/components/VideoCanvas.jsx
// This component is used to draw the landmarks on the canvas
// It is used in the MinimalTracker component
import React, { useEffect } from 'react';
import { LANDMARK_MAP, POSE_CONNECTIONS } from '../logic/landmarkUtils';

const VideoCanvas = ({ 
  videoRef, 
  canvasRef, 
  landmarks, 
  width, 
  height,
  cameraStarted,
  feedOpacity = 1,
  minVisibilityForConnection = 0.0, // Default to 0.0 (draw all connections if not specified)
  overrideConnectionVisibility = false, // Add new prop with default
  highlightExerciseConnections = false,
  connectionHighlightColor = "#00FF00",
  selectedExercise = null,
  // Stationary tracking visualization props
  enableStationaryTracking = false,
  stationaryDeviationThreshold = 0.05,
  stabilityState = 'idle',
  averageStationaryLandmarks = {},
  stationaryLandmarksConfiguration = []
}) => {
  // Helper function to get landmark indices for the current exercise
  const getExerciseConnections = (exercise) => {
    if (!exercise || !exercise.logicConfig || !exercise.logicConfig.anglesToTrack) return [];
    
    // We'll store connections important for rep calculations
    const importantConnections = [];
    
    // Focus on angles that are used for rep counting (isRepCounter = true)
    const repCountAngles = exercise.logicConfig.anglesToTrack.filter(
      angle => angle.isRepCounter === true
    );
    
    // For each rep counting angle, get the connections between its points
    repCountAngles.forEach(angleConfig => {
      if (angleConfig.points && angleConfig.points.length >= 3) {
        // Map generic points to actual landmark names based on side
        const side = angleConfig.side || 'left';
        
        // Map the points to actual landmark names
        const mappedPoints = angleConfig.points.map(point => {
          if (point === 'shoulder') return `${side}_shoulder`;
          if (point === 'elbow') return `${side}_elbow`;
          if (point === 'wrist') return `${side}_wrist`;
          if (point === 'hip') return `${side}_hip`;
          if (point === 'knee') return `${side}_knee`;
          if (point === 'ankle') return `${side}_ankle`;
          return point; // Return as is if no mapping
        });
        
        // Convert to indices
        const pointIndices = mappedPoints
          .map(name => LANDMARK_MAP[name])
          .filter(idx => idx !== undefined);
        
        // For an angle defined by points A-B-C (where B is the vertex)
        // We want to highlight connections A-B and B-C
        if (pointIndices.length >= 3) {
          // We need to find if A-B and B-C are valid connections in POSE_CONNECTIONS
          
          // For each potential connection in our angle points
          for (let i = 0; i < pointIndices.length - 1; i++) {
            const idxA = pointIndices[i];
            const idxB = pointIndices[i + 1];
            
            // Check if this connection or its reverse exists in POSE_CONNECTIONS
            const connectionExists = POSE_CONNECTIONS.some(([idx1, idx2]) => 
              (idx1 === idxA && idx2 === idxB) || (idx1 === idxB && idx2 === idxA)
            );
            
            if (connectionExists) {
              // Add the connection if it exists
              importantConnections.push([idxA, idxB]);
            } else {
              // If direct connection doesn't exist, try to find intermediate connections
              // For example, if shoulder-wrist doesn't exist directly, we might need shoulder-elbow and elbow-wrist
              
              // Try to find the intermediate landmarks
              const allLandmarks = Object.values(LANDMARK_MAP);
              
              for (const intermediateIdx of allLandmarks) {
                // Check if there's a path from A to intermediate and intermediate to B
                const connectionA = POSE_CONNECTIONS.some(([idx1, idx2]) => 
                  (idx1 === idxA && idx2 === intermediateIdx) || (idx1 === intermediateIdx && idx2 === idxA)
                );
                
                const connectionB = POSE_CONNECTIONS.some(([idx1, idx2]) => 
                  (idx1 === idxB && idx2 === intermediateIdx) || (idx1 === intermediateIdx && idx2 === idxB)
                );
                
                if (connectionA && connectionB) {
                  // Add both connections
                  importantConnections.push([idxA, intermediateIdx]);
                  importantConnections.push([intermediateIdx, idxB]);
                  break; // Found a valid path
                }
              }
            }
          }
        }
      }
    });
    
    // Convert to unique connection strings to remove duplicates
    const uniqueConnections = new Set();
    importantConnections.forEach(([idx1, idx2]) => {
      // Sort indices to ensure consistent representation
      const sortedIndices = [idx1, idx2].sort((a, b) => a - b);
      uniqueConnections.add(`${sortedIndices[0]},${sortedIndices[1]}`);
    });
    
    // Convert back to pairs of indices
    return Array.from(uniqueConnections).map(conn => {
      const [idx1, idx2] = conn.split(',').map(Number);
      return [idx1, idx2];
    });
  };

  // Draw landmarks on canvas
  const drawLandmarks = (ctx, landmarks, width, height, minVisibility, overrideVisibility) => {
    if (!landmarks) return;

    // Set styles for landmarks
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Draw each landmark
    for (const landmark of landmarks) {
      // Convert normalized coordinates to pixel coordinates
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      // Draw landmark point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Get exercise-specific connections if highlighting is enabled
    const exerciseConnections = highlightExerciseConnections && selectedExercise ? 
      getExerciseConnections(selectedExercise) : [];
    
    // Create a Set of exercise connection pairs for faster lookup
    const exerciseConnectionsSet = new Set();
    exerciseConnections.forEach(([idx1, idx2]) => {
      exerciseConnectionsSet.add(`${idx1},${idx2}`);
      exerciseConnectionsSet.add(`${idx2},${idx1}`); // Add both directions for easier lookup
    });
    
    // Draw connections between landmarks
    // Use POSE_CONNECTIONS from landmarkUtils instead of hard-coding
    const connections = POSE_CONNECTIONS;
    
    // First, draw regular connections
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    for (const [idx1, idx2] of connections) {
      // Skip this connection if it's an exercise connection (we'll draw those separately)
      if (highlightExerciseConnections && exerciseConnectionsSet.has(`${idx1},${idx2}`)) {
        continue;
      }

      const landmark1 = landmarks[idx1];
      const landmark2 = landmarks[idx2];

      if (landmark1 && landmark2) {
        let shouldDrawConnection = false;
        if (overrideVisibility) {
          shouldDrawConnection = true; // Always draw if override is true
        } else {
          // Check visibility if available, otherwise assume visible (1.0)
          const L1Visibility = landmark1.visibility !== undefined ? landmark1.visibility : 1.0;
          const L2Visibility = landmark2.visibility !== undefined ? landmark2.visibility : 1.0;
          if (L1Visibility >= minVisibility && L2Visibility >= minVisibility) {
            shouldDrawConnection = true;
          }
        }

        if (shouldDrawConnection) {
          const x1 = landmark1.x * width;
          const y1 = landmark1.y * height;
          const x2 = landmark2.x * width;
          const y2 = landmark2.y * height;
          
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
      }
    }
    ctx.stroke();
    
    // Then, draw exercise-specific connections with the highlight color
    if (highlightExerciseConnections && exerciseConnections.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = connectionHighlightColor;
      ctx.lineWidth = 3; // Make exercise connections slightly thicker
      
      for (const [idx1, idx2] of exerciseConnections) {
        const landmark1 = landmarks[idx1];
        const landmark2 = landmarks[idx2];

        if (landmark1 && landmark2) {
          let shouldDrawConnection = false;
          if (overrideVisibility) {
            shouldDrawConnection = true; // Always draw if override is true
          } else {
            // Check visibility if available, otherwise assume visible (1.0)
            const L1Visibility = landmark1.visibility !== undefined ? landmark1.visibility : 1.0;
            const L2Visibility = landmark2.visibility !== undefined ? landmark2.visibility : 1.0;
            if (L1Visibility >= minVisibility && L2Visibility >= minVisibility) {
              shouldDrawConnection = true;
            }
          }

          if (shouldDrawConnection) {
            const x1 = landmark1.x * width;
            const y1 = landmark1.y * height;
            const x2 = landmark2.x * width;
            const y2 = landmark2.y * height;
            
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
        }
      }
      ctx.stroke();
    }

    // Draw stationary landmark stability circles
    if (enableStationaryTracking && stationaryLandmarksConfiguration && stationaryLandmarksConfiguration.length > 0) {
      stationaryLandmarksConfiguration.forEach(landmarkName => {
        if (averageStationaryLandmarks && averageStationaryLandmarks[landmarkName]) {
          const avgPos = averageStationaryLandmarks[landmarkName];
          const centerX = avgPos.x * width;
          const centerY = avgPos.y * height;
          // Use canvasWidth for radius calculation, assuming width is representative or adjust as needed
          const radius = stationaryDeviationThreshold * width; 

          // Check landmark visibility before drawing
          const landmarkIndex = LANDMARK_MAP[landmarkName];
          if (landmarkIndex === undefined || !landmarks[landmarkIndex]) {
            return; // Skip if landmark not found
          }
          
          const landmark = landmarks[landmarkIndex];
          const visibility = landmark.visibility !== undefined ? landmark.visibility : 0;
          
          // Only draw if visibility is higher than minimum threshold (converted from percent to 0-1 scale)
          if (visibility < minVisibilityForConnection) {
            return; // Skip drawing if visibility is too low
          }

          let circleColor = 'grey'; // Default color
          switch (stabilityState) {
            case 'stable':
              circleColor = 'rgba(0, 255, 0, 0.8)'; // Green for stable
              break;
            case 'stabilizing':
              circleColor = 'rgba(255, 255, 0, 0.8)'; // Yellow for stabilizing
              break;
            case 'unstable':
              circleColor = 'rgba(255, 0, 0, 0.8)'; // Red for unstable
              break;
            case 'idle': // Or specific 'disabled' state if you prefer
            default:
              circleColor = 'rgba(128, 128, 128, 0.5)'; // Grey for idle or other states
              break;
          }

          // Draw as outline instead of filled circle
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = circleColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Optionally, draw the actual landmark point for stationary landmarks more prominently
          if (landmarkIndex !== undefined && landmarks[landmarkIndex]) {
            const actualLandmark = landmarks[landmarkIndex];
            const actualX = actualLandmark.x * width;
            const actualY = actualLandmark.y * height;
            ctx.beginPath();
            ctx.arc(actualX, actualY, 6, 0, 2 * Math.PI); // Larger circle for actual stationary landmark
            ctx.fillStyle = 'cyan'; // Different color to distinguish
            ctx.fill();
          }
        }
      });
    }
  };

  // Update canvas when landmarks change
  useEffect(() => {
    // Ensure canvasRef is current and width/height are positive before drawing
    if (canvasRef.current && width > 0 && height > 0) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      // Apply mirroring and draw video frame
      if (videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
        ctx.save();
        ctx.scale(-1, 1); // Mirror horizontally
        ctx.translate(-width, 0);

        // Apply opacity for the video frame
        const originalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = feedOpacity;
        
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        
        // Restore original alpha before drawing landmarks
        ctx.globalAlpha = originalAlpha;
        
        // Draw the landmarks (they will also be mirrored due to the transform)
        // Only draw landmarks if there are any to draw
        if (landmarks && landmarks.length > 0) {
            drawLandmarks(ctx, landmarks, width, height, minVisibilityForConnection, overrideConnectionVisibility);
        }

        ctx.restore();
      }
    }
  }, [
    landmarks, 
    width, 
    height, 
    videoRef, 
    canvasRef, 
    cameraStarted, 
    feedOpacity, 
    minVisibilityForConnection, 
    overrideConnectionVisibility,
    highlightExerciseConnections,
    connectionHighlightColor,
    selectedExercise,
    enableStationaryTracking,
    stationaryDeviationThreshold,
    stabilityState,
    averageStationaryLandmarks,
    stationaryLandmarksConfiguration
  ]);

  return (
    <div className="video-canvas-wrapper">
      <video 
        ref={videoRef} 
        className="input_video" 
        autoPlay 
        playsInline 
        muted 
        style={{ display: 'none' }}
      />
      <canvas 
        ref={canvasRef} 
        className="output_canvas" 
        width={width} 
        height={height} 
      />
    </div>
  );
};

// Helper functions that can be reused by parent components
export const setupCamera = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    return stream;
  } catch (error) {
    throw new Error(`Error accessing camera: ${error.message}`);
  }
};

// Wait for video to be ready
export const waitForVideoReady = (videoElement) => {
  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      videoElement.play();
      resolve(videoElement);
    };
  });
};

export default VideoCanvas; 