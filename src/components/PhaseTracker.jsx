import React, { useState, useEffect, useRef } from 'react';
import './PhaseTracker.css';

const PhaseTracker = ({ angle, angleConfig, side }) => {
  const [phase, setPhase] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const phaseSequenceRef = useRef([]);
  
  // Add debugging logs
  console.log(`PhaseTracker (${side || 'unknown'}) - angle:`, angle);
  console.log(`PhaseTracker (${side || 'unknown'}) - config:`, angleConfig);
  
  useEffect(() => {
    if (angle === null || !angleConfig) {
      console.log(`PhaseTracker (${side || 'unknown'}) - skipping due to null angle or missing config`);
      return;
    }
    
    const { minThreshold, maxThreshold, relaxedIsHigh } = angleConfig;
    const midpoint = Math.floor((minThreshold + maxThreshold) / 2);
    
    // Calculate current phase
    let currentPhase;
    if (relaxedIsHigh) {
      // For exercises where relaxed is high angle (like bicep curls)
      // We need to invert the phases to keep relaxed=0 and peak=3
      if (angle >= maxThreshold) {
        currentPhase = 0; // Relaxed (arm straight)
      } else if (angle > midpoint) {
        currentPhase = 1; // Starting to bend
      } else if (angle > minThreshold) {
        currentPhase = 2; // Almost at peak
      } else {
        currentPhase = 3; // Peak contraction (arm fully bent)
      }
    } else {
      // For exercises where relaxed is low angle (like tricep kickbacks)
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
    
    console.log(`PhaseTracker (${side || 'unknown'}) - calculated phase:`, currentPhase, 
                `(angle: ${angle}, min: ${minThreshold}, mid: ${midpoint}, max: ${maxThreshold}, relaxedIsHigh: ${relaxedIsHigh})`);
    
    // Update phase
    if (currentPhase !== phase) {
      setPhase(currentPhase);
      
      // Track phase sequence for rep counting
      const newSequence = [...phaseSequenceRef.current, currentPhase];
      phaseSequenceRef.current = newSequence.slice(-8); // Keep last 8 phases
      
      // Check for complete rep pattern (0-1-2-3-2-1-0)
      // Pattern is now the same regardless of relaxedIsHigh
      const pattern = [0,1,2,3,2,1,0];
      
      // Check if sequence contains pattern for rep
      const sequence = phaseSequenceRef.current.join('');
      const patternStr = pattern.join('');
      
      if (sequence.includes(patternStr)) {
        setRepCount(prev => prev + 1);
        // Reset sequence after counting a rep
        phaseSequenceRef.current = [currentPhase];
      }
    }
  }, [angle, angleConfig, phase]);
  
  // Visual representation of phases
  const getPhaseDisplay = () => {
    const circles = [];
    for (let i = 0; i < 4; i++) {
      circles.push(
        <div 
          key={i}
          className={`phase-circle ${phase === i ? 'active' : ''}`}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: phase === i ? '#45a29e' : '#ccc',
            margin: '0 2px',
            display: 'inline-block'
          }}
        />
      );
    }
    return circles;
  };
  
  return (
    <div className="phase-tracker" style={{ textAlign: side === 'right' ? 'right' : 'left' }}>
      {side && <div className="side-label" style={{ fontSize: '14px', marginBottom: '4px' }}>{side}</div>}
      <div className="phase-display" style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start', 
        marginBottom: '4px'
      }}>
        {getPhaseDisplay()}
      </div>
      <div className="rep-count" style={{ fontSize: '14px' }}>
        Reps: {repCount}
      </div>
    </div>
  );
};

export default PhaseTracker; 