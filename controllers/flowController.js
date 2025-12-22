/**
 * MLPA Prototype - Flow Controller
 * 
 * Thin orchestration layer for flow editor operations.
 * Calls logic/*, state/*, ui/renderer/* - NO direct DOM manipulation.
 */

// ============================================================================
// FLOW CONTROLLER
// ============================================================================

const FlowController = (function () {
    'use strict';

    /**
     * Handle scale deletion with cascade.
     * Orchestrates: ScaleGraph → State → Renderer
     * 
     * @param {string} scaleId - Scale ID to delete
     * @param {Map} scales - Current scales Map
     * @param {Function} deleteScaleFn - State mutation function
     * @param {Function} renderFn - Re-render function
     * @returns {{ deleted: boolean, count: number }}
     */
    function handleDeleteScale(scaleId, scales, deleteScaleFn, renderFn) {
        if (!scaleId) return { deleted: false, count: 0 };

        const scale = scales.get(scaleId);
        if (!scale) return { deleted: false, count: 0 };

        // Root protection (logic decision)
        if (scale.is_root) {
            return { deleted: false, count: 0, error: 'root_protected' };
        }

        // Build cascade delete set (pure logic)
        const toDelete = window.ScaleGraph.buildCascadeDeleteSet(scales, scaleId);
        const count = toDelete.size;

        // Return info for confirmation (UI handles confirmation dialog)
        return {
            deleted: false,
            count: count,
            toDelete: toDelete,
            execute: () => {
                // Execute deletion (state mutation)
                toDelete.forEach(id => deleteScaleFn(id));
                // Trigger re-render
                if (renderFn) renderFn();
                return { deleted: true, count };
            }
        };
    }

    /**
     * Handle branch creation flow.
     * Orchestrates: BranchPositioning → ScaleAssembler → State
     * 
     * @param {string} sourceScaleId - Source scale ID
     * @param {Object} gptResult - GPT response data
     * @param {Map} scales - Current scales Map
     * @returns {Scale} New scale object ready to add
     */
    function assembleBranch(sourceScaleId, gptResult, scales) {
        const sourceScale = scales.get(sourceScaleId);
        if (!sourceScale) return null;

        // Count existing branches to get branch_index
        const branchCount = window.ScaleGraph.countBranches(scales, sourceScaleId);

        // Calculate position (pure layout logic)
        const position = window.BranchPositioning.getNextBranchPosition(sourceScale, branchCount);

        // Generate new scale ID
        const newScaleId = `${sourceScaleId}-branch-${branchCount + 1}`;

        // Assemble new scale (pure assembly logic)
        const newScale = window.ScaleAssembler.assembleNewScale(
            gptResult,
            sourceScale,
            position,
            newScaleId
        );

        return newScale;
    }

    /**
     * Validate branching can proceed.
     * 
     * @param {string} sourceScaleId - Source scale ID
     * @param {Map} scales - Current scales Map
     * @param {boolean} isBranchingInProgress - Lock flag
     * @returns {{ valid: boolean, error?: string }}
     */
    function validateBranching(sourceScaleId, scales, isBranchingInProgress) {
        if (isBranchingInProgress) {
            return { valid: false, error: 'branching_in_progress' };
        }

        const sourceScale = scales.get(sourceScaleId);
        if (!sourceScale) {
            return { valid: false, error: 'source_not_found' };
        }

        return { valid: true, sourceScale };
    }

    /**
     * Get render data for all flow boxes.
     * Returns data only - no DOM operations.
     * 
     * @param {Map} scales - Current scales Map
     * @returns {Array<{scale: Scale, html: string}>}
     */
    function getFlowBoxRenderData(scales) {
        const renderData = [];

        scales.forEach(scale => {
            const html = window.FlowBoxRenderer
                ? window.FlowBoxRenderer.createFlowBoxHtml(scale)
                : null;

            renderData.push({ scale, html });
        });

        return renderData;
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    return {
        handleDeleteScale,
        assembleBranch,
        validateBranching,
        getFlowBoxRenderData
    };
})();

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.FlowController = FlowController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowController;
}
