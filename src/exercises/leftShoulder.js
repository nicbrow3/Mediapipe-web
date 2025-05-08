// Placeholder for Bicep Curls exercise configuration
// Based on Architecture Guide.md

// Import logic functions
import { calculateAngle } from '../logic/landmarkUtils';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic.js';

export const leftShoulder = {
    // --- Basic Info ---
    id: 'left-shoulder',
    name: 'Left Shoulder test',
    isTwoSided: false,
    hasWeight: true,

    // --- Landmark Requirements ---
    landmarks: {
        primary: ['left_shoulder', 'nose'],
        secondary: ['right_shoulder']
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: "Stand tall, arms fully extended downwards by your sides.",
        requiredAngles: [
            {
                id: 'leftShoulderAbductionStart',
                side: 'left',
                points: ['hip', 'shoulder', 'elbow'],
                targetAngle: 15,
                tolerance: 10
            },
        ],
        readyPositionHoldTime: 1.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
             {
                // Let's assume we want to track shoulder abduction for the rep
                id: 'leftShoulderAbductionRep',
                side: 'left',
                points: ['hip', 'shoulder', 'elbow'], // Angle of arm relative to body
                minThreshold: 50,  // Arm slightly raised
                maxThreshold: 90, // Arm parallel to ground (adjust as needed)
                isRepCounter: true,
                relaxedIsHigh: false
             }
        ],
        // Assign the actual logic functions
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle: calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your elbows tucked in. Control the movement.",
    muscleGroups: ["Biceps", "Forearms"]
}; 