# MLPA Prototype Technical Documentation

## 1. Project Overview
The **MLPA (Multi-Level Profiling Assessment)** prototype is a web-based tool designed for psychometric scale management. It allows users to upload CSV data, visualize psychometric scales, run assessments, and edit/adapt scales using a node-based flow interface with semantic rubric tracking.

**Target Audience:** Psychometricians and researchers.
**Key Focus:** Clean, Apple-like minimal UI, responsive flow editing, contenteditable item editing, and semantic rubric visualization.

---

## 2. Technology Stack
- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Frameworks:** None (Zero-dependency architecture).
- **External Integrations:** OpenAI API (abstracted in `api.js`).
- **Data Format:** CSV (Input), JSON (Internal State).

---

## 3. Project Structure

```
mlpa-beta-prototype/
├── .git/                      # Git repository
├── .gitignore                 # Git ignore rules
├── assets/                    # Image assets
│   ├── arrow_icon.png
│   ├── branch_button_icon.png
│   ├── drag_and_drop_icon.png
│   ├── edit_icon.png
│   ├── loading_icon.png
│   ├── reset_icon.png
│   ├── save_icon.png
│   ├── sidebar_hide_icon.png
│   ├── sidebar_show_icon.png
│   └── tampilan_edit_icon.png
├── index.html                 # Main HTML structure
├── styles.css                 # Global styles and component CSS
├── app.js                     # Application logic and Flow Editor
├── api.js                     # OpenAI API abstraction layer
├── config.js                  # Configuration (API keys)
├── test-data.csv              # Mock psychometric data
└── system.md                  # Technical documentation (this file)
```

### File Descriptions

| File | Purpose |
|------|---------|
| `index.html` | Content structure and screen containers (Upload, Questionnaire, Tampilan Edit). |
| `styles.css` | Global styling, CSS variables, screen transitions, and component styles. |
| `app.js` | Main application logic, state management, event handling, and Flow Editor module. |
| `api.js` | Abstraction layer for OpenAI GPT-5.2 API interactions. |
| `config.js` | Configuration values (e.g., API keys - kept local). |
| `test-data.csv` | Mock data representing 10 items across 3 dimensions with rubrics. |

---

## 4. Core Architecture

### 4.1 State Management
The application uses a centralized, mutable `state` object within the `app.js` IIFE (Immediately Invoked Function Expression).

```javascript
const state = {
  // Navigation
  currentScreen: 1,
  
  // App Flags
  sidebarCollapsed: false,
  previewMode: false,

  // Questionnaire Data
  items: [],
  answers: {},
  selectedScaleId: null,  // Currently selected scale for preview

  // Tampilan Edit State (Screen 3)
  canvasState: {
    scales: Map<string, Scale>,  // The core graph data
    connections: [],             // Visual bezier lines
    pan: { x: 0, y: 0 },         // Canvas offset
    activeScaleId: null,
    branchingFromScaleId: null
  }
};
```

### 4.2 Screen System
The app functions as a Single Page Application (SPA).
- **Navigation:** `showScreen(n)` helper toggles visibility using CSS classes (`.active`, `.hidden`).
- **Inner Screens:** Sidebar navigation switches between "Tampilan Preview" and "Tampilan Edit" without reloading.

### 4.3 Data Flow
1. **Input:** User uploads CSV or uses Mock Data (10 items with rubrics).
2. **Parsing:** Custom CSV parser converts text to JSON objects.
3. **Transformation:** Data is structured into Scales > Dimensions > Items with rubric tracking.
4. **Rendering:** Active screen reads from `state` and updates the DOM.
5. **Output:** Global or per-scale CSV export with baseline/current rubric columns.

---

## 5. Key Modules & Systems

### 5.1 Questionnaire Engine (Screen 2: Tampilan Preview Kuesioner)
- **Logic:** Renders one item at a time with Likert scale interaction.
- **Components:** 
  - Likert scale (1-5 dots)
  - Progress counter ("Item X / Y")
  - Navigation arrows (Previous/Next)
  - Completion screen with score summary
