# React Workout Tracker: Data-Driven Architecture Guide (Using MediaPipe)

## 1. Overview

This document outlines the data-driven architecture for the React-based workout tracking application using webcam pose estimation, specifically leveraging the **MediaPipe Pose** library. The core principle is the **separation of concerns**, dividing the application into three main parts:

1.  **Data Configuration:** Static definitions for each exercise (properties, required MediaPipe landmarks, logic parameters, starting positions).
2.  **Reusable Logic:** Functions that process MediaPipe landmark data based on the configuration to determine rep state, count reps, and check form. **Logic is now pipeline-based, allowing for compound and extensible movement logic.**
3.  **UI Components:** React components responsible for rendering the user interface, displaying data, and handling user interactions.

This approach promotes modularity, scalability, maintainability, and testability.

## 2. Core Principles

* **Data-Driven:** Exercise specifics are defined in configuration files, not hardcoded in components or logic functions.
* **Separation of Concerns:**
    * **Data (`src/exercises/`):** What defines an exercise? (Using MediaPipe landmark names)
    * **Logic (`src/logic/`):** How are reps counted and form checked based on MediaPipe data? **Logic is composed as a pipeline of functions.**
    * **UI (`src/components/`):** How is information displayed and interacted with?
    * **Hooks (`src/hooks/`):** Custom React hooks that encapsulate specific functionalities.
* **Reusability:** Logic for common actions (like angle calculation or angle-based rep counting) is written once and reused by multiple exercises via their configuration.
* **Scalability:** Adding new exercises primarily involves creating new configuration files. **Adding new logic types involves creating new logic files and adding them to the pipeline.**

## 3. Directory Structure

The application follows this directory structure:

```
.
├── public/                 # Static assets
│   └── index.html           # Main HTML file
│
├── src/
│   ├── App.jsx              # Main application component
│   ├── index.js             # App entry point
│   │
│   ├── components/          # Reusable UI Components
│   │   ├── WorkoutTracker.jsx    # Main component for workout session
│   │   ├── RepHistoryGraph.jsx   # Graph showing rep history
│   │   ├── WorkoutSummary.jsx    # Displays workout statistics at the end of a session
│   │   └── ...                   # Other UI elements
│   │
│   ├── exercises/           # Exercise Configuration Files
│   │   ├── index.js           # Exports all exercise configurations
│   │   ├── bicepCurls.js      # Example exercise config
│   │   └── ...
│   │
│   ├── hooks/               # Custom React Hooks
│   │   ├── useMediaPipe.js      # MediaPipe initialization and camera setup
│   │   ├── usePoseTracking.js   # Pose tracking and rep counting logic
│   │   ├── useWorkoutSession.js # Workout session management
│   │   ├── useLandmarkRenderer.js # Rendering landmarks on canvas
│   │   ├── useDatabase.js       # Database operations and data formatting
│   │   ├── useRepHistoryData.js # Processing rep history data for visualization
│   │   ├── useSettingsStorage.js # Managing app settings persistence
│   │   ├── useColorScheme.js    # Managing color scheme preferences
│   │   └── ...
│   │
│   ├── logic/               # Reusable Business Logic
│   │   ├── trackingStateManager.js # Manages tracking state transitions
│   │   ├── repStateEngine.js   # Rep counting state machine
│   │   ├── angleBasedRepLogic.js   # Angle-based logic
│   │   ├── positionBasedRepLogic.js# Position-based logic
│   │   ├── landmarkUtils.js       # Geometry helpers
│   │   ├── drawingUtils.js        # Canvas drawing utilities
│   │   ├── repHistoryProcessor.js # Processing rep history data
│   │   └── ...
│   │
│   ├── services/            # Service layer for data operations
│   │   └── db.js              # Database operations using Dexie.js
│   │
│   └── styles/              # CSS and style definitions
│       ├── uiStyles.js        # Reusable style objects
│       └── ...
│
├── package.json             # Project dependencies and scripts
└── ...                      # Other config files
```

## 4. Exercise Configuration (Data)

