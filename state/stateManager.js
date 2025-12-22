/**
 * MLPA Prototype - State Manager
 * 
 * Centralized state definition with clear ownership categories.
 * Each category has documented contracts.
 * 
 * STATE CATEGORIES:
 * 1. Canvas State - Graph of scales, positions, connections
 * 2. Preview State - Questionnaire items, answers, progress
 * 3. UI State - Transient flags (mode, collapsed states)
 */

// ============================================================================
// CONTRACT: SCALE OBJECT SHAPE (FROZEN)
// ============================================================================
/**
 * @typedef {Object} Scale
 * @property {string} scale_id - Unique identifier (e.g., "skala-asli", "skala-asli-branch-1")
 * @property {string} scale_name - Display name (e.g., "Skala Gen-Z - Skala Kepercayaan Diri")
 * @property {string|null} parent_scale_id - Parent scale ID or null for root
 * @property {boolean} is_root - True if this is the root scale
 * @property {boolean} expanded - UI expand/collapse state (default: false)
 * @property {number} depth - Nesting depth (0 for root, 1 for first-gen branches, etc.)
 * @property {number} [branch_index] - Index among siblings (0, 1, 2, ...)
 * @property {{x: number, y: number}} position - Canvas world-space position
 * @property {boolean} [positionLocked] - If true, prevents auto-repositioning on render
 * @property {Dimension[]} dimensions - Array of dimension objects
 */

// ============================================================================
// CONTRACT: DIMENSION OBJECT SHAPE (FROZEN)
// ============================================================================
/**
 * @typedef {Object} Dimension
 * @property {string} name - Dimension name (e.g., "Kepercayaan Diri")
 * @property {Item[]} items - Array of items in this dimension
 */

// ============================================================================
// CONTRACT: ITEM OBJECT SHAPE (FROZEN)
// ============================================================================
/**
 * @typedef {Object} Item
 * @property {string} item_id - Unique item ID (e.g., "skala-asli-branch-1-item-1")
 * @property {string} origin_item_id - Original item ID for lineage tracking
 * @property {string} text - Item text content
 * @property {string[]} baseline_rubric - IMMUTABLE traits from root scale
 * @property {string[]} current_rubric - Current extracted traits (may differ from baseline)
 * @property {string} dimension - Dimension name (denormalized for flat access)
 * @property {string} [rubric_source] - "gpt" | "parent" | "manual"
 */

// ============================================================================
// CONTRACT: FLAT ITEM INTERFACE (FOR PREVIEW)
// ============================================================================
/**
 * @typedef {Object} FlatItem
 * Items flattened from Scale for questionnaire preview.
 * Same shape as Item, with dimension name included.
 * 
 * @property {string} item_id
 * @property {string} origin_item_id
 * @property {string} text
 * @property {string[]} baseline_rubric
 * @property {string[]} current_rubric
 * @property {string} dimension
 */

// ============================================================================
// STATE DEFINITION
// ============================================================================