- **Scale Selector:** Button that opens mini flowchart modal for selecting which scale version to preview.

#### **Scale Selector System:**
**Purpose:** Allow users to switch between different scale versions (root and branches) in the preview screen.

**UI Components:**
- **Selector Button:** Displays current selected scale name with chevron icon
- **Modal Window:** Medium-sized chooser with tree visualization
- **Tree Layout:** Scales organized by parent-child relationships with indentation (32px per depth level)
- **Node Display:** Scale name + clickable dot + depth label ("Asal" for root, "Cabang" for branches)

**Behavior:**
- Click button → Opens modal with scale tree
- Click node → Selects scale, updates questionnaire items immediately, closes modal
- Click backdrop or press Escape → Closes modal
- Preview mode → Hides selector button (admin-ui class)

**Key Functions:**
- `openScaleSelector()`: Renders graph and opens modal
- `closeScaleSelector()`: Closes modal
- `renderScaleSelectorGraph()`: Builds tree from `parent_scale_id` relationships
- `selectScale(scaleId)`: Updates `selectedScaleId`, extracts items, refreshes questionnaire
- `getScaleItems(scale)`: Flattens dimensions into item array

**Data Flow:**
1. User clicks scale node
2. `selectScale()` extracts all items from that scale's dimensions
3. Sets `state.items` to flattened item list
4. Resets `currentItemIndex` to 0 and clears answers
5. Calls `updateQuestionnaireUI()` to refresh display

### 5.2 Flow Editor (Screen 3: Tampilan Edit)
A custom-built node-based editor for managing scales with infinite canvas architecture.

#### **Canvas Architecture (World-Viewport Separation):**
```
#flow-canvas (viewport)
  └─ #flow-world (pannable layer, receives transform)
       ├─ #flow-connections (SVG layer)
       └─ #flow-boxes (container, height: auto)
            └─ .flow-box (individual scale nodes)
```

- **Viewport:** `#flow-canvas` - Fixed size, `overflow: hidden`, provides clipping boundary
- **World Layer:** `#flow-world` - Receives pan transform, allows infinite content space
- **Content:** `.flow-boxes` - Natural height growth, no fixed constraints

#### **Module Structure:**
- **Module:** `flowEditor` object in `app.js`.
- **Core Methods:**
  - `init()`: Initializes canvas, world layer, and event bindings
  - `renderAll()`: Clears and rebuilds DOM from state, updates virtual bounds
  - `updateCanvasBounds()`: Dynamically expands `.flow-boxes` height based on content
  - `updateCanvasTransform()`: Applies pan transform to `#flow-world`
  - `createFlowBoxHtml()`: Generates HTML for each scale node with global item indexing
  - `createDimensionHtml()`: Renders dimension containers with vertical labels
  - `createItemHtml()`: Renders individual items with split prefix architecture
  - `createRubricPopupHtml()`: Generates rubric popup HTML (hidden, used as data source)

#### **Interaction:**
- **Panning:** Mouse drag on canvas background translates `#flow-world` layer
- **Expand/Collapse:** Click flow box header to toggle content visibility
- **Hover Tools:** CSS-based hover visibility for Edit, Export, and Branch buttons
- **Debug Panel:** Real-time overlay showing `state.canvasState` (toggled via `DEBUG_FLOW_EDITOR`)

#### **Dimension Labels:**
- **Layout:** Two-column vertical text layout
  - Column 1: "Dimensi {n}"
  - Column 2: Dimension name (e.g., "Kepercayaan Diri")
- **Styling:** 
  - `writing-mode: vertical-rl` with `transform: rotate(180deg)`
  - Fixed 44px width strip, absolute positioned
  - `flex-direction: row` with 1px gap between columns
  - Font size: 0.58em (with !important override), line-height: 0.95
  - Text wrapping: `white-space: normal`, `word-break: break-word`
  - Overflow: `overflow: hidden` on container to prevent leaking
  - Padding: 10px 7px (Apple-style tight spacing)

