import React, { useState, useRef, useEffect } from 'react';
import WorkoutTracker from './components/WorkoutTracker';
import Sidebar from './components/Sidebar'; // Assuming Sidebar component exists
import SettingsDrawer from './components/SettingsDrawer'; // New component for settings
import * as exercises from './exercises'; // Import all exercises
import './App.css'; // Add styles for layout and toggle button
import { MantineProvider, Drawer, ActionIcon, Tooltip } from '@mantine/core';
import { IconSettings, IconX } from '@tabler/icons-react'; // Icons for settings button and close
import '@mantine/core/styles.css';

// --- Settings Persistence Logic (Moved from WorkoutTracker) ---
const SETTINGS_KEY = 'workoutAppSettings';
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const defaults = {
      strictLandmarkVisibility: true,
      videoOpacity: 5,
      smoothingFactor: 15,
      showDebug: false,
    };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return { // Return defaults on error
      strictLandmarkVisibility: true,
      videoOpacity: 5,
      smoothingFactor: 15,
      showDebug: false,
    };
  }
}
function saveSettings(newSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
}
// --- End Settings Persistence Logic ---

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [latestPoseData, setLatestPoseData] = useState(null); // State for pose data
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false); // State for settings drawer

  // --- Lifted Exercise State ---
  const availableExercises = useRef(Object.values(exercises)); // Get all exercises
  // console.log('Available exercises:', availableExercises.current); // DEBUG LOG
  const [selectedExercise, setSelectedExercise] = useState(availableExercises.current[0]); // Default to first

  // --- Color Scheme State ---
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
    // Apply the data attribute to the document element for CSS variables
    document.documentElement.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  // --- Lifted Settings State (from WorkoutTracker) ---
  const [strictLandmarkVisibility, setStrictLandmarkVisibility] = useState(() => loadSettings().strictLandmarkVisibility);
  const [videoOpacity, setVideoOpacity] = useState(() => loadSettings().videoOpacity);
  const [smoothingFactor, setSmoothingFactor] = useState(() => loadSettings().smoothingFactor);
  const [showDebug, setShowDebug] = useState(() => loadSettings().showDebug);
  const [repDebounceDuration, setRepDebounceDuration] = useState(() => loadSettings().repDebounceDuration ?? 200);
  const [useSmoothedRepCounting, setUseSmoothedRepCounting] = useState(() => loadSettings().useSmoothedRepCounting ?? true);

  // Save settings whenever they change
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
  }, [strictLandmarkVisibility, videoOpacity, smoothingFactor, showDebug, repDebounceDuration, useSmoothedRepCounting]);
  // --- End Lifted Settings State ---

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handler function to update pose data state
  const handlePoseResultUpdate = (poseResult) => {
    setLatestPoseData(poseResult);
  };

  // --- Lifted Exercise Handler ---
  const handleExerciseChange = (event) => {
    const exerciseId = event.target.value;
    const newExercise = availableExercises.current.find(ex => ex.id === exerciseId);
    console.log('Selected exerciseId:', exerciseId, 'Resolved exercise:', newExercise); // DEBUG LOG
    if (newExercise) {
      setSelectedExercise(newExercise);
      // Note: Resetting rep count and stage will happen in WorkoutTracker's useEffect
      // or via a dedicated prop if needed, but handled simply here for now.
    }
  };

  // --- Settings Drawer Helpers ---
  const openSettingsDrawer = () => setSettingsDrawerOpen(true);
  const closeSettingsDrawer = () => setSettingsDrawerOpen(false);

  return (
    <MantineProvider theme={{ 
      colorScheme,
      primaryColor: 'grape',
      colors: {
        // Define custom colors that work well in both light and dark modes
        grape: ['#f3e7ff', '#e6d0ff', '#d2b2ff', '#ba8dff', '#a269ff', '#8a45ff', '#7920ff', '#6500fa', '#5600d8', '#4700b3'],
      }
    }}>
      {/* Settings Drawer */}
      <Drawer
        opened={settingsDrawerOpen}
        onClose={closeSettingsDrawer}
        title="Settings"
        position="left"
        padding="md"
        size="md"
        withCloseButton={false}
      >
        <SettingsDrawer
          colorScheme={colorScheme}
          setColorScheme={setColorScheme}
          videoOpacity={videoOpacity}
          setVideoOpacity={setVideoOpacity}
          smoothingFactor={smoothingFactor}
          setSmoothingFactor={setSmoothingFactor}
          strictLandmarkVisibility={strictLandmarkVisibility}
          setStrictLandmarkVisibility={setStrictLandmarkVisibility}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          // Pass reset function
          resetSettings={() => {
            setStrictLandmarkVisibility(true);
            setVideoOpacity(5);
            setSmoothingFactor(15);
            setShowDebug(false);
            setRepDebounceDuration(200);
            setUseSmoothedRepCounting(true);
            // Save immediately
            saveSettings({
              strictLandmarkVisibility: true,
              videoOpacity: 5,
              smoothingFactor: 15,
              showDebug: false,
              repDebounceDuration: 200,
              useSmoothedRepCounting: true,
            });
          }}
          repDebounceDuration={repDebounceDuration}
          setRepDebounceDuration={setRepDebounceDuration}
          useSmoothedRepCounting={useSmoothedRepCounting}
          setUseSmoothedRepCounting={setUseSmoothedRepCounting}
        />
      </Drawer>

      <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Settings Button - Top Left */}
        <Tooltip label="Open Settings" position="right" withArrow>
          <ActionIcon
            variant="filled"
            color="grape.6"
            size="lg"
            radius="xl"
            onClick={() => setSettingsDrawerOpen((o) => !o)}
            style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1001 }}
          >
            <IconSettings size={20} />
          </ActionIcon>
        </Tooltip>

        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          {/* Simple toggle icon, adjust as needed */}
          {isSidebarOpen ? '>' : '<'}
        </button>

        <div className="main-content">
          <h1>React Workout Tracker</h1>
          <WorkoutTracker
            onPoseResultUpdate={handlePoseResultUpdate}
            availableExercises={availableExercises.current} // Pass down list
            selectedExercise={selectedExercise} // Pass down selected exercise
            onExerciseChange={handleExerciseChange} // Pass down handler
            colorScheme={colorScheme}
            setColorScheme={setColorScheme}
            videoOpacity={videoOpacity}
            smoothingFactor={smoothingFactor}
            strictLandmarkVisibility={strictLandmarkVisibility}
            showDebug={showDebug}
            repDebounceDuration={repDebounceDuration}
            useSmoothedRepCounting={useSmoothedRepCounting}
          />
        </div>

        {/* Pass selected exercise and pose data to Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          latestPoseData={latestPoseData}
          selectedExercise={selectedExercise} // Pass down selected exercise
        />
      </div>
    </MantineProvider>
  );
}

export default App; 