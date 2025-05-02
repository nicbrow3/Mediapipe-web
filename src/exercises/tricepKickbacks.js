// Configuration for Tricep Kickbacks exercise

// Import logic functions
import { calculateAngle } from '../logic/landmarkUtils';
import { angleBasedRepLogic } from '../logic/angleBasedRepLogic';

export const tricepKickbacks = {
    // --- Basic Info ---
    id: 'tricep-kickbacks',
    name: 'Tricep Kickbacks',
    isTwoSided: true,
    hasWeight: true,

    // --- Landmark Requirements ---
    landmarks: {
        left: {
            primary: ['left_shoulder', 'left_elbow', 'left_wrist'],
            secondary: ['left_hip', 'left_knee']
        },
        right: {
            primary: ['right_shoulder', 'right_elbow', 'right_wrist'],
            secondary: ['right_hip', 'right_knee']
        }
    },

    // --- Starting Position Requirements ---
    startPosition: {
        description: "Bend forward slightly with upper arms parallel to floor, elbows bent at 90 degrees.",
        requiredAngles: [
            {
                id: 'leftElbowStart',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 90,
                tolerance: 15
            },
            {
                id: 'rightElbowStart',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                targetAngle: 90,
                tolerance: 15
            },
            {
                id: 'leftArmPosition',
                side: 'left',
                points: ['hip', 'shoulder', 'elbow'],
                targetAngle: 0,  // Parallel to floor
                tolerance: 20
            },
            {
                id: 'rightArmPosition',
                side: 'right',
                points: ['hip', 'shoulder', 'elbow'],
                targetAngle: 0,  // Parallel to floor
                tolerance: 20
            }
        ],
        readyPositionHoldTime: 1.5
    },

    // --- Repetition Logic Configuration ---
    logicConfig: {
        type: 'angle',
        anglesToTrack: [
             {
                id: 'leftElbowExtensionAngle',
                side: 'left',
                points: ['shoulder', 'elbow', 'wrist'],
                minThreshold: 90,
                maxThreshold: 170,
                isRepCounter: true,
                relaxedIsHigh: false // relaxed at 90º (high is 170º)
             },
             {
                id: 'rightElbowExtensionAngle',
                side: 'right',
                points: ['shoulder', 'elbow', 'wrist'],
                minThreshold: 90,
                maxThreshold: 170,
                isRepCounter: true,
                relaxedIsHigh: false // relaxed at 90º (high is 170º)
             }
        ],
        pipeline: [angleBasedRepLogic],
        utilityFunctions: {
            calculateAngle,
        }
    },

    // --- Optional Metadata ---
    instructions: "Keep your upper arms parallel to the floor. Focus on extending your forearms backward using only your triceps.",
    muscleGroups: ["Triceps"]
}; 