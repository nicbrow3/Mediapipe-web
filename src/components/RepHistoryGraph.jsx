import React, { useRef, useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * RepHistoryGraph component
 * @param {Array} data - Array of { timestamp, leftAngle, rightAngle } (or other rep metrics)
 * @param {boolean} showLeft - Whether to show the left metric line
 * @param {boolean} showRight - Whether to show the right metric line
 * @param {number} windowSeconds - How many seconds to display (default 10)
 */
const RepHistoryGraph = ({ data, showLeft = true, showRight = true, windowSeconds = 10 }) => {
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

  const now = Date.now();
  const filteredData = data.filter(d => now - d.timestamp <= windowSeconds * 1000);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} strokeOpacity={0.2} />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={[now - windowSeconds * 1000, now]}
            tickFormatter={t => ((t - now) / 1000).toFixed(1) + 's'}
            label={{ value: 'Time (s ago)', position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis domain={[0, 180]} label={{ value: 'Metric', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            labelFormatter={t => ((t - now) / 1000).toFixed(1) + 's ago'}
            formatter={(value, name) => [`${value.toFixed(1)}`, name === 'leftAngle' ? 'Left' : 'Right']}
          />
          <Legend />
          {showLeft && (
            <Line type="monotone" dataKey="leftAngle" stroke={colors.accentColor2} dot={false} name="Left" strokeWidth={2} />
          )}
          {showRight && (
            <Line type="monotone" dataKey="rightAngle" stroke={colors.accentColor3} dot={false} name="Right" strokeWidth={2} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RepHistoryGraph; 