import React from 'react';
import { AreaChart } from '@mantine/charts';
import useRepHistoryData from '../hooks/useRepHistoryData';

/**
 * RepHistoryGraph component (Mantine version)
 * @param {Array} data - Array of { timestamp, leftAngle, rightAngle } (or other rep metrics)
 * @param {boolean} showLeft - Whether to show the left metric line
 * @param {boolean} showRight - Whether to show the right metric line
 * @param {number} windowSeconds - How many seconds to display (default 10)
 * @param {Object} exerciseConfig - The current exercise config (for angle/position limits)
 */
const RepHistoryGraph = ({ 
  data, 
  showLeft = true, 
  showRight = true, 
  windowSeconds = 10, 
  exerciseConfig 
}) => {
  // Use our custom hook to process data and get visualization config
  const {
    containerRef,
    processedData,
    referenceLines,
    buildSeries,
    yAxisLabel,
    windowSeconds: timeWindow
  } = useRepHistoryData(data, exerciseConfig, windowSeconds);

  // Get series configuration
  const series = buildSeries(showLeft, showRight);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 220 }}>
      <AreaChart
        h={220}
        data={processedData}
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
        xAxisProps={{ type: 'number', domain: [-timeWindow, 0], tickMargin: 10, tickFormatter: () => '' }}
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