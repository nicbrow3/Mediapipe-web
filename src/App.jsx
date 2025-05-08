import React, { useState, useEffect } from 'react';
import MinimalTracker from './components/MinimalTracker'; // MinimalTracker is now the main component
// Removed WorkoutTracker, Sidebar, SettingsDrawer, DatabaseViewerContent imports
// Removed exercises import as MinimalTracker handles its own
// Removed config import
import './App.css';
import { MantineProvider } from '@mantine/core'; // Keep MantineProvider
// Removed Drawer, ActionIcon, Tooltip, Paper, Tabs, Switch, Slider, Text from Mantine if no longer needed
// Removed specific Tabler icons if no longer needed by the simplified UI
import '@mantine/core/styles.css';
import { theme as appTheme } from './theme'; // Import our new theme
// Removed db functions (startNewWorkoutSession, endWorkoutSession, getSetsForSession)
// Removed glassStyle import

// --- Settings Persistence Logic (Moved from WorkoutTracker) ---
// Removing SETTINGS_KEY, loadSettings, saveSettings as they were for WorkoutTracker
// MinimalTracker uses its own useAppSettings hook

function App() {
  // Removed isSidebarOpen, latestPoseData, settingsDrawerOpen, currentSessionId, showDatabaseViewer states
  // Removed workoutTrackerRef

  // --- Lifted Exercise State --- (Removed, MinimalTracker handles its own)

  // --- Color Scheme State (Keep) ---
  const COLOR_SCHEME_KEY = 'colorScheme';
  const getInitialColorScheme = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLOR_SCHEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark'; // default
  };
  const [colorScheme, setColorScheme] = useState(getInitialColorScheme);
  useEffect(() => {
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  // --- Handle Page Unload to End Active Sessions --- (Removed as it was tied to WorkoutTracker sessions)
  // --- Lifted Settings State (from WorkoutTracker) --- (Removed, MinimalTracker uses useAppSettings)
  // --- NEW: Workout Session Handlers --- (Removed)
  // Removed toggleSidebar, handlePoseResultUpdate, handleExerciseChange, openSettingsDrawer, closeSettingsDrawer, resetSettings
  // Removed handleFullscreenToggle, handleModelInfoUpdate

  // Removed currentView state, MinimalTracker is always shown

  return (
    <MantineProvider theme={{ ...appTheme, colorScheme }}>
      <div className="app-container">
        {/* Simplified Navigation Bar */}
        <div className="app-navbar">
          {/* Left side of navbar - empty or for future use */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Removed Sidebar toggle and Back to Main View button */}
          </div>

          {/* Center title */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
              Minimal Tracking
            </h1>
          </div>

          {/* Right side of navbar - empty or for future use */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Removed Settings and Switch to Minimal View buttons */}
          </div>
        </div>

        {/* Sidebar removed */}
        {/* Main Content Area */}
        <div className="app-content"> {/* Removed sidebar-open class logic */}
          <MinimalTracker /> {/* Render MinimalTracker directly */}
        </div>

        {/* Settings Drawer removed */}
        {/* Database Viewer removed */}
      </div>
    </MantineProvider>
  );
}

export default App; 