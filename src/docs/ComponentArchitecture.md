# MinimalTracker Component Architecture

This document outlines the component structure of the MinimalTracker application, showing how the various components work together to create a streamlined pose tracking experience.

## Component Hierarchy

```
MinimalTracker
├── TrackerControlsBar
│   ├── StatsDisplay
│   ├── SegmentedControl (for workout mode toggle between manual/timed/ladder)
│   ├── ExerciseSelector (shown in 'manual' mode)
│   ├── SessionControls (shown in 'timed session' mode)
│   │   └── SessionSettings (collapsible panel)
│   └── LadderSessionControls (shown in 'ladder session' mode)
│       └── LadderSessionSettings (collapsible panel)
├── VideoCanvasContainer  // Conceptual grouping (implemented as a <div> in MinimalTracker.jsx)
│   │                     // for elements related to the video feed and tracking display.
│   ├── VideoCanvas
│   ├── AngleDisplay
│   │   └── AngleIndicator
│   ├── PhaseTrackerDisplay
│   │   └── PhaseTracker
│   ├── LandmarkMetricsDisplay2
│   ├── RepGoalIndicator
│   └── WeightIndicator
└── FpsCounter            // Standalone diagnostic tool, not a child of StatsDisplay
```

## Component Responsibilities

### MinimalTracker
**Purpose**: Main container component that orchestrates the entire tracking experience.
- Manages application state
- Initializes MediaPipe Pose Landmarker
- Processes video frames and calculates angles
- Coordinates data flow between components

### VideoCanvas
**Purpose**: Manages the video feed and canvas rendering of pose landmarks.
- Renders the webcam video
- Draws pose landmarks on canvas
- Abstracts away drawing logic from the main component

**Props**:
- `videoRef`: Reference to the video element
- `canvasRef`: Reference to the canvas element
- `landmarks`: Array of pose landmarks to draw
- `width`, `height`: Canvas dimensions
- `cameraStarted`: Boolean indicating if camera is active

### ExerciseSelector
**Purpose**: Provides a dropdown menu for selecting different exercises.
- Displays available exercises
- Handles exercise selection changes

**Props**:
- `exerciseOptions`: Array of available exercises
- `selectedExercise`: Currently selected exercise
- `onChange`: Callback for exercise selection change

### AngleDisplay
**Purpose**: Renders angle measurements for the selected exercise.
- Displays angles based on exercise configuration
- Adjusts display position based on angle type (left/right/single)
- Handles both single-angle and multi-angle exercises

**Props**:
- `selectedExercise`: Current exercise configuration
- `trackedAngles`: Object containing calculated angle values

### StatsDisplay
**Purpose**: Shows performance metrics for the tracking.
- Displays FPS (frames per second) and inference time for pose detection, passed via props.
- Indicates smoothing status and window if enabled.

**Props**:
- `stats`: Object containing performance statistics (FPS, inferenceTime)
- `cameraStarted`: Boolean indicating if camera is active
- `landmarksData`: Array of pose landmarks (used to count landmarks, though not directly displayed)
- `smoothingEnabled`: Boolean indicating if angle smoothing is active
- `smoothingWindow`: Number of frames used for smoothing

### PhaseTrackerDisplay
**Purpose**: Manages the display of exercise phase tracking for different sides (left/right).
- Determines which angle configuration to use based on `displaySide`.
- Renders a `PhaseTracker` component for the relevant angle.

**Props**:
- `selectedExercise`: Current exercise configuration
- `trackedAngles`: Object containing calculated angle values
- `displaySide`: String indicating side to display for ('left' or 'right')

### PhaseTracker
**Purpose**: Tracks and displays the current phase of an exercise movement and counts repetitions.
- Calculates the current movement phase (e.g., relaxed, starting, peak) based on the input angle and thresholds from `angleConfig`.
- Implements logic to count repetitions based on a sequence of phases.
- Visually indicates the current phase.

**Props**:
- `angle`: Current value of the angle being tracked
- `angleConfig`: Configuration for the specific angle (thresholds, etc.)
- `side`: Label for the display (e.g., 'Left', 'Right')

