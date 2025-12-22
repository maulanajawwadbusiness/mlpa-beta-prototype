/**
 * MLPA Prototype - Connection Geometry Module
 * 
 * Pure, deterministic SVG path calculations for flow connections.
 * NO DOM access. NO state mutation. Pure functions only.
 */

// ============================================================================
// BEZIER PATH GENERATION (PURE FUNCTION)
// ============================================================================

/**
 * Create a cubic bezier SVG path string between two points.
 * Uses horizontal control points for smooth flow-style curves.
 * 
 * @param {number} px - Parent X coordinate (right edge of parent box)
 * @param {number} py - Parent Y coordinate (vertical center of parent box)
 * @param {number} cx - Child X coordinate (left edge of child box)
 * @param {number} cy - Child Y coordinate (vertical center of child box)
 * @returns {string} SVG path d attribute value
 */
function createBezierPath(px, py, cx, cy) {
    // Simple cubic bezier: horizontal control points
    const dx = cx - px;
    const c1x = px + dx * 0.4;
    const c1y = py;
    const c2x = cx - dx * 0.4;
    const c2y = cy;

    return `M ${px} ${py} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cx} ${cy}`;
}

/**
 * Calculate connection endpoints from parent and child positions.
 * This is a coordinate helper - still a pure function.
 * 
 * @param {Object} parentPos - { x, y } world position of parent scale
 * @param {Object} childPos - { x, y } world position of child scale
 * @param {Object} parentSize - { width, height } dimensions of parent box
 * @param {Object} childSize - { width, height } dimensions of child box
 * @returns {{ px: number, py: number, cx: number, cy: number }}
 */
function calculateConnectionEndpoints(parentPos, childPos, parentSize, childSize) {
    return {
        px: parentPos.x + parentSize.width,           // Right edge of parent
        py: parentPos.y + parentSize.height / 2,      // Vertical center of parent
        cx: childPos.x,                               // Left edge of child
        cy: childPos.y + childSize.height / 2         // Vertical center of child
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Browser global export
if (typeof window !== 'undefined') {
    window.ConnectionGeometry = {
        createBezierPath,
        calculateConnectionEndpoints
    };
}

// CommonJS export (for future module systems)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createBezierPath,
        calculateConnectionEndpoints
    };
}
