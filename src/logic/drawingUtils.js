/**
 * Draws landmarks and connections on a canvas
 * @param {Array} landmarks - Array of landmark points
 * @param {Array} connections - Array of connection pairs
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} highlightedLandmarkIndices - Indices of landmarks to highlight (primary)
 * @param {Array} secondaryLandmarkIndices - Indices of landmarks to highlight (secondary)
 * @param {Map} visibilityMap - Optional map of landmark indices to visibility values
 */
function drawLandmarks(
  landmarks, 
  connections, 
  canvas, 
  highlightedLandmarkIndices = [], 
  secondaryLandmarkIndices = [],
  visibilityMap = null
) {
  if (!canvas) return;
  
  // Track the rendering time to adaptively adjust quality
  const startTime = performance.now();
  
  // Get last render time from the canvas if available
  const lastRenderTime = canvas._lastRenderTime || 0;
  const lastFrameTime = canvas._lastFrameTime || 16; // Assume 60fps initially
  const simplifyRendering = lastFrameTime > 30; // Simplify if frame time > 30ms (less than 33fps)
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Get the computed color values from the CSS variables
  const computedStyle = getComputedStyle(canvas);
  const accentColorValue = computedStyle.getPropertyValue('--accent-color').trim();
  const accentColorValue2 = computedStyle.getPropertyValue('--accent-color-2').trim();
  const accentColorValue3 = computedStyle.getPropertyValue('--accent-color-3').trim(); // Color for highlight

  // Throttle rendering - only re-render every 2 frames when below threshold to improve performance
  if (canvas._frameCounter === undefined) {
    canvas._frameCounter = 0;
  }
  
  canvas._frameCounter++;
  
  // If we're in low FPS mode, only render on even frames to reduce load
  if (simplifyRendering && canvas._frameCounter % 2 === 1) {
    // Store the time it took to skip rendering
    const endTime = performance.now();
    canvas._lastRenderTime = endTime;
    canvas._lastFrameTime = endTime - startTime;
    return; // Skip this frame
  }
  
  // Reset counter occasionally to avoid overflow
  if (canvas._frameCounter > 1000) {
    canvas._frameCounter = 0;
  }

  // Draw the connecting lines
  ctx.strokeStyle = accentColorValue2 || '#6a55be';
  ctx.lineWidth = simplifyRendering ? 1 : 2; // Thinner lines when FPS is low
  
  // Reuse temporary objects for connection endpoints
  const startPoint = { x: 0, y: 0, visibility: 0 };
  const endPoint = { x: 0, y: 0, visibility: 0 };
  
  // Function to get effective visibility (from visibilityMap or landmark)
  const getEffectiveVisibility = (landmark, index) => {
    if (visibilityMap && visibilityMap.has(index)) {
      return visibilityMap.get(index);
    }
    return landmark?.visibility ?? 0;
  };

  // In simplified mode, draw fewer connections
  const connectionStride = simplifyRendering ? 2 : 1; // Skip every other connection in simplified mode
  
  for (let i = 0; i < connections.length; i += connectionStride) {
    const [startIdx, endIdx] = connections[i];
    const startLandmark = landmarks[startIdx];
    const endLandmark = landmarks[endIdx];
    
    // Skip if either landmark is missing
    if (!startLandmark || !endLandmark) continue;
    
    // Get effective visibility
    const startVisibility = getEffectiveVisibility(startLandmark, startIdx);
    const endVisibility = getEffectiveVisibility(endLandmark, endIdx);
    
    // Skip if either landmark has low visibility
    // Use higher threshold when simplifying to draw even fewer lines
    const visibilityThreshold = simplifyRendering ? 0.2 : 0.1;
    if (startVisibility <= visibilityThreshold || endVisibility <= visibilityThreshold) continue;
    
    // Set temporary object values
    startPoint.x = startLandmark.x;
    startPoint.y = startLandmark.y;
    endPoint.x = endLandmark.x;
    endPoint.y = endLandmark.y;
    
    // Draw the connection
    ctx.beginPath();
    ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
    ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
    ctx.stroke();
  }

  // Draw the landmark points - only draw important landmarks when simplifying
  for (let i = 0; i < landmarks.length; i++) {
    // Skip most landmarks in simplified mode, only draw key points
    // For simplicity, consider highlighted and secondary as key points
    if (simplifyRendering && 
        !highlightedLandmarkIndices.includes(i) && 
        !secondaryLandmarkIndices.includes(i)) {
      // Only draw every 3rd point for non-key landmarks in simplified mode
      if (i % 3 !== 0) continue;
    }
    
    const landmark = landmarks[i];
    if (!landmark) continue;
    
    // Get effective visibility
    const visibility = getEffectiveVisibility(landmark, i);
    
    // Only draw if landmark is reasonably visible
    // Use higher threshold when simplifying
    const visibilityThreshold = simplifyRendering ? 0.2 : 0.1;
    if (visibility <= visibilityThreshold) continue;
    
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    
    // Draw the standard small filled circle for all visible landmarks
    // Use smaller circles when simplifying
    const circleRadius = simplifyRendering ? 3 : 4;
    
    ctx.fillStyle = accentColorValue || '#6a55be';
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
    ctx.fill();

    // In simplified mode, only draw outer circles for primary landmarks
    if (simplifyRendering && !highlightedLandmarkIndices.includes(i)) continue;

    // If this landmark index is in the secondary list, draw the outer circle in accentColorValue2
    if (secondaryLandmarkIndices.includes(i)) {
      ctx.strokeStyle = accentColorValue2 || '#3a8ad3';
      ctx.lineWidth = simplifyRendering ? 1 : 2;
      ctx.beginPath();
      ctx.arc(x, y, simplifyRendering ? 6 : 8, 0, 2 * Math.PI);
      ctx.stroke();
    }
    // If this landmark index is in the highlighted (primary) list, draw the outer circle in accentColorValue3
    else if (highlightedLandmarkIndices.includes(i)) {
      ctx.strokeStyle = accentColorValue3 || '#cf912e'; // Use accent-3 or fallback
      ctx.lineWidth = simplifyRendering ? 1 : 2;
      ctx.beginPath();
      ctx.arc(x, y, simplifyRendering ? 6 : 8, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
  
  // Save rendering time data for adaptive quality
  const endTime = performance.now();
  canvas._lastRenderTime = endTime;
  canvas._lastFrameTime = endTime - startTime;
}

/**
 * Draw an arc from the midpoint of the upper arm to the midpoint of the forearm
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} a - First point (shoulder)
 * @param {Object} b - Second point (elbow)
 * @param {Object} c - Third point (wrist)
 */
function drawRepArc(ctx, a, b, c) {
  // a, b, c are {x, y} in normalized coordinates (0-1)
  // b is the elbow, a is shoulder, c is wrist

  // Calculate midpoints
  const midUpperArm = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const midForearm = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };

  // Convert to canvas coordinates
  const toCanvas = (pt) => ({
    x: pt.x * ctx.canvas.width,
    y: pt.y * ctx.canvas.height,
  });
  const p1 = toCanvas(midUpperArm);
  const p3 = toCanvas(midForearm);

  // Calculate the vector from p1 to p3
  const vx = p3.x - p1.x;
  const vy = p3.y - p1.y;

  // Find the midpoint between p1 and p3
  const mx = (p1.x + p3.x) / 2;
  const my = (p1.y + p3.y) / 2;

  // Calculate a perpendicular vector (normalize and scale)
  const perpLength = Math.sqrt(vx * vx + vy * vy);
  const perpNorm = { x: -vy / perpLength, y: vx / perpLength };
  // Move the control point farther away from the elbow, outward from the arm
  const arcHeight = 0.5 * perpLength; // adjust 0.5 for more/less curve
  const cx = mx + perpNorm.x * arcHeight;
  const cy = my + perpNorm.y * arcHeight;

  // Draw arc from p1 to p3 with (cx, cy) as the control point
  ctx.save();
  ctx.strokeStyle = '#3a8ad3'; // Simple blue for now
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.quadraticCurveTo(cx, cy, p3.x, p3.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Get style for tracking state UI indicator
 * @param {string} state - Current tracking state
 * @param {Object} baseStyle - Base style object to extend
 * @returns {Object} - Style object with colors based on state
 */
function getTrackingStateStyle(state, baseStyle) {
  switch (state) {
    case 'IDLE':
      return { ...baseStyle, borderLeft: '4px solid #3a8ad3' }; // Blue for idle
    case 'ACTIVE':
      return { ...baseStyle, borderLeft: '4px solid #2ecc40' }; // Green for active
    case 'PAUSED':
      return { ...baseStyle, borderLeft: '4px solid #e74c3c' }; // Red for paused
    case 'READY':
      return { ...baseStyle, borderLeft: '4px solid #f1c40f' }; // Yellow for ready
    default:
      return baseStyle;
  }
}

export {
  drawLandmarks,
  drawRepArc,
  getTrackingStateStyle
}; 