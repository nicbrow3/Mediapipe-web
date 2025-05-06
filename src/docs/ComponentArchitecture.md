# MinimalTracker Component Architecture

This document outlines the component structure of the MinimalTracker application, showing how the various components work together to create a streamlined pose tracking experience.

## Component Hierarchy

```
MinimalTracker
├── ExerciseSelector
├── StartCameraButton (currently inline)
├── LoadingOverlay (currently inline)
├── ErrorMessage (currently inline)
└── VideoCanvasContainer
    ├── VideoCanvas
    ├── AngleDisplay
    └── StatsDisplay
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
- Displays FPS (frames per second)
- Displays inference time for pose detection

**Props**:
- `stats`: Object containing performance statistics
- `cameraStarted`: Boolean indicating if camera is active

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