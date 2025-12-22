/**
 * MLPA Prototype - Scale Graph Module
 * 
 * MODULE CONTRACT
 * ----------------
 * Responsibility: Pure graph traversal and relationship queries for scales
 * Inputs: Scales Map (read-only), scale IDs
 * Outputs: Arrays of IDs, Sets, tree structures, boolean checks
 * Allowed side effects: NONE (pure functions only)
 * Forbidden responsibilities:
 *   - NO DOM access
 *   - NO state mutation
 *   - NO rendering
 *   - NO layout calculation
 * Invariants this module guarantees:
 *   - Functions are deterministic
 *   - Input scales Map is never modified
 *   - Output is always safe to use (empty arrays, not null)
 */

// ============================================================================
// GRAPH TRAVERSAL (PURE FUNCTIONS)
// ============================================================================

/**
 * Build a tree structure from parent_scale_id relationships.
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @returns {Map<string, string[]>} Map of parent_scale_id → [child_scale_ids]
 */
function buildScaleTree(scales) {
    const tree = new Map();

    for (const [id, scale] of scales) {
        if (scale.parent_scale_id) {
            if (!tree.has(scale.parent_scale_id)) {
                tree.set(scale.parent_scale_id, []);
            }
            tree.get(scale.parent_scale_id).push(id);
        }
    }

    return tree;
}

/**
 * Get direct children of a scale.
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @param {string} parentId - Parent scale ID
 * @returns {string[]} Array of child scale IDs
 */
function getChildren(scales, parentId) {
    const children = [];

    for (const [id, scale] of scales) {
        if (scale.parent_scale_id === parentId) {
            children.push(id);
        }
    }

    return children;
}

/**
 * Get all descendants of a scale (recursive).
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @param {string} rootId - Root scale ID to start from
 * @returns {string[]} Array of all descendant scale IDs
 */
function getDescendants(scales, rootId) {
    const descendants = [];
    const queue = [rootId];

    while (queue.length > 0) {
        const currentId = queue.shift();
        const children = getChildren(scales, currentId);

        for (const childId of children) {
            descendants.push(childId);
            queue.push(childId);
        }
    }

    return descendants;
}

/**
 * Build Set of all scale IDs to delete when deleting a target scale.
 * Includes the target and all descendants.
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @param {string} targetId - Scale ID to delete
 * @returns {Set<string>} Set of scale IDs to delete
 */
function buildCascadeDeleteSet(scales, targetId) {
    const toDelete = new Set([targetId]);

    // Iterative broad-phase approach
    // Scans all scales to find children whose parent_scale_id is in deletion set
    // Repeats until no new children found
    let modified = true;
    while (modified) {
        modified = false;
        for (const [sId, s] of scales) {
            if (!toDelete.has(sId) && s.parent_scale_id && toDelete.has(s.parent_scale_id)) {
                toDelete.add(sId);
                modified = true;
            }
        }
    }

    return toDelete;
}

/**
 * Count branches of a parent scale.
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @param {string} parentId - Parent scale ID
 * @param {string} [idPrefix] - Optional prefix to filter by
 * @returns {number} Number of branches
 */
function countBranches(scales, parentId, idPrefix = null) {
    let count = 0;

    for (const [id, scale] of scales) {
        if (scale.parent_scale_id === parentId) {
            if (!idPrefix || id.startsWith(idPrefix)) {
                count++;
            }
        }
    }

    return count;
}

/**
 * Find root scale(s) in the graph.
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @returns {string[]} Array of root scale IDs
 */
function findRoots(scales) {
    const roots = [];

    for (const [id, scale] of scales) {
        if (scale.is_root || !scale.parent_scale_id) {
            roots.push(id);
        }
    }

    return roots;
}

/**
 * Check if a scale is a root scale.
 * 
 * @param {Scale} scale - Scale object
 * @returns {boolean} True if root
 */
function isRoot(scale) {
    return !!(scale && (scale.is_root || !scale.parent_scale_id));
}

/**
 * Get the root scale (first root if multiple exist).
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @returns {Scale|null} Root scale object or null
 */
function getRootScale(scales) {
    for (const [id, scale] of scales) {
        if (scale.is_root || !scale.parent_scale_id) {
            return scale;
        }
    }
    return null;
}

/**
 * Get siblings of a scale (same parent).
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @param {string} scaleId - Scale ID to find siblings for
 * @returns {string[]} Array of sibling scale IDs (excludes self)
 */
function getSiblings(scales, scaleId) {
    const scale = scales.get(scaleId);
    if (!scale || !scale.parent_scale_id) {
        return [];  // Root has no siblings
    }

    const siblings = [];
    for (const [id, s] of scales) {
        if (id !== scaleId && s.parent_scale_id === scale.parent_scale_id) {
            siblings.push(id);
        }
    }
    return siblings;
}

/**
 * Get parent scale of a given scale.
 * 
 * @param {Map<string, Scale>} scales - Map of scale_id → Scale
 * @param {string} scaleId - Child scale ID
 * @returns {Scale|null} Parent scale or null if root
 */
function getParent(scales, scaleId) {
    const scale = scales.get(scaleId);
    if (!scale || !scale.parent_scale_id) {
        return null;
    }
    return scales.get(scale.parent_scale_id) || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ScaleGraph = {
        buildScaleTree,
        getChildren,
        getDescendants,
        buildCascadeDeleteSet,
        countBranches,
        findRoots,
        isRoot,
        getRootScale,
        getSiblings,
        getParent
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildScaleTree,
        getChildren,
        getDescendants,
        buildCascadeDeleteSet,
        countBranches,
        findRoots,
        isRoot,
        getRootScale,
        getSiblings,
        getParent
    };
}

