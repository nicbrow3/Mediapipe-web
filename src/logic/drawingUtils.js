/**
 * Draws landmarks and connections on a canvas
 * @param {Array} landmarks - Array of landmark points
 * @param {Array} connections - Array of connection pairs
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} highlightedLandmarkIndices - Indices of landmarks to highlight (primary)
 * @param {Array} secondaryLandmarkIndices - Indices of landmarks to highlight (secondary)
 */
function drawLandmarks(
  landmarks, 
  connections, 
  canvas, 
  highlightedLandmarkIndices = [], 
  secondaryLandmarkIndices = []
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Get the computed color values from the CSS variables
  const computedStyle = getComputedStyle(canvas);
  const accentColorValue = computedStyle.getPropertyValue('--accent-color').trim();
  const accentColorValue2 = computedStyle.getPropertyValue('--accent-color-2').trim();
  const accentColorValue3 = computedStyle.getPropertyValue('--accent-color-3').trim(); // Color for highlight

  // Draw the connecting lines
  ctx.strokeStyle = accentColorValue2 || '#6a55be';
  ctx.lineWidth = 2;
  
  connections.forEach(([start, end]) => {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];
    if (startPoint && endPoint) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      ctx.stroke();
    }
  });

  // Draw the landmark points
  landmarks.forEach((landmark, index) => {
    // Draw the standard small filled circle for all landmarks
    ctx.fillStyle = accentColorValue || '#6a55be';
    ctx.beginPath();
    ctx.arc(
      landmark.x * canvas.width, 
      landmark.y * canvas.height, 
      4, 
      0, 
      2 * Math.PI
    );
    ctx.fill();

    // If this landmark index is in the secondary list, draw the outer circle in accentColorValue2
    if (secondaryLandmarkIndices.includes(index)) {
      ctx.strokeStyle = accentColorValue2 || '#3a8ad3';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width, 
        landmark.y * canvas.height, 
        8, 
        0, 
        2 * Math.PI
      );
      ctx.stroke();
    }
    // If this landmark index is in the highlighted (primary) list, draw the outer circle in accentColorValue3
    else if (highlightedLandmarkIndices.includes(index)) {
      ctx.strokeStyle = accentColorValue3 || '#cf912e'; // Use accent-3 or fallback
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width, 
        landmark.y * canvas.height, 
        8, 
        0, 
        2 * Math.PI
      );
      ctx.stroke();
    }
  });
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