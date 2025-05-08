import React from 'react';

function RepCounterDisplay({ leftCount, rightCount }) {
  // TODO: Implement RepCounterDisplay component
  return (
    <div>
      Rep Counter (Placeholder)
      {leftCount !== undefined && <div>Left: {leftCount}</div>}
      {rightCount !== undefined && <div>Right: {rightCount}</div>}
    </div>
  );
}

export default RepCounterDisplay; 