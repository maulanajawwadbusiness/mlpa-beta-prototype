/**
 * MLPA Prototype - Connection Renderer
 * 
 * Renders SVG connections between flow boxes.
 * Accepts DOM elements and state, performs DOM mutations.
 */

// ============================================================================
// CONNECTION RENDERING
// ============================================================================

/**
 * Build connection path data for a parent-child relationship.
 * Returns path info but does NOT mutate DOM.
 * 
 * @param {Element} parentEl - Parent flow box element
 * @param {Element} childEl - Child flow box element
 * @param {DOMRect} canvasRect - Canvas bounding rect
 * @param {{x: number, y: number}} pan - Current pan offset
 * @returns {{ path: string } | null} Path data or null if cannot calculate
 */
function buildConnectionPath(parentEl, childEl, canvasRect, pan) {
    if (!parentEl || !childEl || !canvasRect) return null;

    const parentRect = parentEl.getBoundingClientRect();
    const childRect = childEl.getBoundingClientRect();

    // Convert to world space (subtract canvas offset and pan)
    const px = parentRect.right - canvasRect.left - pan.x;
    const py = parentRect.top + parentRect.height / 2 - canvasRect.top - pan.y;
    const cx = childRect.left - canvasRect.left - pan.x;
    const cy = childRect.top + childRect.height / 2 - canvasRect.top - pan.y;

    // Use ConnectionGeometry for path calculation
    const path = window.ConnectionGeometry
        ? window.ConnectionGeometry.createBezierPath(px, py, cx, cy)
        : createBezierPathFallback(px, py, cx, cy);

    return { path, px, py, cx, cy };
}

/**
 * Fallback bezier path calculation.
 * @private
 */
function createBezierPathFallback(px, py, cx, cy) {
    const dx = cx - px;
    const c1x = px + dx * 0.4;
    const c1y = py;
    const c2x = cx - dx * 0.4;
    const c2y = cy;
    return `M ${px} ${py} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cx} ${cy}`;
}

/**
 * Create SVG path element HTML.
 * 
 * @param {string} pathD - SVG path d attribute
 * @returns {string} SVG path element HTML
 */
function createConnectionPathHtml(pathD) {
    return `<path class="flow-connection-line" d="${pathD}" />`;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ConnectionRenderer = {
        buildConnectionPath,
        createConnectionPathHtml
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildConnectionPath,
        createConnectionPathHtml
    };
}
