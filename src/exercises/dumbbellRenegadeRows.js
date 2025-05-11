// src/exercises/dumbbellRenegadeRows.js
// Placeholder for Dumbbell Renegade Rows exercise configuration
// Now uses pluggable logic system

// Import logic functions
import { calculateAngle } from '../logic/landmarkUtils.js';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const dumbbellRenegadeRows = {
    // --- Basic Info ---
    id: 'dumbbell-renegade-rows',
    name: 'Dumbbell Renegade Rows',
    isTwoSided: true, // Performed on both sides
    hasWeight: true, // Requires dumbbells

    // --- Visibility Strictness Option ---
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
        description: "Start in a high plank position with your hands gripping the dumbbells, shoulder-width apart.",
        requiredAngles: [
            {
                id: 'leftElbowStart',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 180, // Elbow should be straight
                tolerance: 15
            },
            {
                id: 'rightElbowStart',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 180, // Elbow should be straight
                tolerance: 15
            }
        ],
        readyPositionHoldTime: 1.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
            {
                id: 'leftElbowRowAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'],
                minThreshold: 30, // Minimum angle for a valid rep
                maxThreshold: 150, // Maximum angle for a valid rep
                isRepCounter: true,
                relaxedIsHigh: false // Lower angle indicates a rep
            },
            {
                id: 'rightElbowRowAngle',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                minThreshold: 30, // Minimum angle for a valid rep
                maxThreshold: 150, // Maximum angle for a valid rep
                isRepCounter: true,
                relaxedIsHigh: false // Lower angle indicates a rep
            }
        ],
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your core tight and hips square to the floor while rowing the dumbbell towards your chest.",
    muscleGroups: ["Back", "Shoulders", "Core"]
};
