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
    showScreen(1);
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

  async function handleFiles(files) {
    const file = files[0];

    if (!isCSVFile(file)) {
      showError('Format tidak didukung. Gunakan file CSV.');
      return;
    }

    clearError();
    state.isProcessing = true;

    try {
      const content = await readFileAsText(file);
      state.csvRaw = content;

      console.log('[MLPA] CSV file loaded:', file.name);

      // Parse CSV to JSON
      const parsed = parseCSV(content);
      state.csvData = parsed;

      console.log('[MLPA] Parsed CSV:', parsed);

      // Try OpenAI API if configured
      if (typeof OpenAIAPI !== 'undefined' && OpenAIAPI.isConfigured()) {
        console.log('[MLPA] Sending to OpenAI for analysis...');
        try {
          const analysis = await OpenAIAPI.analyzeCSV(content);
          console.log('[MLPA] OpenAI analysis result:', analysis);

          // Use OpenAI parsed items if available
          if (analysis.items && Array.isArray(analysis.items)) {
            state.items = analysis.items;
          } else {
            state.items = parsed.items;
          }
        } catch (apiError) {
          console.warn('[MLPA] OpenAI API call failed:', apiError.message);
          state.items = parsed.items;
        }
      } else {
        console.log('[MLPA] OpenAI API not configured, using local parse');
        state.items = parsed.items;
      }

      // Initialize questionnaire
      initQuestionnaire();

      // Transition to main app
      showScreen(2);

    } catch (error) {
      console.error('[MLPA] File processing error:', error);
      showError('Gagal membaca file. Coba lagi.');
    } finally {
      state.isProcessing = false;
    }
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

  // ==================== MOCK DATA ====================

  // Mock items with proper structure (dual rubric, origin mapping)
  const MOCK_ITEMS = [
    // Dimension 1: Kepercayaan Diri (items 1-3)
    { item_id: '1', origin_item_id: '1', text: 'Saya merasa percaya diri dalam menghadapi tantangan baru', baseline_rubric: [], current_rubric: [], dimension: 'Kepercayaan Diri' },
    { item_id: '2', origin_item_id: '2', text: 'Saya merasa bernilai dan dihargai oleh orang lain', baseline_rubric: [], current_rubric: [], dimension: 'Kepercayaan Diri' },
    { item_id: '3', origin_item_id: '3', text: 'Saya dapat mengatasi masalah dengan baik dan tenang', baseline_rubric: [], current_rubric: [], dimension: 'Kepercayaan Diri' },
    // Dimension 2: Regulasi Emosi (items 4-7)
    { item_id: '4', origin_item_id: '4', text: 'Saya mampu mengekspresikan perasaan saya dengan jelas', baseline_rubric: [], current_rubric: [], dimension: 'Regulasi Emosi' },
    { item_id: '5', origin_item_id: '5', text: 'Saya merasa nyaman ketika berinteraksi dengan orang baru', baseline_rubric: [], current_rubric: [], dimension: 'Regulasi Emosi' },
    { item_id: '6', origin_item_id: '6', text: 'Saya dapat menerima kritik dengan sikap terbuka', baseline_rubric: [], current_rubric: [], dimension: 'Regulasi Emosi' },
    { item_id: '7', origin_item_id: '7', text: 'Saya mampu mengelola stres dengan efektif', baseline_rubric: [], current_rubric: [], dimension: 'Regulasi Emosi' },
    // Dimension 3: Optimisme (items 8-10)
    { item_id: '8', origin_item_id: '8', text: 'Saya merasa optimis tentang masa depan saya', baseline_rubric: [], current_rubric: [], dimension: 'Optimisme' },
    { item_id: '9', origin_item_id: '9', text: 'Saya merasa puas dengan pencapaian hidup saya sejauh ini', baseline_rubric: [], current_rubric: [], dimension: 'Optimisme' },
    { item_id: '10', origin_item_id: '10', text: 'Saya merasa memiliki tujuan hidup yang jelas', baseline_rubric: [], current_rubric: [], dimension: 'Optimisme' }
  ];

  // Mock scale structure
  function createMockScale() {
    // Group items by dimension
    const dimensions = [
      { name: 'Kepercayaan Diri', items: MOCK_ITEMS.filter(i => i.dimension === 'Kepercayaan Diri') },
      { name: 'Regulasi Emosi', items: MOCK_ITEMS.filter(i => i.dimension === 'Regulasi Emosi') },
      { name: 'Optimisme', items: MOCK_ITEMS.filter(i => i.dimension === 'Optimisme') }
    ];

    return {
      scale_id: 'skala-asli',
      scale_name: 'Skala Asli',
      parent_scale_id: null,
      is_root: true,
      expanded: false,
      position: { x: 100, y: 100 },
      dimensions: dimensions
    };
  }

  function handleLoadMock() {
    console.log('[MLPA] Loading mock data for testing...');

    // Create mock scale and add to canvas state
    const mockScale = createMockScale();
    state.canvasState.scales.set(mockScale.scale_id, mockScale);
    state.canvasState.activeScaleId = mockScale.scale_id;

    // Flatten items for questionnaire preview (legacy support)
    state.items = MOCK_ITEMS.map(item => ({
      item_id: item.item_id,
      item_text: item.text
    }));

    state.csvData = {
      headers: ['item_id', 'item_text'],
      items: state.items,
      rawRowCount: state.items.length
    };

    console.log('[MLPA] Mock data loaded:', state.items.length, 'items in', mockScale.dimensions.length, 'dimensions');

    // Initialize questionnaire
    initQuestionnaire();

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
        // Initial positioning logic (optical vertical centering)
        if (scale.parent_scale_id === null && !scale.__positionInitialized && this.canvas) {
          const canvasHeight = this.canvas.clientHeight || window.innerHeight;
          const estimatedBoxHeight = 120; // Collapsed height
          scale.position.y = (canvasHeight - estimatedBoxHeight) * 0.5;
          scale.__positionInitialized = true;
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
        const html = this.createDimensionHtml({ ...safeDimension, items }, index + 1, globalItemIndex);
        globalItemIndex += items.length;
        return html;
      }).join('');

      return `
        <div class="flow-box flow-mode ${scale.expanded ? '' : 'flow-mode-collapsed'}"  
             data-scale-id="${scale.scale_id}" 
             style="left: ${scale.position.x}px; top: ${scale.position.y}px;">
          <!-- Hover Tools -->
          <div class="flow-box-tools">
            <button class="flow-tool-btn edit-mode-btn" title="Mode Edit">
              <img src="assets/edit_icon.png" alt="Edit">
            </button>
            <button class="flow-tool-btn export-btn" title="Simpan sebagai CSV">
              <img src="assets/save_icon.png" alt="Export">
            </button>
            <button class="flow-tool-btn branch-btn" title="Buat Versi Baru">
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

    createDimensionHtml(dimension, index, startItemIndex) {
      const safeDimension = dimension && typeof dimension === 'object' ? dimension : {};
      const items = Array.isArray(safeDimension.items) ? safeDimension.items : [];
      const itemsHtml = items.map((item, idx) => this.createItemHtml(item, startItemIndex + idx)).join('');
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

    createItemHtml(item, itemIndex) {
      const safeItem = item && typeof item === 'object' ? item : {};
      const integrityClass = this.getIntegrityClass(safeItem);
      const rubricHtml = this.createRubricPopupHtml(safeItem);
      const itemId = safeItem.item_id ?? '';
      const itemText = safeItem.text ?? '';

      return `
        <div class="item-box ${integrityClass}" data-item-id="${itemId}">
          <span class="item-text">i${itemIndex}: ${itemText}</span>
          ${rubricHtml}
          <div class="item-edit-controls">
            <textarea class="item-edit-input"></textarea>
            <button class="item-edit-confirm">✓</button>
            <button class="item-edit-cancel">✗</button>
          </div>
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
          <div class="rubric-title">Inti Makna</div>
          <div class="rubric-list">${rubricItems}</div>
        </div>
      `;
    },

    getIntegrityClass(item) {
      // Compare baseline and current rubric
      if (!item.baseline_rubric || !item.current_rubric) return '';
      if (item.baseline_rubric.length === 0 && item.current_rubric.length === 0) return '';

      const baselineSet = new Set(item.baseline_rubric);
      const currentSet = new Set(item.current_rubric);

      // Check for drift (baseline traits missing)
      const missingFromBaseline = [...baselineSet].filter(b => !currentSet.has(b));
      if (missingFromBaseline.length > 0) return 'integrity-drift';

      // Check for expansion (current has added traits)
      const addedToCurrent = [...currentSet].filter(c => !baselineSet.has(c));
      if (addedToCurrent.length > 0) return 'integrity-expanded';

      // Stable
      return 'integrity-stable';
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

      // Edit mode toggle
      document.querySelectorAll('.edit-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const flowBox = e.target.closest('.flow-box');
          flowBox.querySelectorAll('.item-box').forEach(item => {
            item.classList.toggle('edit-mode');
          });
        });
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
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const flowBox = e.target.closest('.flow-box');
          const scaleId = flowBox.dataset.scaleId;
          console.log('[export-btn] clicked, scaleId:', scaleId);
          this.exportScaleCSV(scaleId);
          return false;
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
      popup?.classList.remove('hidden');
    },

    closeBranchingPopup() {
      const popup = document.getElementById('branching-popup');
      popup?.classList.add('hidden');
      const input = document.getElementById('branching-input');
      if (input) input.value = '';
    },

    exportScaleInternal(scaleId) {
      console.trace('[exportScaleInternal] CALLED');
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
      console.trace('[exportAllScales] CALLED');
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

      this.downloadCSV(rows, 'MLPA_All_Scales.csv');
    },

    exportScaleCSV(scaleId) {
      alert('[exportScaleCSV] Function called with scaleId: ' + scaleId);
      console.log('[exportScaleCSV] called', scaleId);

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
      console.log('[1] csvContent:', csvContent);
      console.log('[1] csvContent type:', typeof csvContent);
      console.log('[1] csvContent length:', csvContent.length);

      // Generate filename
      const filename = `${this.sanitizeFilename(scale.scale_name || 'scale')}.csv`;
      console.log('[2] filename:', filename);

      // Navigate to CSV instead of downloading
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      console.log('[3] blob:', blob);
      console.log('[3] blob.size:', blob.size);
      console.log('[3] blob.type:', blob.type);

      const url = URL.createObjectURL(blob);
      console.log('[4] url:', url);

      // Create download link (ORIGINAL METHOD)
      console.log('[5] Creating <a> element...');
      const link = document.createElement('a');
      console.log('[5] link element:', link);

      link.href = url;
      console.log('[6] link.href set to:', link.href);

      link.download = filename;
      console.log('[7] link.download set to:', link.download);

      console.log('[8] About to click link...');
      link.click();
      console.log('[9] After link.click() - download should have triggered');

      console.log('I OPEN CSV');

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
      console.trace('[downloadCSV] CALLED with filename:', filename);
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

    renderConnections() {
      if (!this.connectionsLayer) return;
      this.connectionsLayer.innerHTML = '';

      state.canvasState.connections.forEach(conn => {
        const fromScale = state.canvasState.scales.get(conn.from);
        const toScale = state.canvasState.scales.get(conn.to);
        if (!fromScale || !toScale) return;

        const path = this.createBezierPath(fromScale.position, toScale.position);
        this.connectionsLayer.insertAdjacentHTML('beforeend',
          `<path class="flow-connection-line" d="${path}" />`
        );
      });
    },

    createBezierPath(from, to) {
      const startX = from.x + 160; // Center of box
      const startY = from.y + 50;
      const endX = to.x + 160;
      const endY = to.y + 50;
      const midX = (startX + endX) / 2;

      return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
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
