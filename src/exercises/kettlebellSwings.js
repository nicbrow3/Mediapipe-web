// src/exercises/kettlebellSwings.js
// Placeholder for Kettlebell Swings exercise configuration
// Now uses pluggable logic system

// Import logic functions
import { calculateAngle } from '../logic/landmarkUtils.js';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const kettlebellSwings = {
    // --- Basic Info ---
    id: 'kettlebellSwings',
    name: 'Kettlebell Swings',
    isTwoSided: false, // Performed on both sides
    hasWeight: false, // Typically bodyweight exercise, but can be with weights

    // --- Visibility Strictness Option ---
    requireAllLandmarksVisible: false,

    // --- Landmark Requirements ---
    landmarks: {
        left: {
            primary: ['left_hip', 'left_shoulder', 'left_wrist'],
            secondary: ['left_shoulder']
        }
    },

    // --- Stationary Landmarks ---
    stationaryLandmarks: ['left_ankle'],

    // --- Starting Position Requirements ---
    startPosition: {
        description: "",
        requiredAngles: [
            {
                id: 'leftShoulderStart',
                side: 'left',
                points: ['hip', 'shoulder', 'wrist'],
                targetAngle: 30, // Kettlebell should be resting below the shoulder straight down.
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
                id: 'leftShoulderAngle',
                side: 'left',
                points: ['hip', 'shoulder', 'wrist'],
                minThreshold: 30, // Minimum angle for a valid rep
                maxThreshold: 80, // Maximum angle for a valid rep
                isRepCounter: true,
                relaxedIsHigh: false // Lower angle indicates a rep
            },
        ],
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "",
    tips: ["Snap your hips forward.", "Squeeze your glutes at the top.", "Keep your back straight.", "Loose arms, tight core.", "Exhale on the upswing."
],
    muscleGroups: ["Glutes", "Hamstrings", "Back"]
};