* **Location:** `src/exercises/`
* **Format:** Plain JavaScript objects exported from `.js` files (allows importing functions/constants). An `index.js` file in this directory should export all individual exercise configurations for easy import elsewhere.
* **Structure:** Each file defines an object representing one exercise.
* **Landmark Naming:** Landmark names **must** correspond to the output names provided by the MediaPipe Pose solution (e.g., `left_shoulder`, `right_elbow`, `left_wrist`, `right_hip`, etc.). Refer to the MediaPipe Pose documentation for the exact names.

**Example (`src/exercises/bicepCurls.js`):**

```javascript
// src/exercises/bicepCurls.js
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic';
import { positionBasedRepLogic } from '../logic/positionBasedRepLogic';
import { calculateAngle, getDistance } from '../logic/landmarkUtils';

export const bicepCurls = {
    // --- Basic Info ---
    id: 'bicep-curls',
    name: 'Bicep Curls',
    isTwoSided: true,

    // --- Landmark Requirements ---
    landmarks: {
        left: {
            primary: ['left_shoulder', 'left_elbow', 'left_wrist'],
            secondary: ['left_hip']
        },
        right: {
            primary: ['right_shoulder', 'right_elbow', 'right_wrist'],
            secondary: ['right_hip']
        }
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: "Stand tall, arms fully extended downwards by your sides.",
        requiredAngles: [
            {
                id: 'leftElbowStart',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 170,
                tolerance: 15
            },
            {
                id: 'rightElbowStart',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 170,
                tolerance: 15
            },
        ],
        holdTime: 0.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'compound',
        anglesToTrack: [
             {
                id: 'leftElbowCurlAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'],
                minThreshold: 45,
                maxThreshold: 160,
                isRepCounter: true
             },
             {
                id: 'rightElbowCurlAngle',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                minThreshold: 45,
                maxThreshold: 160,
                isRepCounter: true
             }
        ],
        positionsToTrack: [
            // Example: { id: 'handAboveHead', points: ['wrist', 'head'], minDistance: 0.1, maxDistance: 0.3 }
        ],
        pipeline: [angleBasedRepLogic, positionBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
            getDistance,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your elbows tucked in. Control the movement.",
    muscleGroups: ["Biceps", "Forearms"]
};
```

## 5. Custom React Hooks

The application uses custom React hooks to encapsulate and reuse stateful logic across components. This approach greatly improves separation of concerns and maintainability by extracting functionality into focused, single-purpose hooks:

- **Location:** `src/hooks/`
- **Purpose:** Provide reusable, stateful logic that can be shared across components.
- **Key Hooks:**

### Core Functionality Hooks
  - **`useMediaPipe.js`**: Handles MediaPipe initialization, webcam setup, and model loading.
  - **`usePoseTracking.js`**: Manages pose detection, landmark processing, and rep counting logic.
  - **`useWorkoutSession.js`**: Controls workout session lifecycle (start, end, stats).
  - **`useLandmarkRenderer.js`**: Renders landmark points and connections on the canvas.

### Data Management Hooks
  - **`useDatabase.js`**: Manages database operations including fetching, formatting, and refreshing workout data.
  - **`useRepHistoryData.js`**: Processes rep history data for visualization, including data normalization, series configuration, and threshold management.

### Settings and Preferences Hooks
  - **`useSettingsStorage.js`**: Manages application settings persistence, loading/saving from localStorage.
  - **`useColorScheme.js`**: Handles color scheme (dark/light mode) preferences and persistence.

**Example Hook Implementation (simplified):**

```javascript
// src/hooks/useMediaPipe.js
import { useState, useRef, useCallback } from 'react';
import { setupMediaPipeModel } from '../logic/mediaSetup';

const useMediaPipe = (config, debugLog) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraStarted, setCameraStarted] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  
  const setupMediaPipe = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initialize model and camera
      const success = await setupMediaPipeModel({
        videoRef,
        poseLandmarkerRef,
        config
      });
      
      setCameraStarted(success);
      return success;
    } catch (error) {
      setErrorMessage('Failed to initialize: ' + error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config]);
  
  return {
    videoRef,
    canvasRef,
    isLoading,
    errorMessage,
    poseLandmarkerRef,
    lastVideoTimeRef,
    cameraStarted,
    setCameraStarted,
    setupMediaPipe
  };
};

export default useMediaPipe;
```