### LandmarkMetricsDisplay2
**Purpose**: Displays metrics related to pose landmarks (current implementation in `MinimalTracker.jsx` seems to pass props but the component itself might be a placeholder or have its logic elsewhere if not directly using them for display).
- Intended to show data derived from landmarks, specific to the exercise.

**Props**:
- `displaySide`: String indicating side to display for ('left' or 'right')
- `selectedExercise`: Current exercise configuration
- `landmarksData`: Array of pose landmarks
- `trackedAngles`: Object containing calculated angle values

### RepGoalIndicator
**Purpose**: Allows the user to set and view a repetition goal for the current exercise.
- Displays the current rep goal.
- Provides functionality to increase or decrease the rep goal.

**Props**:
- `repGoal`: Current repetition goal value
- `setRepGoal`: Callback function to update the rep goal

### WeightIndicator
**Purpose**: Allows the user to set and view the weight used for a weighted exercise.
- Displays the current weight.
- Provides functionality to adjust the weight.
- Only shown if the `selectedExercise` has the `hasWeight` property.

**Props**:
- `weight`: Current weight value
- `setWeight`: Callback function to update the weight

### AngleIndicator
**Purpose**: Provides a visual representation of a single angle.
- Displays an angle as a line on a semi-circular background.
- Can show threshold markers (min/max) for the angle based on `angleConfig`.

**Props**:
- `angle`: Current value of the angle to display
- `maxAngle`: Maximum possible value for the angle (e.g., 180 degrees)
- `size`: Size of the indicator
- `color`: Color of the indicator line
- `backgroundColor`: Background color of the indicator
- `angleConfig`: Configuration for the angle, including thresholds
- `minSize`: Minimum size of the indicator

### FpsCounter
**Purpose**: A standalone diagnostic tool that displays detailed performance metrics.
- Calculates and displays FPS (frames per second).
- Shows render time, MediaPipe inference time, and JavaScript memory usage (if available).
- Can be positioned on screen and can show detailed or summary views.

**Props**:
- `position`: String to control screen position (e.g., 'bottom-left')
- `showDetails`: Boolean to toggle detailed metrics view

### TrackerControlsBar
**Purpose**: Container for the top controls bar with conditional rendering based on workout mode.
- Houses StatsDisplay for performance metrics
- Provides workout mode toggle (manual/timed session/ladder session)
- Conditionally renders one of three components based on mode:
  - ExerciseSelector in manual mode
  - SessionControls in timed session mode
  - LadderSessionControls in ladder session mode

**Props**:
- Various props passed from MinimalTracker including exercise options, session state, etc.
- `workoutMode`: Current mode ('manual', 'session', or 'ladder')
- `onWorkoutModeChange`: Handler for mode changes
- `sessionSettings`: Current timed session configuration values
- `onSessionSettingsChange`: Handler for timed session setting updates
- `ladderSettings`: Current ladder session configuration values
- `onLadderSettingsChange`: Handler for ladder session setting updates

### SessionControls
**Purpose**: Manages the interface for timed workout sessions.
- Displays a collapsible settings panel for configuration
- Shows a timer countdown during active sessions
- Displays current/upcoming exercise information
- Shows set progress (current set / total sets)
- Provides start/stop button for session control

**Props**:
- `isSessionActive`: Boolean indicating if a session is currently running
- `currentTimerValue`: Current countdown timer value in seconds
- `onToggleSession`: Handler to start/stop the session
- `currentExercise`: The exercise currently being performed
- `upcomingExercise`: The next exercise in the queue
- `sessionPhase`: Current phase ('exercising' or 'resting')
- `exerciseSetDuration`: Duration of exercise period in seconds
- `restPeriodDuration`: Duration of rest period in seconds
- `totalSets`: Total number of sets to perform
- `currentSetNumber`: Current set number being performed
- `onSettingsChange`: Handler for session setting updates

### SessionSettings
**Purpose**: Provides a configuration interface for timed workout sessions.
- Allows setting exercise duration (seconds)
- Allows setting rest duration (seconds)
- Allows setting total number of sets
- Disables settings during active sessions

**Props**:
- `exerciseSetDuration`: Current exercise duration in seconds
- `restPeriodDuration`: Current rest duration in seconds
- `totalSets`: Current total sets value
- `onSettingsChange`: Handler for session setting updates
- `isSessionActive`: Boolean to disable settings during active sessions

