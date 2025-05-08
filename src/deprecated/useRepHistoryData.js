import { useState, useEffect, useRef } from 'react';
import { EXTRA_BUFFER_SECONDS } from '../logic/repHistoryProcessor';

/**
 * Hook to process rep history data for visualization
 * @param {Array} data - Raw data points with timestamp and angle measurements
 * @param {Object} exerciseConfig - Configuration for the current exercise
 * @param {number} windowSeconds - Time window to display in seconds
 * @param {number} smoothingFactor - Factor to smooth the angle data (0 = no smoothing)
 * @returns {Object} Processed data and configuration for visualization
 */
const useRepHistoryData = (data, exerciseConfig, windowSeconds = 10, smoothingFactor = 0) => {
  const containerRef = useRef(null);
  const [colors, setColors] = useState({});

  // Extract CSS variables for colors when component mounts
  useEffect(() => {
    if (containerRef.current) {
      const computedStyle = getComputedStyle(containerRef.current);
      setColors({
        accentColor: computedStyle.getPropertyValue('--accent-color').trim(),
        accentColor2: computedStyle.getPropertyValue('--accent-color-2').trim(),
        accentColor3: computedStyle.getPropertyValue('--accent-color-3').trim(),
        gridColor: computedStyle.getPropertyValue('--text-color-secondary').trim(),
      });
    }
  }, []);

  // Determine relaxedIsHigh for each side (default true for backward compatibility)
  const leftAngleConfig = exerciseConfig?.logicConfig?.anglesToTrack?.find(a => a.side === 'left' || !a.side);
  const rightAngleConfig = exerciseConfig?.logicConfig?.anglesToTrack?.find(a => a.side === 'right');
  const leftRelaxedIsHigh = leftAngleConfig?.relaxedIsHigh !== undefined ? leftAngleConfig.relaxedIsHigh : true;
  const rightRelaxedIsHigh = rightAngleConfig?.relaxedIsHigh !== undefined ? rightAngleConfig.relaxedIsHigh : true;
  const leftMin = leftAngleConfig?.minThreshold ?? 45;
  const leftMax = leftAngleConfig?.maxThreshold ?? 160;
  const rightMin = rightAngleConfig?.minThreshold ?? 45;
  const rightMax = rightAngleConfig?.maxThreshold ?? 160;

  // Apply smoothing to data with exponential moving average (EMA)
  // Uses the same algorithm as the rep counting logic
  const applySmoothing = (dataPoints) => {
    if (!smoothingFactor || smoothingFactor <= 0 || dataPoints.length === 0) {
      return dataPoints;
    }
    
    // Convert smoothingFactor to alpha (typical formula for EMA window)
    const alpha = 2 / (smoothingFactor + 1);
    let smoothed = [];
    let prevLeft = dataPoints[0].leftAngle;
    let prevRight = dataPoints[0].rightAngle;
    
    for (let i = 0; i < dataPoints.length; i++) {
      const point = dataPoints[i];
      const left = point.leftAngle;
      const right = point.rightAngle;
      let smoothLeft, smoothRight;
      
      if (left === null) {
        smoothLeft = null;
      } else if (prevLeft === null) {
        smoothLeft = left;
        prevLeft = left; // resume smoothing from here
      } else {
        smoothLeft = alpha * left + (1 - alpha) * prevLeft;
        prevLeft = smoothLeft;
      }
      
      if (right === null) {
        smoothRight = null;
      } else if (prevRight === null) {
        smoothRight = right;
        prevRight = right; // resume smoothing from here
      } else {
        smoothRight = alpha * right + (1 - alpha) * prevRight;
        prevRight = smoothRight;
      }
      
      smoothed.push({
        ...point,
        leftAngle: smoothLeft,
        rightAngle: smoothRight
      });
    }
    
    return smoothed;
  };

  // Process data with time mapping and angle normalization
  const processedData = () => {
    if (!data || data.length === 0) return [];
    
    const now = Date.now();
    
    // Process all data points including those beyond the visible window
    let allProcessed = data.map(d => ({
      timeAgo: (d.timestamp - now) / 1000,
      leftAngle: d.leftAngle == null ? null : (leftRelaxedIsHigh ? (leftMax + leftMin - d.leftAngle) : d.leftAngle),
      rightAngle: d.rightAngle == null ? null : (rightRelaxedIsHigh ? (rightMax + rightMin - d.rightAngle) : d.rightAngle),
      ...d // Keep other properties
    }));

    // Apply smoothing to ALL data including buffer points
    if (smoothingFactor > 0) {
      allProcessed = applySmoothing(allProcessed);
    }

    // Filter to only return the visible window data for display
    return allProcessed.filter(point => {
      return point.timeAgo >= -windowSeconds && point.timeAgo <= 0;
    });
  };

  // Build reference lines for thresholds
  const buildReferenceLines = () => {
    const referenceLines = [];
    if (leftAngleConfig) {
      if (typeof leftAngleConfig.minThreshold === 'number') {
        referenceLines.push({
          y: leftRelaxedIsHigh ? (leftMax + leftMin - leftAngleConfig.minThreshold) : leftAngleConfig.minThreshold,
          color: colors.accentColor2 || 'blue.6',
          label: 'Min Threshold',
        });
      }
      if (typeof leftAngleConfig.maxThreshold === 'number') {
        referenceLines.push({
          y: leftRelaxedIsHigh ? (leftMax + leftMin - leftAngleConfig.maxThreshold) : leftAngleConfig.maxThreshold,
          color: colors.accentColor2 || 'blue.6',
          label: 'Max Threshold',
        });
      }
    }
    return referenceLines;
  };

  // Build data series for chart
  const buildSeries = (showLeft, showRight) => {
    const series = [];
    if (showLeft) {
      series.push({
        name: 'leftAngle',
        label: 'Left',
        color: colors.accentColor2 || 'blue.6',
      });
    }
    if (showRight) {
      series.push({
        name: 'rightAngle',
        label: 'Right',
        color: colors.accentColor3 || 'teal.6',
      });
    }
    return series;
  };

  // Build gradient stops for visualization
  const buildGradientStops = () => {
    const angleConfig = exerciseConfig?.logicConfig?.anglesToTrack?.[0];
    const minThreshold = angleConfig?.minThreshold ?? 45;
    const maxThreshold = angleConfig?.maxThreshold ?? 160;
    
    return [
      { offset: 0, color: 'red.6' },
      { offset: (minThreshold / 180) * 100, color: 'orange.6' },
      { offset: (maxThreshold / 180) * 100, color: 'lime.5' },
      { offset: 100, color: 'blue.5' },
    ];
  };

  // Determine appropriate y-axis label
  const getYAxisLabel = () => {
    return exerciseConfig?.logicConfig?.type === 'position' ? 'Position' : 'Angle';
  };

  return {
    containerRef,
    processedData: processedData(),
    referenceLines: buildReferenceLines(),
    buildSeries,
    gradientStops: buildGradientStops(),
    yAxisLabel: getYAxisLabel(),
    windowSeconds,
    colors
  };
};

export default useRepHistoryData; 