/**
 * MLPA Prototype - FlowBox Renderer
 * 
 * Pure HTML rendering for flow boxes and their contents.
 * Accepts data as input, returns HTML strings.
 * NO logic decisions. NO state mutation.
 */

// ============================================================================
// FLOWBOX HTML RENDERING
// ============================================================================

/**
 * Create complete flowbox HTML for a scale.
 * 
 * @param {Scale} scale - Scale object
 * @returns {string} HTML string
 */
function createFlowBoxHtml(scale) {
    let globalItemIndex = 1;
    const dimensions = Array.isArray(scale.dimensions) ? scale.dimensions : [];
    const dimensionsHtml = dimensions.map((dim, index) => {
        const safeDimension = dim && typeof dim === 'object' ? dim : {};
        const items = Array.isArray(safeDimension.items) ? safeDimension.items : [];
        const html = createDimensionHtml({ ...safeDimension, items }, index + 1, globalItemIndex, scale);
        globalItemIndex += items.length;
        return html;
    }).join('');

    return `
    <div class="flow-box flow-mode ${scale.expanded ? '' : 'flow-mode-collapsed'}"  
         data-scale-id="${scale.scale_id}" 
         style="left: ${scale.position.x}px; top: ${scale.position.y}px;">
      <!-- Hover Tools -->
      <div class="flow-box-tools">
        <button class="flow-tool-btn edit-mode-btn" title="Edit Item">
          <img src="assets/edit_icon.png" alt="Edit">
        </button>
        <button class="flow-tool-btn export-btn" title="Simpan sebagai CSV">
          <img src="assets/save_icon.png" alt="Export">
        </button>
        ${!scale.is_root ? `
        <button class="flow-tool-btn delete-btn" title="Hapus Skala">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>` : ''}
        <button class="flow-tool-btn branch-btn" title="Cabangkan ke Versi Baru">
          <img src="assets/branch_button_icon.png" alt="Branch">
        </button>
      </div>

      <!-- Header -->
      <div class="flow-box-header">
        <span class="flow-box-title">${scale.scale_name}</span>
        <svg class="flow-box-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      <!-- Content -->
      <div class="flow-box-content">
        ${dimensionsHtml}
      </div>
    </div>
  `;
}

/**
 * Create dimension section HTML.
 * 
 * @param {Dimension} dimension - Dimension object
 * @param {number} index - Dimension index (1-based)
 * @param {number} startItemIndex - Starting item index for numbering
 * @param {Scale} scale - Parent scale (for integrity checking)
 * @returns {string} HTML string
 */
function createDimensionHtml(dimension, index, startItemIndex, scale) {
    const safeDimension = dimension && typeof dimension === 'object' ? dimension : {};
    const items = Array.isArray(safeDimension.items) ? safeDimension.items : [];
    const itemsHtml = items.map((item, idx) => createItemHtml(item, startItemIndex + idx, scale)).join('');
    const dimensionName = typeof safeDimension.name === 'string' ? safeDimension.name : '';

    return `
    <div class="dimension-box">
      <div class="dimension-label">
        <span class="dimension-label-line">Dimensi ${index}</span>
        <span class="dimension-label-line">${dimensionName}</span>
      </div>
      <div class="dimension-items">
        ${itemsHtml}
      </div>
    </div>
  `;
}

/**
 * Create single item HTML.
 * 
 * @param {Item} item - Item object
 * @param {number} itemIndex - Item index for display
 * @param {Scale} scale - Parent scale (for integrity checking)
 * @returns {string} HTML string
 */
function createItemHtml(item, itemIndex, scale) {
    const safeItem = item && typeof item === 'object' ? item : {};
    const integrityClass = getIntegrityClass(safeItem, scale);
    const rubricHtml = createRubricPopupHtml(safeItem);
    const itemId = safeItem.item_id ?? '';
    const itemText = safeItem.text ?? '';

    return `
    <div class="item-box ${integrityClass}" data-item-id="${itemId}">
      <span class="item-text">
        <span class="item-index">i${itemIndex}: </span>
        <span class="item-content">${itemText}</span>
      </span>
      ${rubricHtml}
    </div>
  `;
}

/**
 * Create rubric popup HTML for an item.
 * 
 * @param {Item} item - Item object
 * @returns {string} HTML string
 */
function createRubricPopupHtml(item) {
    const hasRubric = item.current_rubric && item.current_rubric.length > 0;
    if (!hasRubric) {
        return `
      <div class="rubric-popup">
        <div class="rubric-title">Rubrik (placeholder)</div>
        <div class="rubric-list">
          <span class="rubric-item">Akan digenerate oleh AI</span>
        </div>
      </div>
    `;
    }

    const rubricItems = item.current_rubric.map(r => `<span class="rubric-item">${r}</span>`).join('');
    return `
    <div class="rubric-popup">
      <div class="rubric-title">Rubrik: Sifat-Sifat Dasar di Kalimat</div>
      <div class="rubric-list">${rubricItems}</div>
    </div>
  `;
}

/**
 * Get integrity CSS class based on rubric comparison.
 * 
 * @param {Item} item - Item object
 * @param {Scale} scale - Parent scale
 * @returns {string} CSS class name
 */
function getIntegrityClass(item, scale) {
    // Don't show outline for root scales
    if (scale && scale.is_root) return '';

    // Compare baseline and current rubric
    if (!item.baseline_rubric || !item.current_rubric) return '';
    if (item.baseline_rubric.length === 0 && item.current_rubric.length === 0) return '';

    // Check if arrays are identical
    const isIdentical =
        item.baseline_rubric.length === item.current_rubric.length &&
        item.baseline_rubric.every((trait, i) => trait === item.current_rubric[i]);

    // Green = match, Red = mismatch
    return isIdentical ? 'integrity-stable' : 'integrity-mismatch';
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.FlowBoxRenderer = {
        createFlowBoxHtml,
        createDimensionHtml,
        createItemHtml,
        createRubricPopupHtml,
        getIntegrityClass
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createFlowBoxHtml,
        createDimensionHtml,
        createItemHtml,
        createRubricPopupHtml,
        getIntegrityClass
    };
}