### LadderSessionControls
**Purpose**: Manages the interface for ladder workout sessions.
- Displays a collapsible settings panel for configuration
- Shows current rep count and direction (going up or down the ladder)
- Displays a timer countdown during rest phases
- Provides exercise name and set progress
- Includes a "Complete Set" button to mark the current set as done

**Props**:
- `isSessionActive`: Boolean indicating if a session is currently running
- `currentTimerValue`: Current countdown timer value in seconds (for rest periods)
- `onToggleSession`: Handler to start/stop the session
- `onCompleteSet`: Handler to mark the current set as completed
- `currentExercise`: The exercise currently being performed
- `currentReps`: Number of reps to perform in current set
- `sessionPhase`: Current phase ('exercising' or 'resting')
- `totalSets`: Total number of sets in the ladder
- `currentSetNumber`: Current set number being performed
- `onSettingsChange`: Handler for ladder setting updates
- `ladderSettings`: Current ladder configuration values

### LadderSessionSettings
**Purpose**: Provides a configuration interface for ladder workout sessions.
- Allows setting starting rep count
- Allows setting top rep count (max reps in the ladder)
- Allows setting ending rep count
- Allows setting increment amount between sets
- Allows setting rest time per rep
- Disables settings during active sessions

**Props**:
- `ladderSettings`: Current ladder configuration values
- `onSettingsChange`: Handler for ladder setting updates
- `isSessionActive`: Boolean to disable settings during active sessions

## Data Flow

1. User starts camera via the start button
2. MinimalTracker initializes the camera and pose detection
3. Video frames are processed by MediaPipe in the renderLoop
4. Detected landmarks are passed to VideoCanvas for rendering
5. Angles are calculated based on the selectedExercise configuration
6. Calculated angles are passed to AngleDisplay for visualization
7. Performance metrics are updated and displayed via StatsDisplay
8. User can select different exercises via ExerciseSelector, start a timed session, or start a ladder session
9. If using timed sessions, SessionControls manages the workout flow through useSessionLogic
10. If using ladder sessions, LadderSessionControls manages the workout flow through useLadderSessionLogic

## Session Management Flow

1. User switches to "Timed Session" mode using the SegmentedControl
2. User configures session parameters via SessionSettings (exercise time, rest time, total sets)
3. When "Start Session" is clicked, SessionControls triggers useSessionLogic hook
4. The hook selects random exercises, manages timer countdown, and transitions between phases
5. SessionControls displays the current timer, exercise, and set progress
6. After all sets are completed, the session automatically ends

## Ladder Session Flow

1. User switches to "Ladder Session" mode using the SegmentedControl
2. User configures ladder parameters via LadderSessionSettings
   - Starting rep count
   - Maximum (top) rep count
   - Ending rep count
   - Increment between sets
   - Rest time per rep
3. When "Start Ladder" is clicked, LadderSessionControls triggers useLadderSessionLogic hook
4. The user performs the specified reps and clicks "Complete Set"
5. The app enters a rest period based on the number of reps just completed
6. After rest, the next set begins with incremented/decremented reps
7. The ladder progresses up to the top rep count and then back down to the end rep count

## State Management

MinimalTracker manages the following state:
- `isLoading`: Loading state during initialization
- `errorMessage`: Error messages if initialization fails
- `cameraStarted`: Whether the camera is active
- `stats`: Performance metrics (FPS, inference time)
- `selectedExercise`: Currently selected exercise
- `trackedAngles`: Calculated angles for current frame
- `canvasDimensions`: Width and height of the canvas
- `landmarksData`: Detected pose landmarks
- `workoutMode`: Current workout mode ('manual', 'session', or 'ladder')

The useSessionLogic hook manages the following session-specific state:
- `isSessionActive`: Whether a session is currently running
- `sessionPhase`: Current phase ('idle', 'exercising', or 'resting')
- `currentTimerValue`: Countdown timer for current phase
- `currentExercise`: Current exercise being performed
- `upcomingExercise`: Next exercise in queue
- `totalSets`: Total number of sets configured
- `currentSetNumber`: Current set being performed
- `sessionSettings`: Configuration values for the session

