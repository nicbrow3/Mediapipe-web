import React, { useRef, useEffect, useState } from 'react';
import { AreaChart } from '@mantine/charts';

/**
 * RepHistoryGraph component (Mantine version)
 * @param {Array} data - Array of { timestamp, leftAngle, rightAngle } (or other rep metrics)
 * @param {boolean} showLeft - Whether to show the left metric line
 * @param {boolean} showRight - Whether to show the right metric line
 * @param {number} windowSeconds - How many seconds to display (default 10)
 * @param {Object} exerciseConfig - The current exercise config (for angle/position limits)
 */
const RepHistoryGraph = ({ data, showLeft = true, showRight = true, windowSeconds = 10, exerciseConfig }) => {
  const containerRef = useRef(null);
  const [colors, setColors] = useState({});

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

  // Map raw data timestamps to relative time (seconds ago) without padding to minimize jitter
  const now = Date.now();

  // Determine relaxedIsHigh for each side (default true for backward compatibility)
  const leftAngleConfig = exerciseConfig?.logicConfig?.anglesToTrack?.find(a => a.side === 'left' || !a.side);
  const rightAngleConfig = exerciseConfig?.logicConfig?.anglesToTrack?.find(a => a.side === 'right');
  const leftRelaxedIsHigh = leftAngleConfig?.relaxedIsHigh !== undefined ? leftAngleConfig.relaxedIsHigh : true;
  const rightRelaxedIsHigh = rightAngleConfig?.relaxedIsHigh !== undefined ? rightAngleConfig.relaxedIsHigh : true;
  const leftMin = leftAngleConfig?.minThreshold ?? 45;
  const leftMax = leftAngleConfig?.maxThreshold ?? 160;
  const rightMin = rightAngleConfig?.minThreshold ?? 45;
  const rightMax = rightAngleConfig?.maxThreshold ?? 160;

  // Flip angle for graph if relaxedIsHigh is true (so contracted is always higher)
  const relData = data.map(d => ({
    timeAgo: (d.timestamp - now) / 1000,
    leftAngle: d.leftAngle == null ? null : (leftRelaxedIsHigh ? (leftMax + leftMin - d.leftAngle) : d.leftAngle),
    rightAngle: d.rightAngle == null ? null : (rightRelaxedIsHigh ? (rightMax + rightMin - d.rightAngle) : d.rightAngle),
  }));

  // Build the series array for Mantine
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

  // Prepare reference lines for rep counting thresholds (only one set, since left/right are always the same)
  let referenceLines = [];
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

  // Get min/max thresholds for gradient stops
  const angleConfig = exerciseConfig?.logicConfig?.anglesToTrack?.[0];
  const minThreshold = angleConfig?.minThreshold ?? 45;
  const maxThreshold = angleConfig?.maxThreshold ?? 160;

  // Define gradient stops for the line color
  const gradientStops = [
    { offset: 0, color: 'red.6' },
    { offset: (minThreshold / 180) * 100, color: 'orange.6' },
    { offset: (maxThreshold / 180) * 100, color: 'lime.5' },
    { offset: 100, color: 'blue.5' },
  ];

  // Determine y-axis label based on exercise type
  let yAxisLabel = 'Angle';
  if (exerciseConfig?.logicConfig?.type === 'position') {
    yAxisLabel = 'Position';
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: 220 }}>
      <AreaChart
        h={220}
        data={relData}
        dataKey="timeAgo"
        withLegend
        legendProps={{
          verticalAlign: 'middle',
          align: 'right',
          layout: 'vertical',
          wrapperStyle: { right: 0, top: 20 },
        }}
        series={series}
        curveType="monotone"
        strokeWidth={2}
        withDots={false}
        yAxisLabel={yAxisLabel}
        yAxisProps={{ domain: [0, 180], tickMargin: 5 }}
        xAxisProps={{ type: 'number', domain: [-windowSeconds, 0], tickMargin: 10, tickFormatter: () => '' }}
        valueFormatter={(value) => value !== null && value !== undefined ? value.toFixed(1) : ''}
        tooltipProps={{
          labelFormatter: (t) => `${t} s ago`,
        }}
        referenceLines={referenceLines}
      />
      {/*
        If you want to visually indicate phase zones, you could overlay absolutely-positioned divs
        or contribute a PR to Mantine to support this feature.
      */}
    </div>
  );
};

export default RepHistoryGraph; 