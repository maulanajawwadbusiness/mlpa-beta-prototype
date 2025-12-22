/**
 * MLPA Prototype - Flow Editor Controller
 * 
 * UI orchestration flows for the flow editor.
 * Calls: domain logic, state ops, renderAll
 * Does NOT contain: layout math, graph traversal
 */

// ============================================================================
// FLOW EDITOR CONTROLLER
// ============================================================================

const FlowEditorController = (function () {
    'use strict';

    /**
     * Execute scale deletion after user confirmation.
     * 
     * @param {Set<string>} toDelete - Scale IDs to delete
     * @param {Map<string, Scale>} scales - Scales Map
     * @param {Object} canvasState - Canvas state for activeScaleId
     * @param {Function} renderFn - Render callback
     */
    function executeDelete(toDelete, scales, canvasState, renderFn) {
        // Use state ops for mutations
        if (window.CanvasStateOps) {
            window.CanvasStateOps.removeScales(scales, toDelete);
            window.CanvasStateOps.clearActiveScaleIfDeleted(canvasState, toDelete);
        } else {
            // Fallback
            toDelete.forEach(id => {
                scales.delete(id);
                if (canvasState.activeScaleId === id) {
                    canvasState.activeScaleId = null;
                }
            });
        }

        console.log(`[FlowEditorController] Deleted ${toDelete.size} scales via cascade.`);

        // Trigger re-render
        if (renderFn) renderFn();
    }

    /**
     * Prepare delete operation (before confirmation).
     * Returns data for UI to show confirmation dialog.
     * 
     * @param {string} scaleId - Scale ID to delete
     * @param {Map<string, Scale>} scales - Scales Map
     * @returns {{ canDelete: boolean, toDelete: Set, count: number, error?: string }}
     */
    function prepareDelete(scaleId, scales) {
        if (!scaleId) {
            return { canDelete: false, error: 'no_scale_id' };
        }

        const scale = scales.get(scaleId);
        if (!scale) {
            return { canDelete: false, error: 'scale_not_found' };
        }

        // Root protection
        if (scale.is_root) {
            return { canDelete: false, error: 'root_protected' };
        }

        // Build cascade set
        const toDelete = window.ScaleGraph
            ? window.ScaleGraph.buildCascadeDeleteSet(scales, scaleId)
            : new Set([scaleId]);

        return {
            canDelete: true,
            toDelete,
            count: toDelete.size
        };
    }

    /**
     * Prepare branching operation (validation only).
     * 
     * @param {string} sourceScaleId - Source scale ID
     * @param {Map<string, Scale>} scales - Scales Map
     * @param {boolean} isBranchingInProgress - Lock flag
     * @returns {{ canBranch: boolean, sourceScale?: Scale, error?: string }}
     */
    function prepareBranch(sourceScaleId, scales, isBranchingInProgress) {
        if (isBranchingInProgress) {
            return { canBranch: false, error: 'branching_in_progress' };
        }

        const sourceScale = scales.get(sourceScaleId);
        if (!sourceScale) {
            return { canBranch: false, error: 'source_not_found' };
        }

        return { canBranch: true, sourceScale };
    }

    /**
     * Assemble a new branch scale from GPT result.
     * Pure assembly - no state mutation.
     * 
     * @param {Object} gptResult - GPT response
     * @param {Scale} sourceScale - Source scale
     * @param {Map<string, Scale>} scales - Scales Map (for counting)
     * @param {Function} expandRubricsFn - Rubric expansion function
     * @returns {Scale} New scale object
     */
    function assembleBranchScale(gptResult, sourceScale, scales, expandRubricsFn) {
        const sourceScaleId = sourceScale.scale_id;

        // Count existing branches
        const branchCount = Array.from(scales.keys())
            .filter(id => id.startsWith(sourceScaleId + '-branch')).length + 1;

        const newScaleId = `${sourceScaleId}-branch-${branchCount}`;
        const branch_index = branchCount - 1;

        // Calculate position
        const newPosition = window.BranchPositioning
            ? window.BranchPositioning.getNextBranchPosition(sourceScale, branch_index)
            : { x: sourceScale.position.x + 550, y: sourceScale.position.y, depth: 1, branch_index: 0 };

        // Expand dimensions with rubrics
        const fullDimensions = expandRubricsFn
            ? expandRubricsFn(gptResult.dimensions, newScaleId, sourceScale.dimensions)
            : gptResult.dimensions;

        return {
            scale_id: newScaleId,
            scale_name: gptResult.scale_name,
            parent_scale_id: sourceScaleId,
            is_root: false,
            expanded: false,
            depth: newPosition.depth,
            branch_index: newPosition.branch_index,
            position: { x: newPosition.x, y: newPosition.y },
            positionLocked: true,
            dimensions: fullDimensions
        };
    }

    /**
     * Add new scale and re-render.
     * 
     * @param {Scale} newScale - Scale to add
     * @param {Map<string, Scale>} scales - Scales Map
     * @param {Function} renderFn - Render callback
     */
    function addScaleAndRender(newScale, scales, renderFn) {
        if (window.CanvasStateOps) {
            window.CanvasStateOps.addScale(scales, newScale);
        } else {
            scales.set(newScale.scale_id, newScale);
        }

        if (renderFn) renderFn();

        console.log('[FlowEditorController] Branch created:', newScale.scale_id);
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    return {
        executeDelete,
        prepareDelete,
        prepareBranch,
        assembleBranchScale,
        addScaleAndRender
    };
})();

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.FlowEditorController = FlowEditorController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowEditorController;
}
