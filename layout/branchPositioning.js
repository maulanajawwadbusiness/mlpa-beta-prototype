/**
 * MLPA Prototype - Branch Positioning Module
 * 
 * MODULE CONTRACT
 * ----------------
 * Responsibility: Deterministic position calculation for branched scales
 * Inputs: Parent scale position/depth, branch_index
 * Outputs: { x, y, depth, branch_index } position object
 * Allowed side effects: NONE (pure functions only)
 * Forbidden responsibilities:
 *   - NO DOM access
 *   - NO state mutation
 *   - NO rendering
 *   - NO sibling scanning
 * Invariants this module guarantees:
 *   - Position is derived ONLY from branch_index
 *   - Symmetric alternating layout (up, down, further up, further down)
 *   - Same inputs always produce same outputs
 *   - LAYOUT_CONSTANTS are frozen and tested
 */

// ============================================================================
// LAYOUT CONSTANTS (LOCKED)
// ============================================================================
// These constants define the symmetric alternating layout.
// Tested and verified stable. Do not modify without running layout tests.

const LAYOUT_CONSTANTS = {
  HORIZONTAL_STEP: 550,     // Horizontal step per generation
  VERTICAL_GAP: 24,         // Gap between sibling scales
  ESTIMATED_HEIGHT: 180,    // Fixed estimated flowbox height
  get ROW_HEIGHT() {
    return this.ESTIMATED_HEIGHT + this.VERTICAL_GAP;  // 204
  }
};

// ============================================================================
// BRANCH POSITIONING (PURE FUNCTION)
// ============================================================================
// Invariant: Position is computed from branch_index only (no DOM reads, no sibling scan)
// Layout: Symmetric alternating around parent Y (up, down, further up, further down)
//
// Key Invariants:
// 1. Positions are computed from branch_index, not DOM or sibling count
// 2. Branched scales have positionLocked=true to prevent auto-repositioning
// 3. renderAll() never mutates positions of locked scales
// 4. Layout is position-driven, not iteration-order dependent
// 5. Child positions are absolute snapshots, not relative to parent

/**
 * Calculate position for a new branch scale.
 * 
 * @param {Object} parentScale - The parent scale object (must have position and depth)
 * @param {number} branch_index - Index of this branch among siblings (0, 1, 2, ...)
 * @param {Object} [constants] - Optional override for layout constants
 * @returns {{ x: number, y: number, branch_index: number, depth: number }}
 */
function getNextBranchPosition(parentScale, branch_index, constants = LAYOUT_CONSTANTS) {
  // Fallback for missing parent
  if (!parentScale || !parentScale.position) {
    return { x: 100, y: 100, branch_index: 0, depth: 1 };
  }

  const { HORIZONTAL_STEP, ROW_HEIGHT } = constants;

  // Depth-based horizontal positioning (constant step per generation)
  const depth = (parentScale.depth || 0) + 1;
  const baseX = parentScale.position.x + HORIZONTAL_STEP;

  // Symmetric alternating: layer + direction derived from branch_index
  // Truth table:
  // index 0: y = parent.y - 204  (up)
  // index 1: y = parent.y + 204  (down)
  // index 2: y = parent.y - 408  (further up)
  // index 3: y = parent.y + 408  (further down)
  const layer = Math.floor(branch_index / 2) + 1;
  const direction = 2 * (branch_index % 2) - 1;  // -1 for even (up), +1 for odd (down)
  const baseY = parentScale.position.y + (direction * layer * ROW_HEIGHT);

  return {
    x: baseX,
    y: baseY,
    branch_index: branch_index,
    depth: depth
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

// Browser global export
if (typeof window !== 'undefined') {
  window.BranchPositioning = {
    getNextBranchPosition,
    LAYOUT_CONSTANTS
  };
}

// CommonJS export (for future module systems)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getNextBranchPosition,
    LAYOUT_CONSTANTS
  };
}