## 6. Logic Layer (Backend Functionality)

- **Location:** `src/logic/`
- **Purpose:** Contains pure functions responsible for analyzing **MediaPipe landmark data** based on exercise configurations.
- **Key Files:**
  - **`trackingStateManager.js`**: Manages tracking state transitions based on landmark visibility, user settings, and exercise status.
  - **`repStateEngine.js`**: Core rep counting state machine that processes data and manages rep states.
  - **`angleBasedRepLogic.js`**: Angle-based rep counting logic.
  - **`positionBasedRepLogic.js`**: Position-based rep counting logic.
  - **`landmarkUtils.js`**: Geometry helpers (e.g., `calculateAngle`, `getDistance`).
  - **`drawingUtils.js`**: Canvas drawing utilities for landmark visualization.
  - **`repHistoryProcessor.js`**: Processes and formats rep history data for display.

**Example Logic Implementation:**

```js
// src/logic/trackingStateManager.js
export function updateTrackingState({
  landmarks,
  exerciseConfig,
  strictMode,
  visibilityThreshold,
  previousState
}) {
  // Check landmark visibility
  const isVisible = checkLandmarkVisibility(landmarks, exerciseConfig, visibilityThreshold);
  
  if (!isVisible && strictMode) {
    return 'PAUSED';
  }
  
  // Determine state based on previous state and current conditions
  switch (previousState) {
    case 'IDLE':
      return isVisible ? 'READY' : 'IDLE';
    case 'READY':
      return isVisible ? 'ACTIVE' : (strictMode ? 'PAUSED' : 'READY');
    case 'ACTIVE':
      return isVisible ? 'ACTIVE' : (strictMode ? 'PAUSED' : 'ACTIVE');
    case 'PAUSED':
      return isVisible ? 'ACTIVE' : 'PAUSED';
    default:
      return 'IDLE';
  }
}
```

## 7. UI Components (`src/components/`)

- **Purpose:** Render the UI, handle user input, display data from the logic layer.
- **Key Components:**
  - **`WorkoutTracker.jsx`**: Main component that coordinates the workout experience. Uses custom hooks to manage pose detection, tracking, and workout session state.
  - **`RepHistoryGraph.jsx`**: Visualizes rep angle history over time, using the useRepHistoryData hook for data processing.
  - **`WorkoutSummary.jsx`**: Displays workout statistics when a session ends, including reps, duration, and session times.
  - **`DatabaseViewer.jsx`**: Provides a user-friendly interface for exploring stored workout data.

The components have been significantly refactored to use custom hooks for better separation of concerns:

```jsx
// Simplified DatabaseViewer.jsx example
import React from 'react';
import { Paper, Table, Title, Accordion } from '@mantine/core';
import { glassStyle } from '/src/styles/uiStyles';
import useDatabase from '../hooks/useDatabase';

const DatabaseViewer = () => {
  const { 
    sessions, 
    sessionSets, 
    loading, 
    error, 
    formatDate, 
    formatDuration 
  } = useDatabase();

  if (loading) return <div>Loading database contents...</div>;
  if (error) return <div>Error loading database: {error}</div>;

  return (
    <Paper p="xl" shadow="md" radius="lg" style={glassStyle}>
      <Title order={2} mb="xl">Database Contents</Title>
      
      {/* Render sessions and sets using data from the hook */}
      {/* ... */}
    </Paper>
  );
};
```

## 8. Data Flow Summary

1. **`App.jsx`**: User selects exercise -> Retrieves config object.
2. **`App.jsx` -> `WorkoutTracker.jsx`**: Renders `WorkoutTracker`, passes config prop.
3. **Inside `WorkoutTracker.jsx`**:
   - **`useMediaPipe` hook** initializes MediaPipe and camera.
   - **`usePoseTracking` hook** processes landmarks and manages rep counting.
   - **`useWorkoutSession` hook** manages workout session state.
   - **`useLandmarkRenderer` hook** handles drawing landmarks on canvas.
