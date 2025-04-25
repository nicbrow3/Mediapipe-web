// Placeholder for Bicep Curls exercise configuration
// Based on Architecture Guide.md

// Import logic functions (placeholders for now)
// import { calculateAngleBasedRepState } from '../logic/repCounterLogic';
// import * as LandmarkUtils from '../logic/landmarkUtils';

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
                points: ['shoulder', 'elbow', 'wrist'], // Mapped to MediaPipe names in logic
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
        type: 'angle',
        anglesToTrack: [
             {
                id: 'leftElbowCurlAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points
                minThreshold: 45,
                maxThreshold: 160,
                isRepCounter: true
             },
             {
                id: 'rightElbowCurlAngle',
                side: 'right',
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