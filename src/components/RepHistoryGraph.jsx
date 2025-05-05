import React, { useMemo } from 'react';
import { AreaChart } from '@mantine/charts';
import useRepHistoryData from '../hooks/useRepHistoryData.js';

/**
 * RepHistoryGraph component (Mantine version)
 * @param {Array} data - Array of { timestamp, leftAngle, rightAngle } including buffer data beyond the visible window
 * @param {boolean} showLeft - Whether to show the left metric line
 * @param {boolean} showRight - Whether to show the right metric line
 * @param {number} windowSeconds - How many seconds to display (default 10)
 * @param {Object} exerciseConfig - The current exercise config (for angle/position limits)
 * @param {number} smoothingFactor - Factor to apply smoothing to the displayed data (0-30)
 * @param {boolean} useSmoothing - Whether to apply smoothing (overrides smoothingFactor if false)
 * 
 * Note: The component receives data beyond the visible window for smooth EMA calculations.
 * The extra buffer data is used for smoothing but not displayed.
 */
const RepHistoryGraph = ({ 
  data, 
  showLeft = true, 
  showRight = true, 
  windowSeconds = 10, 
  exerciseConfig,
  smoothingFactor = 0,
  useSmoothing = true
}) => {
  // Limit data to maximum of 400 entries to avoid performance issues in long sessions
  const limitedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Only take the most recent data needed for the window plus buffer
    return data.slice(-Math.min(400, data.length));
  }, [data]);
  
  // Use the custom hook for data processing
  const { 
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
  } = useRepHistoryData(
    limitedData, 
    exerciseConfig, 
    windowSeconds,
    useSmoothing ? smoothingFactor : 0
  );

  // Calculate the Y-axis domain
  const calculateDomain = () => {
    let minValue = 0;
    let maxValue = 180;
    
    // Get values from exercise configuration, if available
    if (exerciseConfig && exerciseConfig.logicConfig && exerciseConfig.logicConfig.anglesToTrack) {
      const leftTrack = exerciseConfig.logicConfig.anglesToTrack.find(a => a.side === 'left' || !a.side);
      const rightTrack = exerciseConfig.logicConfig.anglesToTrack.find(a => a.side === 'right');
      
      if (leftTrack) {
        minValue = Math.min(minValue, leftTrack.minThreshold - 10);
        maxValue = Math.max(maxValue, leftTrack.maxThreshold + 10);
      }
      
      if (rightTrack) {
        minValue = Math.min(minValue, rightTrack.minThreshold - 10);
        maxValue = Math.max(maxValue, rightTrack.maxThreshold + 10);
      }
    }
    
    // Add some padding
    return [Math.max(0, minValue - 5), maxValue + 5];
  };

  const domain = calculateDomain();
  const referenceLines = buildReferenceLines ? buildReferenceLines() : [];
  const currentData = processedData();
  
  return (
    <div ref={containerRef} style={{ width: '100%', height: 180, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10 }}>
      <AreaChart
        h={160}
        data={currentData}
        dataKey="timeAgo"
        series={[
          ...(showLeft ? [{ name: 'leftAngle', color: colors.accentColor || 'blue' }] : []),
          ...(showRight ? [{ name: 'rightAngle', color: colors.accentColor2 || 'green' }] : [])
        ]}
        curveType="linear"
        gridAxis="none"
        withLegend
        legendProps={{ 
          verticalAlign: 'top', 
          height: 20, 
          fontSize: 10,
          containerStyle: { marginBottom: 0 }
        }}
        yAxisProps={{
          domain,
          tickCount: 5,
          tickFormatter: (value) => `${Math.round(value)}°`,
          fontSize: 9,
          width: 30,
          tickMargin: 0,
          style: { color: colors.gridColor || '#888' }
        }}
        xAxisProps={{
          tickCount: 5,
          tickFormatter: (value) => `${Math.round(value * -1)}s`,
          fontSize: 9,
          style: { color: colors.gridColor || '#888' }
        }}
        valueFormatter={(value) => value !== null && !isNaN(value) ? `${Math.round(value)}°` : 'N/A'}
        referenceLines={referenceLines.map(line => ({
          y: line.y,
          color: line.color,
          stroke: line.color,
          strokeDasharray: '3 3',
          label: { value: '', position: 'right', fill: line.color, fontSize: 9 }
        }))}
      />
    </div>
  );
};

export default React.memo(RepHistoryGraph); 