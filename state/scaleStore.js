/**
 * MODULE CONTRACT
 * ----------------
 * Responsibility: Centralized scale state mutations with invariant enforcement
 * Inputs: Scale objects, scale IDs
 * Outputs: Updated scales Map (via internal reference)
 * Allowed side effects: State mutation (the ONLY place scales should be mutated)
 * Forbidden responsibilities: NO rendering, NO DOM, NO layout calculation
 * Invariants this module guarantees:
 *   - All scales pass validation before insertion
 *   - Cascade deletes are atomic
 *   - No partial state updates
 *   - Future hooks for undo/redo, persistence, minimap
 */

// ============================================================================
// SCALE STORE
// ============================================================================
// This is the SINGLE source of truth for scale mutations.
// Direct access to state.canvasState.scales should be avoided outside this module.

const ScaleStore = (function () {
    'use strict';

    // Reference to the actual scales Map (set during init)
    let _scales = null;
    let _canvasState = null;

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize store with reference to canvas state.
     * 
     * @param {Object} canvasState - Canvas state object containing scales Map
     */
    function init(canvasState) {
        _canvasState = canvasState;
        _scales = canvasState.scales;
    }

    // ============================================================================
    // READ OPERATIONS
    // ============================================================================

    /**
     * Get a scale by ID.
     * 
     * @param {string} scaleId - Scale ID
     * @returns {Scale|undefined}
     */
    function getScale(scaleId) {
        return _scales?.get(scaleId);
    }

    /**
     * Get all scales.
     * 
     * @returns {Map<string, Scale>}
     */
    function getAllScales() {
        return _scales;
    }

    /**
     * Check if scale exists.
     * 
     * @param {string} scaleId - Scale ID
     * @returns {boolean}
     */
    function hasScale(scaleId) {
        return _scales?.has(scaleId) ?? false;
    }

    /**
     * Get scales count.
     * 
     * @returns {number}
     */
    function getCount() {
        return _scales?.size ?? 0;
    }

    // ============================================================================
    // WRITE OPERATIONS (Centralized)
    // ============================================================================

    /**
     * Add a scale to the store.
     * Validates scale before insertion.
     * 
     * @param {Scale} scale - Scale to add
     * @returns {boolean} Success
     */
    function addScale(scale) {
        if (!_scales) {
            console.error('[ScaleStore] Not initialized');
            return false;
        }

        // Validate invariants (DEV only)
        if (window.Invariants) {
            window.Invariants.validateScale(scale);
            if (!scale.is_root) {
                window.Invariants.validateBranchedScale(scale);
            }
        }

        // future: hook undo snapshot here
        // future: hook persistence here

        _scales.set(scale.scale_id, scale);

        // future: hook minimap update here

        return true;
    }

    /**
     * Remove a single scale.
     * 
     * @param {string} scaleId - Scale ID to remove
     * @returns {boolean} Success
     */
    function removeScale(scaleId) {
        if (!_scales) return false;

        // future: hook undo snapshot here

        const deleted = _scales.delete(scaleId);

        // Clear active if deleted
        if (deleted && _canvasState.activeScaleId === scaleId) {
            _canvasState.activeScaleId = null;
        }

        // future: hook persistence here
        // future: hook minimap update here

        return deleted;
    }

    /**
     * Remove multiple scales (cascade delete).
     * Atomic operation - all or nothing.
     * 
     * @param {Set<string>|Array<string>} scaleIds - IDs to remove
     * @returns {number} Count of removed scales
     */
    function removeScalesCascade(scaleIds) {
        if (!_scales) return 0;

        const ids = scaleIds instanceof Set ? scaleIds : new Set(scaleIds);

        // future: hook undo snapshot here (capture all scales before deletion)

        let count = 0;
        ids.forEach(id => {
            if (_scales.delete(id)) {
                count++;
                if (_canvasState.activeScaleId === id) {
                    _canvasState.activeScaleId = null;
                }
            }
        });

        console.log(`[ScaleStore] Removed ${count} scales`);

        // future: hook persistence here
        // future: hook minimap update here

        return count;
    }

    /**
     * Update a scale's properties.
     * 
     * @param {string} scaleId - Scale ID
     * @param {Object} updates - Properties to update
     * @returns {boolean} Success
     */
    function updateScale(scaleId, updates) {
        if (!_scales) return false;

        const scale = _scales.get(scaleId);
        if (!scale) return false;

        // future: hook undo snapshot here

        Object.assign(scale, updates);

        // future: hook persistence here

        return true;
    }

    /**
     * Clear all scales (for testing or reset).
     */
    function clear() {
        if (!_scales) return;

        // future: hook undo snapshot here

        _scales.clear();

        // future: hook persistence here
    }

    // ============================================================================
    // QUERY OPERATIONS (Delegate to ScaleGraph)
    // ============================================================================

    /**
     * Build cascade delete set.
     * Pure query - no mutation.
     */
    function buildCascadeDeleteSet(scaleId) {
        return window.ScaleGraph
            ? window.ScaleGraph.buildCascadeDeleteSet(_scales, scaleId)
            : new Set([scaleId]);
    }

    /**
     * Get children of a scale.
     */
    function getChildren(scaleId) {
        return window.ScaleGraph
            ? window.ScaleGraph.getChildren(_scales, scaleId)
            : [];
    }

    /**
     * Count branches of a scale.
     */
    function countBranches(scaleId) {
        return window.ScaleGraph
            ? window.ScaleGraph.countBranches(_scales, scaleId)
            : 0;
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    return {
        // Lifecycle
        init,

        // Read
        getScale,
        getAllScales,
        hasScale,
        getCount,

        // Write (centralized)
        addScale,
        removeScale,
        removeScalesCascade,
        updateScale,
        clear,

        // Query
        buildCascadeDeleteSet,
        getChildren,
        countBranches
    };
})();

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ScaleStore = ScaleStore;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScaleStore;
}
