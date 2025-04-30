# Exercise Configuration File Guide

This guide explains how to create a new exercise configuration file in this folder. Use this as a reference when adding new exercises, ensuring consistency and compatibility with the rest of the application.

## File Structure Overview
Each exercise file should export a single configuration object with the following structure:

```js
export const exerciseName = {
    // --- Basic Info ---
    id: '',
    name: '',
    isTwoSided: true/false,

    // --- Landmark Requirements ---
    landmarks: {
        left: {
            primary: [],
            secondary: []
        },
        right: {
            primary: [],
            secondary: []
        }
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: '',
        requiredAngles: [
            {
                id: '',
                side: 'left'/'right',
                points: [],
                targetAngle: Number,
                tolerance: Number
            },
            // ...
        ],
        holdTime: Number
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
            {
                id: '',
                points: [],
                minThreshold: Number,
                maxThreshold: Number,
                isRepCounter: true/false
            }
        ],
        stateCalculationFunction: null, // Assign logic function when available
        utilityFunctions: {
            calculateAngle: null // Assign utility function when available
        }
    },

    // --- Optional Metadata ---
    instructions: '',
    muscleGroups: []
};
```

## Field Explanations

### Basic Info
- `id`: Unique string identifier for the exercise (e.g., 'bicep-curls').
- `name`: Human-readable name.
- `isTwoSided`: Boolean indicating if the exercise is performed on both sides (left/right).

### Landmark Requirements
- `landmarks.left` / `landmarks.right`: Lists of required MediaPipe landmarks for each side.
  - `primary`: Essential landmarks for rep counting and form.
  - `secondary`: Additional landmarks for posture or validation.

### Starting Position Requirements
- `description`: Text description of the correct starting pose.
- `requiredAngles`: Array of angle requirements for the start position.
  - `id`: Unique identifier for the angle check.
  - `side`: 'left' or 'right'.
  - `points`: Array of joint names (e.g., ['shoulder', 'elbow', 'wrist']).
  - `targetAngle`: The angle (in degrees) that should be achieved.
  - `tolerance`: Acceptable deviation from the target angle.
- `holdTime`: Minimum time (in seconds) the start position must be held.

### Repetition Logic Configuration
- `logicConfig.type`: Type of logic used (usually 'angle').
- `anglesToTrack`: Array of angle objects to monitor during reps.
  - `id`: Unique identifier for the angle.
  - `points`: Array of joint names.
  - `minThreshold` / `maxThreshold`: Angle range for a valid rep.
  - `isRepCounter`: Boolean, true if this angle is used for rep counting.
- `stateCalculationFunction`: Placeholder for the function that determines rep state (assign when implemented).
- `utilityFunctions`: Placeholder for utility functions (e.g., angle calculation).

### Optional Metadata
- `instructions`: Tips or cues for the user.
- `muscleGroups`: Array of muscle groups targeted.

## How This Configuration Is Used
- **Landmarks**: Used by pose detection logic to extract relevant joint positions.
- **Start Position**: Validated before reps begin; ensures user is in correct pose.
- **Repetition Logic**: Drives the rep counter and state transitions during exercise.
- **Metadata**: Displayed in the UI for user guidance.

## Example Files
- See [`bicepCurls.js`](./bicepCurls.js), [`tricepKickbacks.js`](./tricepKickbacks.js), and [`jumpingJacks.js`](./jumpingJacks.js) for working examples.

## Tips
- Keep field names and structure consistent.
- Use descriptive `id` values for angles and logic.
- When new logic or utility functions are implemented, update the placeholders accordingly.
- **After creating a new exercise file, always update [`index.js`](./index.js) to export your new exercise configuration.**

---

For further details, refer to the main application logic or contact the maintainers. 