#### **Item Indexing:**
- **Global Counter:** Items numbered continuously across all dimensions within each flow box
- **Format:** `i1: {text}`, `i2: {text}`, etc.
- **Split Prefix Architecture:** 
  - `<span class="item-index">i1: </span>` (non-editable, muted)
  - `<span class="item-content">{text}</span>` (editable via contenteditable)
- **Implementation:** Counter initialized in `createFlowBoxHtml()`, incremented per dimension

#### **Data Models (Screen 3):**
**Scale (Flow Box):**
```javascript
{
  scale_id: "skala-asli",
  scale_name: "Skala Asli",
  parent_scale_id: null,        // null for root, scale_id for branches
  is_root: true,
  dimensions: [ ... ],           // Array of Dimensions
  position: { x: 100, y: 100 },
  expanded: false,               // Default collapsed state
  branch_index: 0,               // Index among siblings (0, 1, 2, ...)
  positionLocked: false          // Prevents auto-repositioning if true
}
```

#### **Branching Flowbox Positioning:**
**Architecture:**
- **Deterministic Layout:** Uses `branch_index` from scale ID counting, not DOM queries
- **Position Locking:** Branched scales have `positionLocked: true` to prevent auto-repositioning
- **Pure Rendering:** `renderAll()` never mutates positions of locked scales

**Positioning Constants:**
```javascript
HORIZONTAL_GAP = 450   // X offset from parent to child column
VERTICAL_GAP = 24      // Space between sibling scales
ESTIMATED_HEIGHT = 180 // Height estimate per scale
ROW_HEIGHT = 204       // Total row spacing (HEIGHT + GAP)
```

**Position Calculation (Symmetric Alternating):**
```javascript
// Symmetric alternating: layer + direction derived from branch_index
layer     = floor(branch_index / 2) + 1
direction = 2 * (branch_index % 2) - 1   // -1 for even (up), +1 for odd (down)
x         = parent.x + HORIZONTAL_GAP
y         = parent.y + direction * layer * ROW_HEIGHT

// Truth table:
// index 0: y = parent.y - 204  (up)
// index 1: y = parent.y + 204  (down)
// index 2: y = parent.y - 408  (further up)
// index 3: y = parent.y + 408  (further down)
```

**Key Methods:**
- `getNextBranchPosition(sourceScaleId, branch_index)`: Computes position for new branch
- `handleBranchingSubmit()`: **V2** - Calls GPT to generate adapted scale, validates, expands with rubrics
- `validateGptScale(gptResult, sourceScale)`: Validates GPT response structure
- `expandWithMockRubrics(gptDimensions, scaleId, sourceDimensions)`: Expands GPT items with app-injected fields
- `openBranchingPopup(scaleId)`: Anchors popup to clicked flow box (world-space positioning)
- `closeBranchingPopup()`: Hides popup and clears input

**Branching Popup:**
- **Position:** Absolute within `#flow-world`, dynamically positioned to right of source flow box
- **Trigger:** Click branch button on flow box hover tools
- **Input:** Textarea for adaptation intent (e.g., "adaptasi untuk Gen-Z")
- **Output:** Calls GPT API, creates new scale with GPT-generated dimensions/items
- **Loading State:** Button shows animated dots ("Memproses.", "Memproses..", "Memproses...") during API call
  - Animation: 400ms interval cycling through 1-3 dots
  - Cleanup: Animation stops on success, error, or popup close


**Dimension:**
```javascript
{
  name: "Kepercayaan Diri",
  items: [ ... ]  // Array of Items
}
```

