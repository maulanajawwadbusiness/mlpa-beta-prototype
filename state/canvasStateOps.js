/**
 * MLPA Prototype - Canvas State Operations
 * 
 * MODULE CONTRACT
 * ----------------
 * Responsibility: Low-level state mutation helpers
 * Inputs: State objects/fragments, values to set
 * Outputs: None (mutates in place)
 * Allowed side effects: State mutation ONLY
 * Forbidden responsibilities:
 *   - NO DOM access
 *   - NO rendering
 *   - NO business logic
 *   - NO validation (use Invariants module)
 * Invariants this module guarantees:
 *   - Each function mutates exactly one state property
 *   - Functions are atomic (no partial updates)
 *   - Prefer ScaleStore for scale mutations (higher-level)
 * 
 * NOTE: Consider using ScaleStore.js for scale operations instead.
 * This module is lower-level and may be deprecated.
 */

// ============================================================================
// CANVAS STATE OPERATIONS
// ============================================================================

/**
 * Add a scale to the scales Map.
 * 
 * @param {Map<string, Scale>} scales - Scales Map
 * @param {Scale} scale - Scale to add
 */
function addScale(scales, scale) {
    if (!scale || !scale.scale_id) {
        console.warn('[CanvasStateOps] Cannot add scale without scale_id');
        return;
    }
    scales.set(scale.scale_id, scale);
}

/**
 * Remove multiple scales from the scales Map.
 * 
 * @param {Map<string, Scale>} scales - Scales Map
 * @param {Set<string>|Array<string>} scaleIds - IDs to remove
 */
function removeScales(scales, scaleIds) {
    const ids = scaleIds instanceof Set ? scaleIds : new Set(scaleIds);
    ids.forEach(id => scales.delete(id));
}

/**
 * Set the active scale ID.
 * 
 * @param {Object} canvasState - Canvas state object
 * @param {string|null} scaleId - Scale ID to activate
 */
function setActiveScale(canvasState, scaleId) {
    canvasState.activeScaleId = scaleId;
}

/**
 * Clear active scale if it was deleted.
 * 
 * @param {Object} canvasState - Canvas state object
 * @param {Set<string>|Array<string>} deletedIds - Deleted scale IDs
 */
function clearActiveScaleIfDeleted(canvasState, deletedIds) {
    const ids = deletedIds instanceof Set ? deletedIds : new Set(deletedIds);
    if (canvasState.activeScaleId && ids.has(canvasState.activeScaleId)) {
        canvasState.activeScaleId = null;
    }
}

/**
 * Set branching state when opening popup.
 * 
 * @param {Object} canvasState - Canvas state object
 * @param {string} scaleId - Scale being branched from
 */
function setBranchingFrom(canvasState, scaleId) {
    canvasState.branchingFromScaleId = scaleId;
}

/**
 * Clear branching state when closing popup.
 * 
 * @param {Object} canvasState - Canvas state object
 */
function clearBranchingFrom(canvasState) {
    canvasState.branchingFromScaleId = null;
}

/**
 * Set branching lock.
 * 
 * @param {Object} canvasState - Canvas state object
 * @param {boolean} inProgress - Lock state
 */
function setBranchingInProgress(canvasState, inProgress) {
    canvasState.isBranchingInProgress = inProgress;
}

// ============================================================================
// PREVIEW STATE OPERATIONS
// ============================================================================

/**
 * Set the preview scale and items.
 * 
 * @param {Object} state - Full state object
 * @param {string} scaleId - Selected scale ID
 * @param {FlatItem[]} items - Flattened items
 */
function setPreviewScale(state, scaleId, items) {
    state.selectedScaleId = scaleId;
    state.items = items;
}

/**
 * Reset preview/questionnaire state.
 * 
 * @param {Object} state - Full state object
 */
function resetPreviewState(state) {
    state.currentItemIndex = 0;
    state.answers = {};
    state.isCompleted = false;
}

/**
 * Update current item index.
 * 
 * @param {Object} state - Full state object
 * @param {number} index - New index
 */
function setCurrentItemIndex(state, index) {
    state.currentItemIndex = index;
}

/**
 * Record an answer.
 * 
 * @param {Object} state - Full state object
 * @param {number} itemIndex - Item index
 * @param {number} value - Answer value (1-5)
 */
function setAnswer(state, itemIndex, value) {
    state.answers[itemIndex] = value;
}

/**
 * Mark questionnaire as completed.
 * 
 * @param {Object} state - Full state object
 */
function setCompleted(state) {
    state.isCompleted = true;
}

// ============================================================================
// UI STATE OPERATIONS
// ============================================================================

/**
 * Set current screen.
 * 
 * @param {Object} state - Full state object
 * @param {number} screen - Screen number
 */
function setCurrentScreen(state, screen) {
    state.currentScreen = screen;
}

/**
 * Set app active state.
 * 
 * @param {Object} state - Full state object
 * @param {boolean} active - Active state
 */
function setAppActive(state, active) {
    state.appActive = active;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.CanvasStateOps = {
        // Canvas
        addScale,
        removeScales,
        setActiveScale,
        clearActiveScaleIfDeleted,
        setBranchingFrom,
        clearBranchingFrom,
        setBranchingInProgress,

        // Preview
        setPreviewScale,
        resetPreviewState,
        setCurrentItemIndex,
        setAnswer,
        setCompleted,

        // UI
        setCurrentScreen,
        setAppActive
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addScale,
        removeScales,
        setActiveScale,
        clearActiveScaleIfDeleted,
        setBranchingFrom,
        clearBranchingFrom,
        setBranchingInProgress,
        setPreviewScale,
        resetPreviewState,
        setCurrentItemIndex,
        setAnswer,
        setCompleted,
        setCurrentScreen,
        setAppActive
    };
}
