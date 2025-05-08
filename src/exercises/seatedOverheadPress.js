// Placeholder for Seated Overhead Press exercise configuration
// Now uses pluggable logic system

// Import logic functions (placeholders for now)
import { calculateAngle } from '../logic/landmarkUtils';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const seatedOverheadPress = {
    // --- Basic Info ---
    id: 'seated-overhead-press',
    name: 'Seated Overhead Press',
    isTwoSided: false,
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
            primary: ['left_shoulder', 'left_elbow', 'left_wrist', 'left_hip'],
            secondary: ['left_hip']
        },
        right: {
            primary: ['right_shoulder', 'right_elbow', 'right_wrist', 'right_hip'],
            secondary: ['right_hip']
        }
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: "Sit on the ground with your back straight and legs extended straight out in front of you, hands holding the dumbbells at shoulder level.",
        requiredAngles: [
            {
                id: 'leftShoulderStart',
                side: 'left',
                points: ['shoulder', 'elbow', 'hip'], // Mapped to MediaPipe names in logic
                targetAngle: 60,
                tolerance: 15
            },
            {
                id: 'rightShoulderStart',
                side: 'right',
                points: ['shoulder', 'elbow', 'hip'],
                targetAngle: 60,
                tolerance: 15
            },
        ],
        readyPositionHoldTime: 2.0
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
             {
                id: 'leftShoulderAbductionAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'hip'], // Generic points
                minThreshold: 75,
                maxThreshold: 150,
                isRepCounter: true,
                relaxedIsHigh: false
             },
             {
                id: 'rightShoulderAbductionAngle',
                side: 'right',
                points: ['shoulder', 'elbow', 'hip'], // Generic points
                minThreshold: 75,
                maxThreshold: 150,
                isRepCounter: true,
                relaxedIsHigh: false
             }
        ],
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your back straight and control the movement.",
    muscleGroups: ["Shoulders", "Traps", "Deltoids"]
}; 