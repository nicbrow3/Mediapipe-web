// src/exercises/squats.js
// Placeholder for Squats exercise configuration
// Now uses pluggable logic system

// Import logic functions
import { calculateAngle } from '../logic/landmarkUtils';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const squats = {
    // --- Basic Info ---
    id: 'squats',
    name: 'Squats',
    isTwoSided: false, // Performed on both sides
    hasWeight: false, // Typically bodyweight exercise, but can be with weights

    // --- Visibility Strictness Option ---
    requireAllLandmarksVisible: false,

    // --- Landmark Requirements ---
    landmarks: {
        left: {
            primary: ['left_hip', 'left_knee', 'left_ankle'],
            secondary: ['left_shoulder']
        }
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: "Stand with your feet shoulder-width apart and your toes slightly pointed out.",
        requiredAngles: [
            {
                id: 'leftKneeStart',
                side: 'left',
                points: ['hip', 'knee', 'ankle'],
                targetAngle: 180, // Knee should be straight
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
                id: 'leftKneeSquatAngle',
                side: 'left',
                points: ['hip', 'knee', 'ankle'],
                minThreshold: 90, // Minimum angle for a valid rep
                maxThreshold: 160, // Maximum angle for a valid rep
                isRepCounter: true,
                relaxedIsHigh: true // Lower angle indicates a rep
            }
        ],
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Lower your body as if sitting back into a chair, keeping your chest up and knees behind your toes.",
    tips: ["Imagine sitting into a chair behind you.", "Feet a little wider than hips, toes slightly out.", "Chest up, back straight.", "Control the up and the down of the movement."],
    muscleGroups: ["Quadriceps", "Hamstrings", "Glutes"]
};