const StateManager = (function () {
    'use strict';

    // ---------------------------------------------------------------------------
    // CATEGORY 1: CANVAS STATE (Graph of scales)
    // Mutated by: flow editor, branching, delete operations
    // ---------------------------------------------------------------------------
    const canvasState = {
        scales: new Map(),           // scale_id → Scale (CONTRACT: Map<string, Scale>)
        connections: [],             // Visual only, derived from parent_scale_id
        pan: { x: 0, y: 0 },        // Canvas viewport offset
        activeScaleId: null,        // Currently active scale in editor
        branchingFromScaleId: null, // Scale being branched (during popup)
        isBranchingInProgress: false // Lock to prevent double-submission
    };

    // ---------------------------------------------------------------------------
    // CATEGORY 2: PREVIEW STATE (Questionnaire)
    // Mutated by: selectScale, questionnaire interactions
    // ---------------------------------------------------------------------------
    const previewState = {
        items: [],                   // FlatItem[] - flattened from selected scale
        currentItemIndex: 0,         // Current question position
        answers: {},                 // item_id → answer value (1-5)
        isCompleted: false,          // True when all items answered
        selectedScaleId: null        // Currently previewed scale
    };

    // ---------------------------------------------------------------------------
    // CATEGORY 3: UI STATE (Transient flags)
    // Mutated by: UI interactions only
    // ---------------------------------------------------------------------------
    const uiState = {
        currentScreen: 1,            // 1 = welcome, 2 = preview, 3 = edit
        appActive: false,            // True after data loaded
        sidebarCollapsed: false,     // Sidebar visibility
        previewMode: false,          // Hide admin UI
        isProcessing: false          // File upload in progress
    };

    // ---------------------------------------------------------------------------
    // TRANSIENT DATA (Not state, not persisted)
    // ---------------------------------------------------------------------------
    const transientData = {
        csvRaw: null,                // Raw CSV content (before processing)
        csvData: null                // Parsed CSV data
    };

    // ---------------------------------------------------------------------------
    // GETTERS (Read access)
    // ---------------------------------------------------------------------------

    // Canvas
    function getScales() {
        return canvasState.scales;
    }

    function getScale(scaleId) {
        return canvasState.scales.get(scaleId);
    }

    function getPan() {
        return canvasState.pan;
    }

    function getActiveScaleId() {
        return canvasState.activeScaleId;
    }

    function getBranchingFromScaleId() {
        return canvasState.branchingFromScaleId;
    }

    function isBranchingInProgress() {
        return canvasState.isBranchingInProgress;
    }

    // Preview
    function getPreviewItems() {
        return previewState.items;
    }

    function getCurrentItemIndex() {
        return previewState.currentItemIndex;
    }

    function getAnswers() {
        return previewState.answers;
    }

    function isQuestCompleted() {
        return previewState.isCompleted;
    }

    function getSelectedScaleId() {
        return previewState.selectedScaleId;
    }

    // UI
    function getCurrentScreen() {
        return uiState.currentScreen;
    }

    function isAppActive() {
        return uiState.appActive;
    }

    function isSidebarCollapsed() {
        return uiState.sidebarCollapsed;
    }

    function isPreviewMode() {
        return uiState.previewMode;
    }

    function isProcessing() {
        return uiState.isProcessing;
    }

    // ---------------------------------------------------------------------------
    // SETTERS (Controlled mutation)
    // ---------------------------------------------------------------------------

    // Canvas mutations
    function setScale(scaleId, scale) {
        canvasState.scales.set(scaleId, scale);
    }

    function deleteScale(scaleId) {
        canvasState.scales.delete(scaleId);
    }

    function clearScales() {
        canvasState.scales.clear();
    }

    function setPan(x, y) {
        canvasState.pan.x = x;
        canvasState.pan.y = y;
    }

    function setActiveScaleId(scaleId) {
        canvasState.activeScaleId = scaleId;
    }

    function setBranchingFromScaleId(scaleId) {
        canvasState.branchingFromScaleId = scaleId;
    }

    function setBranchingInProgress(value) {
        canvasState.isBranchingInProgress = value;
    }

    // Preview mutations
    function setPreviewItems(items) {
        previewState.items = items;
    }

    function setCurrentItemIndex(index) {
        previewState.currentItemIndex = index;
    }

    function setAnswer(itemId, value) {
        previewState.answers[itemId] = value;
    }

    function clearAnswers() {
        previewState.answers = {};
    }

    function setQuestCompleted(value) {
        previewState.isCompleted = value;
    }

    function setSelectedScaleId(scaleId) {
        previewState.selectedScaleId = scaleId;
    }

    // UI mutations
    function setCurrentScreen(screen) {
        uiState.currentScreen = screen;
    }

    function setAppActive(value) {
        uiState.appActive = value;
    }

    function setSidebarCollapsed(value) {
        uiState.sidebarCollapsed = value;
    }

    function setPreviewMode(value) {
        uiState.previewMode = value;
    }

    function setProcessing(value) {
        uiState.isProcessing = value;
    }

    // Transient data
    function setCsvRaw(content) {
        transientData.csvRaw = content;
    }

    function getCsvRaw() {
        return transientData.csvRaw;
    }

    // ---------------------------------------------------------------------------
    // BULK OPERATIONS
    // ---------------------------------------------------------------------------

    /**
     * Reset preview state to initial values.
     * Called when selecting a new scale.
     */
    function resetPreviewState() {
        previewState.currentItemIndex = 0;
        previewState.answers = {};
        previewState.isCompleted = false;
    }

    /**
     * Get legacy state object for backward compatibility.
     * DEPRECATED: Use specific getters instead.
     */
    function getLegacyState() {
        return {
            currentScreen: uiState.currentScreen,
            totalScreens: 3,
            csvData: transientData.csvData,
            csvRaw: transientData.csvRaw,
            isProcessing: uiState.isProcessing,
            appActive: uiState.appActive,
            sidebarCollapsed: uiState.sidebarCollapsed,
            previewMode: uiState.previewMode,
            items: previewState.items,
            currentItemIndex: previewState.currentItemIndex,
            answers: previewState.answers,
            isCompleted: previewState.isCompleted,
            selectedScaleId: previewState.selectedScaleId,
            canvasState: canvasState
        };
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    return {
        // Canvas getters
        getScales,
        getScale,
        getPan,
        getActiveScaleId,
        getBranchingFromScaleId,
        isBranchingInProgress,

        // Canvas setters
        setScale,
        deleteScale,
        clearScales,
        setPan,
        setActiveScaleId,
        setBranchingFromScaleId,
        setBranchingInProgress,

        // Preview getters
        getPreviewItems,
        getCurrentItemIndex,
        getAnswers,
        isQuestCompleted,
        getSelectedScaleId,

        // Preview setters
        setPreviewItems,
        setCurrentItemIndex,
        setAnswer,
        clearAnswers,
        setQuestCompleted,
        setSelectedScaleId,
        resetPreviewState,

        // UI getters
        getCurrentScreen,
        isAppActive,
        isSidebarCollapsed,
        isPreviewMode,
        isProcessing,

        // UI setters
        setCurrentScreen,
        setAppActive,
        setSidebarCollapsed,
        setPreviewMode,
        setProcessing,

        // Transient
        setCsvRaw,
        getCsvRaw,

        // Legacy (for gradual migration)
        getLegacyState
    };
})();

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}
