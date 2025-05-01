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
* **Reusability:** Logic for common actions (like angle calculation or angle-based rep counting) is written once and reused by multiple exercises via their configuration.
* **Scalability:** Adding new exercises primarily involves creating new configuration files. **Adding new logic types involves creating new logic files and adding them to the pipeline.**

## 3. Directory Structure

A recommended directory structure to support this architecture:

```
.
├── public/                 # Or root, depending on Parcel setup
│   └── index.html           # Main HTML file (Entry point for Parcel)
│
├── src/
│   ├── App.jsx              # Main application component (Planned)
│   ├── index.js             # App entry point (Likely exists for Parcel)
│   │
│   ├── components/          # Reusable UI Components (Directory created)
│   │   ├── WorkoutTracker.jsx    # Main component for workout session (Planned Example)
│   │   ├── WebcamFeed.jsx        # Handles webcam and MediaPipe (Planned Example)
│   │   ├── RepCounterDisplay.jsx # Displays rep counts (Planned Example)
│   │   ├── StartPositionGuide.jsx# UI for start position (Planned Example)
│   │   ├── WorkoutSummary.jsx    # Displays workout statistics at the end of a session
│   │   ├── DatabaseViewer.jsx    # Component for inspecting stored workout data
│   │   └── ...                 # Other UI elements
│   │
│   ├── exercises/           # Exercise Configuration Files (Planned)
│   │   ├── index.js           # Exports all exercise configurations (Planned)
│   │   ├── bicepCurls.js      # Example exercise config (Planned)
│   │   └── ...
│   │
│   ├── logic/               # Reusable Business Logic (Planned)
│   │   ├── angleBasedRepLogic.js   # Angle-based logic (NEW)
│   │   ├── positionBasedRepLogic.js# Position-based logic (NEW)
│   │   ├── landmarkUtils.js       # Geometry helpers
│   │   └── ...
│   │
│   ├── hooks/               # Custom React Hooks (Optional, Planned)
│   │   └── useMediaPipePose.js # Example hook (Planned)
│   │
│   ├── services/            # Service layer for data operations
│   │   └── db.js              # Database operations using Dexie.js
│   │
│   └── styles/              # CSS, etc. (Planned)
│       └── ...
│
├── package.json             # Project dependencies and scripts (Exists)
├── node_modules/            # Installed dependencies (Exists)
└── ...                      # Other config files (.gitignore, etc.)
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

## 5. Repetition Logic (Pipeline Functions)

- **Location:** `src/logic/`
- **Purpose:** Contains pure functions responsible for analyzing **MediaPipe landmark data** (passed in as an object mapping landmark names to `{x, y, z, visibility}` objects) based on an exercise's `logicConfig` and `startPosition` config.
- **Pipeline Approach:**
    - Each logic type (angle-based, position-based, etc.) is implemented in its own file (e.g., `angleBasedRepLogic.js`, `positionBasedRepLogic.js`).
    - The `logicConfig.pipeline` array specifies the sequence of logic functions to run for each exercise.
    - Each function receives `{ landmarks, config, prevState, utils, state }` and returns an updated `state` object.
    - The engine (`runRepStateEngine`) runs each function in order, passing the evolving state object.
- **Key Files:**
    - `angleBasedRepLogic.js`: Angle-based logic.
    - `positionBasedRepLogic.js`: Position-based logic.
    - `landmarkUtils.js`: Geometry helpers (e.g., `calculateAngle`, `getDistance`).

**Example Logic Function Signature:**

```js
/**
 * Angle-based rep logic for pipeline.
 * @param {Object} params
 * @param {Array} params.landmarks
 * @param {Object} params.config
 * @param {Object} params.prevState
 * @param {Object} params.utils
 * @param {Object} params.state
 * @returns {Object} Updated state
 */
