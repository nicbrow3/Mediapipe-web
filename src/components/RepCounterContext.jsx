import React, { createContext, useContext, useState, useEffect } from 'react';

// Create context for rep count data
const RepCounterContext = createContext({
  repCount: { left: 0, right: 0 },
  setRepCount: () => {},
  resetRepCounts: () => {},
  updateRepCount: () => {},
});

/**
 * Provider component for rep counter data
 * Makes rep count data available to all child components
 */
export const RepCounterProvider = ({ children }) => {
  const [repCount, setRepCount] = useState({ left: 0, right: 0 });

  // Reset rep counts to zero
  const resetRepCounts = () => {
    setRepCount({ left: 0, right: 0 });
  };

  // Update rep count for a specific side
  const updateRepCount = (side, count) => {
    setRepCount(prev => ({
      ...prev,
      [side]: count,
    }));
  };

  return (
    <RepCounterContext.Provider value={{ 
      repCount, 
      setRepCount, 
      resetRepCounts,
      updateRepCount,
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