4. When new pose landmarks are detected, the pipeline processes them through:
   - Landmark visibility checking (`trackingStateManager.js`)
   - Rep state updates (`repStateEngine.js`)
   - Exercise-specific logic (angle-based, position-based logic)
5. UI components re-render to reflect updated state.

## 9. Benefits of the Refactored Architecture

- **Improved Maintainability:**
  - Each hook focuses on a specific concern, making the code easier to understand and maintain.
  - The original `WorkoutTracker.jsx` component has been reduced from over 1000 lines to about 300 lines.
  - Logic is separated from UI rendering, making the codebase more testable and maintainable.
  - Settings, data processing, and database operations are now in dedicated hooks.

- **Enhanced Reusability:**
  - Custom hooks can be reused across different components.
  - Logic functions are pure and can be tested in isolation.
  - Separation of concerns makes it easier to replace or upgrade individual components.
  - UI components like graphs and database viewers now only handle rendering, with data processing moved to hooks.

- **Better Scalability:**
  - Adding new exercise types or tracking methods requires minimal changes to existing code.
  - The modular architecture allows for easy extension with new features.
  - New settings can be added to the settings hooks without changing components.

- **Testability:**
  - Pure logic functions can be unit tested without rendering components.
  - Hooks can be tested using React testing utilities.
  - Separation of concerns makes it easier to mock dependencies during testing.

## 10. Styling and UI Theming

- **Location:** `src/styles/`
- **Purpose:** Contains reusable style objects and CSS for consistent UI theming across components.
- **Key Features:**
    - **Glass UI Style:** A reusable style object (`glassStyle`) providing a consistent transparent glass-like appearance for UI elements.
    - **Consistent Theming:** Shared style objects ensure visual consistency across components.
    - **Adaptive UI:** Transparent elements allow the webcam feed to remain visible through UI overlays.
- **Implementation:**
    - Style objects are defined in `uiStyles.js` and imported by components.
    - The glass style uses CSS properties like `backdrop-filter`, `background-color` with alpha transparency, and subtle borders.
    - Style objects can be extended or modified by components for specific needs while maintaining the overall theme.
    - Theme management is now handled by the useColorScheme hook.

## 11. Implementation Considerations (MediaPipe Specific)

- **MediaPipe Pose Setup:** Encapsulated in the `useMediaPipe` hook and `mediaSetup.js` utility. This provides clean separation between MediaPipe integration and React components.
- **Landmark Coordinates:** MediaPipe provides normalized coordinates (0.0 to 1.0). The `landmarkUtils.js` functions work with these directly. `z` coordinate indicates depth relative to the hip center. `visibility` score indicates landmark confidence.
- **Performance:** Optimized through:
    - Careful state management in custom hooks.
    - Pure functions for computationally intensive operations.
    - Separation of rendering logic from data processing.
    - Use of React optimizations (`useCallback`, `useMemo`, `useRef`).
- **Asynchronicity:** MediaPipe initialization and detection are asynchronous, handled through the `useMediaPipe` hook, providing clear loading and error states.

## 12. Rep Counting Implementation Note

- The rep counting logic now uses a **per-side rep cycle** for maximum accuracy and robustness.
    - For each side (left/right), the system tracks whether the user has been in the ready pose (after the required hold timer).
    - A rep is only counted for a side if the user was in the ready pose, then left the ready pose and completed the rep movement, and was previously in the ready pose.
    - After a rep is counted, the per-side ready state is reset for the next cycle.
- For **single-sided exercises**, only the 'left' side is used for all rep tracking and state logic.
- The global ready pose hold timer is still used for transitioning from IDLE to READY state, ensuring the user must hold the ready pose for a minimum duration before starting reps.
- For **dual-sided exercises**, the total rep count uses the minimum (lower) count between left and right sides. This ensures that:
    - A set of 10 reps on each arm is counted as 10 total reps, not 20.
    - If sides are uneven (e.g., 8 left, 10 right), the lower count (8) is used as the total.
    - This follows the conventional way to count exercise repetitions for dual-sided movements.

