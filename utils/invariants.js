/**
 * MODULE CONTRACT
 * ----------------
 * Responsibility: Runtime invariant checking for development mode
 * Inputs: Conditions and error messages
 * Outputs: Throws if invariant violated (DEV only)
 * Allowed side effects: Console warnings, throws
 * Forbidden responsibilities: NO state mutation, NO rendering, NO business logic
 * Invariants this module guarantees: Invalid states are caught early in dev
 */

// ============================================================================
// DEV MODE FLAG
// ============================================================================

const DEV = true; // Set to false for production

// ============================================================================
// SCALE INVARIANTS
// ============================================================================

/**
 * Assert that a condition is true.
 * Throws in DEV mode if violated.
 * 
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if violated
 */
function assert(condition, message) {
    if (DEV && !condition) {
        throw new Error(`[Invariant Violated] ${message}`);
    }
}

/**
 * Validate scale object has required fields.
 * 
 * @param {Scale} scale - Scale to validate
 * @throws If scale is invalid (DEV only)
 */
function validateScale(scale) {
    if (!DEV) return;

    assert(scale !== null && typeof scale === 'object', 'Scale must be an object');
    assert(typeof scale.scale_id === 'string' && scale.scale_id.length > 0, 'Scale must have scale_id');
    assert(typeof scale.scale_name === 'string', 'Scale must have scale_name');
    assert(Array.isArray(scale.dimensions), 'Scale must have dimensions array');
    assert(scale.position && typeof scale.position.x === 'number' && typeof scale.position.y === 'number',
        'Scale must have position {x, y}');
}

/**
 * Validate non-root scale has parent.
 * 
 * @param {Scale} scale - Scale to validate
 * @throws If non-root scale without parent (DEV only)
 */
function validateBranchedScale(scale) {
    if (!DEV) return;
    if (scale.is_root) return;

    assert(typeof scale.parent_scale_id === 'string', 'Non-root scale must have parent_scale_id');
    assert(typeof scale.branch_index === 'number' && scale.branch_index >= 0,
        'Branched scale must have non-negative branch_index');
    assert(scale.positionLocked === true, 'Branched scale must have positionLocked=true');
}

/**
 * Validate dimension structure.
 * 
 * @param {Dimension} dimension - Dimension to validate
 * @throws If dimension is invalid (DEV only)
 */
function validateDimension(dimension) {
    if (!DEV) return;

    assert(dimension !== null && typeof dimension === 'object', 'Dimension must be an object');
    assert(typeof dimension.name === 'string', 'Dimension must have name');
    assert(Array.isArray(dimension.items), 'Dimension must have items array');
}

/**
 * Validate item structure.
 * 
 * @param {Item} item - Item to validate
 * @throws If item is invalid (DEV only)
 */
function validateItem(item) {
    if (!DEV) return;

    assert(item !== null && typeof item === 'object', 'Item must be an object');
    assert(typeof item.item_id === 'string', 'Item must have item_id');
    assert(typeof item.text === 'string', 'Item must have text');
}

// ============================================================================
// STATE TRANSITION GUARDS
// ============================================================================

/**
 * Ensure we're not in the middle of another operation.
 * 
 * @param {boolean} lock - Current lock state
 * @param {string} operation - Operation name
 * @throws If lock is active (DEV only)
 */
function assertNotLocked(lock, operation) {
    if (!DEV) return;
    assert(!lock, `Cannot start ${operation} while another operation is in progress`);
}

/**
 * Ensure scale exists before operating on it.
 * 
 * @param {Map} scales - Scales Map
 * @param {string} scaleId - Scale ID to check
 * @throws If scale not found (DEV only)
 */
function assertScaleExists(scales, scaleId) {
    if (!DEV) return;
    assert(scales.has(scaleId), `Scale not found: ${scaleId}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.Invariants = {
        DEV,
        assert,
        validateScale,
        validateBranchedScale,
        validateDimension,
        validateItem,
        assertNotLocked,
        assertScaleExists
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEV,
        assert,
        validateScale,
        validateBranchedScale,
        validateDimension,
        validateItem,
        assertNotLocked,
        assertScaleExists
    };
}
