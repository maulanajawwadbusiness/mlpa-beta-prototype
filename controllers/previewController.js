/**
 * MLPA Prototype - Preview Controller
 * 
 * Thin orchestration layer for preview/questionnaire operations.
 * Calls logic/*, state/*, ui/renderer/* - NO direct DOM manipulation.
 */

// ============================================================================
// PREVIEW CONTROLLER
// ============================================================================

const PreviewController = (function () {
    'use strict';

    /**
     * Handle scale selection for preview.
     * Orchestrates: ScaleTransform → State updates
     * 
     * @param {string} scaleId - Selected scale ID
     * @param {Map} scales - Current scales Map
     * @returns {{ success: boolean, items: FlatItem[], scaleName: string }}
     */
    function selectScale(scaleId, scales) {
        if (!scaleId) {
            return { success: false, items: [], error: 'no_scale_id' };
        }

        const scale = scales.get(scaleId);
        if (!scale) {
            return { success: false, items: [], error: 'scale_not_found' };
        }

        // Flatten items (pure transform logic)
        const items = window.ScaleTransform
            ? window.ScaleTransform.flattenScaleItems(scale)
            : flattenItemsFallback(scale);

        return {
            success: true,
            items: items,
            scaleName: scale.scale_name,
            scaleId: scaleId
        };
    }

    /**
     * Fallback item flattening.
     * @private
     */
    function flattenItemsFallback(scale) {
        const items = [];
        if (scale && Array.isArray(scale.dimensions)) {
            scale.dimensions.forEach(dim => {
                if (Array.isArray(dim.items)) {
                    dim.items.forEach(item => {
                        items.push({ ...item, dimension: dim.name });
                    });
                }
            });
        }
        return items;
    }

    /**
     * Navigate to next item.
     * 
     * @param {number} currentIndex - Current item index
     * @param {number} totalItems - Total items count
     * @returns {{ newIndex: number, atEnd: boolean }}
     */
    function goToNextItem(currentIndex, totalItems) {
        const newIndex = Math.min(currentIndex + 1, totalItems - 1);
        return {
            newIndex,
            atEnd: newIndex >= totalItems - 1
        };
    }

    /**
     * Navigate to previous item.
     * 
     * @param {number} currentIndex - Current item index
     * @returns {{ newIndex: number, atStart: boolean }}
     */
    function goToPrevItem(currentIndex) {
        const newIndex = Math.max(currentIndex - 1, 0);
        return {
            newIndex,
            atStart: newIndex === 0
        };
    }

    /**
     * Record an answer.
     * 
     * @param {Object} answers - Current answers object
     * @param {number} itemIndex - Item index (key)
     * @param {number} value - Answer value (1-5)
     * @returns {Object} Updated answers object (new reference)
     */
    function recordAnswer(answers, itemIndex, value) {
        return {
            ...answers,
            [itemIndex]: value
        };
    }

    /**
     * Check if questionnaire is complete.
     * 
     * @param {Object} answers - Answers object
     * @param {number} totalItems - Total items count
     * @returns {{ complete: boolean, answeredCount: number }}
     */
    function checkCompletion(answers, totalItems) {
        const answeredCount = Object.keys(answers).length;
        return {
            complete: answeredCount >= totalItems,
            answeredCount
        };
    }

    /**
     * Calculate final score.
     * 
     * @param {Object} answers - Answers object
     * @param {number} totalItems - Total items count
     * @returns {{ score: number, maxScore: number, percentage: number }}
     */
    function calculateScore(answers, totalItems) {
        const score = Object.values(answers).reduce((sum, val) => sum + val, 0);
        const maxScore = totalItems * 5;
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        return { score, maxScore, percentage };
    }

    /**
     * Build scale tree for selector.
     * 
     * @param {Map} scales - Current scales Map
     * @returns {Map<string, string[]>} Tree structure
     */
    function buildScaleTree(scales) {
        return window.ScaleGraph
            ? window.ScaleGraph.buildScaleTree(scales)
            : new Map();
    }

    /**
     * Find root scales for tree rendering.
     * 
     * @param {Map} scales - Current scales Map
     * @returns {string[]} Array of root scale IDs
     */
    function findRoots(scales) {
        return window.ScaleGraph
            ? window.ScaleGraph.findRoots(scales)
            : [];
    }

    /**
     * Handle scale selection orchestration.
     * Combines: selectScale + state mutation + reset
     * 
     * @param {string} scaleId - Selected scale ID
     * @param {Map} scales - Scales Map
     * @param {Object} state - Full state object
     * @returns {{ success: boolean, items: FlatItem[], scaleName?: string, error?: string }}
     */
    function handleScaleSelection(scaleId, scales, state) {
        // 1. Get scale and flatten items
        const result = selectScale(scaleId, scales);
        if (!result.success) {
            return result;
        }

        // 2. Update state using state ops
        if (window.CanvasStateOps) {
            window.CanvasStateOps.setPreviewScale(state, result.scaleId, result.items);
            window.CanvasStateOps.resetPreviewState(state);
        } else {
            // Fallback
            state.selectedScaleId = result.scaleId;
            state.items = result.items;
            state.currentItemIndex = 0;
            state.answers = {};
            state.isCompleted = false;
        }

        return result;
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    return {
        selectScale,
        goToNextItem,
        goToPrevItem,
        recordAnswer,
        checkCompletion,
        calculateScore,
        buildScaleTree,
        findRoots,
        handleScaleSelection
    };
})();

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.PreviewController = PreviewController;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewController;
}