**Item (The Core Unit):**
Crucial for MLPA "Core Meaning" verification.
```javascript
{
  item_id: "1",
  origin_item_id: "1",       // Tracks lineage across branches
  text: "Saya merasa...",
  baseline_rubric: ["Kepercayaan Diri", "Merasa", ...],  // Immutable original traits
  current_rubric: ["Kepercayaan Diri", "Merasa", ...],   // Mutable current traits
  dimension: "Kepercayaan Diri"
}
```

### 5.3 Item Editing System
**Philosophy:** "Calm, boring, invisible" Apple-like single-item editing with contenteditable.

#### **Edit Mode Activation:**
- **Flow-Level:** Click edit button on flow box to enter `.flow-edit-mode`
- **Auto-Expansion:** Collapsed flow boxes auto-expand when entering edit mode
- **Single-Flow Constraint:** Only one flow box can be in edit mode at a time
- **UI Feedback:**
  - Tooltip: "Klik item untuk mengedit teks" (1.5s, left-aligned, flat)
  - Notification: "Edit item ditutup" (1.5s, bottom-right toast)

#### **Item-Level Editing:**
- **Activation:** Single-click on item (when flow is in edit mode)
- **Visual State:** Subtle blue outline (`box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.8)`)
- **Editing:** Contenteditable on `.item-content` span only (prefix protected)
- **Confirmation:**
  - `Enter` key or click outside (if text changed/dirty)
  - Dirty-check logic: saves if valid, reverts if empty
- **Cancellation:** `Escape` key
- **Switching Items:** Clicking another item confirms current, starts new edit
- **Plain Text Paste:** Newlines collapsed to spaces

#### **State Variables:**
```javascript
flowEditor: {
  activeEditItem: null,      // DOM reference to .item-box being edited
  editBackupText: '',        // Original text for revert
  // ... other properties
}
```

#### **Helper Functions:**
- `startEditItem(itemBox)`: Enables contenteditable, focuses, positions cursor
- `confirmOrRevertEdit()`: Dirty-check logic, updates state then DOM
- `cancelActiveEdit()`: Restores backup text, cleans up
- `handleEditKeydown(e)`: Enter/Escape key handling
- `handleEditPaste(e)`: Plain text paste enforcement
- `showEditTooltip(button)`: Portal tooltip above edit button
- `showNotification(message)`: Bottom-right toast notification

### 5.4 Rubric Popup System
**Purpose:** Display semantic traits (rubric) for each item on hover.

#### **Architecture:**
- **Portal Pattern:** Popup rendered in `document.body` to escape stacking contexts
- **Trigger:** `mouseenter` on `.item-box`
- **Positioning:** `getBoundingClientRect()` for precise placement
  - Horizontal: 12px to the right of item box
  - Vertical: Center-to-center anchoring (`top: 50%, transform: translateY(-50%)`)
- **Data Source:** Hidden `.rubric-popup` div in item HTML (display: none)
- **Portal Element:** `.rubric-popup-portal` with `position: fixed, z-index: 10000`

#### **Display Logic:**
```javascript
if (item.current_rubric && item.current_rubric.length > 0) {
  // Show actual rubric traits
  title: "Rubrik: Sifat-Sifat Dasar di Kalimat"
  items: ["Kepercayaan Diri", "Merasa", ...]
} else {
  // Show placeholder
  title: "Rubrik (placeholder)"
  items: ["Akan digenerate oleh AI"]
}
```

#### **Styling:**
- Background: `rgba(0, 0, 0, 0.85)` (dark, semi-transparent)
- Font: 11px, properly capitalized rubric traits
- Transition: `opacity 0.15s ease-out`
- No shadow (flat design)
- Bullet points before each trait

### 5.5 Cascade Delete System
**Purpose:** Allow deletion of scales with automatic cascade to all descendants.

**UI Integration:**
- Delete button appears in `.flow-box-tools` for non-root scales only
- Root scales (`is_root === true`) do not show delete button (UI-level protection)
- Button uses trash icon SVG, matches design system

