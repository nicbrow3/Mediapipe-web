import React, { useState, useCallback, createContext, useContext, useEffect } from 'react';

const APP_SETTINGS_KEY = 'mediapipeWebAppSettings';

// Default settings
const DEFAULT_SETTINGS = {
  selectedExerciseId: null,
  isSmoothingEnabled: false,
  selectedWeights: null, // Or a default weight object/value
  useThreePhases: false, // Controls whether to use 3 or 4 phases for rep counting
  requireAllLandmarks: false, // Now means "require primary landmarks"
  minimumVisibilityThreshold: 25, // Renamed from minimumVisibilityAllLandmarks
  requireSecondaryLandmarks: false,
  cameraOpacity: 100, // Default to 100%
  alwaysShowConnections: false, // Default to false (respect visibility threshold for connections)
};

export function loadAppSettings() {
  try {
    const serializedSettings = localStorage.getItem(APP_SETTINGS_KEY);
    if (serializedSettings === null) {
      return DEFAULT_SETTINGS;
    }
    
    // Parse the stored settings
    const storedSettings = JSON.parse(serializedSettings);
    
    // Handle migration from old setting name to new one
    if (storedSettings.minimumVisibilityAllLandmarks !== undefined && storedSettings.minimumVisibilityThreshold === undefined) {
      storedSettings.minimumVisibilityThreshold = storedSettings.minimumVisibilityAllLandmarks;
      delete storedSettings.minimumVisibilityAllLandmarks;
    }
    
    // Ensure numeric values are parsed as numbers
    if (storedSettings.minimumVisibilityThreshold !== undefined) {
      storedSettings.minimumVisibilityThreshold = Number(storedSettings.minimumVisibilityThreshold);
    }
    if (storedSettings.cameraOpacity !== undefined) {
      storedSettings.cameraOpacity = Number(storedSettings.cameraOpacity);
    } else {
      // If cameraOpacity is not in stored settings, ensure it gets the default.
      // This case is handled by the spread operator below, but explicit for clarity.
    }
    if (storedSettings.alwaysShowConnections === undefined) {
      // If alwaysShowConnections is not in stored settings, it will get the default from DEFAULT_SETTINGS
      // when merged below. Explicitly handling it like this isn't strictly necessary due to the merge,
      // but can be useful if specific migration or type conversion logic were needed for this new setting.
    }
    
    // Merge stored settings with defaults to ensure all keys are present
    // and new default settings are picked up if not in localStorage yet.
    return { ...DEFAULT_SETTINGS, ...storedSettings };
  } catch (error) {
    console.error("Error loading app settings from localStorage:", error);
    return DEFAULT_SETTINGS; // Fallback to defaults on error
  }
}

export function saveAppSettings(settings) {
  try {
    const serializedSettings = JSON.stringify(settings);
    localStorage.setItem(APP_SETTINGS_KEY, serializedSettings);
  } catch (error) {
    console.error("Error saving app settings to localStorage:", error);
  }
}

// Create a Context
const AppSettingsContext = createContext();

// Create a Provider Component
export function AppSettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => loadAppSettings());

  const updateSettings = useCallback((newValues) => {
    setSettingsState(prevSettings => {
      console.log('[useAppSettingsProvider] updateSettings received newValues:', newValues);
      const updatedSettings = typeof newValues === 'function'
        ? newValues(prevSettings)
        : { ...prevSettings, ...newValues };
      
      console.log('[useAppSettingsProvider] Storing updatedSettings:', updatedSettings);
      saveAppSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  // Optional: Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === APP_SETTINGS_KEY && event.storageArea === localStorage) {
        console.log('[useAppSettingsProvider] localStorage changed by another tab/window. Reloading settings.');
        setSettingsState(loadAppSettings());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

// Custom Hook to consume the context
export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  // Return in the same [value, updater] format for minimal changes in consuming components
  return [context.settings, context.updateSettings];
} 