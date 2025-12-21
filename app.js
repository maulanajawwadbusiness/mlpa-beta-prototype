/**
 * MLPA Prototype - Application Logic
 * Main app with sidebar, questionnaire, preview mode, and CSV/OpenAI integration
 */

(function () {
  'use strict';

  // ==================== STATE ====================

  const state = {
    currentScreen: 1,
    totalScreens: 3,
    csvData: null,
    csvRaw: null,
    isProcessing: false,

    // App state
    appActive: false,
    sidebarCollapsed: false,
    previewMode: false,

    // Questionnaire state
    items: [],
    currentItemIndex: 0,
    answers: {},
    isCompleted: false,
    selectedScaleId: null,  // Currently selected scale for preview

    // Canvas state (for Tampilan Edit)
    canvasState: {
      scales: new Map(),           // scale_id -> Scale
      connections: [],              // { from: scale_id, to: scale_id }
      pan: { x: 0, y: 0 },         // Canvas offset
      activeScaleId: 'skala-asli'  // Currently selected scale
    }
  };

  // ==================== DOM ELEMENTS ====================

  const elements = {
    // Welcome screen
    screens: null,
    uploadZone: null,
    fileInput: null,
    fullscreenBtn: null,
    errorMessage: null,
    testMockBtn: null,

    // App container
    appContainer: null,
    sidebar: null,
    sidebarToggle: null,
    navItems: null,
    mainContent: null,

    // Preview toggle
    previewToggle: null,

    // Questionnaire
    questionnaire: null,
    itemCounter: null,
    itemText: null,
    likertDots: null,
    prevBtn: null,
    nextBtn: null,

    // Completion
    completion: null,
    finalScore: null,
    maxScore: null,
    resetBtn: null,

    // Preview return
    previewReturn: null,

    // Inner screens
    innerScreens: null
  };

  // ==================== INITIALIZATION ====================

  function init() {
    cacheElements();
    bindEvents();
    initOfflineDetection();
    initUploadErrorModal();
    showScreen(1);
  }

  // ==================== NETWORK RESILIENCE ====================

  function initOfflineDetection() {
    const overlay = document.getElementById('offline-overlay');

    // Check initial state
    if (!navigator.onLine) {
      overlay?.classList.remove('hidden');
    }

    // Listen for network changes
    window.addEventListener('online', () => {
      console.log('[MLPA] Network: Back online');
      overlay?.classList.add('hidden');
    });

    window.addEventListener('offline', () => {
      console.log('[MLPA] Network: Went offline');
      overlay?.classList.remove('hidden');
    });
  }

  function initUploadErrorModal() {
    const modal = document.getElementById('upload-error-modal');
    const mockBtn = document.getElementById('upload-error-mock');
    const closeBtn = document.getElementById('upload-error-close');

    mockBtn?.addEventListener('click', () => {
      hideUploadErrorModal();
      handleLoadMock();
    });

    closeBtn?.addEventListener('click', () => {
      hideUploadErrorModal();
    });
  }

  function showUploadErrorModal(message) {
    const modal = document.getElementById('upload-error-modal');
    const messageEl = document.getElementById('upload-error-message');

    if (messageEl) messageEl.textContent = message;
    modal?.classList.remove('hidden');
  }

  function hideUploadErrorModal() {
    const modal = document.getElementById('upload-error-modal');
    modal?.classList.add('hidden');
  }

  function cacheElements() {
    // Welcome screen
    elements.screens = document.querySelectorAll('.screen');
    elements.uploadZone = document.getElementById('upload-zone');
    elements.fileInput = document.getElementById('file-input');
    elements.fullscreenBtn = document.getElementById('fullscreen-btn');
    elements.errorMessage = document.getElementById('error-message');
    elements.testMockBtn = document.getElementById('test-mock-btn');

    // App container
    elements.appContainer = document.getElementById('app-container');
    elements.sidebar = document.getElementById('sidebar');
    elements.sidebarToggle = document.getElementById('sidebar-toggle');
    elements.sidebarToggleTooltip = document.querySelector('.sidebar-toggle-tooltip');
    elements.sidebarShowBtn = document.getElementById('sidebar-show-btn');
    elements.navItems = document.querySelectorAll('.nav-item');
    elements.mainContent = document.getElementById('main-content');

    // Preview toggle
    elements.previewToggle = document.getElementById('preview-toggle');

    // Questionnaire
    elements.questionnaire = document.getElementById('questionnaire');
    elements.itemCounter = document.getElementById('item-counter');
    elements.itemText = document.getElementById('item-text');
    elements.likertDots = document.querySelectorAll('.likert-dot');
    elements.prevBtn = document.getElementById('prev-btn');
    elements.nextBtn = document.getElementById('next-btn');

    // Completion
    elements.completion = document.getElementById('completion');
    elements.finalScore = document.getElementById('final-score');
    elements.maxScore = document.getElementById('max-score');
    elements.resetBtn = document.getElementById('reset-btn');

    // Preview return button
    elements.previewReturn = document.getElementById('preview-return');

    // Scale selector
    elements.scaleSelectorBtn = document.getElementById('scale-selector-btn');
    elements.scaleSelectorLabel = document.getElementById('scale-selector-label');
    elements.scaleSelectorModal = document.getElementById('scale-selector-modal');
    elements.scaleSelectorClose = document.getElementById('scale-selector-close');
    elements.scaleSelectorBackdrop = document.querySelector('.scale-selector-backdrop');
    elements.scaleSelectorNodes = document.getElementById('scale-selector-nodes');
    elements.scaleSelectorConnections = document.getElementById('scale-selector-connections');

    // Inner screens
    elements.innerScreens = document.querySelectorAll('.inner-screen');
  }

  function bindEvents() {
    // Upload zone interactions
    if (elements.uploadZone) {
      elements.uploadZone.addEventListener('click', handleUploadClick);
      elements.uploadZone.addEventListener('keydown', handleUploadKeydown);
      elements.uploadZone.addEventListener('dragenter', handleDragEnter);
      elements.uploadZone.addEventListener('dragover', handleDragOver);
      elements.uploadZone.addEventListener('dragleave', handleDragLeave);
      elements.uploadZone.addEventListener('drop', handleDrop);
    }

    // File input change
    if (elements.fileInput) {
      elements.fileInput.addEventListener('change', handleFileSelect);
    }

    // Fullscreen button
    if (elements.fullscreenBtn) {
      elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Test Mock Data button
    if (elements.testMockBtn) {
      elements.testMockBtn.addEventListener('click', handleLoadMock);
    }

    // Sidebar toggle
    if (elements.sidebarToggle) {
      elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Sidebar show button (when collapsed)
    if (elements.sidebarShowBtn) {
      elements.sidebarShowBtn.addEventListener('click', toggleSidebar);
    }

    // Navigation items
    elements.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const screenNum = parseInt(item.dataset.screen);
        switchInnerScreen(screenNum);
        updateNavActive(item);
      });
    });

    // Preview toggle
    if (elements.previewToggle) {
      elements.previewToggle.addEventListener('click', togglePreviewMode);
    }

    // Preview return button
    if (elements.previewReturn) {
      elements.previewReturn.addEventListener('click', togglePreviewMode);
    }

    // Likert dots
    elements.likertDots.forEach(dot => {
      dot.addEventListener('click', () => handleLikertSelect(dot));
    });

    // Navigation arrows
    if (elements.prevBtn) {
      elements.prevBtn.addEventListener('click', goToPrevItem);
    }
    if (elements.nextBtn) {
      elements.nextBtn.addEventListener('click', goToNextItem);
    }

    // Reset button
    if (elements.resetBtn) {
      elements.resetBtn.addEventListener('click', resetQuestionnaire);
    }

    // Scale selector
    if (elements.scaleSelectorBtn) {
      elements.scaleSelectorBtn.addEventListener('click', openScaleSelector);
    }
    if (elements.scaleSelectorClose) {
      elements.scaleSelectorClose.addEventListener('click', closeScaleSelector);
    }
    if (elements.scaleSelectorBackdrop) {
      elements.scaleSelectorBackdrop.addEventListener('click', closeScaleSelector);
    }
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.scaleSelectorModal?.classList.contains('open')) {
        closeScaleSelector();
      }
    });

    // Fullscreen change event
    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
  }

  // ==================== SCREEN NAVIGATION ====================

  function showScreen(screenNumber) {
    if (screenNumber < 1 || screenNumber > state.totalScreens) return;

    state.currentScreen = screenNumber;

    // Handle welcome screen
    const welcomeScreen = document.getElementById('screen-1');
    if (screenNumber === 1) {
      welcomeScreen?.classList.add('active');
      elements.appContainer?.classList.remove('active');
      state.appActive = false;
    } else {
      welcomeScreen?.classList.remove('active');
      elements.appContainer?.classList.add('active');
      state.appActive = true;
      switchInnerScreen(screenNumber);
    }
  }

  function switchInnerScreen(screenNumber) {
    elements.innerScreens?.forEach((screen, index) => {
      const isActive = index + 2 === screenNumber; // +2 because inner screens start at 2
      screen.classList.toggle('active', isActive);
    });
    state.currentScreen = screenNumber;

    // Initialize flow editor when switching to screen 3
    if (screenNumber === 3 && typeof flowEditor !== 'undefined') {
      flowEditor.init();
      flowEditor.renderAll();
    }
  }

  function updateNavActive(activeItem) {
    elements.navItems.forEach(item => item.classList.remove('active'));
    activeItem.classList.add('active');
  }

  // Expose for external use
  window.goToScreen = showScreen;
  window.getAppState = () => ({ ...state });

  // ==================== SIDEBAR ====================

  function toggleSidebar() {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    elements.sidebar?.classList.toggle('collapsed', state.sidebarCollapsed);

    // Update tooltip text
    if (elements.sidebarToggleTooltip) {
      elements.sidebarToggleTooltip.textContent = state.sidebarCollapsed
        ? 'Tampilkan sidebar'
        : 'Sembunyikan sidebar';
    }
  }

  // ==================== PREVIEW MODE ====================

  function togglePreviewMode() {
    state.previewMode = !state.previewMode;
    document.body.classList.toggle('preview-mode', state.previewMode);
    elements.previewToggle?.classList.toggle('active', state.previewMode);
  }

  // ==================== UPLOAD HANDLERS ====================

  function handleUploadClick(e) {
    // Don't open file picker if clicking the mock data button
    if (e.target.closest('#test-mock-btn')) {
      return;
    }
    if (!state.isProcessing) {
      clearError();
      elements.fileInput?.click();
    }
  }

  function handleUploadKeydown(e) {
    if ((e.key === 'Enter' || e.key === ' ') && !state.isProcessing) {
      e.preventDefault();
      clearError();
      elements.fileInput?.click();
    }
  }

  let dragCounter = 0;

  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    elements.uploadZone.classList.add('drag-over');
    clearError();
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      elements.uploadZone.classList.remove('drag-over');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter = 0;
    elements.uploadZone.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }

  function handleFileSelect(e) {
    const files = e.target?.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    e.target.value = '';
  }

  // ==================== FILE VALIDATION ====================

  function isCSVFile(file) {
    return file.name.toLowerCase().endsWith('.csv');
  }

  function showError(message) {
    if (elements.errorMessage) {
      elements.errorMessage.textContent = message;
      elements.errorMessage.classList.add('visible');
      elements.uploadZone?.classList.add('has-error');
    }
  }

  function clearError() {
    if (elements.errorMessage) {
      elements.errorMessage.textContent = '';
      elements.errorMessage.classList.remove('visible');
      elements.uploadZone?.classList.remove('has-error');
    }
  }

  // ==================== CSV PARSING ====================

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) {
      return { headers: [], items: [], rawRowCount: 0 };
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
    const headers = parseCSVLine(lines[0], delimiter);

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, delimiter);
      const item = {};

      headers.forEach((header, index) => {
        item[header.trim() || `column_${index + 1}`] = values[index]?.trim() || '';
      });

      items.push(item);
    }

    return {
      headers: headers.map(h => h.trim()),
      items: items,
      rawRowCount: items.length
    };
  }

  function parseCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  // ==================== FILE PROCESSING ====================

  // Upload loading state management
  let uploadLoadingInterval = null;

  function showUploadLoading() {
    const uploadZone = document.getElementById('upload-zone');
    const loadingText = document.getElementById('upload-loading-text');

    uploadZone?.classList.add('processing');

    // Animated dots
    let dotCount = 0;
    if (loadingText) {
      loadingText.textContent = 'Memproses skala.';
      uploadLoadingInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 3;
        const dots = '.'.repeat(dotCount + 1);
        loadingText.textContent = 'Memproses skala' + dots;
      }, 400);
    }
  }

  function hideUploadLoading() {
    const uploadZone = document.getElementById('upload-zone');
    uploadZone?.classList.remove('processing');

    if (uploadLoadingInterval) {
      clearInterval(uploadLoadingInterval);
      uploadLoadingInterval = null;
    }
  }

  async function handleFiles(files) {
    const file = files[0];

    if (!isCSVFile(file)) {
      showError('Format tidak didukung. Gunakan file CSV.');
      return;
    }

    clearError();
    state.isProcessing = true;
    showUploadLoading();

    try {
      const content = await readFileAsText(file);
      state.csvRaw = content;

      console.log('[MLPA] CSV file loaded:', file.name);

      // Parse CSV to JSON
      const parsed = parseCSV(content);
      state.csvData = parsed;

      console.log('[MLPA] Parsed CSV:', parsed);

      let rootScale;

      // Try GPT structuring if configured
      if (typeof OpenAIAPI !== 'undefined' && OpenAIAPI.isConfigured()) {
        console.log('[MLPA] Calling GPT for scale structuring...');
        const structured = await OpenAIAPI.structureCSVToScale(parsed.items, file.name);
        console.log('[MLPA] GPT structuring result:', structured);

        // Check sanity-check result
        if (structured && structured.is_valid_scale === false) {
          console.warn('[MLPA] CSV rejected - not a valid scale');
          hideUploadLoading();
          const reason = structured.rejection_reason || 'Skala tidak terdeteksi dalam CSV ini.';
          showUploadErrorModal(reason);
          return;
        }

        // Ask user confirmation if GPT needs to group items into dimensions
        if (structured && structured.has_dimensions === false) {
          console.log('[MLPA] CSV has no dimensions - asking user confirmation');
          hideUploadLoading();

          // Show confirmation modal and wait for user decision
          const userConfirmed = await showDimensionConfirmModal();

          if (!userConfirmed) {
            console.log('[MLPA] User declined dimension grouping');
            return; // User cancelled, stay on upload screen
          }

          console.log('[MLPA] User confirmed dimension grouping');
          showUploadLoading(); // Show loading again while we build the scale
        }

        if (structured && structured.dimensions && structured.dimensions.length > 0) {
          rootScale = buildScaleFromGPT(structured, file.name);
        } else {
          console.warn('[MLPA] GPT structuring invalid, using fallback');
          rootScale = createFallbackScale(parsed.items, file.name);
        }
      } else {
        console.log('[MLPA] OpenAI API not configured, using fallback');
        rootScale = createFallbackScale(parsed.items, file.name);
      }

      // Clear existing scales (single CSV policy)
      state.canvasState.scales.clear();

      // Add to scale graph
      state.canvasState.scales.set(rootScale.scale_id, rootScale);
      state.canvasState.activeScaleId = rootScale.scale_id;

      // Initialize preview via selectScale
      selectScale(rootScale.scale_id);

      console.log('[MLPA] Scale created and selected:', rootScale.scale_id);

      // Hide loading before transition
      hideUploadLoading();

      // Transition to main app
      showScreen(2);

    } catch (error) {
      console.error('[MLPA] File processing error:', error);
      hideUploadLoading();

      // Show structured error message in modal
      const errorMessage = error.message || error.type || 'Terjadi kesalahan. Coba lagi.';
      showUploadErrorModal(errorMessage);
    } finally {
      state.isProcessing = false;
    }
  }

  // Show dimension confirmation modal and return promise
  function showDimensionConfirmModal() {
    return new Promise((resolve) => {
      const modal = document.getElementById('dimension-confirm-modal');
      const yesBtn = document.getElementById('dimension-confirm-yes');
      const noBtn = document.getElementById('dimension-confirm-no');

      modal.classList.remove('hidden');

      const handleYes = () => {
        modal.classList.add('hidden');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        resolve(true);
      };

      const handleNo = () => {
        modal.classList.add('hidden');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        resolve(false);
      };

      yesBtn.addEventListener('click', handleYes);
      noBtn.addEventListener('click', handleNo);
    });
  }

  /**
   * Build Scale object from GPT structuring result
   */
  function buildScaleFromGPT(gptResult, filename) {
    return {
      scale_id: 'imported-scale',
      scale_name: gptResult.scale_name || filename.replace(/\.csv$/i, ''),
      parent_scale_id: null,
      is_root: true,
      expanded: false,
      depth: 0,
      position: { x: 100, y: 250 },
      dimensions: gptResult.dimensions.map(dim => ({
        name: dim.name,
        items: dim.items.map((item, i) => ({
          item_id: item.item_id || `imported-${i + 1}`,
          origin_item_id: item.item_id || `imported-${i + 1}`,
          text: item.text,
          baseline_rubric: item.baseline_rubric || [],
          current_rubric: item.baseline_rubric || [],
          dimension: dim.name
        }))
      }))
    };
  }

  /**
   * Create fallback Scale when GPT is unavailable
   */
  function createFallbackScale(parsedItems, filename) {
    const scaleName = filename
      .replace(/\.csv$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) || 'Skala Impor';

    return {
      scale_id: 'imported-scale',
      scale_name: scaleName,
      parent_scale_id: null,
      is_root: true,
      expanded: false,
      depth: 0,
      position: { x: 100, y: 250 },
      dimensions: [{
        name: 'Item Impor',
        items: parsedItems.map((item, i) => ({
          item_id: item.item_id || `imported-${i + 1}`,
          origin_item_id: item.item_id || `imported-${i + 1}`,
          text: item.item_text || item.text || Object.values(item).find(v => typeof v === 'string' && v.length > 10) || '',
          baseline_rubric: [],
          current_rubric: [],
          dimension: 'Item Impor'
        }))
      }]
    };
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // ==================== QUESTIONNAIRE ====================

  function initQuestionnaire() {
    state.currentItemIndex = 0;
    state.answers = {};
    state.isCompleted = false;

    // Show questionnaire, hide completion
    elements.questionnaire?.classList.remove('hidden');
    elements.completion?.classList.add('hidden');

    updateQuestionnaireUI();
  }

  function updateQuestionnaireUI() {
    if (!state.items || state.items.length === 0) {
      elements.itemText.textContent = 'Tidak ada item untuk ditampilkan';
      return;
    }

    const item = state.items[state.currentItemIndex];
    const total = state.items.length;

    // Update counter
    if (elements.itemCounter) {
      elements.itemCounter.textContent = `Item ${state.currentItemIndex + 1} / ${total}`;
    }

    // Update item text - try common column names
    const textValue = item.item_text || item.text || item.question || item.pernyataan ||
      Object.values(item).find(v => typeof v === 'string' && v.length > 10) ||
      Object.values(item)[1] || 'No text available';

    if (elements.itemText) {
      elements.itemText.textContent = textValue;
    }

    // Update Likert selection state
    updateLikertUI();

    // Update navigation buttons
    updateNavButtons();
  }

  function updateLikertUI() {
    const currentAnswer = state.answers[state.currentItemIndex];

    elements.likertDots.forEach(dot => {
      const value = parseInt(dot.dataset.value);
      dot.classList.toggle('selected', value === currentAnswer);
    });
  }

  function updateNavButtons() {
    if (elements.prevBtn) {
      elements.prevBtn.disabled = state.currentItemIndex === 0;
    }
    if (elements.nextBtn) {
      elements.nextBtn.disabled = state.currentItemIndex >= state.items.length - 1;
    }
  }

  function handleLikertSelect(dot) {
    const value = parseInt(dot.dataset.value);
    state.answers[state.currentItemIndex] = value;

    console.log('[MLPA] Answer recorded:', state.currentItemIndex + 1, '=', value);

    // Update UI
    updateLikertUI();

    // Auto-advance after brief delay
    setTimeout(() => {
      if (state.currentItemIndex < state.items.length - 1) {
        goToNextItem();
      } else {
        // Check if all items answered
        checkCompletion();
      }
    }, 300);
  }

  function goToPrevItem() {
    if (state.currentItemIndex > 0) {
      state.currentItemIndex--;
      updateQuestionnaireUI();
    }
  }

  function goToNextItem() {
    if (state.currentItemIndex < state.items.length - 1) {
      state.currentItemIndex++;
      updateQuestionnaireUI();
    }
  }

  function checkCompletion() {
    const answeredCount = Object.keys(state.answers).length;
    const totalItems = state.items.length;

    if (answeredCount >= totalItems) {
      showCompletion();
    }
  }

  function showCompletion() {
    state.isCompleted = true;

    // Calculate total score (sum of all answers)
    const answers = Object.values(state.answers);
    const totalScore = answers.reduce((a, b) => a + b, 0);
    const maxScore = state.items.length * 5; // 5 is max Likert value

    if (elements.finalScore) {
      elements.finalScore.textContent = totalScore;
    }
    if (elements.maxScore) {
      elements.maxScore.textContent = maxScore;
    }

    // Show completion, hide questionnaire
    elements.questionnaire?.classList.add('hidden');
    elements.completion?.classList.remove('hidden');

    console.log('[MLPA] Questionnaire completed. Score:', totalScore, '/', maxScore);
  }

  function resetQuestionnaire() {
    console.log('[MLPA] Resetting questionnaire...');

    // Reset state
    state.currentItemIndex = 0;
    state.answers = {};
    state.isCompleted = false;

    // Hide completion, show questionnaire
    elements.completion?.classList.add('hidden');
    elements.questionnaire?.classList.remove('hidden');

    // Update UI
    updateQuestionnaireUI();

    console.log('[MLPA] Questionnaire reset complete');
  }

  // ==================== SCALE SELECTOR ====================

  function openScaleSelector() {
    if (!elements.scaleSelectorModal) return;

    // Render the graph before opening
    renderScaleSelectorGraph();

    // Open modal
    elements.scaleSelectorModal.classList.add('open');
    elements.scaleSelectorBtn?.classList.add('open');
  }

  function closeScaleSelector() {
    if (!elements.scaleSelectorModal) return;

    elements.scaleSelectorModal.classList.remove('open');
    elements.scaleSelectorBtn?.classList.remove('open');
  }

  function renderScaleSelectorGraph() {
    if (!elements.scaleSelectorNodes || !elements.scaleSelectorConnections) return;

    const scales = state.canvasState.scales;
    if (scales.size === 0) {
      elements.scaleSelectorNodes.innerHTML = '<p style="color: var(--color-text-muted); text-align: center;">Tidak ada skala tersedia</p>';
      elements.scaleSelectorConnections.innerHTML = '';
      return;
    }

    // Build tree structure from parent_scale_id relationships
    const tree = buildScaleTree(scales);

    // Render nodes with tree layout (indentation based on depth)
    let nodesHtml = '';
    const nodePositions = new Map(); // For connector rendering
    let nodeIndex = 0;

    function renderNode(scaleId, depth) {
      const scale = scales.get(scaleId);
      if (!scale) return;

      const isSelected = state.selectedScaleId === scaleId;
      const indent = depth * 32; // 32px indent per depth level

      nodesHtml += `
        <div class="scale-node ${isSelected ? 'selected' : ''}" 
             data-scale-id="${scaleId}" 
             style="margin-left: ${indent}px;">
          <span class="scale-node-dot"></span>
          <span class="scale-node-name">${scale.scale_name}</span>
          ${depth > 0 ? `<span class="scale-node-depth">Cabang</span>` : '<span class="scale-node-depth">Asal</span>'}
        </div>
      `;

      nodePositions.set(scaleId, { index: nodeIndex, depth });
      nodeIndex++;

      // Render children
      const children = tree.get(scaleId) || [];
      children.forEach(childId => renderNode(childId, depth + 1));
    }

    // Find root nodes (no parent or parent not in scales)
    const roots = [];
    for (const [id, scale] of scales) {
      if (!scale.parent_scale_id || !scales.has(scale.parent_scale_id)) {
        roots.push(id);
      }
    }

    // Render from each root
    roots.forEach(rootId => renderNode(rootId, 0));

    elements.scaleSelectorNodes.innerHTML = nodesHtml;

    // Bind click events to nodes
    elements.scaleSelectorNodes.querySelectorAll('.scale-node').forEach(node => {
      node.addEventListener('click', () => {
        const scaleId = node.dataset.scaleId;
        selectScale(scaleId);
      });
    });

    // Render simple vertical connectors (optional, can be enhanced)
    // For simplicity, we'll skip SVG connectors and rely on indentation
    elements.scaleSelectorConnections.innerHTML = '';
  }

  function buildScaleTree(scales) {
    // Map of parent_scale_id -> [child_scale_ids]
    const tree = new Map();

    for (const [id, scale] of scales) {
      if (scale.parent_scale_id) {
        if (!tree.has(scale.parent_scale_id)) {
          tree.set(scale.parent_scale_id, []);
        }
        tree.get(scale.parent_scale_id).push(id);
      }
    }

    return tree;
  }

  function selectScale(scaleId) {
    if (!scaleId) return;

    const scale = state.canvasState.scales.get(scaleId);
    if (!scale) {
      console.warn('[MLPA] Scale not found:', scaleId);
      return;
    }

    console.log('[MLPA] Selecting scale:', scale.scale_name);

    // Update state
    state.selectedScaleId = scaleId;

    // Update button label
    if (elements.scaleSelectorLabel) {
      elements.scaleSelectorLabel.textContent = scale.scale_name;
    }

    // Extract items from selected scale and set for questionnaire
    state.items = getScaleItems(scale);
    state.currentItemIndex = 0;
    state.answers = {};
    state.isCompleted = false;

    // Refresh questionnaire UI
    elements.completion?.classList.add('hidden');
    elements.questionnaire?.classList.remove('hidden');
    updateQuestionnaireUI();

    // Close the selector modal
    closeScaleSelector();

    console.log('[MLPA] Scale selected, items loaded:', state.items.length);
  }

  function getScaleItems(scale) {
    // Flatten all items from all dimensions
    const items = [];

    if (Array.isArray(scale.dimensions)) {
      scale.dimensions.forEach(dim => {
        if (Array.isArray(dim.items)) {
          dim.items.forEach(item => {
            items.push({
              ...item,
              dimension: dim.name
            });
          });
        }
      });
    }

    return items;
  }

  // ==================== MOCK DATA ====================

  // Mock items with proper structure (dual rubric, origin mapping)
  const MOCK_ITEMS = [
    // === SKALA ASLI ===
    // Dimension 1: Kepercayaan Diri (items 1-3)
    {
      item_id: '1',
      origin_item_id: '1',
      text: 'Saya merasa percaya diri dalam menghadapi tantangan baru',
      baseline_rubric: ['Kepercayaan diri', 'Menghadapi tantangan', 'Merasa', 'Konteks: Situasi baru', 'Sudut pandang orang pertama'],
      current_rubric: ['Kepercayaan diri', 'Menghadapi tantangan', 'Merasa', 'Konteks: Situasi baru', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri',
      scale_group: 'asli'
    },
    {
      item_id: '2',
      origin_item_id: '2',
      text: 'Saya merasa bernilai dan dihargai oleh orang lain',
      baseline_rubric: ['Nilai diri', 'Dihargai', 'Merasa', 'Oleh orang lain', 'Sudut pandang orang pertama'],
      current_rubric: ['Nilai diri', 'Dihargai', 'Merasa', 'Oleh orang lain', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri',
      scale_group: 'asli'
    },
    {
      item_id: '3',
      origin_item_id: '3',
      text: 'Saya dapat mengatasi masalah dengan baik dan tenang',
      baseline_rubric: ['Mengatasi masalah', 'Ketenangan', 'Dapat', 'Sudut pandang orang pertama'],
      current_rubric: ['Mengatasi masalah', 'Ketenangan', 'Dapat', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri',
      scale_group: 'asli'
    },
    // Dimension 2: Regulasi Emosi (items 4-7)
    {
      item_id: '4',
      origin_item_id: '4',
      text: 'Saya mampu mengekspresikan perasaan saya dengan jelas',
      baseline_rubric: ['Ekspresi perasaan', 'Kejelasan', 'Mampu', 'Sudut pandang orang pertama'],
      current_rubric: ['Ekspresi perasaan', 'Kejelasan', 'Mampu', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi',
      scale_group: 'asli'
    },
    {
      item_id: '5',
      origin_item_id: '5',
      text: 'Saya merasa nyaman ketika berinteraksi dengan orang baru',
      baseline_rubric: ['Kenyamanan', 'Interaksi sosial', 'Merasa', 'Konteks: Orang baru', 'Sudut pandang orang pertama'],
      current_rubric: ['Kenyamanan', 'Interaksi sosial', 'Merasa', 'Konteks: Orang baru', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi',
      scale_group: 'asli'
    },
    {
      item_id: '6',
      origin_item_id: '6',
      text: 'Saya dapat menerima kritik dengan sikap terbuka',
      baseline_rubric: ['Penerimaan kritik', 'Keterbukaan', 'Dapat', 'Sudut pandang orang pertama'],
      current_rubric: ['Penerimaan kritik', 'Keterbukaan', 'Dapat', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi',
      scale_group: 'asli'
    },
    {
      item_id: '7',
      origin_item_id: '7',
      text: 'Saya mampu mengelola stres dengan efektif',
      baseline_rubric: ['Pengelolaan stres', 'Efektivitas', 'Mampu', 'Sudut pandang orang pertama'],
      current_rubric: ['Pengelolaan stres', 'Efektivitas', 'Mampu', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi',
      scale_group: 'asli'
    },
    // Dimension 3: Optimisme (items 8-10)
    {
      item_id: '8',
      origin_item_id: '8',
      text: 'Saya merasa optimis tentang masa depan saya',
      baseline_rubric: ['Optimisme', 'Merasa', 'Waktu: Masa depan', 'Sudut pandang orang pertama'],
      current_rubric: ['Optimisme', 'Merasa', 'Waktu: Masa depan', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme',
      scale_group: 'asli'
    },
    {
      item_id: '9',
      origin_item_id: '9',
      text: 'Saya merasa puas dengan pencapaian hidup saya sejauh ini',
      baseline_rubric: ['Kepuasan', 'Pencapaian Hidup', 'Merasa', 'Sudut Pandang Orang Pertama', 'Waktu: Sejauh Ini'],
      current_rubric: ['Kepuasan', 'Pencapaian Hidup', 'Merasa', 'Sudut Pandang Orang Pertama', 'Waktu: Sejauh Ini'],
      dimension: 'Optimisme',
      scale_group: 'asli'
    },
    {
      item_id: '10',
      origin_item_id: '10',
      text: 'Saya merasa memiliki tujuan hidup yang jelas',
      baseline_rubric: ['Tujuan hidup', 'Merasa', 'Sudut pandang orang pertama'],
      current_rubric: ['Tujuan hidup', 'Merasa', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme',
      scale_group: 'asli'
    },

    // === SKALA GEN-Z (Branch 1) ===
    // Dimension 1
    {
      item_id: 'skala-asli-branch-1-item-1',
      origin_item_id: '1',
      text: 'Saya berani mencoba hal baru tanpa ragu',
      baseline_rubric: ['Kepercayaan diri', 'Menghadapi tantangan', 'Merasa', 'Konteks: Situasi baru', 'Sudut pandang orang pertama'],
      current_rubric: ['Keberanian', 'Mencoba hal baru', 'Tanpa keraguan', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri & Keberanian',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-2',
      origin_item_id: '2',
      text: 'Saya merasa dihargai dan berarti di lingkungan saya',
      baseline_rubric: ['Nilai diri', 'Dihargai', 'Merasa', 'Oleh orang lain', 'Sudut pandang orang pertama'],
      current_rubric: ['Nilai diri', 'Dihargai', 'Merasa', 'Konteks: Lingkungan', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri & Keberanian',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-3',
      origin_item_id: '3',
      text: 'Saya bisa mengatasi masalah dengan kepala dingin dan percaya diri',
      baseline_rubric: ['Mengatasi masalah', 'Ketenangan', 'Dapat', 'Sudut pandang orang pertama'],
      current_rubric: ['Mengatasi masalah', 'Ketenangan', 'Kepercayaan diri', 'Bisa', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri & Keberanian',
      scale_group: 'genz'
    },
    // Dimension 2
    {
      item_id: 'skala-asli-branch-1-item-4',
      origin_item_id: '4',
      text: 'Saya bisa mengekspresikan perasaan saya secara jujur dan jelas',
      baseline_rubric: ['Ekspresi perasaan', 'Kejelasan', 'Mampu', 'Sudut pandang orang pertama'],
      current_rubric: ['Ekspresi perasaan', 'Kejujuran', 'Kejelasan', 'Bisa', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi & Interaksi',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-5',
      origin_item_id: '5',
      text: 'Saya merasa nyaman dan tidak awkward saat bertemu orang baru',
      baseline_rubric: ['Kenyamanan', 'Interaksi sosial', 'Merasa', 'Konteks: Orang baru', 'Sudut pandang orang pertama'],
      current_rubric: ['Kenyamanan', 'Tidak canggung', 'Merasa', 'Konteks: Orang baru', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi & Interaksi',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-6',
      origin_item_id: '6',
      text: 'Saya bisa menerima kritik tanpa baper dan belajar darinya',
      baseline_rubric: ['Penerimaan kritik', 'Keterbukaan', 'Dapat', 'Sudut pandang orang pertama'],
      current_rubric: ['Penerimaan kritik', 'Stabilitas emosi', 'Belajar', 'Bisa', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi & Interaksi',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-7',
      origin_item_id: '7',
      text: 'Saya mampu mengatur stres agar tidak merasa overwhelmed',
      baseline_rubric: ['Pengelolaan stres', 'Efektivitas', 'Mampu', 'Sudut pandang orang pertama'],
      current_rubric: ['Pengelolaan stres', 'Menghindari kewalahan', 'Mampu', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi & Interaksi',
      scale_group: 'genz'
    },
    // Dimension 3
    {
      item_id: 'skala-asli-branch-1-item-8',
      origin_item_id: '8',
      text: 'Saya optimis tentang masa depan dan peluang yang akan datang',
      baseline_rubric: ['Optimisme', 'Merasa', 'Waktu: Masa depan', 'Sudut pandang orang pertama'],
      current_rubric: ['Optimisme', 'Peluang', 'Merasa', 'Waktu: Masa depan', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme dan Tujuan (Goals)',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-9',
      origin_item_id: '9',
      text: 'Saya merasa bangga dan puas dengan pencapaian saya sejauh ini',
      baseline_rubric: ['Kepuasan', 'Pencapaian hidup', 'Merasa', 'Waktu: Sejauh ini', 'Sudut pandang orang pertama'],
      current_rubric: ['Kepuasan', 'Kebanggaan', 'Pencapaian', 'Merasa', 'Waktu: Sejauh ini', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme dan Tujuan (Goals)',
      scale_group: 'genz'
    },
    {
      item_id: 'skala-asli-branch-1-item-10',
      origin_item_id: '10',
      text: 'Saya memiliki tujuan hidup atau goals yang jelas untuk dicapai',
      baseline_rubric: ['Tujuan hidup', 'Kejelasan', 'Memiliki', 'Sudut pandang orang pertama'],
      current_rubric: ['Tujuan hidup', 'Goals', 'Kejelasan', 'Memiliki', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme dan Tujuan (Goals)',
      scale_group: 'genz'
    },

    // === SKALA BOOMER (Branch 2) ===
    // Dimension 1
    {
      item_id: 'skala-asli-branch-2-item-1',
      origin_item_id: '1',
      text: 'Saya merasa percaya diri menghadapi perubahan dan tantangan yang muncul pada usia saya',
      baseline_rubric: ['Kepercayaan diri', 'Menghadapi tantangan', 'Merasa', 'Konteks: Situasi baru', 'Sudut pandang orang pertama'],
      current_rubric: ['Kepercayaan diri', 'Menghadapi perubahan', 'Menghadapi tantangan', 'Merasa', 'Konteks: Usia', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri pada Usia Boomer',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-2',
      origin_item_id: '2',
      text: 'Saya merasa dihargai dan dianggap berarti oleh keluarga dan komunitas saya',
      baseline_rubric: ['Nilai diri', 'Dihargai', 'Merasa', 'Oleh orang lain', 'Sudut pandang orang pertama'],
      current_rubric: ['Nilai diri', 'Dihargai', 'Merasa', 'Konteks: Keluarga', 'Konteks: Komunitas', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri pada Usia Boomer',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-3',
      origin_item_id: '3',
      text: 'Saya mampu menyelesaikan masalah sehari-hari dan menghadapi situasi sulit dengan tenang',
      baseline_rubric: ['Mengatasi masalah', 'Ketenangan', 'Dapat', 'Sudut pandang orang pertama'],
      current_rubric: ['Menyelesaikan masalah', 'Menghadapi situasi sulit', 'Ketenangan', 'Mampu', 'Konteks: Sehari-hari', 'Sudut pandang orang pertama'],
      dimension: 'Kepercayaan Diri pada Usia Boomer',
      scale_group: 'boomer'
    },
    // Dimension 2
    {
      item_id: 'skala-asli-branch-2-item-4',
      origin_item_id: '4',
      text: 'Saya dapat mengungkapkan perasaan saya kepada keluarga atau teman dengan jujur dan tepat',
      baseline_rubric: ['Ekspresi perasaan', 'Kejelasan', 'Mampu', 'Sudut pandang orang pertama'],
      current_rubric: ['Ekspresi perasaan', 'Kejujuran', 'Ketepatan', 'Dapat', 'Konteks: Keluarga/teman', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi dan Interaksi Sosial',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-5',
      origin_item_id: '5',
      text: 'Saya merasa nyaman saat berinteraksi dengan orang baru, termasuk yang berasal dari generasi berbeda',
      baseline_rubric: ['Kenyamanan', 'Interaksi sosial', 'Merasa', 'Konteks: Orang baru', 'Sudut pandang orang pertama'],
      current_rubric: ['Kenyamanan', 'Interaksi sosial', 'Merasa', 'Konteks: Orang baru', 'Konteks: Generasi berbeda', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi dan Interaksi Sosial',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-6',
      origin_item_id: '6',
      text: 'Saya menerima masukan atau kritik dari orang lain dengan sikap terbuka dan bijaksana',
      baseline_rubric: ['Penerimaan kritik', 'Keterbukaan', 'Dapat', 'Sudut pandang orang pertama'],
      current_rubric: ['Penerimaan kritik', 'Keterbukaan', 'Kebijaksanaan', 'Menerima', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi dan Interaksi Sosial',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-7',
      origin_item_id: '7',
      text: 'Saya mampu mengelola stres terkait kesehatan, tanggung jawab keluarga, atau perubahan hidup secara efektif',
      baseline_rubric: ['Pengelolaan stres', 'Efektivitas', 'Mampu', 'Sudut pandang orang pertama'],
      current_rubric: ['Pengelolaan stres', 'Efektivitas', 'Mampu', 'Konteks: Kesehatan', 'Konteks: Keluarga', 'Konteks: Perubahan hidup', 'Sudut pandang orang pertama'],
      dimension: 'Regulasi Emosi dan Interaksi Sosial',
      scale_group: 'boomer'
    },
    // Dimension 3
    {
      item_id: 'skala-asli-branch-2-item-8',
      origin_item_id: '8',
      text: 'Saya merasa optimis tentang kualitas hidup dan kesejahteraan saya di masa mendatang',
      baseline_rubric: ['Optimisme', 'Merasa', 'Waktu: Masa depan', 'Sudut pandang orang pertama'],
      current_rubric: ['Optimisme', 'Kualitas hidup', 'Kesejahteraan', 'Merasa', 'Waktu: Masa depan', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme dan Makna Hidup',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-9',
      origin_item_id: '9',
      text: 'Saya merasa puas dan bangga dengan pencapaian hidup serta peran yang telah saya jalani',
      baseline_rubric: ['Kepuasan', 'Pencapaian hidup', 'Merasa', 'Waktu: Sejauh ini', 'Sudut pandang orang pertama'],
      current_rubric: ['Kepuasan', 'Kebanggaan', 'Pencapaian hidup', 'Peran', 'Merasa', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme dan Makna Hidup',
      scale_group: 'boomer'
    },
    {
      item_id: 'skala-asli-branch-2-item-10',
      origin_item_id: '10',
      text: 'Saya memiliki tujuan atau kegiatan yang memberi arti dan semangat pada kehidupan saya saat ini',
      baseline_rubric: ['Tujuan hidup', 'Kejelasan', 'Memiliki', 'Sudut pandang orang pertama'],
      current_rubric: ['Tujuan hidup', 'Kegiatan bermakna', 'Semangat', 'Memiliki', 'Waktu: Saat ini', 'Sudut pandang orang pertama'],
      dimension: 'Optimisme dan Makna Hidup',
      scale_group: 'boomer'
    }
  ];

  // Mock scale structure
  // Mock scale structure (Root only)
  function createMockScale() {
    // Filter items for Asli
    const itemsAsli = MOCK_ITEMS.filter(i => i.scale_group === 'asli');

    // Group items by dimension
    const dimensions = [
      { name: 'Kepercayaan Diri', items: itemsAsli.filter(i => i.dimension === 'Kepercayaan Diri') },
      { name: 'Regulasi Emosi', items: itemsAsli.filter(i => i.dimension === 'Regulasi Emosi') },
      { name: 'Optimisme', items: itemsAsli.filter(i => i.dimension === 'Optimisme') }
    ];

    return {
      scale_id: 'skala-asli',
      scale_name: 'Skala Asli - Skala Kepercayaan Diri',
      parent_scale_id: null,
      is_root: true,
      expanded: false,
      depth: 0,
      position: { x: 100, y: 250 },
      dimensions: dimensions
    };
  }

  function handleLoadMock() {
    console.log('[MLPA] Loading mock data for testing...');

    // 1. Create and set Root Scale
    const rootScale = createMockScale();
    state.canvasState.scales.set(rootScale.scale_id, rootScale);
    state.canvasState.activeScaleId = rootScale.scale_id;

    // 2. Create Gen-Z Branch (Branch 1) - Using standard layout logic
    const genzPos = flowEditor.getNextBranchPosition(rootScale.scale_id, 0);
    const itemsGenz = MOCK_ITEMS.filter(i => i.scale_group === 'genz');
    const dimsGenz = [
      { name: 'Kepercayaan Diri & Keberanian', items: itemsGenz.filter(i => i.dimension === 'Kepercayaan Diri & Keberanian') },
      { name: 'Regulasi Emosi & Interaksi', items: itemsGenz.filter(i => i.dimension === 'Regulasi Emosi & Interaksi') },
      { name: 'Optimisme dan Tujuan (Goals)', items: itemsGenz.filter(i => i.dimension === 'Optimisme dan Tujuan (Goals)') }
    ];

    const genzScale = {
      scale_id: 'skala-genz',
      scale_name: 'Skala Gen-Z - Skala Kepercayaan Diri',
      parent_scale_id: rootScale.scale_id,
      is_root: false,
      expanded: false,
      depth: genzPos.depth,
      branch_index: genzPos.branch_index,
      position: { x: genzPos.x, y: genzPos.y },
      positionLocked: true,
      dimensions: dimsGenz
    };
    state.canvasState.scales.set(genzScale.scale_id, genzScale);

    // 3. Create Boomer Branch (Branch 2) - Using standard layout logic
    const boomerPos = flowEditor.getNextBranchPosition(rootScale.scale_id, 1);
    const itemsBoomer = MOCK_ITEMS.filter(i => i.scale_group === 'boomer');
    const dimsBoomer = [
      { name: 'Kepercayaan Diri pada Usia Boomer', items: itemsBoomer.filter(i => i.dimension === 'Kepercayaan Diri pada Usia Boomer') },
      { name: 'Regulasi Emosi dan Interaksi Sosial', items: itemsBoomer.filter(i => i.dimension === 'Regulasi Emosi dan Interaksi Sosial') },
      { name: 'Optimisme dan Makna Hidup', items: itemsBoomer.filter(i => i.dimension === 'Optimisme dan Makna Hidup') }
    ];

    const boomerScale = {
      scale_id: 'skala-boomer',
      scale_name: 'Skala Boomer - Skala Kepercayaan Diri',
      parent_scale_id: rootScale.scale_id,
      is_root: false,
      expanded: false,
      depth: boomerPos.depth,
      branch_index: boomerPos.branch_index,
      position: { x: boomerPos.x, y: boomerPos.y },
      positionLocked: true,
      dimensions: dimsBoomer
    };
    state.canvasState.scales.set(boomerScale.scale_id, boomerScale);

    // Select root scale for preview (this sets items, updates button label, etc.)
    selectScale(rootScale.scale_id);

    console.log('[MLPA] Mock data loaded: Root + 2 Branches');

    // Transition to main app
    showScreen(2);
  }

  // ==================== FLOW EDITOR (Screen 3) ====================

  const DEBUG_FLOW_EDITOR = false; // Set to false to hide debug info

  const flowEditor = {
    canvas: null,
    boxesContainer: null,
    connectionsLayer: null,
    isPanning: false,
    panStart: { x: 0, y: 0 },
    debugPanel: null,

    // Edit mode state
    activeEditItem: null,
    editBackupText: '',

    // Loading animation state
    loadingDotsInterval: null,

    init() {
      this.canvas = document.getElementById('flow-canvas');
      this.worldLayer = document.getElementById('flow-world');
      this.boxesContainer = document.getElementById('flow-boxes');
      this.connectionsLayer = document.getElementById('flow-connections');

      if (this.canvas) {
        this.bindPanning();
      }

      // Bind branching popup
      const branchCloseBtn = document.getElementById('branching-popup-close');
      if (branchCloseBtn) {
        branchCloseBtn.addEventListener('click', () => this.closeBranchingPopup());
      }

      // Bind branching submit button (use mousedown for immediate response)
      const branchSubmitBtn = document.getElementById('branching-submit');
      if (branchSubmitBtn) {
        branchSubmitBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();  // Prevent focus issues
          this.handleBranchingSubmit();
        });
      }

      // Bind global export
      const exportBtn = document.getElementById('global-export-btn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.exportAllScales());
      }

      // Initialize debug panel
      if (DEBUG_FLOW_EDITOR) {
        this.initDebugPanel();
      }
    },

    bindPanning() {
      this.canvas.addEventListener('mousedown', (e) => {
        // Only pan if clicking on canvas background, not on flow boxes
        if (e.target === this.canvas || e.target === this.boxesContainer) {
          this.isPanning = true;
          this.panStart = { x: e.clientX - state.canvasState.pan.x, y: e.clientY - state.canvasState.pan.y };
          this.canvas.style.cursor = 'grabbing';
        }
      });

      document.addEventListener('mousemove', (e) => {
        if (!this.isPanning) return;
        state.canvasState.pan.x = e.clientX - this.panStart.x;
        state.canvasState.pan.y = e.clientY - this.panStart.y;
        this.updateCanvasTransform();
      });

      document.addEventListener('mouseup', () => {
        if (this.isPanning) {
          this.isPanning = false;
          this.canvas.style.cursor = 'grab';
        }
      });
    },

    updateCanvasTransform() {
      if (this.worldLayer) {
        this.worldLayer.style.transform = `translate(${state.canvasState.pan.x}px, ${state.canvasState.pan.y}px)`;
      }
    },

    updateCanvasBounds() {
      if (!this.boxesContainer) return;

      let maxBottom = 0;

      document.querySelectorAll('.flow-box').forEach(box => {
        const bottom = box.offsetTop + box.offsetHeight;
        if (bottom > maxBottom) maxBottom = bottom;
      });

      // Add padding buffer (100px)
      const requiredHeight = maxBottom + 100;

      // Ensure minimum height matches viewport
      const minHeight = this.canvas ? this.canvas.clientHeight : window.innerHeight;
      const finalHeight = Math.max(requiredHeight, minHeight);

      this.boxesContainer.style.height = `${finalHeight}px`;
    },

    renderAll() {
      if (!this.boxesContainer) return;
      this.boxesContainer.innerHTML = '';

      state.canvasState.scales.forEach((scale) => {
        // Auto-position ONLY if position is undefined AND not locked
        // Invariant: Branched scales have positionLocked=true and are never auto-positioned
        if (!scale.position && !scale.positionLocked && this.canvas) {
          const canvasHeight = this.canvas.clientHeight || window.innerHeight;
          const estimatedBoxHeight = 120;
          scale.position = {
            x: 100,
            y: (canvasHeight - estimatedBoxHeight) * 0.5
          };
        }

        const flowBoxHtml = this.createFlowBoxHtml(scale);
        this.boxesContainer.insertAdjacentHTML('beforeend', flowBoxHtml);
      });

      this.bindFlowBoxEvents();
      this.renderConnections();

      // Update debug panel
      if (DEBUG_FLOW_EDITOR) {
        this.updateDebugPanel();
      }

      // Update virtual canvas bounds
      this.updateCanvasBounds();
    },

    createFlowBoxHtml(scale) {
      let globalItemIndex = 1;
      const dimensions = Array.isArray(scale.dimensions) ? scale.dimensions : [];
      const dimensionsHtml = dimensions.map((dim, index) => {
        const safeDimension = dim && typeof dim === 'object' ? dim : {};
        const items = Array.isArray(safeDimension.items) ? safeDimension.items : [];
        const html = this.createDimensionHtml({ ...safeDimension, items }, index + 1, globalItemIndex, scale);
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
    },

    createDimensionHtml(dimension, index, startItemIndex, scale) {
      const safeDimension = dimension && typeof dimension === 'object' ? dimension : {};
      const items = Array.isArray(safeDimension.items) ? safeDimension.items : [];
      const itemsHtml = items.map((item, idx) => this.createItemHtml(item, startItemIndex + idx, scale)).join('');
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
    },

    createItemHtml(item, itemIndex, scale) {
      const safeItem = item && typeof item === 'object' ? item : {};
      const integrityClass = this.getIntegrityClass(safeItem, scale);
      const rubricHtml = this.createRubricPopupHtml(safeItem);
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
    },

    createRubricPopupHtml(item) {
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
    },

    getIntegrityClass(item, scale) {
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
    },

    bindFlowBoxEvents() {
      // Toggle expand/collapse
      document.querySelectorAll('.flow-box-header').forEach(header => {
        header.addEventListener('click', (e) => {
          const flowBox = e.target.closest('.flow-box');
          const scaleId = flowBox.dataset.scaleId;
          const scale = state.canvasState.scales.get(scaleId);
          if (scale) {
            scale.expanded = !scale.expanded;
            flowBox.classList.toggle('flow-mode-collapsed', !scale.expanded);

            // Update canvas bounds after animation completes
            setTimeout(() => this.updateCanvasBounds(), 350);
          }
        });
      });

      // Edit mode toggle (flow-level permission)
      document.querySelectorAll('.edit-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const flowBox = e.target.closest('.flow-box');
          const scaleId = flowBox.dataset.scaleId;
          const scale = state.canvasState.scales.get(scaleId);

          const isEntering = !flowBox.classList.contains('flow-edit-mode');

          if (isEntering) {
            // Exit edit mode on any other flow boxes first (confirm their active edits)
            document.querySelectorAll('.flow-box.flow-edit-mode').forEach(box => {
              this.confirmOrRevertEdit();
              box.classList.remove('flow-edit-mode');
            });

            // Auto-expand if collapsed
            if (scale && !scale.expanded) {
              scale.expanded = true;
              flowBox.classList.remove('flow-mode-collapsed');
              setTimeout(() => this.updateCanvasBounds(), 350);
            }

            // Enter edit mode
            flowBox.classList.add('flow-edit-mode');
            this.showEditTooltip(btn);
          } else {
            // Confirm any active edit before exiting
            this.confirmOrRevertEdit();
            flowBox.classList.remove('flow-edit-mode');
            this.showNotification('Edit item dinonaktifkan');
          }
        });
      });

      // Click handler for edit mode interactions
      document.addEventListener('click', (e) => {
        const clickedItem = e.target.closest('.item-box');
        const activeEditBox = document.querySelector('.flow-box.flow-edit-mode');

        // Handle click on item in edit mode
        if (clickedItem && activeEditBox && activeEditBox.contains(clickedItem)) {
          // If clicking on a different item than the one being edited
          if (this.activeEditItem && this.activeEditItem !== clickedItem) {
            this.confirmOrRevertEdit();
          }

          // Start editing this item if not already
          if (!clickedItem.classList.contains('item-editing')) {
            e.stopPropagation();
            this.startEditItem(clickedItem);
          }
          return;
        }

        // Click outside active edit item → confirm if dirty
        if (this.activeEditItem && !this.activeEditItem.contains(e.target)) {
          this.confirmOrRevertEdit();
        }

        // Click outside flow box in edit mode → exit edit mode
        if (activeEditBox && !activeEditBox.contains(e.target)) {
          activeEditBox.classList.remove('flow-edit-mode');
          this.showNotification('Edit item dinonaktifkan');
        }
      });

      // Branch button
      document.querySelectorAll('.branch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const flowBox = e.target.closest('.flow-box');
          const scaleId = flowBox.dataset.scaleId;
          this.openBranchingPopup(scaleId);
        });
      });

      // Per-scale export
      document.querySelectorAll('.flow-box-tools .export-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const flowBox = e.target.closest('.flow-box');
          const scaleId = flowBox.dataset.scaleId;
          this.exportScale(scaleId);
        });
      });

      // Delete button
      document.querySelectorAll('.flow-box-tools .delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const flowBox = e.target.closest('.flow-box');
          const scaleId = flowBox.dataset.scaleId;
          this.handleDeleteScale(scaleId);
        });
      });

      // Item double-click to edit
      document.querySelectorAll('.item-box').forEach(item => {
        item.addEventListener('dblclick', (e) => {
          if (!item.classList.contains('editing')) {
            this.startItemEdit(item);
          }
        });
      });

      // Item edit confirm/cancel
      document.querySelectorAll('.item-edit-confirm').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemBox = e.target.closest('.item-box');
          this.confirmItemEdit(itemBox);
        });
      });

      document.querySelectorAll('.item-edit-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemBox = e.target.closest('.item-box');
          this.cancelItemEdit(itemBox);
        });
      });

      // Rubric popup portal (escapes stacking context)
      let activeRubricPopup = null;

      document.querySelectorAll('.item-box').forEach(itemBox => {
        itemBox.addEventListener('mouseenter', (e) => {
          const rubricData = itemBox.querySelector('.rubric-popup');
          if (!rubricData) return;

          // Remove existing popup
          if (activeRubricPopup) {
            activeRubricPopup.remove();
            activeRubricPopup = null;
          }

          // Create portal popup in body
          const popup = document.createElement('div');
          popup.className = 'rubric-popup-portal';
          popup.innerHTML = rubricData.innerHTML;
          document.body.appendChild(popup);
          activeRubricPopup = popup;

          // Position using getBoundingClientRect
          const positionPopup = () => {
            const rect = itemBox.getBoundingClientRect();
            popup.style.position = 'fixed';
            popup.style.top = `${rect.top + (rect.height / 2)}px`;
            popup.style.left = `${rect.right + 12}px`;
            popup.style.transform = 'translateY(-50%)';
            popup.style.opacity = '1';
            popup.style.visibility = 'visible';
          };

          positionPopup();

          // Update position on scroll/pan
          const updateHandler = () => positionPopup();
          window.addEventListener('scroll', updateHandler, { passive: true });
          itemBox._rubricScrollHandler = updateHandler;
        });

        itemBox.addEventListener('mouseleave', () => {
          if (activeRubricPopup) {
            activeRubricPopup.remove();
            activeRubricPopup = null;
          }
          if (itemBox._rubricScrollHandler) {
            window.removeEventListener('scroll', itemBox._rubricScrollHandler);
            delete itemBox._rubricScrollHandler;
          }
        });
      });
    },

    startItemEdit(itemBox) {
      const textSpan = itemBox.querySelector('.item-text');
      const input = itemBox.querySelector('.item-edit-input');
      input.value = textSpan.textContent;
      itemBox.classList.add('editing');
      input.focus();
    },

    confirmItemEdit(itemBox) {
      const input = itemBox.querySelector('.item-edit-input');
      const textSpan = itemBox.querySelector('.item-text');
      const newText = input.value.trim();

      if (newText && newText !== textSpan.textContent) {
        textSpan.textContent = newText;
        // TODO: Regenerate current_rubric via AI
        console.log('[MLPA] Item edited, rubric regeneration needed');
      }

      itemBox.classList.remove('editing');
    },

    cancelItemEdit(itemBox) {
      itemBox.classList.remove('editing');
    },

    openBranchingPopup(scaleId) {
      state.canvasState.branchingFromScaleId = scaleId;
      const popup = document.getElementById('branching-popup');
      if (!popup) return;

      // Get the flow box DOM element for accurate dimensions
      const flowBox = document.querySelector(`.flow-box[data-scale-id="${scaleId}"]`);
      const canvas = this.canvas;

      if (flowBox && canvas) {
        const flowBoxRect = flowBox.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const panX = state.canvasState.pan.x;
        const panY = state.canvasState.pan.y;

        // Convert screen coords to world coords
        const worldRight = flowBoxRect.right - canvasRect.left - panX;
        const worldCenterY = flowBoxRect.top + flowBoxRect.height / 2 - canvasRect.top - panY;

        // Position popup to the right of flow box in world space
        popup.style.left = `${worldRight + 16}px`;
        popup.style.top = `${worldCenterY}px`;
        popup.style.transform = 'translateY(-50%)';
      }

      popup.classList.remove('hidden');
    },

    closeBranchingPopup() {
      const popup = document.getElementById('branching-popup');
      popup?.classList.add('hidden');
      const input = document.getElementById('branching-input');
      if (input) input.value = '';

      // Stop loading animation if popup closed during processing
      this.stopLoadingDots();

      // Reset button state
      const submitBtn = document.getElementById('branching-submit');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = 'Buat Cabang Baru';
      }
    },

    // ============================================================================
    // BRANCHING FLOWBOX POSITIONING (LAYOUT ENGINE - LOCKED)
    // ============================================================================
    // This layout system has been tested and verified stable. Do not modify
    // positioning logic without running tests 1-5 from system.md.
    //
    // Key Invariants:
    // 1. Positions are computed from branch_index, not DOM or sibling count
    // 2. Branched scales have positionLocked=true to prevent auto-repositioning
    // 3. renderAll() never mutates positions of locked scales
    // 4. Layout is position-driven, not iteration-order dependent
    // 5. Child positions are absolute snapshots, not relative to parent
    //
    // Tests Passed:
    // - Test 1: Mutation resistance (Object.freeze)
    // - Test 2: Parent movement propagation
    // - Test 4: Reorder stress test
    // - Test 5: Child-of-child (nesting)
    // ============================================================================

    // Deterministic child-row positioning for branched scales
    // Invariant: Position is computed from branch_index only (no DOM reads, no sibling scan)
    // Layout: Symmetric alternating around parent Y (up, down, further up, further down)
    getNextBranchPosition(sourceScaleId, branch_index) {
      const HORIZONTAL_STEP = 550;    // Horizontal step per generation
      const VERTICAL_GAP = 24;        // Gap between sibling scales
      const ESTIMATED_HEIGHT = 180;   // Fixed estimated flowbox height
      const ROW_HEIGHT = ESTIMATED_HEIGHT + VERTICAL_GAP;

      const source = state.canvasState.scales.get(sourceScaleId);
      if (!source) return { x: 100, y: 100, branch_index: 0, depth: 1 };

      // Depth-based horizontal positioning (constant step per generation)
      const depth = (source.depth || 0) + 1;
      const baseX = source.position.x + HORIZONTAL_STEP;

      // Symmetric alternating: layer + direction derived from branch_index
      const layer = Math.floor(branch_index / 2) + 1;
      const direction = 2 * (branch_index % 2) - 1;  // -1 for even (up), +1 for odd (down)
      const baseY = source.position.y + (direction * layer * ROW_HEIGHT);

      return {
        x: baseX,
        y: baseY,
        branch_index: branch_index,
        depth: depth
      };
    },

    // ============================================================================
    // GPT SCALE GENERATION (V1: Dimensions only)
    // ============================================================================
    // Invariant: If GPT succeeds, the resulting scale must be renderable
    // without triggering any layout recomputation.

    /**
     * Validate GPT response has required fields (V2)
     * @returns {{ valid: boolean, error?: string }}
     */
    validateGptScale(gptResult, sourceScale) {
      if (!gptResult) return { valid: false, error: 'No response' };
      if (gptResult.error) return { valid: false, error: gptResult.error };
      if (!gptResult.scale_name || typeof gptResult.scale_name !== 'string') {
        return { valid: false, error: 'Missing scale_name' };
      }
      if (!Array.isArray(gptResult.dimensions) || gptResult.dimensions.length === 0) {
        return { valid: false, error: 'Missing or empty dimensions' };
      }

      // V2: Validate items
      for (let i = 0; i < gptResult.dimensions.length; i++) {
        const dim = gptResult.dimensions[i];
        if (!dim.name || typeof dim.name !== 'string') {
          return { valid: false, error: `Dimension ${i + 1} missing name` };
        }
        if (!Array.isArray(dim.items) || dim.items.length === 0) {
          return { valid: false, error: `Dimension "${dim.name}" has no items` };
        }
        for (let j = 0; j < dim.items.length; j++) {
          const item = dim.items[j];
          if (!item.text || typeof item.text !== 'string') {
            return { valid: false, error: `Item ${j + 1} in "${dim.name}" missing text` };
          }
        }
      }

      // ============================================================================
      // SAFETY INVARIANT: Dimension and item count checks (warn only, don't fail)
      // ============================================================================
      if (sourceScale) {
        // Check dimension count
        if (gptResult.dimensions.length !== sourceScale.dimensions.length) {
          console.warn(
            `[MLPA Safety] Dimension count mismatch: ` +
            `expected=${sourceScale.dimensions.length}, got=${gptResult.dimensions.length}`
          );
        }

        // Check item count per dimension
        for (let i = 0; i < Math.min(gptResult.dimensions.length, sourceScale.dimensions.length); i++) {
          const gptDim = gptResult.dimensions[i];
          const sourceDim = sourceScale.dimensions[i];
          if (gptDim.items.length !== sourceDim.items.length) {
            console.warn(
              `[MLPA Safety] Item count mismatch in dimension "${gptDim.name}": ` +
              `expected=${sourceDim.items.length}, got=${gptDim.items.length}`
            );
          }
        }
      }

      return { valid: true };
    },

    /**
     * Expand GPT items with rubrics (V2)
     * @param {Array} gptDimensions - [{ name, items: [{ text, current_rubric? }] }]
     * @param {string} scaleId - Scale ID for namespacing
     * @param {Array} sourceDimensions - Source dimensions for origin_item_id and baseline_rubric mapping
     * @returns {Array} Full dimensions with all required fields
     */
    expandWithMockRubrics(gptDimensions, scaleId, sourceDimensions) {
      let itemCounter = 1;
      return gptDimensions.map((dim, dimIndex) => {
        const sourceItems = sourceDimensions[dimIndex]?.items || [];

        return {
          name: dim.name,
          items: dim.items.map((item, itemIndex) => {
            const sourceItem = sourceItems[itemIndex];

            // baseline_rubric: ALWAYS from source (root scale, never changes)
            const baseline_rubric = sourceItem?.baseline_rubric || ['Mock Rubric'];

            // current_rubric: GPT's raw traits from adapted sentence (or fallback to baseline)
            // GPT should extract these fresh from the new sentence, NOT copy baseline
            const current_rubric = item.current_rubric && item.current_rubric.length > 0
              ? item.current_rubric  // GPT provided raw traits from adapted sentence
              : baseline_rubric;     // Fallback if GPT didn't provide

            return {
              item_id: `${scaleId}-item-${itemCounter++}`,
              origin_item_id: sourceItem?.item_id || 'unknown',
              text: item.text,
              baseline_rubric: baseline_rubric,
              current_rubric: current_rubric,
              dimension: dim.name,
              rubric_source: item.current_rubric ? 'gpt' : 'parent'
            };
          })
        };
      });
    },

    /**
     * Show error notification toast
     */
    showBranchingError(message) {
      console.error('[MLPA Branching]', message);
      // Simple alert for now - can be upgraded to toast later
      alert('Gagal membuat cabang: ' + message);
    },

    /**
     * Start animated loading dots on button
     * @param {HTMLElement} button - The submit button element
     * @param {string} baseText - Base text without dots (e.g., "Memproses")
     */
    startLoadingDots(button, baseText = 'Memproses') {
      // Clear any existing interval
      this.stopLoadingDots();

      let dotCount = 0;
      const spanElement = button.querySelector('span');

      // Immediate update
      spanElement.textContent = baseText + '.';

      // Start interval (cycles every 400ms)
      this.loadingDotsInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 3;  // 0, 1, 2, 0, 1, 2...
        const dots = '.'.repeat(dotCount + 1);  // ., .., ...
        spanElement.textContent = baseText + dots;
      }, 400);
    },

    /**
     * Stop loading dots animation
     */
    stopLoadingDots() {
      if (this.loadingDotsInterval) {
        clearInterval(this.loadingDotsInterval);
        this.loadingDotsInterval = null;
      }
    },

    async handleBranchingSubmit() {
      // Guard: prevent double-submission
      if (state.canvasState.isBranchingInProgress) {
        console.log('[MLPA Branching] Already in progress - ignoring');
        return;
      }

      // Get input
      const input = document.getElementById('branching-input');
      const submitBtn = document.getElementById('branching-submit');
      const adaptationIntent = input?.value?.trim();

      // Guard: empty input
      if (!adaptationIntent) {
        console.log('[MLPA Branching] Empty input - doing nothing');
        return;
      }

      // Get source scale
      const sourceScaleId = state.canvasState.branchingFromScaleId;
      const sourceScale = state.canvasState.scales.get(sourceScaleId);

      if (!sourceScale) {
        console.error('[MLPA Branching] Source scale not found');
        return;
      }

      // Set lock BEFORE any async operation
      state.canvasState.isBranchingInProgress = true;

      // Show loading state with animated dots
      if (submitBtn) {
        submitBtn.disabled = true;
        this.startLoadingDots(submitBtn, 'Memproses');
      }

      try {
        // Call GPT to adapt dimensions
        console.log('[MLPA Branching] Calling GPT for adaptation...');
        const gptResult = await OpenAIAPI.adaptScale(sourceScale.scale_name, sourceScale.dimensions, adaptationIntent);

        // Validate GPT response (V2: includes items)
        const validation = this.validateGptScale(gptResult, sourceScale);
        if (!validation.valid) {
          this.showBranchingError(validation.error);
          return;
        }

        // Generate unique branch ID and compute branch index
        const branchCount = Array.from(state.canvasState.scales.keys())
          .filter(id => id.startsWith(sourceScaleId + '-branch')).length + 1;
        const newScaleId = `${sourceScaleId}-branch-${branchCount}`;
        const branch_index = branchCount - 1;

        // Compute position using deterministic formula
        const newPosition = this.getNextBranchPosition(sourceScaleId, branch_index);

        // Expand GPT items with mock rubrics (V2)
        const fullDimensions = this.expandWithMockRubrics(gptResult.dimensions, newScaleId, sourceScale.dimensions);

        // Assemble final scale
        const newScale = {
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

        // Add to canvas state (only on success)
        state.canvasState.scales.set(newScaleId, newScale);

        // Close popup and clear input
        this.closeBranchingPopup();

        // Re-render canvas
        this.renderAll();

        console.log('[MLPA Branching] Branch created successfully:', newScaleId);

      } catch (error) {
        console.error('[MLPA Branching] Error:', error);
        // Show user-friendly message from structured error
        const errorMessage = error.message || error.type || 'Terjadi kesalahan. Coba lagi.';
        this.showBranchingError(errorMessage);
      } finally {
        // Release lock
        state.canvasState.isBranchingInProgress = false;

        // Reset button state
        if (submitBtn) {
          this.stopLoadingDots();
          submitBtn.disabled = false;
          submitBtn.querySelector('span').textContent = 'Buat Cabang Baru';
        }
      }
    },

    // TEST 2: Parent movement propagation test
    // Usage: flowEditor.testMoveParent('skala-asli', 50)
    testMoveParent(scaleId, deltaY) {
      const scale = state.canvasState.scales.get(scaleId);
      if (!scale) {
        console.error('[TEST 2] Scale not found:', scaleId);
        return;
      }

      console.log('[TEST 2] Moving parent:', scaleId, 'by deltaY:', deltaY);
      console.log('[TEST 2] Before:', scale.position);

      scale.position.y += deltaY;

      console.log('[TEST 2] After:', scale.position);
      console.log('[TEST 2] Forcing re-render...');

      this.renderAll();

      console.log('[TEST 2] Check:');
      console.log('  - Do children move WITH parent? (relative system)');
      console.log('  - Or stay at original Y? (absolute snapshot)');
      console.log('  - No overlap? No weird offsets?');
    },

    // TEST 4: Reorder stress test (future-you safety)
    // Usage: flowEditor.testReorderScales()
    testReorderScales() {
      console.log('[TEST 4] Reordering scales in state...');
      console.log('[TEST 4] Before:', Array.from(state.canvasState.scales.keys()));

      // Reverse the Map order
      const entries = Array.from(state.canvasState.scales.entries()).reverse();
      state.canvasState.scales = new Map(entries);

      console.log('[TEST 4] After:', Array.from(state.canvasState.scales.keys()));
      console.log('[TEST 4] Forcing re-render...');

      this.renderAll();

      console.log('[TEST 4] Expected: Layout stays identical');
      console.log('[TEST 4] This proves layout is:');
      console.log('  - position-driven (good)');
      console.log('  - not iteration-order fragile (good)');
    },

    exportScale(scaleId) {
      const scale = state.canvasState.scales.get(scaleId);
      if (!scale) return;

      const rows = [['scale_id', 'dimension_name', 'item_id', 'origin_item_id', 'item_text', 'baseline_rubric', 'current_rubric']];

      scale.dimensions.forEach(dim => {
        dim.items.forEach(item => {
          rows.push([
            scale.scale_id,
            dim.name,
            item.item_id,
            item.origin_item_id,
            item.text,
            (item.baseline_rubric || []).join(';'),
            (item.current_rubric || []).join(';')
          ]);
        });
      });

      this.downloadCSV(rows, `${scale.scale_name.replace(/\s+/g, '_')}.csv`);
    },

    exportAllScales() {
      const rows = [['scale_id', 'scale_name', 'parent_scale_id', 'dimension_name', 'item_id', 'origin_item_id', 'item_text', 'baseline_rubric', 'current_rubric']];

      state.canvasState.scales.forEach(scale => {
        scale.dimensions.forEach(dim => {
          dim.items.forEach(item => {
            rows.push([
              scale.scale_id,
              scale.scale_name,
              scale.parent_scale_id || '',
              dim.name,
              item.item_id,
              item.origin_item_id,
              item.text,
              (item.baseline_rubric || []).join(';'),
              (item.current_rubric || []).join(';')
            ]);
          });
        });
      });

      this.downloadCSV(rows, 'MLPA_Semua_Skala.csv');
    },

    // ============================================================================
    // DELETE SCALE LOGIC (Cascade)
    // ============================================================================
    handleDeleteScale(scaleId) {
      if (!scaleId) return;
      const scale = state.canvasState.scales.get(scaleId);
      if (!scale) return;

      // 1. Root Protection
      if (scale.is_root) {
        alert('Skala utama (Root) tidak dapat dihapus.');
        return;
      }

      // 2. Cascade Collection
      // Find all descendants recursively
      const toDelete = new Set([scaleId]);

      let modified = true;
      while (modified) {
        modified = false;
        // Iterate all scales to find children of any currently marked-for-deletion scale
        for (const [sId, s] of state.canvasState.scales) {
          if (!toDelete.has(sId) && s.parent_scale_id && toDelete.has(s.parent_scale_id)) {
            toDelete.add(sId);
            modified = true;
          }
        }
      }

      // 3. Confirmation
      const count = toDelete.size;
      const message = count > 1
        ? `Apakah Anda yakin ingin menghapus skala ini dan ${count - 1} turunannya?`
        : `Apakah Anda yakin ingin menghapus skala ini?`;

      if (!confirm(message)) return;

      // 4. Execution
      this.closeBranchingPopup();

      toDelete.forEach(id => {
        state.canvasState.scales.delete(id);
        // Reset active ID if we deleted it
        if (state.canvasState.activeScaleId === id) {
          state.canvasState.activeScaleId = null;
        }
      });

      console.log(`[MLPA] Deleted ${count} scales via cascade.`);

      // 5. Render (No reflow)
      this.renderAll();
    },

    exportScale(scaleId) {
      // Get scale data
      const scale = state.canvasState.scales.get(scaleId);
      if (!scale) {
        console.error('Scale not found:', scaleId);
        return;
      }

      // Flatten all items from all dimensions
      const allItems = [];
      let itemCounter = 1;

      (scale.dimensions || []).forEach(dimension => {
        const dimensionName = dimension.name || '';
        const items = dimension.items || [];

        items.forEach(item => {
          allItems.push({
            item_id: itemCounter++,
            dimension: dimensionName,
            item_text: item.text || ''
          });
        });
      });

      // Convert to CSV
      const csvContent = this.convertToCSV(allItems, ['item_id', 'dimension', 'item_text']);

      // Generate filename
      const filename = `${this.sanitizeFilename(scale.scale_name || 'scale')}.csv`;

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    },

    convertToCSV(data, columns) {
      // Header row
      const header = columns.join(',');

      // Data rows
      const rows = data.map(row => {
        return columns.map(col => {
          const value = row[col] ?? '';
          // Escape quotes and wrap in quotes if contains comma/quote/newline
          if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',');
      });

      return [header, ...rows].join('\r\n');
    },

    sanitizeFilename(name) {
      // Remove illegal filename characters and convert to lowercase kebab-case
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    },

    downloadCSV(rows, filename) {
      const csvContent = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    },

    startEditItem(itemBox) {
      const flowBox = itemBox.closest('.flow-box');
      if (!flowBox || !flowBox.classList.contains('flow-edit-mode')) return;

      const itemContent = itemBox.querySelector('.item-content');
      if (!itemContent) return;

      // Store backup
      this.editBackupText = itemContent.textContent;
      this.activeEditItem = itemBox;

      // Enter editing state
      itemBox.classList.add('item-editing');
      itemContent.contentEditable = 'true';
      itemContent.focus();

      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(itemContent);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Add keyboard handlers
      itemContent.addEventListener('keydown', this.handleEditKeydown.bind(this));
      itemContent.addEventListener('paste', this.handleEditPaste.bind(this));
    },

    handleEditKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmOrRevertEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelActiveEdit();
      }
    },

    handleEditPaste(e) {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      // Insert plain text only, collapse newlines to spaces
      const cleanText = text.replace(/[\r\n]+/g, ' ').trim();
      document.execCommand('insertText', false, cleanText);
    },

    confirmOrRevertEdit() {
      if (!this.activeEditItem) return;

      const itemContent = this.activeEditItem.querySelector('.item-content');
      if (!itemContent) {
        this.cancelActiveEdit();
        return;
      }

      const newText = itemContent.textContent.trim();
      const isDirty = newText !== this.editBackupText;

      if (isDirty && newText.length > 0) {
        // Update state first
        const flowBox = this.activeEditItem.closest('.flow-box');
        const scaleId = flowBox.dataset.scaleId;
        const itemId = this.activeEditItem.dataset.itemId;
        const scale = state.canvasState.scales.get(scaleId);

        if (scale) {
          for (const dim of scale.dimensions || []) {
            for (const it of dim.items || []) {
              if (it.item_id === itemId) {
                it.text = newText;
                break;
              }
            }
          }
        }

        // Update DOM second
        itemContent.textContent = newText;
      } else if (isDirty && newText.length === 0) {
        // Dirty but empty → revert
        itemContent.textContent = this.editBackupText;
      }
      // If not dirty, just exit without changes

      // Exit editing state
      itemContent.contentEditable = 'false';
      itemContent.removeEventListener('keydown', this.handleEditKeydown);
      itemContent.removeEventListener('paste', this.handleEditPaste);
      this.activeEditItem.classList.remove('item-editing');
      this.activeEditItem = null;
      this.editBackupText = '';
    },

    cancelActiveEdit() {
      if (!this.activeEditItem) return;

      const itemContent = this.activeEditItem.querySelector('.item-content');
      if (itemContent) {
        // Restore backup
        itemContent.textContent = this.editBackupText;
        itemContent.contentEditable = 'false';
        itemContent.removeEventListener('keydown', this.handleEditKeydown);
        itemContent.removeEventListener('paste', this.handleEditPaste);
      }

      // Exit editing state
      this.activeEditItem.classList.remove('item-editing');
      this.activeEditItem = null;
      this.editBackupText = '';
    },

    showEditTooltip(button) {
      // Remove any existing tooltip
      const existingTooltip = document.querySelector('.edit-mode-tooltip');
      if (existingTooltip) {
        existingTooltip.remove();
      }

      // Create tooltip element
      const tooltip = document.createElement('div');
      tooltip.className = 'edit-mode-tooltip';
      tooltip.textContent = 'Klik item untuk mengedit teks';
      document.body.appendChild(tooltip);

      // Position above button (left-leaning)
      const rect = button.getBoundingClientRect();
      tooltip.style.position = 'fixed';
      tooltip.style.left = `${rect.right}px`;
      tooltip.style.top = `${rect.top - 6}px`;
      tooltip.style.transform = 'translate(-100%, -100%)';

      // Trigger animation by adding active class after paint
      requestAnimationFrame(() => {
        tooltip.classList.add('active');
      });

      // Auto-remove after 0.5 seconds
      setTimeout(() => {
        tooltip.classList.remove('active');
        setTimeout(() => tooltip.remove(), 150);
      }, 1500);
    },

    showNotification(message) {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'edit-notification';
      notification.textContent = message;
      document.body.appendChild(notification);

      // Trigger animation
      requestAnimationFrame(() => {
        notification.classList.add('show');
      });

      // Auto-remove after 1 second
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
      }, 1500);
    },

    // ============================================================================
    // CONNECTORS (Visual-only, derived from parent_scale_id)
    // ============================================================================
    // Connectors are rendered AFTER layout, never during position calculation.
    // They read DOM positions and derive relationships from scale state.

    renderConnections() {
      if (!this.connectionsLayer) return;
      this.connectionsLayer.innerHTML = '';

      // Get canvas offset for screen → world space conversion
      const canvasRect = this.canvas?.getBoundingClientRect();
      if (!canvasRect) return;

      const panX = state.canvasState.pan.x;
      const panY = state.canvasState.pan.y;

      // Iterate through scales and draw connections to parents
      state.canvasState.scales.forEach((scale) => {
        if (!scale.parent_scale_id) return;  // Skip root scales

        const parentScale = state.canvasState.scales.get(scale.parent_scale_id);
        if (!parentScale) return;

        // Get DOM elements
        const parentEl = document.querySelector(`.flow-box[data-scale-id="${scale.parent_scale_id}"]`);
        const childEl = document.querySelector(`.flow-box[data-scale-id="${scale.scale_id}"]`);
        if (!parentEl || !childEl) return;

        // Get bounding rects (screen space)
        const parentRect = parentEl.getBoundingClientRect();
        const childRect = childEl.getBoundingClientRect();

        // Convert to world space (subtract canvas offset and pan)
        const px = parentRect.right - canvasRect.left - panX;
        const py = parentRect.top + parentRect.height / 2 - canvasRect.top - panY;
        const cx = childRect.left - canvasRect.left - panX;
        const cy = childRect.top + childRect.height / 2 - canvasRect.top - panY;

        // Create bezier path
        const path = this.createBezierPath(px, py, cx, cy);
        this.connectionsLayer.insertAdjacentHTML('beforeend',
          `<path class="flow-connection-line" d="${path}" />`
        );
      });
    },

    createBezierPath(px, py, cx, cy) {
      // Simple cubic bezier: horizontal control points
      const dx = cx - px;
      const c1x = px + dx * 0.4;
      const c1y = py;
      const c2x = cx - dx * 0.4;
      const c2y = cy;

      return `M ${px} ${py} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cx} ${cy}`;
    },

    // Debug Panel Functions
    initDebugPanel() {
      // Create debug panel element
      const panel = document.createElement('div');
      panel.id = 'flow-debug-panel';
      panel.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        max-width: 400px;
        max-height: 300px;
        overflow-y: auto;
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        padding: 16px;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        z-index: 1000;
        line-height: 1.4;
      `;

      document.body.appendChild(panel);
      this.debugPanel = panel;
    },

    updateDebugPanel() {
      if (!this.debugPanel) return;

      const scalesArray = Array.from(state.canvasState.scales.entries());

      let html = '<div style="font-weight: bold; margin-bottom: 8px; color: #4ade80;">DEBUG: state.canvasState.scales</div>';
      html += `<div style="color: #94a3b8; margin-bottom: 8px;">Total scales: ${scalesArray.length}</div>`;

      scalesArray.forEach(([scaleId, scale]) => {
        const totalItems = scale.dimensions.reduce((sum, dim) => sum + dim.items.length, 0);

        html += `
          <div style="margin-bottom: 12px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">
            <div style="color: #60a5fa; font-weight: bold;">${scale.scale_name}</div>
            <div style="color: #94a3b8; font-size: 10px;">ID: ${scaleId}</div>
            <div style="color: #94a3b8; font-size: 10px;">Parent: ${scale.parent_scale_id || 'null (root)'}</div>
            <div style="color: #94a3b8; font-size: 10px;">Position: (${scale.position.x}, ${scale.position.y})</div>
            <div style="color: #94a3b8; font-size: 10px;">Expanded: ${scale.expanded}</div>
            <div style="color: #fbbf24; margin-top: 4px;">Dimensions: ${scale.dimensions.length}</div>
        `;

        const flowBoxHtml = this.createFlowBoxHtml(state.canvasState.scales.get(scaleId));
        if (flowBoxHtml) {
          const preview = flowBoxHtml.substring(0, 100).replace(/</g, '&lt;').replace(/>/g, '&gt;');
          html += `<div style="color: #4ade80; font-size: 10px; margin-top: 4px;">flowBoxHtml: EXISTS (${flowBoxHtml.length} chars)</div>`;
          html += `<div style="color: #94a3b8; font-size: 9px; margin-left: 8px; font-style: italic;">Preview: ${preview}...</div>`;
        } else {
          html += `<div style="color: #ef4444; font-size: 10px; margin-top: 4px;">flowBoxHtml: EMPTY</div>`;
        }

        scale.dimensions.forEach((dim, idx) => {
          html += `<div style="color: #a78bfa; font-size: 10px; margin-left: 12px;">└ ${dim.name} (${dim.items.length} items)</div>`;
        });

        html += `<div style="color: #fbbf24; margin-top: 4px;">Total items: ${totalItems}</div>`;
        html += `</div>`;
      });

      this.debugPanel.innerHTML = html;
    }
  };

  // ==================== FULLSCREEN ====================

  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  function updateFullscreenState() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('is-fullscreen', isFullscreen);
  }

  // ==================== START ====================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