This approach eliminates phantom reps and ensures accurate, robust rep counting for both single- and two-sided exercises.

## 13. State-Driven Rep Counting and Graph Display

- **Single Source of Truth:**
  Rep counting and the rep history graph are now driven by the global tracking state (`ACTIVE`, `READY`, `PAUSED`, etc).
  - **Reps and graph data are only recorded when the tracking state is not `PAUSED` (i.e., only during `ACTIVE` or `READY`).**
  - The tracking state is determined by all relevant logic, including landmark visibility, strict mode, and grace periods.
  - This ensures that all user-facing features (UI, rep counting, graph) are always in sync and respect the user's settings.

- **Implementation:**
  - Each rep history entry stores the tracking state at the time it was recorded.
  - The graph only displays data from times when the state was `ACTIVE` or `READY`.
  - Rep counting is only performed in these states as well.
  - The `useRepHistoryData` hook now handles all data processing for the graph, including normalization of angles for visualization.

- **Benefits:**
  - This approach eliminates duplicated logic, reduces bugs, and makes the system easier to maintain and extend.

## 13.1 Automatic Rep Goal Adjustment

- **Purpose:** 
  Automatically adjusts the user's rep goal when they exceed their current goal, encouraging progressive overload and continuous improvement.

- **Implementation:**
  - Implemented via a React `useEffect` hook that watches rep counts and compares them to the current goal.
  - For single-sided exercises: When the rep count exceeds the current goal, the rep goal is automatically increased to match the rep count.
  - For two-sided exercises: When either side's rep count exceeds the current goal, the rep goal is increased to match the higher of the two counts.
  - The rep goal is displayed to the user and can also be manually adjusted using increment/decrement buttons.

- **Benefits:**
  - Promotes progressive overload by automatically raising standards as the user improves.
  - Reduces manual input needed from users during workouts.
  - Provides motivation by acknowledging when a user exceeds their target.
  - Maintains challenge level appropriate to the user's demonstrated ability.

- **User Experience:**
  - Users still have full control to manually set goals higher or lower if desired.
  - The automatic adjustment only occurs when the user demonstrates they can exceed the current goal.
  - Used in conjunction with the rep visualization tools to provide immediate feedback on progress.

## 14. Data Persistence

- **Technology:** The application uses **Dexie.js**, a minimalistic wrapper for IndexedDB, to provide client-side data persistence.
- **Purpose:** Stores workout sessions and exercise sets locally in the browser, allowing users to track progress over time without requiring server storage.
- **Location:** `src/services/db.js` with data access handled by `useDatabase.js` hook.

### Database Schema

The database is structured around two primary tables:

```javascript
db.version(1).stores({
  // Stores overall workout session information
  workoutSessions: '++id, startTime, endTime',
  
  // Stores details of individual exercise sets within a session
  exerciseSets: '++id, sessionId, exerciseId, startTime',
});
```

- **workoutSessions:** Tracks overall workout sessions with automatically generated IDs.
  - `id`: Auto-incrementing primary key
  - `startTime`: When the session began (indexed for sorting)
  - `endTime`: When the session ended
  - `durationMillis`: Calculated session duration
  - `notes`: User notes about the session

- **exerciseSets:** Records individual exercise sets performed during a session.
  - `id`: Auto-incrementing primary key
  - `sessionId`: Foreign key to workoutSessions
  - `exerciseId`: Identifies the type of exercise performed
  - `startTime`, `endTime`: Timestamps for set duration
  - `reps`: Repetition count
  - `repsLeft`, `repsRight`: For exercises tracking sides separately
  - `weight`: Optional weight used

### Core Database Operations

The database layer provides these key functions:

1. **Session Management:**
   - `startNewWorkoutSession()`: Creates a new workout session with the current timestamp
   - `endWorkoutSession(sessionId)`: Marks a session as completed and calculates duration