export function angleBasedRepLogic({ landmarks, config, prevState, utils, state }) {
  // ...
  return { ...state, angleLogic: {/* ... */} };
}
```

## 6. UI Components (`src/components/`)

- **Purpose:** Render the UI, handle user input, display data from the logic layer.
- **Key Components:**
    - `App.jsx`: Top-level component. Selects exercise, passes config down.
    - `WorkoutTracker.jsx`: Receives exercise config, manages workout state, renders `WebcamFeed`, receives MediaPipe landmark data, calls the pipeline logic, updates state, and renders display components.
    - `WebcamFeed.jsx`: Encapsulates webcam access and MediaPipe Pose setup.
    - `RepCounterDisplay.jsx`: Displays rep counts.
    - `StartPositionGuide.jsx`: Guides user based on `startPositionConfig` and feedback.
    - `WorkoutSummary.jsx`: Displays workout statistics when a session ends, including reps, duration, and session times.
    - `DatabaseViewer.jsx`: Provides a UI for browsing stored workout data.

## 7. Data Flow Summary

1. **`App.jsx`**: User selects exercise -> Retrieves config object.
2. **`App.jsx` -> `WorkoutTracker.jsx`**: Renders `WorkoutTracker`, passes config prop.
3. **`WorkoutTracker.jsx` -> `WebcamFeed.jsx`**: Renders `WebcamFeed`.
4. **`WebcamFeed.jsx` -> `WorkoutTracker.jsx`**: `WebcamFeed` uses MediaPipe Pose to detect landmarks, sends the `poseLandmarks` object back to `WorkoutTracker`.
5. **`WorkoutTracker.jsx`**: On receiving `poseLandmarks`:
    - Gets `logicConfig.pipeline` and `utilityFunctions` from config prop.
    - Gets current rep state(s).
    - Calls the pipeline logic with `{ landmarks, config, prevState, utils, state }`.
    - Receives result object.
    - Updates React state.
    - Re-renders display components.

## 8. Benefits of the Pipeline Architecture

- **Maintainability:** Changes isolated to config, logic, or UI.
- **Scalability:** Adding exercises is mainly adding config files. Adding new logic types is as simple as creating a new file and adding it to the pipeline.
- **Testability:** Each logic function is testable in isolation with mock MediaPipe data.
- **Reusability:** Logic functions are reused across exercises and can be composed in any order for compound movements.
- **Extensibility:** Easily supports compound and novel movement logic by chaining logic types.

## 9. Styling and UI Theming

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

## 10. Implementation Considerations (MediaPipe Specific)

- **Build Tool:** This project appears to be using **Parcel** (`parcel index.html`). Ensure configurations (like paths in `index.html` or component imports) are compatible with Parcel's resolution and bundling mechanisms. Address any build errors, such as missing files (e.g., CSS imports) or internal Parcel errors.
- **MediaPipe Pose Setup:** Integrate the `@mediapipe/pose` library correctly. Handle model loading, configuration (static vs. stream mode, model complexity), and running inference on the webcam stream.
- **Landmark Coordinates:** MediaPipe provides normalized coordinates (0.0 to 1.0). Your `landmarkUtils.js` functions will work with these directly. `z` coordinate indicates depth relative to the hip center. `visibility` score indicates landmark confidence. Use visibility scores to ignore unreliable landmarks.
- **Performance:** MediaPipe Pose can be resource-intensive.
    - Choose appropriate model complexity (`0`, `1`, or `2`).
    - Ensure efficient video frame handling.
    - Use React optimizations (`React.memo`, `useCallback`, `useMemo`).
    - Consider Web Workers to run MediaPipe off the main thread if performance issues arise.
- **Asynchronicity:** MediaPipe initialization and detection are asynchronous. Handle loading states and errors.
- **Coordinate System:** Be mindful of the coordinate system if calculating angles relative to vertical/horizontal planes.

## Rep Counting Implementation Note

- The rep counting logic now uses a **per-side rep cycle** for maximum accuracy and robustness.
    - For each side (left/right), the system tracks whether the user has been in the ready pose (after the required hold timer).
    - A rep is only counted for a side if the user was in the ready pose, then left the ready pose and completed the rep movement, and was previously in the ready pose.
    - After a rep is counted, the per-side ready state is reset for the next cycle.
- For **single-sided exercises**, only the 'left' side is used for all rep tracking and state logic.
- The global ready pose hold timer is still used for transitioning from IDLE to READY state, ensuring the user must hold the ready pose for a minimum duration before starting reps.

This approach eliminates phantom reps and ensures accurate, robust rep counting for both single- and two-sided exercises.

## State-Driven Rep Counting and Graph Display

- **Single Source of Truth:**
  Rep counting and the rep history graph are now driven by the global tracking state (`ACTIVE`, `READY`, `PAUSED`, etc).
  - **Reps and graph data are only recorded when the tracking state is not `PAUSED` (i.e., only during `ACTIVE` or `READY`).**
  - The tracking state is determined by all relevant logic, including landmark visibility, strict mode, and grace periods.
  - This ensures that all user-facing features (UI, rep counting, graph) are always in sync and respect the user's settings.

- **Implementation:**
  - Each rep history entry stores the tracking state at the time it was recorded.
  - The graph only displays data from times when the state was `ACTIVE` or `READY`.
  - Rep counting is only performed in these states as well.

- **Benefits:**
  - This approach eliminates duplicated logic, reduces bugs, and makes the system easier to maintain and extend.

## 11. Data Persistence

- **Technology:** The application uses **Dexie.js**, a minimalistic wrapper for IndexedDB, to provide client-side data persistence.
- **Purpose:** Stores workout sessions and exercise sets locally in the browser, allowing users to track progress over time without requiring server storage.
- **Location:** `src/services/db.js`

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

### Integration with Application Architecture

- **Data Flow:** UI components trigger database operations during workout tracking:
  1. Workout starts → `startNewWorkoutSession()`
  2. Exercise completed → `addExerciseSet()`
  3. Workout ends → `endWorkoutSession()`
  4. History view → `getAllWorkoutSessions()` and `getSetsForSession()`

- **Separation of Concerns:** Database operations are isolated in the services layer, making them reusable across components and keeping database logic separate from UI.

- **Future Expansion:** The schema design allows for future additions such as:
  - Storing MediaPipe landmark data for form analysis
  - Adding workout templates and exercise library
  - Implementing workout statistics and progress tracking

## 12. Session Statistics and Data Visualization

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

### Integration with Workout Flow

- The WorkoutSummary appears automatically when a user ends a workout session through the "End Workout" button.
- The DatabaseViewer is accessible through a dedicated database icon button, allowing users to browse their workout history at any time.
- Both components access data through the db.js service, maintaining separation of concerns.

The combination of these components provides users with immediate feedback on their current workout and access to historical data, supporting motivation and progress tracking without requiring backend infrastructure.

*This document details a data-driven architecture optimized for a React workout tracker using MediaPipe Pose, structured for clarity for both*
