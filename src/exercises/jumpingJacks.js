// Jumping Jacks exercise configuration using position-based rep logic
import { getDistance2D } from '../logic/landmarkUtils';
import { positionBasedRepLogic } from '../logic/positionBasedRepLogic';

export const jumpingJacks = {
  id: 'jumping-jacks',
  name: 'Jumping Jacks',
  isTwoSided: false,
  hasWeight: false,

  requireAllLandmarksVisible: false,

  landmarks: {
    primary: ['left_wrist', 'right_wrist', 'nose', 'left_ankle', 'right_ankle'],
    secondary: ['left_shoulder', 'right_shoulder']
  },

  startPosition: {
    description: 'Stand upright with arms at your sides and feet together.',
    requiredPositions: [
      {
        id: 'handsAtSides',
        points: ['left_wrist', 'left_ankle'],
        maxDistance: 0.25, // Hands near ankles (normalized units)
      },
      {
        id: 'handsAtSides2',
        points: ['right_wrist', 'right_ankle'],
        maxDistance: 0.25,
      },
    ],
    readyPositionHoldTime: 1.0
  },

  logicConfig: {
    type: 'position',
    positionsToTrack: [
      {
        id: 'handsTogetherAboveHead',
        points: ['left_wrist', 'right_wrist'],
        maxDistance: 0.18, // Hands must be close together (normalized units)
        isRepCounter: true
      },
      {
        id: 'handsAboveHead',
        points: ['nose', 'left_wrist'],
        minVertical: -0.10, // y of wrist must be less than y of nose (above head, y axis is down)
        isRepCounter: true
      },
      {
        id: 'handsAboveHead2',
        points: ['nose', 'right_wrist'],
        minVertical: -0.10,
        isRepCounter: true
      }
    ],
    pipeline: [positionBasedRepLogic],
    utilityFunctions: {
      getDistance2D,
    }
  },

  instructions: 'Jump, spreading your legs and raising your arms overhead until your hands touch. Return to start position.',
  muscleGroups: ['Legs', 'Shoulders', 'Cardio']
}; 