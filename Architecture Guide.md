# React Workout Tracker: Data-Driven Architecture Guide (Using MediaPipe)

## 1. Overview

This document outlines the data-driven architecture for the React-based workout tracking application using webcam pose estimation, specifically leveraging the **MediaPipe Pose** library. The core principle is the **separation of concerns**, dividing the application into three main parts:

1.  **Data Configuration:** Static definitions for each exercise (properties, required MediaPipe landmarks, logic parameters, starting positions).
2.  **Reusable Logic:** Functions that process MediaPipe landmark data based on the configuration to determine rep state, count reps, and check form.
3.  **UI Components:** React components responsible for rendering the user interface, displaying data, and handling user interactions.

This approach promotes modularity, scalability, maintainability, and testability.

## 2. Core Principles

* **Data-Driven:** Exercise specifics are defined in configuration files, not hardcoded in components or logic functions.
* **Separation of Concerns:**
    * **Data (`src/exercises/`):** What defines an exercise? (Using MediaPipe landmark names)
    * **Logic (`src/logic/`):** How are reps counted and form checked based on MediaPipe data?
    * **UI (`src/components/`):** How is information displayed and interacted with?
* **Reusability:** Logic for common actions (like angle calculation or angle-based rep counting) is written once and reused by multiple exercises via their configuration.
* **Scalability:** Adding new exercises primarily involves creating new configuration files.

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
│   │   └── ...                 # Other UI elements
│   │
│   ├── exercises/           # Exercise Configuration Files (Planned)
│   │   ├── index.js           # Exports all exercise configurations (Planned)
│   │   ├── bicepCurls.js      # Example exercise config (Planned)
│   │   └── ...
│   │
│   ├── logic/               # Reusable Business Logic (Planned)
│   │   ├── repCounterLogic.js # Functions for rep counting (Planned Example)
│   │   ├── landmarkUtils.js   # Geometry helpers (Planned Example)
│   │   └── ...
│   │
│   ├── hooks/               # Custom React Hooks (Optional, Planned)
│   │   └── useMediaPipePose.js # Example hook (Planned)
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
import { calculateAngleBasedRepState } from '../logic/repCounterLogic';
import * as LandmarkUtils from '../logic/landmarkUtils';

export const bicepCurls = {
    // --- Basic Info ---
    id: 'bicep-curls', // Unique machine-readable identifier
    name: 'Bicep Curls', // Human-readable name
    isTwoSided: true, // Requires separate tracking for left/right sides?

    // --- Landmark Requirements ---
    // Specifies which MediaPipe landmarks are needed
    landmarks: {
        left: {
            primary: ['left_shoulder', 'left_elbow', 'left_wrist'], // Crucial MediaPipe landmarks
            secondary: ['left_hip'] // Optional MediaPipe landmarks
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
                // Use generic point names here, mapped to actual MediaPipe names in logic
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 170,
                tolerance: 15
            },
            { id: 'rightElbowStart', side: 'right', points: ['shoulder', 'elbow', 'wrist'], targetAngle: 170, tolerance: 15 },
        ],
        holdTime: 0.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
             {
                id: 'elbowCurlAngle',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points for calculation
                minThreshold: 45,
                maxThreshold: 160,
                isRepCounter: true
             }
        ],
        stateCalculationFunction: calculateAngleBasedRepState,
        utilityFunctions: {
            calculateAngle: LandmarkUtils.calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your elbows tucked in. Control the movement.",
    muscleGroups: ["Biceps", "Forearms"]
};

// --- In src/exercises/index.js ---
// export * from './bicepCurls';
// export * from './squats';
// ... etc.
````

## 5. Repetition Logic (Functions)

- **Location:** `src/logic/`
	
- **Purpose:** Contains pure functions responsible for analyzing **MediaPipe landmark data** (passed in as an object mapping landmark names to `{x, y, z, visibility}` objects) based on an exercise's `logicConfig` and `startPosition` config.
	
- **Key Files:**
	
	- `repCounterLogic.js`: Houses functions like `calculateAngleBasedRepState`, `calculateMultiAngleRepState`. These functions receive the MediaPipe landmark data.
		
	- `landmarkUtils.js`: Provides geometry helpers (e.g., `calculateAngle(p1, p2, p3)`, `getDistance(p1, p2)`). These helpers operate on the `{x, y, z}` coordinates from MediaPipe landmarks.

