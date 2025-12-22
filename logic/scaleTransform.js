/**
 * MLPA Prototype - Scale Transform Module
 * 
 * MODULE CONTRACT
 * ----------------
 * Responsibility: Pure data transformations for scale objects
 * Inputs: Scale objects (read-only)
 * Outputs: Flat item arrays, counts, new scale objects (immutable updates)
 * Allowed side effects: NONE (pure functions only)
 * Forbidden responsibilities:
 *   - NO DOM access
 *   - NO state mutation
 *   - NO rendering
 *   - NO graph traversal (use scaleGraph.js)
 * Invariants this module guarantees:
 *   - Functions are deterministic
 *   - Input scale is never modified
 *   - Returns FlatItem[] interface for preview
 *   - updateItemText returns NEW scale object
 */

// ============================================================================
// SCALE TRANSFORMATION (PURE FUNCTIONS)
// ============================================================================

/**
 * Flatten a scale's dimensions into a flat array of items.
 * Each item gets the dimension name attached.
 * 
 * CONTRACT: Returns FlatItem[] interface as defined in stateManager.js
 * 
 * @param {Scale} scale - Scale object with dimensions
 * @returns {FlatItem[]} Flat array of items with dimension names
 */
function flattenScaleItems(scale) {
    const items = [];

    if (!scale || !Array.isArray(scale.dimensions)) {
        return items;
    }

    scale.dimensions.forEach(dim => {
        if (Array.isArray(dim.items)) {
            dim.items.forEach(item => {
                items.push({
                    ...item,
                    dimension: dim.name
                });
            });
        }
    });

    return items;
}

/**
 * Count total items in a scale.
 * 
 * @param {Scale} scale - Scale object
 * @returns {number} Total item count
 */
function countScaleItems(scale) {
    if (!scale || !Array.isArray(scale.dimensions)) {
        return 0;
    }

    return scale.dimensions.reduce((total, dim) => {
        return total + (Array.isArray(dim.items) ? dim.items.length : 0);
    }, 0);
}

/**
 * Get dimension names from a scale.
 * 
 * @param {Scale} scale - Scale object
 * @returns {string[]} Array of dimension names
 */
function getDimensionNames(scale) {
    if (!scale || !Array.isArray(scale.dimensions)) {
        return [];
    }

    return scale.dimensions.map(dim => dim.name);
}

/**
 * Find an item by ID within a scale.
 * 
 * @param {Scale} scale - Scale object
 * @param {string} itemId - Item ID to find
 * @returns {{ item: Item, dimensionName: string } | null} Found item with dimension, or null
 */
function findItemInScale(scale, itemId) {
    if (!scale || !Array.isArray(scale.dimensions)) {
        return null;
    }

    for (const dim of scale.dimensions) {
        if (Array.isArray(dim.items)) {
            for (const item of dim.items) {
                if (item.item_id === itemId) {
                    return { item, dimensionName: dim.name };
                }
            }
        }
    }

    return null;
}

/**
 * Update an item's text within a scale (returns new scale, does not mutate).
 * 
 * @param {Scale} scale - Scale object
 * @param {string} itemId - Item ID to update
 * @param {string} newText - New text value
 * @returns {Scale} New scale object with updated item
 */
function updateItemText(scale, itemId, newText) {
    if (!scale || !Array.isArray(scale.dimensions)) {
        return scale;
    }

    return {
        ...scale,
        dimensions: scale.dimensions.map(dim => ({
            ...dim,
            items: (dim.items || []).map(item =>
                item.item_id === itemId
                    ? { ...item, text: newText }
                    : item
            )
        }))
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ScaleTransform = {
        flattenScaleItems,
        countScaleItems,
        getDimensionNames,
        findItemInScale,
        updateItemText
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        flattenScaleItems,
        countScaleItems,
        getDimensionNames,
        findItemInScale,
        updateItemText
    };
}
