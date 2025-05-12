import { useState, useCallback } from 'react';

const APP_SETTINGS_KEY = 'mediapipeWebAppSettings';

// Define your default settings here
// You'll need to adjust these defaults to match your application's needs
const DEFAULT_SETTINGS = {
  selectedExerciseId: null,
  isSmoothingEnabled: false,
  selectedWeights: null, // Or a default weight object/value
  useThreePhases: false, // Controls whether to use 3 or 4 phases
  // Add other future settings keys here with default values
  // e.g., theme: 'light',
};

export function loadAppSettings() {
  try {
    const serializedSettings = localStorage.getItem(APP_SETTINGS_KEY);
    if (serializedSettings === null) {
      return DEFAULT_SETTINGS;
    }
    // Merge stored settings with defaults to ensure all keys are present
    // and new default settings are picked up if not in localStorage yet.
    return { ...DEFAULT_SETTINGS, ...JSON.parse(serializedSettings) };
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

// Custom Hook
export function useAppSettings() {
  const [settings, setSettingsState] = useState(() => loadAppSettings());

  const updateSettings = useCallback((newValues) => {
    setSettingsState(prevSettings => {
      // newValues can be an object with new settings to merge,
      // or a function that takes previous settings and returns the new state
      const updatedSettings = typeof newValues === 'function'
        ? newValues(prevSettings)
        : { ...prevSettings, ...newValues };
      
      saveAppSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  return [settings, updateSettings];
} 