The useLadderSessionLogic hook manages the following ladder-specific state:
- `isSessionActive`: Whether a ladder session is currently running
- `sessionPhase`: Current phase ('idle', 'exercising', or 'resting')
- `currentTimerValue`: Countdown timer for rest phase
- `currentExercise`: Current exercise being performed
- `currentReps`: Number of reps to perform in the current set
- `direction`: Whether the ladder is going 'up' or 'down'
- `totalSets`: Total number of sets calculated from ladder parameters
- `currentSetNumber`: Current set being performed
- `ladderSettings`: Configuration values for the ladder

### Global Application Settings with `useAppSettings` and Context

The `useAppSettings` hook is responsible for managing global application settings that persist across sessions, such as `isSmoothingEnabled`, `useThreePhases`, `requireAllLandmarks`, etc.

**Previous Challenge:**
Initially, `useAppSettings` utilized `useState` internally. This meant that each component invoking the hook received its own independent, local copy of the settings state. While settings were loaded from and saved to `localStorage`, changes made via `updateSettings` in one component were not immediately reflected in other components using the same hook. This could lead to inconsistencies, where some parts of the UI would only update after a page refresh.

**Solution: React Context for Shared State:**
To address this, `useAppSettings` has been refactored to leverage React Context.
-   An `AppSettingsContext` is created.
-   An `AppSettingsProvider` component now wraps the application (typically in `App.jsx`). This provider holds the actual settings state (`useState`) and the `updateSettings` function.
-   The `useAppSettings` hook now uses `useContext(AppSettingsContext)` to access the shared `settings` object and `updateSettings` function from the provider.

**Benefits of this Approach:**
-   **Centralized State:** All components calling `useAppSettings` now access the *same instance* of the settings state.
-   **Immediate Updates:** When `updateSettings` is called from any component, the state within `AppSettingsProvider` changes. This triggers a re-render of the provider, and consequently, all consuming components receive the new settings value and re-render if necessary.
-   **Consistency:** This ensures that settings changes are applied globally and immediately, preventing desynchronization issues and the need for page refreshes to see updates. For example, toggling a setting in `SettingsOverlay.jsx` will now instantly affect behavior in `MinimalTracker.jsx`, `PhaseTracker.jsx`, and other components relying on these shared settings.
-   **Simplified Logic:** Components no longer need to pass settings down through multiple layers of props if they can directly access them via the `useAppSettings` hook.

This contextual approach for `useAppSettings` significantly improves the robustness and predictability of global settings management throughout the application.

## Helper Functions

The architecture includes several reusable helper functions:
- `setupCamera`: Initializes webcam access
- `waitForVideoReady`: Waits for video metadata to load
- `initializePoseLandmarker`: Sets up MediaPipe
- `renderLoop`: Main processing loop for video frames

## Future Improvements

Potential future refactoring:
1. Extract remaining inline components:
   - StartCameraButton
   - LoadingOverlay
   - ErrorMessage
2. Create a custom hook for MediaPipe initialization (e.g., `usePoseLandmarker`)
3. Move inline styles to CSS modules or styled components
4. Implement a state management solution for more complex applications
5. Add TypeScript type definitions for props and state

## Custom Hooks

The architecture includes several custom hooks:
- `useAppSettings`: Manages persistent application settings
- `useSessionLogic`: Manages timed workout session logic including:
  - Session state (active/inactive)
  - Phase transitions (exercising/resting)
  - Timer countdown
  - Exercise selection
  - Set tracking and completion

## Component Communication Diagram

```
User Input → ExerciseSelector → MinimalTracker → AngleDisplay
                    ↑               ↓
WorkoutMode → TrackerControlsBar ←→ MinimalTracker → StatsDisplay
                    ↓
               SessionControls → useSessionLogic
                    ↓
              SessionSettings
```

This architecture promotes:
- **Separation of concerns**: Each component has a clear, single responsibility
- **Reusability**: Components can be reused in other parts of the application
- **Maintainability**: Changes to one aspect don't require modifying the entire application
- **Testability**: Smaller components with clear inputs/outputs are easier to test
- **Scalability**: The session system can be extended to support more features like muscle group targeting 