import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';

// Create context for rep count data
// Maintains state for left and right rep counts
// Provides functions to update counts for each side
// Offers methods to reset counters
// Exports a custom hook (useRepCounter) for components to access this data

const RepCounterContext = createContext({
  repCount: { left: 0, right: 0 },
  setRepCount: () => {},
  resetRepCounts: () => {},
  updateRepCount: () => {},
  isTrackingEnabled: true,
  updateTrackingState: () => {},
});

/**
 * Provider component for rep counter data
 * Makes rep count data available to all child components
 */
export const RepCounterProvider = ({ children }) => {
  const [repCount, setRepCount] = useState({ left: 0, right: 0 });
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [settings] = useAppSettings();

  // Reset rep counts to zero
  const resetRepCounts = useCallback(() => {
    setRepCount({ left: 0, right: 0 });
  }, []);

  // Update rep count for a specific side
  const updateRepCount = useCallback((side, count) => {
    setRepCount(prev => ({
      ...prev,
      [side]: count,
    }));
  }, []);

  // Update tracking state based on landmark visibility
  // This is mainly for backward compatibility now, but still useful
  // Each side now makes its own decision in PhaseTracker.jsx
  const updateTrackingState = useCallback((landmarkVisibilityData) => {
    // This function is kept to maintain API compatibility
    // Each PhaseTracker component now handles its own visibility checks
    // based on the app settings
    return true;
  }, []);

  return (
    <RepCounterContext.Provider value={{ 
      repCount, 
      setRepCount, 
      resetRepCounts,
      updateRepCount,
      isTrackingEnabled: true, // Each side now individually determines if tracking is enabled
      updateTrackingState,
    }}>
      {children}
    </RepCounterContext.Provider>
  );
};

// Custom hook to use the rep counter context
export const useRepCounter = () => {
  const context = useContext(RepCounterContext);
  if (!context) {
    throw new Error('useRepCounter must be used within a RepCounterProvider');
  }
  return context;
};

export default RepCounterContext; 