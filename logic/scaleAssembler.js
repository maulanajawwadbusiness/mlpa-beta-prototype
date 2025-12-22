/**
 * MLPA Prototype - Scale Assembler Module
 * 
 * Pure functions for assembling Scale objects from GPT results.
 * NO DOM access. NO state mutation. NO API calls. Pure functions only.
 */

// ============================================================================
// SCALE ASSEMBLY (PURE FUNCTIONS)
// ============================================================================

/**
 * Assemble a complete Scale object from GPT result and source data.
 * 
 * @param {Object} gptResult - GPT response { scale_name, dimensions }
 * @param {Scale} sourceScale - Source scale for rubric inheritance
 * @param {{x: number, y: number, depth: number, branch_index: number}} position - Computed position
 * @param {string} scaleId - Unique ID for new scale
 * @returns {Scale} Complete Scale object ready for state insertion
 */
function assembleNewScale(gptResult, sourceScale, position, scaleId) {
    // Expand GPT dimensions with rubrics (delegates to OpenAIScaleAdapter if available)
    const expandedDimensions = typeof window !== 'undefined' && window.OpenAIScaleAdapter
        ? window.OpenAIScaleAdapter.expandWithRubrics(gptResult.dimensions, scaleId, sourceScale.dimensions)
        : expandDimensionsBasic(gptResult.dimensions, scaleId, sourceScale.dimensions);

    return {
        scale_id: scaleId,
        scale_name: gptResult.scale_name,
        parent_scale_id: sourceScale.scale_id,
        is_root: false,
        expanded: false,
        depth: position.depth,
        branch_index: position.branch_index,
        position: { x: position.x, y: position.y },
        positionLocked: true,  // Branched scales are always position-locked
        dimensions: expandedDimensions
    };
}

/**
 * Basic dimension expansion without rubric inheritance.
 * Fallback when OpenAIScaleAdapter is not available.
 * 
 * @param {Array} gptDimensions - GPT-generated dimensions
 * @param {string} scaleId - Scale ID for namespacing
 * @param {Array} sourceDimensions - Source dimensions for structure reference
 * @returns {Array} Expanded dimensions with item IDs
 */
function expandDimensionsBasic(gptDimensions, scaleId, sourceDimensions) {
    let itemCounter = 1;

    return gptDimensions.map((dim, dimIndex) => {
        const sourceItems = sourceDimensions[dimIndex]?.items || [];

        return {
            name: dim.name,
            items: dim.items.map((item, itemIndex) => {
                const sourceItem = sourceItems[itemIndex];
                const baseline = sourceItem?.baseline_rubric || ['Placeholder'];

                return {
                    item_id: `${scaleId}-item-${itemCounter++}`,
                    origin_item_id: sourceItem?.item_id || 'unknown',
                    text: item.text,
                    baseline_rubric: baseline,
                    current_rubric: item.current_rubric || baseline,
                    dimension: dim.name,
                    rubric_source: item.current_rubric ? 'gpt' : 'parent'
                };
            })
        };
    });
}

/**
 * Generate a unique branch ID.
 * 
 * @param {string} parentScaleId - Parent scale ID
 * @param {number} branchNumber - Branch number (1-based)
 * @returns {string} Unique branch scale ID
 */
function generateBranchId(parentScaleId, branchNumber) {
    return `${parentScaleId}-branch-${branchNumber}`;
}

/**
 * Validate that a scale object has all required fields.
 * 
 * @param {Scale} scale - Scale object to validate
 * @returns {{ valid: boolean, missing?: string[] }}
 */
function validateScaleShape(scale) {
    const required = ['scale_id', 'scale_name', 'dimensions', 'position'];
    const missing = required.filter(field => !(field in scale));

    return {
        valid: missing.length === 0,
        missing: missing.length > 0 ? missing : undefined
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ScaleAssembler = {
        assembleNewScale,
        expandDimensionsBasic,
        generateBranchId,
        validateScaleShape
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        assembleNewScale,
        expandDimensionsBasic,
        generateBranchId,
        validateScaleShape
    };
}
