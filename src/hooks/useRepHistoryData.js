import { useState, useEffect, useRef, useMemo } from 'react';
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
    
    // Pre-allocate array for better performance
    const smoothed = new Array(dataPoints.length);
    
    // Initialize with first data point
    smoothed[0] = { ...dataPoints[0] };
    let prevLeft = dataPoints[0].leftAngle;
    let prevRight = dataPoints[0].rightAngle;
    
    for (let i = 1; i < dataPoints.length; i++) {
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
      
      // Only copy properties we need - create minimal object
      smoothed[i] = {
        timeAgo: point.timeAgo,
        leftAngle: smoothLeft,
        rightAngle: smoothRight
      };
    }
    
    return smoothed;
  };

  // Process data with time mapping and angle normalization
  const processedData = () => {
    if (!data || data.length === 0) return [];
    
    const now = Date.now();
    
    // Process all data points including those beyond the visible window
    // Use more efficient array creation with pre-allocation
    const allProcessed = new Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      // Only compute the minimal properties we need
      allProcessed[i] = {
        timeAgo: (d.timestamp - now) / 1000,
        leftAngle: d.leftAngle == null ? null : (leftRelaxedIsHigh ? (leftMax + leftMin - d.leftAngle) : d.leftAngle),
        rightAngle: d.rightAngle == null ? null : (rightRelaxedIsHigh ? (rightMax + rightMin - d.rightAngle) : d.rightAngle)
      };
    }

    // Apply smoothing to ALL data including buffer points
    const smoothedData = smoothingFactor > 0 ? applySmoothing(allProcessed) : allProcessed;

    // Filter to only return the visible window data for display
    // First find how many entries are in the window
    let visibleCount = 0;
    for (let i = 0; i < smoothedData.length; i++) {
      const point = smoothedData[i];
      if (point.timeAgo >= -windowSeconds && point.timeAgo <= 0) {
        visibleCount++;
      }
    }
    
    // Now create filtered array with just the visible data
    const filtered = new Array(visibleCount);
    let filteredIndex = 0;
    
    for (let i = 0; i < smoothedData.length; i++) {
      const point = smoothedData[i];
      if (point.timeAgo >= -windowSeconds && point.timeAgo <= 0) {
        filtered[filteredIndex++] = point;
      }
    }
    
    return filtered;
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
    processedData,
    buildReferenceLines,
    leftRelaxedIsHigh,
    rightRelaxedIsHigh,
    leftMin,
    leftMax,
    rightMin,
    rightMax,
    colors
  };
};

export default useRepHistoryData; 