2. **Exercise Set Tracking:**
   - `addExerciseSet(setData)`: Records completed exercise sets with rep counts

3. **Data Retrieval:**
   - `getAllWorkoutSessions()`: Retrieves workout history, sorted by date (newest first)
   - `getSetsForSession(sessionId)`: Gets all sets performed in a specific session

## 15. Session Statistics and Data Visualization

The application includes components for visualizing workout data and providing feedback to users:

### Workout Summary Component

- **Location:** `src/components/WorkoutSummary.jsx`
- **Purpose:** Displays a summary of the completed workout session with key metrics.
- **Key Features:**
  - **Session Statistics:** Shows total reps performed, workout duration, and session time.
  - **Visual Elements:** Uses Mantine UI components like RingProgress and SimpleGrid to present data in an attractive and readable format.
  - **Animation:** Incorporates smooth animations for a polished user experience.
  - **Responsive Design:** Adapts to different screen sizes with responsive layout.

### Database Viewer Component

- **Location:** `src/components/DatabaseViewer.jsx`
- **Purpose:** Provides a user-friendly interface for exploring stored workout data.
- **Key Features:**
  - **Session Browser:** Lists all workout sessions with expandable details.
  - **Exercise Sets:** Shows all sets performed in each session with rep counts.
  - **Filtering and Organization:** Groups data by session with accordion UI for easy navigation.
  - **Data Formatting:** Presents timestamps and durations in human-readable format.
  - **Hook Integration:** Now uses the `useDatabase` hook for clean separation of data fetching from presentation.

### Rep History Graph Component

- **Location:** `src/components/RepHistoryGraph.jsx`
- **Purpose:** Visualizes rep angle history in real-time during workouts.
- **Key Features:**
  - **Real-time Visualization:** Shows angle progression over time for both sides of the body.
  - **Threshold Indicators:** Displays target ranges for proper exercise form.
  - **Hook Integration:** Now uses the `useRepHistoryData` hook for data processing and configuration.
  - **Responsive Design:** Adapts to container size with consistent styling.

### Integration with Workout Flow

- The WorkoutSummary appears automatically when a user ends a workout session through the "End Workout" button.
- The DatabaseViewer is accessible through a dedicated database icon button, allowing users to browse their workout history at any time.
- Both components access data through hooks, which in turn use the db.js service, maintaining clear separation of concerns.

## 16. Settings and Preferences Management

- **Location:** 
  - `src/hooks/useSettingsStorage.js`
  - `src/hooks/useColorScheme.js`

- **Purpose:** Manage user preferences and application settings with persistence.

- **Key Features:**
  - **Local Storage Persistence:** Settings are automatically saved to and loaded from the browser's localStorage.
  - **Default Values:** Sensible defaults are provided for all settings.
  - **Type Safety:** Settings are structured with clear types and validation.
  - **Reset Capability:** Users can reset all settings to defaults.

- **Settings Categories:**
  - **Workout Tracking:** 
    - **Visibility Threshold:** Adjustable threshold (0.3-0.9) for landmark visibility detection. Lower values reduce tracking pauses at the cost of potential accuracy.
    - **Strict Landmark Visibility:** Toggle requiring all primary landmarks to be visible.
    - **Rep Debounce Duration:** Controls rep detection sensitivity.
    - **Smoothing Factor:** Reduces noise in movement data.
  - **UI Settings:** Video opacity, debug information visibility, rep flow diagram display.
  - **Appearance:** Light/dark mode preference.

- **Implementation:**
  - Settings are managed in dedicated hooks, completely separate from the components that use them.
  - Components receive only the settings they need, promoting modularity.
  - Changes to settings are automatically persisted without requiring explicit save actions.

This modular, hook-based approach to settings management makes the application more maintainable and provides a clean interface for components to access and update user preferences.

The combination of these components and hooks provides users with immediate feedback on their current workout and access to historical data, supporting motivation and progress tracking without requiring backend infrastructure.

*This document details a data-driven architecture optimized for a React workout tracker using MediaPipe Pose, structured for clarity for both developers and users.*