**Behavior:**
- Click delete → Shows confirmation dialog with descendant count
- User confirms → Deletes scale and all children recursively
- User cancels → No action
- After deletion → Canvas re-renders via `renderAll()`

**Safety Mechanisms:**
- **UI Protection:** Delete button not rendered for root scales
- **Backend Protection:** `handleDeleteScale()` checks `is_root` as fallback
- **Confirmation:** Native `confirm()` dialog shows exact count ("...dan X turunannya?")

**Cascade Logic:**
- Iterative broad-phase approach
- Scans all scales to find children whose `parent_scale_id` is in deletion set
- Repeats until no new children found
- Results in comprehensive `Set` of IDs to delete

**Key Function:**
```javascript
handleDeleteScale(scaleId) {
  // 1. Root protection check
  // 2. Build cascade set via tree traversal
  // 3. Show confirmation with count
  // 4. Delete from state.canvasState.scales
  // 5. Reset activeScaleId if deleted
  // 6. Call renderAll() once
}
```

### 5.6 Mock Data System
**File:** `MOCK_ITEMS` constant in `app.js`

**Structure:** Three complete scales with 10 items each across 3 dimensions:

**Skala Asli (Root):**
- Dimension 1: Kepercayaan Diri (items 1-3)
- Dimension 2: Regulasi Emosi (items 4-7)
- Dimension 3: Optimisme (items 8-10)

**Skala Gen-Z (Branch 1):**
- Dimension 1: Kepercayaan Diri & Keberanian (items 1-3)
- Dimension 2: Regulasi Emosi & Interaksi (items 4-7)
- Dimension 3: Optimisme dan Tujuan (Goals) (items 8-10)

**Skala Boomer (Branch 2):**
- Dimension 1: Kepercayaan Diri pada Usia Boomer (items 1-3)
- Dimension 2: Regulasi Emosi dan Interaksi Sosial (items 4-7)
- Dimension 3: Optimisme dan Makna Hidup (items 8-10)

**Initialization:**
- `handleLoadMock()` creates root scale and two branches
- Uses `flowEditor.getNextBranchPosition()` for standard layout
- Calls `selectScale(rootScale.scale_id)` to initialize preview

**Rubric Example (Item 1):**
```javascript
baseline_rubric: [
  'Kepercayaan Diri',
  'Menghadapi Tantangan Baru',
  'Merasa',
  'Sudut Pandang Orang Pertama'
]
```

### 5.7 OpenAI API Layer (`api.js`)
- **Purpose:** Abstract GPT-5.2 complexity.
- **Methods:** 
  - `analyzeCSV`: Parse CSV data into JSON
  - `ask`: Generic prompt call
  - `createResponse`: Low-level Response API wrapper
  - `adaptScale`: **V2** - Adapt psychometric scales (dimensions + items)
- **Config:** Supports `gpt-5.2` and `gpt-5-mini`.

#### **GPT Scale Generation (V2):**
**Scope:**
- GPT generates **dimension names** and **item texts**
- App injects: `item_id`, `origin_item_id`, `baseline_rubric`, `current_rubric`

**Prompt Structure:**
```javascript
{
  role: 'user',
  content: `
    SOURCE SCALE: [dimensions with item texts]
    ADAPTATION INTENT: ${userInput}
    
    Return JSON:
    {
      "scale_name": "...",
      "dimensions": [
        {
          "name": "...",
          "items": [{ "text": "..." }]
        }
      ]
    }
  `
}
```

**API Call:**
- Endpoint: `/v1/chat/completions` (Chat Completions API)
- Model: `gpt-5-mini`
- Response format: `{ type: 'json_object' }`

**Validation Pipeline:**
1. Check `scale_name` exists
2. Check `dimensions` is non-empty array
3. For each dimension:
   - Check `name` exists
   - Check `items` is non-empty array
   - For each item: check `text` exists
