// Placeholder for Bicep Curls exercise configuration
// Based on Architecture Guide.md

// Import logic functions (placeholders for now)
// import { calculateAngleBasedRepState } from '../logic/repCounterLogic';
// import * as LandmarkUtils from '../logic/landmarkUtils';

export const leftShoulder = {
    // --- Basic Info ---
    id: 'left-shoulder',
    name: 'Left Shoulder test',
    isTwoSided: false,

    // --- Landmark Requirements ---
    landmarks: {
        primary: ['left_shoulder'],
        secondary: ['right_shoulder']
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: "Stand tall, arms fully extended downwards by your sides.",
        requiredAngles: [
            {
                id: 'leftShoulderStart',
                side: 'left',
                points: ['shoulder'], // Mapped to MediaPipe names in logic
                targetAngle: 170,
                tolerance: 15
            },
            {
                id: 'rightShoulderStart',
                side: 'right',
                points: ['shoulder'],
                targetAngle: 170,
                tolerance: 15
            },
        ],
        holdTime: 0.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
             {
                id: 'elbowCurlAngle',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points
                minThreshold: 45,
                maxThreshold: 160,
                isRepCounter: true
             }
        ],
        // Placeholder: Assign the actual function when defined
        stateCalculationFunction: null, // calculateAngleBasedRepState,
        // Placeholder: Assign actual functions when defined
        utilityFunctions: {
            calculateAngle: null // LandmarkUtils.calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your elbows tucked in. Control the movement.",
    muscleGroups: ["Biceps", "Forearms"]
}; 