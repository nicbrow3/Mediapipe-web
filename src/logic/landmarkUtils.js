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
    // TODO: Implement the actual angle calculation
    // Consider visibility/presence of points
    if (!p1 || !p2 || !p3) {
        return null; // Cannot calculate if points are missing
    }
    console.log('[calculateAngle] Called with:', { p1, p2, p3 });
    // Basic 2D angle calculation (ignoring Z for simplicity in placeholder)
    const angleRad = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angleDeg = angleRad * (180 / Math.PI);
    angleDeg = Math.abs(angleDeg);
    if (angleDeg > 180) {
        angleDeg = 360 - angleDeg;
    }
    return angleDeg;
}

/**
 * Placeholder function to calculate the distance between two points.
 * @param {object} p1 - First point {x, y, z, visibility}
 * @param {object} p2 - Second point {x, y, z, visibility}
 * @returns {number | null} Distance, or null if points are missing.
 */
export function getDistance(p1, p2) {
    // TODO: Implement actual distance calculation (consider 2D or 3D)
    if (!p1 || !p2) {
        return null;
    }
    console.log('[getDistance] Called with:', { p1, p2 });
    // Basic 2D distance
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Add other utility functions as needed (e.g., finding midpoint, mapping landmarks) 