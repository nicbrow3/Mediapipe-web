/**
 * Placeholder for Landmark Utilities
 * Contains helper functions for geometry calculations based on MediaPipe landmarks.
 */

/**
 * Placeholder function to calculate the angle between three points.
 * @param {object} p1 - First point {x, y, z, visibility}
 * @param {object} p2 - Second point (vertex) {x, y, z, visibility}
 * @param {object} p3 - Third point {x, y, z, visibility}
 * @returns {number | null} Angle in degrees, or null if calculation is not possible.
 */
export function calculateAngle(p1, p2, p3) {
    // Robust 2D angle calculation using the dot product formula
    if (!p1 || !p2 || !p3) {
        return null; // Cannot calculate if points are missing
    }
    // Vectors from p2 to p1 and p2 to p3
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    if (mag1 === 0 || mag2 === 0) return null; // Avoid division by zero
    let angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))); // Clamp for safety
    let angleDeg = angleRad * (180 / Math.PI);
    return angleDeg; // Always in [0, 180]
}

/**
 * Calculates the 2D Euclidean distance between two points (ignores z).
 * @param {object} p1 - First point {x, y, z, visibility}
 * @param {object} p2 - Second point {x, y, z, visibility}
 * @returns {number | null} 2D distance, or null if points are missing.
 */
export function getDistance2D(p1, p2) {
    if (!p1 || !p2) {
        return null;
    }
    // 2D distance (x, y)
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Calculates the 3D Euclidean distance between two points.
 * @param {object} p1 - First point {x, y, z, visibility}
 * @param {object} p2 - Second point {x, y, z, visibility}
 * @returns {number | null} 3D distance, or null if points are missing.
 */
export function getDistance3D(p1, p2) {
    if (!p1 || !p2) {
        return null;
    }
    // 3D distance (x, y, z)
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow((p1.z || 0) - (p2.z || 0), 2)
    );
}

// MediaPipe Pose landmarks mapping (name to index)
export const LANDMARK_MAP = {
  nose: 0,
  left_eye_inner: 1,
  left_eye: 2,
  left_eye_outer: 3,
  right_eye_inner: 4,
  right_eye: 5,
  right_eye_outer: 6,
  left_ear: 7,
  right_ear: 8,
  mouth_left: 9,
  mouth_right: 10,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_pinky: 17,
  right_pinky: 18,
  left_index: 19,
  right_index: 20,
  left_thumb: 21,
  right_thumb: 22,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
  left_heel: 29,
  right_heel: 30,
  left_foot_index: 31,
  right_foot_index: 32
};

// MediaPipe Pose connections (for drawing skeleton, etc.)
export const POSE_CONNECTIONS = [
  // Torso
  [11, 12], // shoulders
  [11, 23], // left shoulder to left hip
  [12, 24], // right shoulder to right hip
  [23, 24], // hips

  // Left arm
  [11, 13], // left shoulder to left elbow
  [13, 15], // left elbow to left wrist

  // Right arm
  [12, 14], // right shoulder to right elbow
  [14, 16], // right elbow to right wrist

  // Left leg
  [23, 25], // left hip to left knee
  [25, 27], // left knee to left ankle

  // Right leg
  [24, 26], // right hip to right knee
  [26, 28], // right knee to right ankle
];

// Add other utility functions as needed (e.g., finding midpoint, mapping landmarks) 