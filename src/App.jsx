import React, { useState, useRef, useEffect } from 'react';
import WorkoutTracker from './components/WorkoutTracker';
import MinimalTracker from './components/MinimalTracker'; // Import the new MinimalTracker component
import Sidebar from './components/Sidebar'; // Assuming Sidebar component exists
import SettingsDrawer from './components/SettingsDrawer'; // New component for settings
import DatabaseViewerContent from './components/DatabaseViewerContent.jsx'; // Import the new component
import * as exercises from './exercises'; // Import all exercises
import config from './config'; // Import the configuration
import './App.css'; // Add styles for layout and toggle button
import { MantineProvider, Drawer, ActionIcon, Tooltip, Paper, Tabs, Switch, Slider, Text } from '@mantine/core';
import { 
  IconSettings, 
  IconX, 
  IconDatabase, 
  IconEye, 
  IconMaximize, 
  IconMinimize, 
  IconDeviceWatch 
} from '@tabler/icons-react'; // Add fullscreen and model indicator icons
import '@mantine/core/styles.css';
import { startNewWorkoutSession, endWorkoutSession, getSetsForSession } from './services/db'; // Import db functions

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
      frameSamplingRate: 1,
      enableFaceLandmarks: true,
      enableHandLandmarks: true,
    };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return { // Return defaults on error
      strictLandmarkVisibility: true,
      videoOpacity: 5,
      smoothingFactor: 15,
      showDebug: false,
      frameSamplingRate: 1,
      enableFaceLandmarks: true,
      enableHandLandmarks: true,
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
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false); // State for database viewer
  
  // Create ref for WorkoutTracker component to access its methods
  const workoutTrackerRef = useRef(null);

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

  // --- Handle Page Unload to End Active Sessions ---
  useEffect(() => {
    // Function to end any active session when the page unloads
    const handlePageUnload = async () => {
      if (currentSessionId) {
        try {
          // Get the latest set time to use as the end time
          const sets = await getSetsForSession(currentSessionId);
          
          let endTime = Date.now(); // Default to current time
          if (sets && sets.length > 0) {
            // Sort sets by endTime (descending) and use the most recent one
            const sortedSets = [...sets].sort((a, b) => {
              return new Date(b.endTime || 0) - new Date(a.endTime || 0);
            });
            
            // Use the last set's end time if available
            if (sortedSets[0].endTime) {
              endTime = new Date(sortedSets[0].endTime).getTime();
            }
          }
          
          // End the workout session with the determined end time
          await endWorkoutSession(currentSessionId, endTime);
          console.log(`Ended workout session ${currentSessionId} on page unload`);
        } catch (error) {
          console.error("Failed to end workout session on page unload:", error);
        }
      }
    };

    // Check for active sessions on load
    const checkForInProgressSessions = async () => {
      if (!currentSessionId) {
        // If we don't have a current session ID, check if any are still active in database
        try {
          // We'll rely on DatabaseViewer's code to handle this instead
          // This avoids duplicating the logic here
        } catch (error) {
          console.error("Error checking for in-progress sessions:", error);
        }
      }
    };

    // Run check on component mount
    checkForInProgressSessions();

    // Add event listeners for page close/refresh
    window.addEventListener('beforeunload', handlePageUnload);
    return () => {
      window.removeEventListener('beforeunload', handlePageUnload);
    };
  }, [currentSessionId]);

  // --- Lifted Settings State (from WorkoutTracker) ---
  const [strictLandmarkVisibility, setStrictLandmarkVisibility] = useState(() => loadSettings().strictLandmarkVisibility);
  const [videoOpacity, setVideoOpacity] = useState(() => loadSettings().videoOpacity);
  const [smoothingFactor, setSmoothingFactor] = useState(() => loadSettings().smoothingFactor);
  const [showDebug, setShowDebug] = useState(() => loadSettings().showDebug);
  const [repDebounceDuration, setRepDebounceDuration] = useState(() => loadSettings().repDebounceDuration ?? 200);
  const [useSmoothedRepCounting, setUseSmoothedRepCounting] = useState(() => loadSettings().useSmoothedRepCounting ?? true);
  const [showRepFlowDiagram, setShowRepFlowDiagram] = useState(() => loadSettings().showRepFlowDiagram ?? true);
  const [visibilityThreshold, setVisibilityThreshold] = useState(() => loadSettings().visibilityThreshold ?? 0.7);
  const [frameSamplingRate, setFrameSamplingRate] = useState(() => loadSettings().frameSamplingRate ?? 1);
  const [enableFaceLandmarks, setEnableFaceLandmarks] = useState(() => loadSettings().enableFaceLandmarks ?? true);
  const [enableHandLandmarks, setEnableHandLandmarks] = useState(() => loadSettings().enableHandLandmarks ?? true);
  const [modelType, setModelType] = useState(() => loadSettings().modelType ?? 'lite');
  const [useLocalModel, setUseLocalModel] = useState(() => loadSettings().useLocalModel ?? false);
  const [useConfidenceAsFallback, setUseConfidenceAsFallback] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);

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
      visibilityThreshold,
      frameSamplingRate,
      enableFaceLandmarks,
      enableHandLandmarks,
      modelType,
      useLocalModel,
      useConfidenceAsFallback,
      confidenceThreshold,
    };
    saveSettings(settings);
  }, [strictLandmarkVisibility, videoOpacity, smoothingFactor, showDebug, repDebounceDuration, 
      useSmoothedRepCounting, showRepFlowDiagram, visibilityThreshold, frameSamplingRate,
      enableFaceLandmarks, enableHandLandmarks, modelType, useLocalModel, useConfidenceAsFallback,
      confidenceThreshold]);
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

  // Add modelType and useLocalModel to resetSettings
  const resetSettings = () => {
    setStrictLandmarkVisibility(true);
    setVideoOpacity(5);
    setSmoothingFactor(15);
    setShowDebug(false);
    setRepDebounceDuration(200);
    setUseSmoothedRepCounting(true);
    setShowRepFlowDiagram(true);
    setVisibilityThreshold(0.7);
    setFrameSamplingRate(1);
    setEnableFaceLandmarks(true);
    setEnableHandLandmarks(true);
    setModelType('lite');
    setUseLocalModel(false);
    setUseConfidenceAsFallback(true);
    setConfidenceThreshold(0.8);
  };

  // Create a modified config object with current settings
  const configWithSettings = {
    ...config,
    mediapipe: {
      ...config.mediapipe,
      modelPath: useLocalModel 
        ? `${window.location.origin}/models/pose_landmarker_${modelType}.task` 
        : `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${modelType}/float16/1/pose_landmarker_${modelType}.task`,
    },
    pose: {
      ...config.pose,
      enableFaceLandmarks,
      enableHandLandmarks,
    }
  };

  // Add new state for fullscreen and model info
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [modelInfo, setModelInfo] = useState({
    modelType: 'full',
    useLocalModel: false,
    accelerationMode: 'Loading...',
    details: null
  });

  // Handle fullscreen toggle from WorkoutTracker
  const handleFullscreenToggle = (fullScreenState) => {
    setIsFullScreen(fullScreenState);
  };
  
  // Handle model info from WorkoutTracker
  const handleModelInfoUpdate = (info) => {
    setModelInfo(info);
  };

  // Add state for current view
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'minimal'

  return (
    <MantineProvider theme={{ 
      colorScheme,
      primaryColor: 'grape',
      colors: {
        // Define custom colors that work well in both light and dark modes
        grape: ['#f3e7ff', '#e6d0ff', '#d2b2ff', '#ba8dff', '#a269ff', '#8a45ff', '#7920ff', '#6500fa', '#5600d8', '#4700b3'],
      }
    }}>
      <div className="app-container">
        {/* Navigation Bar */}
        <div className="app-navbar">
          {/* Left side of navbar */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Only show sidebar toggle in main view */}
            {currentView === 'main' && (
              <Tooltip label="Toggle Sidebar">
                <ActionIcon 
                  variant="subtle" 
                  size="lg" 
                  onClick={toggleSidebar} 
                  aria-label="Toggle Sidebar"
                >
                  <IconDatabase size={20} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Back to Main View button (only shown in minimal view) */}
            {currentView === 'minimal' && (
              <Tooltip label="Back to Main Tracker">
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={() => setCurrentView('main')}
                  aria-label="Back to Main Tracker"
                >
                  <IconX size={20} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>

          {/* Center title */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
              {currentView === 'main' ? 'Workout Tracker' : 'Minimal Tracking'}
            </h1>
          </div>

          {/* Right side of navbar */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Only show settings and other actions in main view */}
            {currentView === 'main' && (
              <>
                {/* Existing right-side buttons */}
                <Tooltip label="Settings">
                  <ActionIcon 
                    variant="subtle" 
                    size="lg" 
                    onClick={openSettingsDrawer} 
                    aria-label="Settings"
                  >
                    <IconSettings size={20} />
                  </ActionIcon>
                </Tooltip>
                {/* Switch to Minimal View button */}
                <Tooltip label="Switch to Minimal Tracking">
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    onClick={() => setCurrentView('minimal')}
                    aria-label="Switch to Minimal Tracking"
                  >
                    <IconEye size={20} />
                  </ActionIcon>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Sidebar (only in main view) */}
        {currentView === 'main' && (
          <div className={`app-sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <Sidebar />
          </div>
        )}

        {/* Main Content Area */}
        <div className={`app-content ${isSidebarOpen && currentView === 'main' ? 'sidebar-open' : ''}`}>
          {/* Render different tracker based on currentView */}
          {currentView === 'main' ? (
            <WorkoutTracker
              ref={workoutTrackerRef}
              onPoseResultUpdate={handlePoseResultUpdate}
              availableExercises={availableExercises.current}
              selectedExercise={selectedExercise}
              onExerciseChange={handleExerciseChange}
              videoOpacity={videoOpacity}
              smoothingFactor={smoothingFactor}
              strictLandmarkVisibility={strictLandmarkVisibility}
              showDebug={showDebug}
              repDebounceDuration={repDebounceDuration}
              useSmoothedRepCounting={useSmoothedRepCounting}
              showRepFlowDiagram={showRepFlowDiagram}
              frameSamplingRate={frameSamplingRate}
              config={{
                ...config,
                pose: {
                  ...config.pose,
                  enableFaceLandmarks,
                  enableHandLandmarks,
                  modelType,
                  useLocalModel
                }
              }}
              useLocalModel={useLocalModel}
              modelType={modelType}
              useConfidenceAsFallback={useConfidenceAsFallback}
              confidenceThreshold={confidenceThreshold}
              onFullscreenToggle={handleFullscreenToggle}
              onModelInfoClick={handleModelInfoUpdate}
            />
          ) : (
            <MinimalTracker />
          )}
        </div>

        {/* Settings Drawer */}
        <Drawer
          opened={settingsDrawerOpen}
          onClose={closeSettingsDrawer}
          title="Settings"
          position="right"
          size="md"
          overlayProps={{ opacity: 0.5, blur: 4 }}
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
            resetSettings={resetSettings}
            repDebounceDuration={repDebounceDuration}
            setRepDebounceDuration={setRepDebounceDuration}
            useSmoothedRepCounting={useSmoothedRepCounting}
            setUseSmoothedRepCounting={setUseSmoothedRepCounting}
            showRepFlowDiagram={showRepFlowDiagram}
            setShowRepFlowDiagram={setShowRepFlowDiagram}
            visibilityThreshold={visibilityThreshold}
            setVisibilityThreshold={setVisibilityThreshold}
            frameSamplingRate={frameSamplingRate}
            setFrameSamplingRate={setFrameSamplingRate}
            enableFaceLandmarks={enableFaceLandmarks}
            setEnableFaceLandmarks={setEnableFaceLandmarks}
            enableHandLandmarks={enableHandLandmarks}
            setEnableHandLandmarks={setEnableHandLandmarks}
            modelType={modelType}
            setModelType={setModelType}
            useLocalModel={useLocalModel}
            setUseLocalModel={setUseLocalModel}
            useConfidenceAsFallback={useConfidenceAsFallback}
            setUseConfidenceAsFallback={setUseConfidenceAsFallback}
            confidenceThreshold={confidenceThreshold}
            setConfidenceThreshold={setConfidenceThreshold}
          />
        </Drawer>

        {/* Database Viewer */}
        <Drawer
          opened={showDatabaseViewer}
          onClose={() => setShowDatabaseViewer(false)}
          title="Database Viewer"
          position="right"
          size="xl"
          overlayProps={{ opacity: 0.5, blur: 4 }}
        >
          <DatabaseViewerContent 
            onClose={() => setShowDatabaseViewer(false)} 
            colorScheme={colorScheme}
          />
        </Drawer>
      </div>
    </MantineProvider>
  );
}

export default App; 