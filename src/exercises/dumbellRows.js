// Placeholder for Bicep Curls exercise configuration
// Now uses pluggable logic system

// Import logic functions (placeholders for now)
import { calculateAngle } from '../logic/landmarkUtils.js';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const dumbellRows = {
    // --- Basic Info ---
    id: 'dumbell-rows',
    name: 'Dumbell Rows',
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
        description: "Straight back, bent over at the waist, dumbell at your side.",
        requiredAngles: [
            {
                id: 'leftElbowStart',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'], // Mapped to MediaPipe names in logic
                targetAngle: 160,
                tolerance: 15
            },
            {
                id: 'rightElbowStart',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 160,
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
                id: 'leftRowAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points
                minThreshold: 90,
                maxThreshold: 150,
                isRepCounter: true,
                relaxedIsHigh: true
             },
             {
                id: 'rightRowAngle',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'], // Generic points
                minThreshold: 90,
                maxThreshold: 150,
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
    tips: ["Pull with your back, not your biceps.", "Engage your core and keep your back straight.", "Eyes focused slightly ahead on the floor.", "Chest up, back flat."],
    muscleGroups: ["Back"]
}; 