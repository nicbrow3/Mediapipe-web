import React from 'react';
import { Stack } from '@mantine/core';
import LargeRepGoalDisplay from './LargeRepGoalDisplay';
import { useRepCounter } from './RepCounterContext';

/**
 * Container component for rep goal displays
 * Shows either one or two LargeRepGoalDisplay components based on exercise configuration
 * 
 * @param {Object} props
 * @param {number} props.repGoal - Target repetition goal
 * @param {boolean} props.isTwoSided - Whether exercise tracks both sides separately
 * @param {number} props.ladderReps - Current ladder session rep target (if in ladder mode)
 */
const RepGoalDisplayContainer = ({ repGoal = 10, isTwoSided = false, ladderReps = null }) => {
  // Get rep count data from context
  const { repCount } = useRepCounter();
  
  // Use ladder reps as the goal if provided, otherwise use repGoal
  const goalReps = ladderReps !== null ? ladderReps : repGoal;
  
  if (isTwoSided) {
    // For two-sided exercises, position displays in bottom left and right corners
    return (
      <>
        {/* Left side display - bottom left corner */}
        <div 
          style={{
            position: 'absolute',
            bottom: 20, // Higher position to avoid bottom controls
            left: 20,
            zIndex: 10,
            pointerEvents: 'auto',
            width: '300px', // Match the width of LargeRepGoalDisplay
            display: 'block', // Block display
          }}
        >
          <LargeRepGoalDisplay 
            currentReps={repCount.left} 
            goalReps={goalReps} 
            side="left" 
          />
        </div>
        
        {/* Right side display - bottom right corner */}
        <div 
          style={{
            position: 'absolute',
            bottom: 20, // Higher position to avoid bottom controls
            right: 20,
            zIndex: 10,
            pointerEvents: 'auto',
            width: '300px', // Match the width of LargeRepGoalDisplay
            display: 'block', // Block display
          }}
        >
          <LargeRepGoalDisplay 
            currentReps={repCount.right} 
            goalReps={goalReps} 
            side="right" 
          />
        </div>
      </>
    );
  } else {
    // For single-sided exercises, just position in bottom left
    return (
      <div 
        style={{
          position: 'absolute',
          bottom: 20, // Higher position to avoid bottom controls
          left: 20,
          zIndex: 10,
          pointerEvents: 'auto',
          width: '300px', // Match the width of LargeRepGoalDisplay
          display: 'block', // Block display
        }}
      >
        <LargeRepGoalDisplay 
          currentReps={repCount.left} 
          goalReps={goalReps} 
        />
      </div>
    );
  }
};

export default RepGoalDisplayContainer; 