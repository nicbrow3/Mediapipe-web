import { useState, useEffect } from 'react';

// Settings key for local storage
const SETTINGS_KEY = 'workoutAppSettings';

/**
 * Hook to manage app settings storage and retrieval
 * @returns {Object} Settings state and management functions
 */
const useSettingsStorage = () => {
  // Default settings
  const defaultSettings = {
    strictLandmarkVisibility: true,
    videoOpacity: 5,
    smoothingFactor: 15,
    showDebug: false,
    repDebounceDuration: 200,
    useSmoothedRepCounting: true,
  };

  // Load settings from local storage
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return defaultSettings;
    }
  };

  // Initialize state with loaded settings
  const [strictLandmarkVisibility, setStrictLandmarkVisibility] = useState(() => loadSettings().strictLandmarkVisibility);
  const [videoOpacity, setVideoOpacity] = useState(() => loadSettings().videoOpacity);
  const [smoothingFactor, setSmoothingFactor] = useState(() => loadSettings().smoothingFactor);
  const [showDebug, setShowDebug] = useState(() => loadSettings().showDebug);
  const [repDebounceDuration, setRepDebounceDuration] = useState(() => loadSettings().repDebounceDuration);
  const [useSmoothedRepCounting, setUseSmoothedRepCounting] = useState(() => loadSettings().useSmoothedRepCounting);

  // Save settings to local storage
  const saveSettings = (newSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  // Update local storage when settings change
  useEffect(() => {
    const settings = {
      strictLandmarkVisibility,
      videoOpacity,
      smoothingFactor,
      showDebug,
      repDebounceDuration,
      useSmoothedRepCounting,
    };
    saveSettings(settings);
  }, [
    strictLandmarkVisibility, 
    videoOpacity, 
    smoothingFactor, 
    showDebug,
    repDebounceDuration,
    useSmoothedRepCounting,
  ]);

  // Function to reset settings to defaults
  const resetSettings = () => {
    setStrictLandmarkVisibility(defaultSettings.strictLandmarkVisibility);
    setVideoOpacity(defaultSettings.videoOpacity);
    setSmoothingFactor(defaultSettings.smoothingFactor);
    setShowDebug(defaultSettings.showDebug);
    setRepDebounceDuration(defaultSettings.repDebounceDuration);
    setUseSmoothedRepCounting(defaultSettings.useSmoothedRepCounting);
    saveSettings(defaultSettings);
  };

  return {
    // State
    strictLandmarkVisibility,
    videoOpacity,
    smoothingFactor,
    showDebug,
    repDebounceDuration,
    useSmoothedRepCounting,
    
    // Setters
    setStrictLandmarkVisibility,
    setVideoOpacity,
    setSmoothingFactor,
    setShowDebug,
    setRepDebounceDuration,
    setUseSmoothedRepCounting,
    
    // Functions
    resetSettings
  };
};

export default useSettingsStorage; 