// src/components/VideoCanvas.jsx
// This component is used to draw the landmarks on the canvas
// It is used in the MinimalTracker component
import React, { useEffect } from 'react';

const VideoCanvas = ({ 
  videoRef, 
  canvasRef, 
  landmarks, 
  width, 
  height,
  cameraStarted
}) => {
  // Draw landmarks on canvas
  const drawLandmarks = (ctx, landmarks, width, height) => {
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
    
    // Draw connections between landmarks (simplified)
    // POSE_CONNECTIONS would normally come from MediaPipe, but we'll use a simplified subset
    const connections = [
      // Torso
      [11, 12], [12, 24], [24, 23], [23, 11],
      // Arms
      [11, 13], [13, 15], [12, 14], [14, 16],
      // Legs
      [23, 25], [25, 27], [24, 26], [26, 28],
      // Head
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8]
    ];
    
    ctx.beginPath();
    for (const [i, j] of connections) {
      if (landmarks[i] && landmarks[j]) {
        const x1 = landmarks[i].x * width;
        const y1 = landmarks[i].y * height;
        const x2 = landmarks[j].x * width;
        const y2 = landmarks[j].y * height;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
    }
    ctx.stroke();
  };

  // Update canvas when landmarks change
  useEffect(() => {
    if (canvasRef.current && landmarks) {
      const ctx = canvasRef.current.getContext('2d');
      
      // Clear the canvas
      ctx.clearRect(0, 0, width, height);
      
      // Apply mirroring and draw video frame
      if (videoRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);

        ctx.drawImage(videoRef.current, 0, 0, width, height);
        
        // Draw the landmarks (they will also be mirrored due to the transform)
        drawLandmarks(ctx, landmarks, width, height);

        ctx.restore();
      }
    }
  }, [landmarks, width, height, videoRef, canvasRef, cameraStarted]);

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