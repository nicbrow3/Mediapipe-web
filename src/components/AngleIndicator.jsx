import React from 'react';
import './AngleIndicator.css';

const AngleIndicator = ({ 
  angle, 
  maxAngle = 180, 
  size = 120, 
  color = '#45a29e', 
  backgroundColor = 'rgba(69, 162, 158, 0.3)',
  angleConfig = null, // Add angleConfig parameter
  minSize = 80, // Corrected default minSize
  showIndicatorLine = true // New prop to control indicator line visibility
}) => {
  // Default to 0 if angle is null or undefined for calculations (though line won't show if showIndicatorLine is false)
  const safeAngle = angle !== null && angle !== undefined ? angle : 0;
  
  // For display purposes, we want 0° at the left, 90° at the top, 180° at the right (top half)
  // So, radians = Math.PI * (1 - (displayAngle / 180))
  const displayAngle = Math.min(Math.max(safeAngle, 0), maxAngle);
  
  // Calculate the coordinates for the indicator line
  const effectiveSize = Math.max(size, minSize);
  const lineLength = effectiveSize / 2 - 2; // Slightly shorter than radius
  const radians = Math.PI * (1 - (displayAngle / 180));
  const endX = effectiveSize / 2 + lineLength * Math.cos(radians);
  const endY = effectiveSize / 2 - lineLength * Math.sin(radians); // Subtract to flip Y axis for SVG
  
  // Extract threshold values from angleConfig if available
  const minThreshold = angleConfig?.minThreshold;
  const maxThreshold = angleConfig?.maxThreshold;
  
  // Calculate radians for threshold markers
  const minRadians = minThreshold !== undefined ? Math.PI * (1 - (minThreshold / 180)) : null;
  const maxRadians = maxThreshold !== undefined ? Math.PI * (1 - (maxThreshold / 180)) : null;

  return (
    <div className="angle-indicator-container" style={{ width: effectiveSize, height: effectiveSize / 2, minWidth: minSize, minHeight: minSize / 2 }}>
      <div className="angle-indicator-background" style={{ 
        backgroundColor,
        width: effectiveSize,
        height: effectiveSize,
        clipPath: 'polygon(0% 50%, 100% 50%, 100% 0%, 0% 0%)'
      }}></div>
      
      <svg width={effectiveSize} height={effectiveSize} className="angle-indicator-svg">
        {/* Center dot */}
        <circle cx={effectiveSize/2} cy={effectiveSize/2} r={3} fill={color} />
        
        {/* Threshold markers if available */}
        {minRadians !== null && angleConfig.showThresholds !== false && (
          <g className="threshold-marker min">
            {/* Min threshold marker */}
            {(() => {
              const minX = effectiveSize / 2 + (lineLength * 0.9) * Math.cos(minRadians);
              const minY = effectiveSize / 2 - (lineLength * 0.9) * Math.sin(minRadians);
              
              return (
                <>
                  <circle cx={minX} cy={minY} r={3} fill="#e74c3c" />
                  <text 
                    x={minX + 5 * Math.cos(minRadians)} 
                    y={minY + 5 * Math.sin(minRadians)} 
                    fill="#e74c3c"
                    fontSize="10px"
                    textAnchor="middle"
                  >
                    {minThreshold}°
                  </text>
                </>
              );
            })()}
          </g>
        )}
        
        {maxRadians !== null && angleConfig.showThresholds !== false && (
          <g className="threshold-marker max">
            {/* Max threshold marker */}
            {(() => {
              const maxX = effectiveSize / 2 + (lineLength * 0.9) * Math.cos(maxRadians);
              const maxY = effectiveSize / 2 - (lineLength * 0.9) * Math.sin(maxRadians);
              
              return (
                <>
                  <circle cx={maxX} cy={maxY} r={3} fill="#2ecc71" />
                  <text 
                    x={maxX + 5 * Math.cos(maxRadians)} 
                    y={maxY + 5 * Math.sin(maxRadians)} 
                    fill="#2ecc71"
                    fontSize="10px"
                    textAnchor="middle"
                  >
                    {maxThreshold}°
                  </text>
                </>
              );
            })()}
          </g>
        )}
        
        {/* Indicator line - Conditionally render based on showIndicatorLine */}
        {showIndicatorLine && (
          <line 
            x1={effectiveSize/2} 
            y1={effectiveSize/2} 
            x2={endX} 
            y2={endY} 
            stroke={color} 
            strokeWidth={2} 
          />
        )}
        
        {/* Angle text - moved to AngleDisplay.jsx */}
      </svg>
    </div>
  );
};

export default AngleIndicator; 