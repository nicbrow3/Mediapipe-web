import React, { useState, useEffect } from 'react';
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
 * @param {string} props.sessionPhase - Current ladder session phase ('idle', 'exercising', 'resting')
 * @param {number} props.nextLadderReps - The next set of reps to be displayed after the rest phase
 */
const RepGoalDisplayContainer = ({ 
  repGoal = 10, 
  isTwoSided = false, 
  ladderReps = null,
  sessionPhase = 'idle',
  nextLadderReps = null
}) => {
  // Get rep count data from context
  const { repCount } = useRepCounter();
  
  // Store the completed rep counts for display during rest phase
  const [completedReps, setCompletedReps] = useState({ left: 0, right: 0 });
  // Track if we're showing completed reps (during rest phase)
  const [showingCompletedReps, setShowingCompletedReps] = useState(false);
  // Track the display goal (completed or upcoming)
  const [displayGoal, setDisplayGoal] = useState(ladderReps || repGoal);
  // Reset reps when transitioning from completed to upcoming
  const [resetReps, setResetReps] = useState({ left: 0, right: 0 });
  
  // Update completed reps when entering rest phase
  useEffect(() => {
    if (sessionPhase === 'resting') {
      // Save the current rep counts when entering rest phase
      setCompletedReps({
        left: repCount.left,
        right: repCount.right
      });
      setShowingCompletedReps(true);
      
      // After 3 seconds, switch to showing upcoming rep goal
      const timer = setTimeout(() => {
        setShowingCompletedReps(false);
        // Set the display goal to the next ladder reps if provided, otherwise keep current
        if (nextLadderReps !== null) {
          setDisplayGoal(nextLadderReps);
        }
        // Reset rep display to 0 when showing the upcoming goal
        setResetReps({ left: 0, right: 0 });
      }, 3000); // Show completed reps for 3 seconds
      
      return () => clearTimeout(timer);
    } else if (sessionPhase === 'exercising' || sessionPhase === 'idle') {
      // Reset when not in rest phase
      setShowingCompletedReps(false);
      setDisplayGoal(ladderReps || repGoal);
      // Only use reset reps when transitioning from completed to upcoming
      setResetReps(null);
    }
  }, [sessionPhase, repCount, ladderReps, repGoal, nextLadderReps]);
  
  // Determine which rep counts to display
  const displayReps = showingCompletedReps 
    ? completedReps 
    : resetReps || repCount; // Use resetReps (0) when transitioning from completed to upcoming
  
  // Common styles
  const containerStyle = {
    position: 'absolute',
    bottom: 20, // Increased to be higher from bottom
    width: 'auto',
    height: 'auto', // Explicitly match display height
    margin: 0,
    padding: 0,
    zIndex: 999, // Higher z-index to ensure visibility
  };
  
  if (isTwoSided) {
    // For two-sided exercises, position displays in bottom left and right corners
    return (
      <>
        {/* Left side display - bottom left corner */}
        <div 
          style={{
            ...containerStyle,
            left: 20,
          }}
        >
          <LargeRepGoalDisplay 
            currentReps={displayReps.left} 
            goalReps={displayGoal} 
            side="left" 
            showCompleted={showingCompletedReps}
          />
        </div>
        
        {/* Right side display - bottom right corner */}
        <div 
          style={{
            ...containerStyle,
            right: 20,
          }}
        >
          <LargeRepGoalDisplay 
            currentReps={displayReps.right} 
            goalReps={displayGoal} 
            side="right" 
            showCompleted={showingCompletedReps}
          />
        </div>
      </>
    );
  }
  
  // For single-sided exercises, just position in bottom left
  return (
    <div 
      style={{
        ...containerStyle,
        left: 20,
      }}
    >
      <LargeRepGoalDisplay 
        currentReps={displayReps.left} 
        goalReps={displayGoal}
        showCompleted={showingCompletedReps}
      />
    </div>
  );
};

export default RepGoalDisplayContainer; 