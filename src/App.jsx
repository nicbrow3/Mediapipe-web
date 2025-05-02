import React, { useState, useRef, useEffect } from 'react';
import WorkoutTracker from './components/WorkoutTracker';
import Sidebar from './components/Sidebar'; // Assuming Sidebar component exists
import SettingsDrawer from './components/SettingsDrawer'; // New component for settings
import DatabaseViewer from './components/DatabaseViewer'; // Import DatabaseViewer
import * as exercises from './exercises'; // Import all exercises
import './App.css'; // Add styles for layout and toggle button
import { MantineProvider, Drawer, ActionIcon, Tooltip } from '@mantine/core';
import { IconSettings, IconX, IconDatabase, IconEye } from '@tabler/icons-react'; // Icons for settings button and close, and database icon
import '@mantine/core/styles.css';
import { startNewWorkoutSession, endWorkoutSession } from './services/db'; // Import db functions

// Import glassStyle from the styles utility file
import { glassStyle } from '/src/styles/uiStyles';

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
  const [currentSessionId, setCurrentSessionId] = useState(null); // State for active session ID

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
  const [showRepFlowDiagram, setShowRepFlowDiagram] = useState(() => loadSettings().showRepFlowDiagram ?? true);

  // Save settings whenever they change
  useEffect(() => {
    const settings = {
      strictLandmarkVisibility,
      videoOpacity,
      smoothingFactor,
      showDebug,
      repDebounceDuration,
      useSmoothedRepCounting,
      showRepFlowDiagram,
    };
    saveSettings(settings);
  }, [strictLandmarkVisibility, videoOpacity, smoothingFactor, showDebug, repDebounceDuration, useSmoothedRepCounting, showRepFlowDiagram]);
  // --- End Lifted Settings State ---

  // --- NEW: Workout Session Handlers ---
  const handleStartWorkout = async () => {
    // This might be called from WorkoutTracker when the camera *successfully* starts
    // We assume WorkoutTracker will handle the actual start process and call this
    try {
      const sessionId = await startNewWorkoutSession();
      setCurrentSessionId(sessionId);
      console.log("Workout session started, ID:", sessionId);
      // Potentially trigger other actions needed when workout starts
    } catch (error) {
      console.error("Failed to start workout session:", error);
      // TODO: Show user feedback (e.g., notification)
    }
  };

  const handleEndWorkout = async () => {
    if (currentSessionId) {
      try {
        await endWorkoutSession(currentSessionId);
        console.log("Workout session ended, ID:", currentSessionId);
        const endedSessionId = currentSessionId; // Store before resetting
        setCurrentSessionId(null); // Reset session ID state

        // TODO: Add any other cleanup needed after ending a session
        // e.g., potentially stop camera if not stopped already, clear workout state in WorkoutTracker?
        // Maybe show a summary or confirmation?
        alert(`Workout Session ${endedSessionId} ended.`); // Simple feedback for now

      } catch (error) {
        console.error("Failed to end workout session:", error);
        // TODO: Show user feedback
      }
    } else {
      console.warn("Attempted to end workout, but no active session ID found.");
    }
  };
  // --- End Workout Session Handlers ---

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

  // Add state for database viewer
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false);

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
        styles={{
          body: glassStyle, // Apply glass style to drawer body
          header: glassStyle, // Apply glass style to drawer header
          root: { 
            zIndex: 1002, // Ensure proper stacking
            backgroundColor: 'transparent', // Make the root background transparent
          },
          inner: {
            backgroundColor: 'transparent', // Make the inner container transparent
          },
          content: {
            backgroundColor: 'transparent', // Make the content container transparent
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.3)', // Lighter overlay to see through
          }
        }}
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
            setShowRepFlowDiagram(true);
            // Save immediately
            saveSettings({
              strictLandmarkVisibility: true,
              videoOpacity: 5,
              smoothingFactor: 15,
              showDebug: false,
              repDebounceDuration: 200,
              useSmoothedRepCounting: true,
              showRepFlowDiagram: true,
            });
          }}
          repDebounceDuration={repDebounceDuration}
          setRepDebounceDuration={setRepDebounceDuration}
          useSmoothedRepCounting={useSmoothedRepCounting}
          setUseSmoothedRepCounting={setUseSmoothedRepCounting}
          showRepFlowDiagram={showRepFlowDiagram}
          setShowRepFlowDiagram={setShowRepFlowDiagram}
        />
      </Drawer>

      {/* Database Viewer Drawer */}
      <Drawer
        opened={showDatabaseViewer}
        onClose={() => setShowDatabaseViewer(false)}
        title="Database Contents"
        position="right"
        padding="md"
        size="xl"
        styles={{
          body: { ...glassStyle, overflowY: 'auto', maxHeight: 'calc(100vh - 60px)' }, 
          header: glassStyle,
          root: { 
            zIndex: 1003, // Higher than settings drawer
            backgroundColor: 'transparent',
          },
          inner: {
            backgroundColor: 'transparent',
          },
          content: {
            backgroundColor: 'transparent',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }
        }}
      >
        <DatabaseViewer />
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

        {/* Top Right Vertical Button Group */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1001, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sidebar Toggle (Visibility) Button */}
          <Tooltip label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"} position="left" withArrow>
            <ActionIcon
              variant="filled"
              color="grape.6"
              size="lg"
              radius="xl"
              onClick={toggleSidebar}
            >
              <IconEye size={20} />
            </ActionIcon>
          </Tooltip>

          {/* Database Button */}
          <Tooltip label="View Database Contents" position="left" withArrow>
            <ActionIcon
              variant="filled"
              color="teal.7"
              size="lg"
              radius="xl"
              onClick={() => setShowDatabaseViewer(true)}
            >
              <IconDatabase size={20} />
            </ActionIcon>
          </Tooltip>
        </div>

        {/* <<< ADDED: End Workout Button - Top Right >>> */}
        {currentSessionId && (
          <Tooltip label="End Current Workout Session" position="left" withArrow>
            <ActionIcon
              variant="filled"
              color="red.7" // Use a distinct color
              size="lg"
              radius="xl"
              onClick={handleEndWorkout}
              style={{ position: 'fixed', top: '20px', right: '80px', zIndex: 1001 }}
            >
              <IconX size={20} />
            </ActionIcon>
          </Tooltip>
        )}

        <div className="main-content">
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
            showRepFlowDiagram={showRepFlowDiagram}
            currentSessionId={currentSessionId} // Pass current ID (needed for addExerciseSet)
            onWorkoutStart={handleStartWorkout} // Pass the start handler
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