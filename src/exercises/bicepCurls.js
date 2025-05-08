// Placeholder for Bicep Curls exercise configuration
// Now uses pluggable logic system

// Import logic functions (placeholders for now)
import { calculateAngle } from '../logic/landmarkUtils';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const bicepCurls = {
    // --- Basic Info ---
    id: 'bicep-curls',
    name: 'Bicep Curls',
    isTwoSided: true,
    hasWeight: true,

    // --- Visibility Strictness Option ---
    /**
     * If true, ALL pose landmarks must have visibility >= threshold to exit paused state.
     * If false, only required/primary/secondary landmarks are checked.
     */
    requireAllLandmarksVisible: false,

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
        readyPositionHoldTime: 1.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
             {
                id: 'leftElbowCurlAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points
                minThreshold: 90,
                maxThreshold: 160,
                isRepCounter: true,
                relaxedIsHigh: true
             },
             {
                id: 'rightElbowCurlAngle',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points
                minThreshold: 90,
                maxThreshold: 160,
                isRepCounter: true,
                relaxedIsHigh: true
             }
        ],
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your elbows tucked in. Control the movement.",
    muscleGroups: ["Biceps", "Forearms"]
}; 