/**
 * MLPA Prototype - GPT Scale Service
 * 
 * Service layer for GPT-powered scale operations.
 * Wraps OpenAIAPI calls and handles validation.
 * NO DOM access. NO state mutation.
 */

// ============================================================================
// GPT SCALE SERVICE
// ============================================================================

const GPTScaleService = (function () {
    'use strict';

    /**
     * Adapt a scale for a specific audience using GPT.
     * 
     * @param {Scale} sourceScale - Source scale to adapt
     * @param {string} adaptationIntent - User's adaptation description
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async function adaptScale(sourceScale, adaptationIntent) {
        // Validate inputs
        if (!sourceScale || !sourceScale.scale_name || !sourceScale.dimensions) {
            return { success: false, error: 'Invalid source scale' };
        }

        if (!adaptationIntent || adaptationIntent.trim().length === 0) {
            return { success: false, error: 'Adaptation intent is required' };
        }

        // Check API availability
        if (typeof OpenAIAPI === 'undefined' || !OpenAIAPI.isConfigured()) {
            return { success: false, error: 'API not configured' };
        }

        try {
            // Call OpenAI API
            const gptResult = await OpenAIAPI.adaptScale(
                sourceScale.scale_name,
                sourceScale.dimensions,
                adaptationIntent
            );

            // Validate response using adapter if available
            const validation = typeof window !== 'undefined' && window.OpenAIScaleAdapter
                ? window.OpenAIScaleAdapter.validateAdaptScaleResponse(gptResult, sourceScale)
                : validateBasic(gptResult);

            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Log warnings if any
            if (validation.warnings) {
                validation.warnings.forEach(w => console.warn('[GPTScaleService]', w));
            }

            return { success: true, data: gptResult };

        } catch (error) {
            console.error('[GPTScaleService] Adaptation failed:', error);

            // Return structured error
            const message = error.message || error.type || 'Unknown error';
            return { success: false, error: message };
        }
    }

    /**
     * Structure CSV items into a Scale using GPT.
     * 
     * @param {Object[]} csvItems - Parsed CSV items
     * @param {string} filename - Original filename
     * @returns {Promise<{success: boolean, data?: Object, error?: string, isValidScale?: boolean}>}
     */
    async function structureCSV(csvItems, filename) {
        // Validate inputs
        if (!Array.isArray(csvItems) || csvItems.length === 0) {
            return { success: false, error: 'No items to structure' };
        }

        // Check API availability
        if (typeof OpenAIAPI === 'undefined' || !OpenAIAPI.isConfigured()) {
            return { success: false, error: 'API not configured' };
        }

        try {
            // Call OpenAI API
            const gptResult = await OpenAIAPI.structureCSVToScale(csvItems, filename);

            // Check if GPT determined it's not a valid scale
            if (gptResult.is_valid_scale === false) {
                return {
                    success: true,
                    isValidScale: false,
                    error: gptResult.rejection_reason || 'Invalid scale data'
                };
            }

            // Validate structure
            if (!gptResult.scale_name || !Array.isArray(gptResult.dimensions)) {
                return { success: false, error: 'Invalid GPT response structure' };
            }

            return {
                success: true,
                isValidScale: true,
                data: gptResult
            };

        } catch (error) {
            console.error('[GPTScaleService] CSV structuring failed:', error);

            const message = error.message || error.type || 'Unknown error';
            return { success: false, error: message };
        }
    }

    /**
     * Basic validation fallback.
     * @private
     */
    function validateBasic(gptResult) {
        if (!gptResult) return { valid: false, error: 'No response' };
        if (!gptResult.scale_name) return { valid: false, error: 'Missing scale_name' };
        if (!Array.isArray(gptResult.dimensions)) return { valid: false, error: 'Missing dimensions' };
        return { valid: true };
    }

    // ---------------------------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------------------------
    return {
        adaptScale,
        structureCSV
    };
})();

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.GPTScaleService = GPTScaleService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GPTScaleService;
}