**Example Function Signature (`src/logic/repCounterLogic.js`):**

```
/**
 * Calculates the current state of a rep based on configuration and MediaPipe landmarks.
 * Handles start position checks and potentially multiple angle tracking.
 *
 * @param {object} currentLandmarks - Object mapping MediaPipe landmark names
 * (e.g., 'left_shoulder') to {x, y, z, visibility} objects.
 * @param {string | null} side - 'left', 'right', or null.
 * @param {object} logicConfig - The logicConfig object from the exercise configuration.
 * @param {object} startPositionConfig - The startPosition object from the exercise configuration.
 * @param {string} previousState - The state from the previous frame.
 * @param {number} timeInState - How long the previousState has been active.
 *
 * @returns {object} An object describing the new state, e.g.:
 * {
 * newState: string,
 * increment: boolean,
 * isStartOk: boolean,
 * feedback: { startPosition: string | null, formChecks: string[] | null },
 * angles: { [angleId: string]: number | null },
 * }
 */
export function calculateAngleBasedRepState(
    currentLandmarks, // Expecting MediaPipe poseLandmarks object structure
    side,
    logicConfig,
    startPositionConfig,
    previousState,
    timeInState
) {
    // 1. Check visibility/presence of required MediaPipe landmarks.
    // 2. Evaluate start position using MediaPipe landmarks.
    // 3. Calculate angles using MediaPipe landmark coordinates.
    // 4. Implement state machine logic.
    // 5. Perform secondary checks.
    // 6. Return the state object.

    // ... implementation details ...

    return { newState: '...', increment: false, isStartOk: false, feedback: {}, angles: {} };
}
```

## 6. UI Components (`src/components/`)

- **Purpose:** Render the UI, handle user input, display data from the logic layer.
	
- **Key Components:**
	
	- **`App.jsx`:** Top-level component. Selects exercise, passes config down.
		
	- **`WorkoutTracker.jsx`:**
		
		- Receives exercise config.
			
		- Manages workout state.
			
		- Renders `WebcamFeed`.
			
		- Receives **MediaPipe landmark data** from `WebcamFeed`.
			
		- Calls the `stateCalculationFunction` with landmarks, config, state.
			
		- Updates state based on logic function result.
			
		- Renders display components.
			
	- **`WebcamFeed.jsx`:** Encapsulates webcam access and **MediaPipe Pose setup** (using `@mediapipe/pose`). Configures MediaPipe, runs detection on video frames, and emits the detected `poseLandmarks` object upwards. A custom hook like `useMediaPipePose` can abstract this.
		
	- **`RepCounterDisplay.jsx`:** Displays rep counts.
		
	- **`StartPositionGuide.jsx`:** Guides user based on `startPositionConfig` and feedback.

## 7. Data Flow Summary

1. **`App.jsx`**: User selects exercise -> Retrieves config object.
	
2. **`App.jsx` -> `WorkoutTracker.jsx`**: Renders `WorkoutTracker`, passes config prop.
	
3. **`WorkoutTracker.jsx` -> `WebcamFeed.jsx`**: Renders `WebcamFeed`.
	
4. **`WebcamFeed.jsx` -> `WorkoutTracker.jsx`**: `WebcamFeed` uses **MediaPipe Pose** to detect landmarks, sends the `poseLandmarks` object back to `WorkoutTracker`.
	
5. **`WorkoutTracker.jsx`**: On receiving `poseLandmarks`:
	
	- Gets `stateCalculationFunction`, `logicConfig`, `startPosition` from config prop.
		
	- Gets current rep state(s).
		
	- Calls `stateCalculationFunction(poseLandmarks, side, logicConfig, startPosition, currentState, timeInState)`.
		
	- Receives result object.
		
	- Updates React state.
		
	- Re-renders display components.

## 8. Benefits of this Architecture

- **Maintainability:** Changes isolated to config, logic, or UI.
	
- **Scalability:** Adding exercises is mainly adding config files.
	
- **Testability:** Logic functions testable with mock MediaPipe data.
	
- **Reusability:** Logic functions reused across exercises.

## 9. Implementation Considerations (MediaPipe Specific)

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

*This document details a data-driven architecture optimized for a React workout tracker using MediaPipe Pose, structured for clarity for both
