# MinimalTracker Component Architecture

This document outlines the component structure of the MinimalTracker application, showing how the various components work together to create a streamlined pose tracking experience.

## Component Hierarchy

```
MinimalTracker
├── ExerciseSelector
├── StatsDisplay
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

## Data Flow

1. User starts camera via the start button
2. MinimalTracker initializes the camera and pose detection
3. Video frames are processed by MediaPipe in the renderLoop
4. Detected landmarks are passed to VideoCanvas for rendering
5. Angles are calculated based on the selectedExercise configuration
6. Calculated angles are passed to AngleDisplay for visualization
7. Performance metrics are updated and displayed via StatsDisplay
8. User can select different exercises via ExerciseSelector

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

## Component Communication Diagram

```
User Input → ExerciseSelector → MinimalTracker → AngleDisplay
                                       ↓
           Camera → VideoCanvas ← MinimalTracker → StatsDisplay
```

This architecture promotes:
- **Separation of concerns**: Each component has a clear, single responsibility
- **Reusability**: Components can be reused in other parts of the application
- **Maintainability**: Changes to one aspect don't require modifying the entire application
- **Testability**: Smaller components with clear inputs/outputs are easier to test 