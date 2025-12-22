/**
 * MLPA Prototype - Preview Renderer
 * 
 * Renders questionnaire preview UI updates.
 * Accepts state data, performs DOM updates.
 */

// ============================================================================
// QUESTIONNAIRE UI RENDERING
// ============================================================================

/**
 * Update questionnaire item display.
 * 
 * @param {Object} elements - DOM element references
 * @param {Object} item - Current item object
 * @param {number} currentIndex - Current item index (0-based)
 * @param {number} totalItems - Total items count
 */
function renderQuestionnaireItem(elements, item, currentIndex, totalItems) {
    if (!item) {
        if (elements.itemText) {
            elements.itemText.textContent = 'Tidak ada item untuk ditampilkan';
        }
        return;
    }

    // Update counter
    if (elements.itemCounter) {
        elements.itemCounter.textContent = `Item ${currentIndex + 1} / ${totalItems}`;
    }

    // Update item text - try common column names
    const textValue = item.item_text || item.text || item.question || item.pernyataan ||
        Object.values(item).find(v => typeof v === 'string' && v.length > 10) ||
        Object.values(item)[1] || 'No text available';

    if (elements.itemText) {
        elements.itemText.textContent = textValue;
    }
}

/**
 * Update Likert scale dots selection state.
 * 
 * @param {NodeList} dots - Likert dot elements
 * @param {number|undefined} currentAnswer - Currently selected value
 */
function renderLikertSelection(dots, currentAnswer) {
    if (!dots) return;

    dots.forEach(dot => {
        const value = parseInt(dot.dataset.value);
        dot.classList.toggle('selected', value === currentAnswer);
    });
}

/**
 * Update navigation button states.
 * 
 * @param {HTMLElement} prevBtn - Previous button
 * @param {HTMLElement} nextBtn - Next button
 * @param {number} currentIndex - Current item index
 * @param {number} totalItems - Total items count
 */
function renderNavButtons(prevBtn, nextBtn, currentIndex, totalItems) {
    if (prevBtn) {
        prevBtn.disabled = currentIndex === 0;
    }
    if (nextBtn) {
        nextBtn.disabled = currentIndex >= totalItems - 1;
    }
}

/**
 * Render completion screen.
 * 
 * @param {Object} elements - DOM element references
 * @param {Object} answers - Answers object
 * @param {number} totalItems - Total items count
 */
function renderCompletion(elements, answers, totalItems) {
    const answeredCount = Object.keys(answers).length;
    const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);
    const maxScore = totalItems * 5;

    if (elements.finalScore) {
        elements.finalScore.textContent = totalScore;
    }
    if (elements.maxScore) {
        elements.maxScore.textContent = maxScore;
    }

    elements.questionnaire?.classList.add('hidden');
    elements.completion?.classList.remove('hidden');
}

/**
 * Reset questionnaire UI to initial state.
 * 
 * @param {Object} elements - DOM element references
 */
function resetQuestionnaireUI(elements) {
    elements.completion?.classList.add('hidden');
    elements.questionnaire?.classList.remove('hidden');
}

// ============================================================================
// SCALE SELECTOR RENDERING
// ============================================================================

/**
 * Render scale selector graph node HTML.
 * 
 * @param {Scale} scale - Scale object
 * @param {number} depth - Nesting depth for indentation
 * @returns {string} HTML string for node
 */
function createScaleSelectorNodeHtml(scale, depth) {
    return `
    <div class="scale-selector-node" 
         data-scale-id="${scale.scale_id}"
         style="margin-left: ${depth * 24}px">
      <span class="scale-selector-node-name">${scale.scale_name}</span>
    </div>
  `;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.PreviewRenderer = {
        renderQuestionnaireItem,
        renderLikertSelection,
        renderNavButtons,
        renderCompletion,
        resetQuestionnaireUI,
        createScaleSelectorNodeHtml
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderQuestionnaireItem,
        renderLikertSelection,
        renderNavButtons,
        renderCompletion,
        resetQuestionnaireUI,
        createScaleSelectorNodeHtml
    };
}