4. Warn (don't fail) on dimension/item count mismatch

**Item Expansion (`expandWithMockRubrics`):**
```javascript
{
  item_id: `${scaleId}-item-${n}`,           // App-generated
  origin_item_id: sourceItems[i].item_id,    // Index-mapped from parent
  text: gptItem.text,                        // GPT-generated
  baseline_rubric: sourceItems[i].baseline_rubric,  // Copied from parent
  current_rubric: sourceItems[i].baseline_rubric,   // Same as baseline
  dimension: dim.name                        // GPT-generated
}
```

**Invariants:**
- Resulting scale must be renderable without layout recomputation
- No changes to positioning, connectors, or canvas logic
- `item_id` always follows pattern: `{scaleId}-item-{n}`

---

## 6. Styling System (`styles.css`)
- **Philosophy:** "Apple-like" minimalism. High whitespace, subtle borders, no distinct backgrounds for headers.
- **Variables:** Extensive use of `:root` for consistency.
  - Colors: `--color-bg`, `--sidebar-bg` (Dark mode sidebar, Light mode content).
  - Spacing: `--space-min` (24px).
  - Typography: `--font-size-xs` (11px), `--font-size-base` (16px).
  - Transitions: `--transition-smooth`, `--transition-fast`.
- **BEM-ish Naming:** `.flow-box`, `.flow-box-header`, `.flow-box-content`.
- **Flow Mode:** `.flow-mode` class enforces compact typography (12.5px, line-height 1.35) for system-map aesthetic.

## 7. Current UI State
- **Default Flow Box State:** Collapsed (expanded: false)
- **Initial Positioning:** Root flow boxes optically centered at 50% viewport height
- **Dimension Labels:** Two-line vertical text with 2px gap
- **Item Display:** Prefixed with global index (i1, i2, i3...)
- **Canvas Bounds:** Dynamically updated after render and expand/collapse
- **Edit Mode:** Flow-level permission, item-level activation, contenteditable
- **Rubric Popups:** Portal-based, center-aligned, 10000 z-index

## 8. Key Constraints & Design Decisions

### 8.1 Edit Mode
- **Non-Negotiable:** No visible textarea or buttons (✓/✕)
- **Interaction Model:** Single-click to edit, Enter/click-outside to confirm, Escape to cancel
- **Visual Feedback:** Minimal (blue outline only)
- **Text Handling:** Plain text only, no rich formatting

### 8.2 Rubric Popups
- **Stacking Context Solution:** Portal pattern (render in body)
- **Positioning:** Dynamic via getBoundingClientRect, not CSS-only
- **Z-Index Strategy:** 10000 (highest layer, like notifications)
- **Overflow Handling:** Escaped via portal, not CSS overflow fixes

### 8.3 Data Integrity
- **Rubric Tracking:** Dual rubric system (baseline vs current)
- **Origin Tracking:** `origin_item_id` for lineage across branches
- **Dirty Check:** Only save if text changed and valid (non-empty)

## 9. Extensions & Maintenance
- **Adding Features:** Add new properties to `state` and update the relevant render function in `app.js`.
- **Debugging:** Use the built-in Debug Panel in Screen 3 to inspect state without console logging.
- **Canvas Clipping Issues:** Ensure transforms are applied to `#flow-world`, not `#flow-canvas`.
- **Item Indexing:** Counter lives in `createFlowBoxHtml()`, resets per flow box.
- **Stacking Context Issues:** Use portal pattern (render in body) for overlays that need to escape parent contexts.
- **Edit Mode State:** Always check `flowEditor.activeEditItem` before modifying edit state.

## 10. Known Limitations
- **Browser Support:** Modern browsers only (ES6+, CSS Grid, contenteditable)
- **CSV Format:** Expects specific column names (item_id, dimension, item_text)
- **Rubric Generation:** Currently copied from parent scale (GPT rubric generation pending)
- **Branching:** ✅ Implemented (V2: GPT generates dimensions + items, app fills rubrics)
- **Undo/Redo:** Not implemented for item edits
