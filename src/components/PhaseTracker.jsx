import React, { useState, useEffect, useRef } from 'react';
import './PhaseTracker.css';
import { useRepCounter } from './RepCounterContext.jsx';
import { useAppSettings } from '../hooks/useAppSettings';

// Analyzing angle measurements through different movement phases
// Using a phase sequence buffer to track movement patterns
// Detects complete rep cycles (relaxed → peak contraction → relaxed)
// Calls updateRepCount('left', newRepCount) or updateRepCount('right', newRepCount)
//  to update the global rep count in the context

const PhaseTracker = ({ 
  angle, 
  angleConfig, 
  side, 
  useThreePhases = false, 
  landmarkVisibility = {
    primaryLandmarks: { allVisible: true, minVisibility: 100 },
    secondaryLandmarks: { allVisible: true, minVisibility: 100 }
  },
  workoutMode,
  isRepCountingAllowed = true // Default to true if not provided, for backward compatibility
}) => {
  const [phase, setPhase] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const phaseSequenceRef = useRef([]);
  const lastPhaseRef = useRef(null);
  const [isLocalTrackingEnabled, setIsLocalTrackingEnabled] = useState(true);
  
  // Get app settings
  const [settings] = useAppSettings();
  
  // Extract specific settings we care about to include in dependencies
  const { 
    requireAllLandmarks,
    minimumVisibilityThreshold,
    requireSecondaryLandmarks
  } = settings;

  
  // Get the updateRepCount function from context
  const { updateRepCount, updateTrackingState, isTrackingEnabled, resetToken } = useRepCounter();
  
  // Effect to reset local rep count and phase sequence when resetToken changes
  useEffect(() => {
    // Check if it's not the initial token value (assuming initial is 0)
    // The first increment will make resetToken = 1, so this will trigger.
    // No need for resetToken > 0 if initial is 0 and it always increments.
    setRepCount(0);
    phaseSequenceRef.current = [];
    lastPhaseRef.current = null;
    setPhase(0); // Reset current displayed phase circle as well
  }, [resetToken]);
  
  // Update tracking state based on landmark visibility and app settings
  useEffect(() => {
    // Pass to the global context (for backward compatibility)
    updateTrackingState(landmarkVisibility);
    
    // Local tracking check for this specific side, respecting app settings
    const { primaryLandmarks, secondaryLandmarks = { allVisible: false, minVisibility: 0 } } = landmarkVisibility;
    
    // Default to tracking enabled unless settings require landmark visibility
    let shouldTrackLocally = true;
    let failureReason = null; // Track the reason for failure
    
    if (requireAllLandmarks) {
      // Check primary landmarks against the configured threshold
      // Convert values to numbers to ensure proper comparison
      const primVisibility = Number(primaryLandmarks.minVisibility);
      const threshold = Number(minimumVisibilityThreshold);
      
      // Primary landmarks check - this always happens if requireAllLandmarks is true
      if (!primaryLandmarks.allVisible || primVisibility < threshold) {
        shouldTrackLocally = false;
        failureReason = 'primary';
      }
      
      // Secondary landmarks check - only if both the checkbox is enabled AND we passed the primary check
      if (requireSecondaryLandmarks && shouldTrackLocally) {
        // Check if we have secondary landmarks to check
        if (secondaryLandmarks) {
          const secVisible = Boolean(secondaryLandmarks.allVisible);
          const secVisibility = Number(secondaryLandmarks.minVisibility || 0);
          
          // Update tracking only if the secondary landmarks fail the check
          if (!secVisible || secVisibility < threshold) {
            shouldTrackLocally = false;
            failureReason = 'secondary';
          }
        } else {
          // No secondary landmarks data but required - default to not track
          shouldTrackLocally = false;
          failureReason = 'secondary_missing';
        }
      }
    }
    
    // Store the failure reason
    failureReasonRef.current = failureReason;
    
    setIsLocalTrackingEnabled(shouldTrackLocally);
    
  }, [
    landmarkVisibility, 
    updateTrackingState, 
    requireAllLandmarks,
    minimumVisibilityThreshold, 
    requireSecondaryLandmarks
  ]);
  
  // Add a ref to track the reason for tracking failure
  const failureReasonRef = useRef(null);
  
  // Add debugging logs
  // console.log(`PhaseTracker (${side || 'unknown'}) - angle:`, angle);
  // console.log(`PhaseTracker (${side || 'unknown'}) - config:`, angleConfig);
  
  useEffect(() => {
    if (!isLocalTrackingEnabled || !isRepCountingAllowed || angle === null || !angleConfig) {
      // Skip phase tracking if disabled by local visibility, stationary checks, or missing data
      return;
    }
    
    const { minThreshold, maxThreshold, relaxedIsHigh } = angleConfig;
    const midpoint = Math.floor((minThreshold + maxThreshold) / 2);
    
    // Calculate current phase
    let currentPhase;
    if (relaxedIsHigh) {
      // For exercises where relaxed is high angle (like bicep curls)
      if (useThreePhases) {
        if (angle >= maxThreshold) {
          currentPhase = 0; // Relaxed (arm straight)
        } else if (angle > minThreshold) {
          currentPhase = 1; // During movement
        } else {
          currentPhase = 2; // Peak contraction (arm fully bent)
        }
      } else {
        // Original 4-phase logic
        if (angle >= maxThreshold) {
          currentPhase = 0; // Relaxed (arm straight)
        } else if (angle > midpoint) {
          currentPhase = 1; // Starting to bend
        } else if (angle > minThreshold) {
          currentPhase = 2; // Almost at peak
        } else {
          currentPhase = 3; // Peak contraction (arm fully bent)
        }
      }
    } else {
      // For exercises where relaxed is low angle (like tricep kickbacks)
      if (useThreePhases) {
        if (angle <= minThreshold) {
          currentPhase = 0; // Relaxed (arm bent)
        } else if (angle < maxThreshold) {
          currentPhase = 1; // During movement
        } else {
          currentPhase = 2; // Peak extension (arm straight)
        }
      } else {
        // Original 4-phase logic
        if (angle <= minThreshold) {
          currentPhase = 0; // Relaxed (arm bent)
        } else if (angle <= midpoint) {
          currentPhase = 1; // Starting to extend
        } else if (angle <= maxThreshold) {
          currentPhase = 2; // Almost at peak
        } else {
          currentPhase = 3; // Peak extension (arm straight)
        }
      }
    }
    
    // console.log(`PhaseTracker (${side || 'unknown'}) - calculated phase:`, currentPhase, 
    //             `(angle: ${angle}, min: ${minThreshold}, mid: ${midpoint}, max: ${maxThreshold}, relaxedIsHigh: ${relaxedIsHigh})`);
    
    // Update phase
    if (currentPhase !== lastPhaseRef.current) {
      lastPhaseRef.current = currentPhase;
      setPhase(currentPhase);
      
      // Add phase to sequence only if it's different from the last one
      const newSequence = [...phaseSequenceRef.current, currentPhase];
      phaseSequenceRef.current = newSequence.slice(-12); // Increased buffer size
      
      const pattern = useThreePhases ? [0,1,2,1,0] : [0,1,2,3,2,1,0];
      
      // Check for complete phase cycle (relaxed -> peak -> relaxed)
      if (currentPhase === 0 && phaseSequenceRef.current.length >= 3) {
        // Find key phases in the sequence
        const hasRelaxedPhase = phaseSequenceRef.current.includes(0);
        const hasPeakPhase = useThreePhases 
          ? phaseSequenceRef.current.includes(2) 
          : phaseSequenceRef.current.includes(3);
        
        // Get last cycle - from last relaxed phase, we should have gone through peak and back
        const lastRelaxedIndex = phaseSequenceRef.current.lastIndexOf(0, phaseSequenceRef.current.length - 2);
        
        // If we've gone from relaxed (0) through peak phase and back to relaxed (0)
        if (hasRelaxedPhase && hasPeakPhase && lastRelaxedIndex !== -1) {
          const cycle = phaseSequenceRef.current.slice(lastRelaxedIndex);
          
          // Check if this cycle contains the peak contraction phase
          const containsPeak = useThreePhases 
            ? cycle.includes(2) 
            : cycle.includes(3);
            
          if (containsPeak) {
            const newRepCount = repCount + 1;
            setRepCount(newRepCount);
            
            // Update the rep count in context when it changes
            if (side === 'left' || side === 'Left') {
              updateRepCount('left', newRepCount);
            } else if (side === 'right' || side === 'Right') {
              updateRepCount('right', newRepCount);
            }
            
            // Keep only the latest phase after counting a rep
            phaseSequenceRef.current = [currentPhase];
          }
        }
      }
    }
  }, [angle, angleConfig, phase, useThreePhases, repCount, side, updateRepCount, isLocalTrackingEnabled, isRepCountingAllowed]);
  
  // Visual representation of phases
  const getPhaseDisplay = () => {
    const numPhases = useThreePhases ? 3 : 4;
    const circles = [];
    
    // Determine if circles should be colored red due to low visibility
    // Only apply the visibility warning visual if we actually require landmark visibility
    const shouldWarn = requireAllLandmarks && !isLocalTrackingEnabled;
    
    const activeColor = shouldWarn ? '#ff5555' : '#45a29e'; // Red if visibility issue, teal otherwise
    const inactiveColor = shouldWarn ? '#aa3333' : '#ccc'; // Dark red if visibility issue, gray otherwise
    
    for (let i = 0; i < numPhases; i++) {
      circles.push(
        <div 
          key={i}
          className={`phase-circle ${phase === i ? 'active' : ''}`}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: phase === i ? activeColor : inactiveColor,
            margin: '0 2px',
            display: 'inline-block'
          }}
        />
      );
    }
    return circles;
  };
  
  // For debugging purposes, get actual visibility values
  const getVisibilityLabel = () => {
    if (requireAllLandmarks && !isLocalTrackingEnabled) {
      const { primaryLandmarks, secondaryLandmarks = { allVisible: false, minVisibility: 0 } } = landmarkVisibility;
      const threshold = Number(minimumVisibilityThreshold);
      
      // Check failure reason to give more specific information
      if (failureReasonRef.current === 'secondary' || failureReasonRef.current === 'secondary_missing') {
        // Secondary landmarks visibility is the reason
        return `Low sec. vis: ${Math.round(secondaryLandmarks.minVisibility)}% < ${threshold}%`;
      } else {
        // Primary landmarks visibility is the reason
        return `Low vis: ${Math.round(primaryLandmarks.minVisibility)}% < ${threshold}%`;
      }
    }
    return null;
  };
  
  return (
    <div className="phase-tracker" style={{ textAlign: side === 'right' ? 'right' : 'left' }}>
      {side && <div className="side-label" style={{ fontSize: '14px'}}>{side}</div>}
      <div className="phase-display" style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start', 
        // marginBottom: '4px'
      }}>
        {getPhaseDisplay()}
      </div>
      {workoutMode === 'manual' && (
        <div className="rep-count" style={{ fontSize: '14px' }}>
          Reps: {repCount}
        </div>
      )}
      {requireAllLandmarks && !isLocalTrackingEnabled && (
        <div style={{ 
          fontSize: '10px', 
          color: '#ff5555',
          marginTop: '2px'
        }}>
          {getVisibilityLabel() || 'Low visibility'}
        </div>
      )}
    </div>
  );
};

export default PhaseTracker; 