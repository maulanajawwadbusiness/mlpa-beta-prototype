# MLPA Prototype Technical Documentation

**Last Updated:** December 22, 2025  
**Architecture Version:** Post-Phase 6 Modularization

---

## 1. Project Overview

The **MLPA (Multi-Level Profiling Assessment)** prototype is a web-based tool for psychometric scale management. It allows users to upload CSV data, visualize psychometric scales, run assessments, and edit/adapt scales using a node-based flow interface with semantic rubric tracking.

**Target Audience:** Psychometricians and researchers.  
**Key Focus:** Modular architecture, clean UI, responsive flow editing, contenteditable item editing, and semantic rubric visualization.

---

## 2. Technology Stack

- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Frameworks:** None (Zero-dependency architecture)
- **External Integrations:** OpenAI API (abstracted in `api.js`)
- **Data Format:** CSV (Input), JSON (Internal State)
- **Architecture:** Modular, with explicit contracts and invariants

---

## 3. Project Structure (Post-Modularization)

```
mlpa-beta-prototype/
├── adapters/                   # Phase 1 - Data input/output
│   ├── csvIngest.js           # CSV parsing (pure functions)
│   └── openAiScale.js         # GPT prompt templates & validation
├── controllers/                # Phase 4-5 - Orchestration
│   ├── flowController.js      # Flow operations orchestration
│   ├── flowEditorController.js # Branching/delete orchestration
│   └── previewController.js   # Preview/questionnaire orchestration
├── layout/                     # Phase 1 - Pure layout math
│   ├── branchPositioning.js   # Symmetric branch positioning
│   └── connectionGeometry.js  # Bezier path calculation
├── logic/                      # Phase 2-3 - Domain logic
│   ├── scaleAssembler.js      # Scale object assembly
│   ├── scaleGraph.js          # Graph traversal (10 functions)
│   └── scaleTransform.js      # Data transformations (5 functions)
├── services/                   # Phase 2 - External APIs
│   └── gptScaleService.js     # OpenAI API wrapper
├── state/                      # Phase 2, 5, 6 - State management
│   ├── canvasStateOps.js      # Low-level state mutations
│   ├── scaleStore.js          # Centralized scale store
│   └── stateManager.js        # State contracts & documentation
├── ui/                         # Phase 4 - Rendering
│   └── renderer/
│       ├── flowBoxRenderer.js # FlowBox HTML generation
│       ├── connectionRenderer.js # Connection SVG rendering
│       └── previewRenderer.js # Questionnaire UI updates
├── utils/                      # Phase 6 - Infrastructure
│   └── invariants.js          # DEV-only runtime guards
├── assets/                     # Images
├── app.js                      # Thin coordinator (~2100 lines)
├── api.js                      # OpenAI abstraction layer
├── config.js                   # Configuration (API keys)
├── index.html                  # Main HTML structure
├── styles.css                  # Global styling
├── test-data.csv              # Mock psychometric data
└── system.md                   # Technical documentation (this file)
```

---

## 4. Core Architecture

### 4.1 Module Organization

The codebase follows a strict **layered architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                      app.js (coordinator)                   │
│                    ↓ delegates to ↓                         │
├──────────────┬───────────────────┬──────────────────────────┤
│ Controllers  │  ScaleStore       │  Renderers               │
│ (orchestrate)│  (centralized)    │  (dumb DOM)              │
├──────────────┴───────────────────┴──────────────────────────┤
│                    Logic Modules                            │
│         (scaleGraph, scaleTransform, branchPositioning)     │
├─────────────────────────────────────────────────────────────┤
│                    Invariants (DEV guards)                  │
└─────────────────────────────────────────────────────────────┘
```

**Directionality Rules:**
- ✅ UI → Controller → Logic/State → Renderer → DOM
- ❌ Logic → UI
- ❌ Renderer → State mutation
- ❌ Layout → DOM

### 4.2 State Management

**Primary State Object** (in `app.js`):

```javascript
const state = {
  // UI State
  currentScreen: 1,
  sidebarCollapsed: false,
  previewMode: false,
  appActive: false,
  
  // Preview State
  items: [],              // Flattened items for questionnaire
  answers: {},            // User responses
  selectedScaleId: null,  // Currently selected scale
  currentItemIndex: 0,
  isCompleted: false,
  
  // Canvas State
  canvasState: {
    scales: Map<string, Scale>,  // Core graph data (managed by ScaleStore)
    connections: [],             // Visual bezier lines
    pan: { x: 0, y: 0 },        // Canvas viewport offset
    activeScaleId: null,
    branchingFromScaleId: null,
    isBranchingInProgress: false
  }
};
```

**State Mutations:**
- **Low-level:** `state/canvasStateOps.js` (14 helpers)
- **High-level:** `state/scaleStore.js` (centralized, with validation)

### 4.3 Data Contracts (FROZEN)

**Scale Object:**
```javascript
{
  scale_id: string,           // Unique identifier
  scale_name: string,         // Display name
  parent_scale_id: string | null,
  is_root: boolean,
  expanded: boolean,          // UI state
  depth: number,              // Generation depth
  branch_index: number,       // Sibling index
  position: { x: number, y: number },
  positionLocked: boolean,    // Prevents auto-repositioning
  dimensions: Dimension[]
}
```

**Dimension Object:**
```javascript
{
  name: string,               // Dimension label
  items: Item[]
}
```

**Item Object:**
```javascript
{
  item_id: string,
  origin_item_id: string,     // Links to original item
  text: string,               // Item content
  baseline_rubric: string[],  // Original rubric traits
  current_rubric: string[]    // GPT-extracted traits
}
```

**FlatItem Interface** (for preview):
```javascript
{
  ...Item,
  dimension: string           // Dimension name attached
}
```

---

## 5. Key Modules

### 5.1 Logic Modules (Pure Functions)

#### `logic/scaleGraph.js`
**Responsibility:** Graph traversal and relationship queries.  
**Functions:** 10 pure functions
- `buildScaleTree(scales)` → tree structure
- `getChildren(scales, parentId)` → direct children
- `getDescendants(scales, rootId)` → all descendants
- `buildCascadeDeleteSet(scales, targetId)` → cascade set
- `findRoots(scales)`, `isRoot(scale)`, `getRootScale(scales)`
- `getSiblings(scales, scaleId)`, `getParent(scales, scaleId)`

**Invariants:**
- NO DOM access
- NO state mutation
- Input scales Map never modified
- Deterministic outputs

#### `logic/scaleTransform.js`
**Responsibility:** Data transformations.  
**Functions:** 5 pure functions
- `flattenScaleItems(scale)` → FlatItem[]
- `countScaleItems(scale)` → number
- `getDimensionNames(scale)` → string[]
- `findItemInScale(scale, itemId)` → {item, dimensionName} | null
- `updateItemText(scale, itemId, newText)` → new Scale

#### `layout/branchPositioning.js`
**Responsibility:** Deterministic position calculation.  
**Key Function:** `getNextBranchPosition(parentScale, branch_index)`

**Layout Algorithm:**
```
branch_index 0: y = parent.y - 204  (up)
branch_index 1: y = parent.y + 204  (down)
branch_index 2: y = parent.y - 408  (further up)
branch_index 3: y = parent.y + 408  (further down)
```

**Invariants:**
- Position derived ONLY from `branch_index`
- NO DOM reads, NO sibling scanning
- Symmetric alternating layout
- `LAYOUT_CONSTANTS` are frozen

### 5.2 State Management

#### `state/scaleStore.js`
**Responsibility:** Centralized scale mutations.  
**Key Functions:**
- `init(canvasState)` — Initialize store
- `addScale(scale)` — With validation
- `removeScalesCascade(scaleIds)` — Atomic deletion
- `getScale(id)`, `getAllScales()`, `hasScale(id)`

**Future Hooks Marked:**
```javascript
// future: hook undo snapshot here
// future: hook persistence here
// future: hook minimap update here
```

#### `utils/invariants.js`
**Responsibility:** DEV-only runtime guards.  
**Key Functions:**
- `validateScale(scale)` — Ensures scale_id, scale_name, dimensions[], position
- `validateBranchedScale(scale)` — Ensures parent_scale_id, branch_index >= 0, positionLocked
- `assert(condition, message)` — Throws if condition false

**DEV Flag:** Set `const DEV = false;` for production.

### 5.3 Controllers (Orchestration)

#### `controllers/flowEditorController.js`
**Responsibility:** Branching and delete orchestration.  
**Key Functions:**
- `prepareDelete(scaleId, scales)` → validation + cascade set
- `executeDelete(toDelete, scales, canvasState, renderFn)` → mutation + render
- `prepareBranch(sourceScaleId, scales, isBranchingInProgress)` → validation
- `assembleBranchScale(gptResult, sourceScale, scales, expandRubricsFn)` → new scale

#### `controllers/previewController.js`
**Responsibility:** Preview/questionnaire orchestration.  
**Key Functions:**
- `selectScale(scaleId, scales)` → flatten items
- `handleScaleSelection(scaleId, scales, state)` → full flow
- `goToNextItem(currentIndex, totalItems)`, `goToPrevItem(currentIndex)`
- `checkCompletion(answers, totalItems)`, `calculateScore(answers, totalItems)`

### 5.4 Renderers (Dumb DOM)

#### `ui/renderer/flowBoxRenderer.js`
**Responsibility:** FlowBox HTML generation.  
**Functions:**
- `createFlowBoxHtml(scale)` → complete flowbox HTML
- `createDimensionHtml(dimension, index, startItemIndex, scale)`
- `createItemHtml(item, itemIndex, scale)`
- `createRubricPopupHtml(item)`
- `getIntegrityClass(item, scale)` → 'integrity-stable' | 'integrity-mismatch'

**Invariants:**
- NO logic decisions
- NO state mutation
- Accepts data, returns HTML strings

---

## 6. Data Flow

### 6.1 File Upload Flow
```
User uploads CSV
  ↓
CSVIngest.parseCSV(text) → parsed items
  ↓
OpenAI API: structureCSV(items) → dimensions
  ↓
ScaleAssembler.assembleNewScale() → Scale object
  ↓
ScaleStore.addScale(scale) → with validation
  ↓
flowEditor.renderAll() → DOM update
```

### 6.2 Branching Flow
```
User clicks "Branch" button
  ↓
FlowEditorController.prepareBranch() → validation
  ↓
User enters adaptation intent
  ↓
GPTScaleService.adaptScale(scaleName, dimensions, intent) → GPT result
  ↓
FlowEditorController.assembleBranchScale() → new scale with position
  ↓
ScaleStore.addScale(newScale) → validation + future hooks
  ↓
flowEditor.renderAll() → DOM update
```

### 6.3 Delete Flow
```
User clicks delete button
  ↓
FlowEditorController.prepareDelete(scaleId) → cascade set
  ↓
User confirms deletion
  ↓
FlowEditorController.executeDelete(toDelete) → ScaleStore mutations
  ↓
flowEditor.renderAll() → DOM update
```

---

## 7. Rubric System

### 7.1 Dual Rubric Tracking
Each item has TWO rubric arrays:
- **baseline_rubric:** Original rubric from parent scale
- **current_rubric:** GPT-extracted rubric from adapted item

### 7.2 Visual Integrity Indicators
- **Green outline** (`integrity-stable`): baseline === current
- **Red outline** (`integrity-mismatch`): baseline ≠ current
- **No outline:** Root scale (no comparison)

### 7.3 OpenAI Integration
**Service:** `services/gptScaleService.js`  
**Adapters:** `adapters/openAiScale.js` (prompt templates)

**GPT Operations:**
1. **structureCSV:** Raw CSV items → structured dimensions
2. **adaptScale:** Adapt scale for target audience (Gen-Z, Boomer, etc.)

**GPT Prompt Format (adaptScale):**
```
You are adapting the scale "[scale_name]" for [adaptation_intent].

Extract these for each item:
- text: adapted item text
- current_rubric: array of semantic traits
```

---

## 8. UI Architecture

### 8.1 Screen System
Three main screens:
1. **Screen 1:** File upload / Mock data selection
2. **Screen 2:** Questionnaire preview
3. **Screen 3:** Flow editor (Tampilan Edit)

**Navigation:** `showScreen(n)` toggles visibility using CSS classes.

### 8.2 Flow Editor Features
- **Pan/Zoom:** Canvas panning with mouse drag
- **Node Creation:** Branching creates new scales
- **Visual Connections:** SVG bezier curves between parent-child
- **Inline Editing:** Contenteditable item text (future)
- **Export:** Per-scale or global CSV export

### 8.3 Preview Mode
- **Scale Selector:** Mini flowchart for choosing scale version
- **Questionnaire:** 5-point Likert scale interface
- **Progress Tracking:** Item counter, completion screen

---

## 9. Module Contracts

All key modules have explicit contracts defining:
- **Responsibility:** What the module does
- **Inputs:** What it accepts
- **Outputs:** What it returns
- **Allowed side effects:** (e.g., state mutation, DOM)
- **Forbidden responsibilities:** What does NOT belong
- **Invariants:** Guarantees the module makes

**Example Contract Template:**
```javascript
/**
 * MODULE CONTRACT
 * ----------------
 * Responsibility: ...
 * Inputs: ...
 * Outputs: ...
 * Allowed side effects: ...
 * Forbidden responsibilities: ...
 * Invariants this module guarantees: ...
 */
```

---

## 10. Development Guidelines

### 10.1 Invariant Checking
Use DEV-only guards from `utils/invariants.js`:
```javascript
if (Invariants.DEV) {
  Invariants.validateScale(scale);
  Invariants.validateBranchedScale(scale);
}
```

### 10.2 State Mutations
**Always use ScaleStore for scale operations:**
```javascript
// ✅ Correct
ScaleStore.addScale(scale);
ScaleStore.removeScalesCascade(toDelete);

// ❌ Incorrect (direct mutation)
state.canvasState.scales.set(id, scale);
```

### 10.3 Adding Future Features
**Hooks are marked in ScaleStore:**
```javascript
// future: hook undo snapshot here
// future: hook persistence here
// future: hook minimap update here
```

Add implementations at these marked locations.

---

## 11. Testing & Verification

### 11.1 Manual Verification Checklist
- [ ] App loads correctly
- [ ] Flow boxes render
- [ ] Connections render
- [ ] Branching works (symmetric positioning)
- [ ] Cascade delete works
- [ ] Preview questionnaire works
- [ ] Scale selector works
- [ ] No console errors
- [ ] No visual changes after refactor

### 11.2 Mock Data
**Location:** `app.js` (MOCK_ITEMS, lines 990-1280)  
**Content:** 3 scale versions (Asli, Gen-Z, Boomer) with 10 items each

---

## 12. Known Limitations

1. **app.js Size:** Still ~2100 lines (contains mock data, flowEditor object, event binding)
2. **No Persistence:** State resets on page reload
3. **No Undo/Redo:** Architecture prepared but not implemented
4. **Inline Editing:** Partial implementation (edit mode exists, persistence incomplete)
5. **No Minimap:** Architecture prepared but not implemented

---

## 13. Future Roadmap

### 13.1 Prepared Systems (Stubs Marked)
- **Undo/Redo:** Hook in ScaleStore
- **Persistence:** LocalStorage/IndexedDB hook in ScaleStore
- **Minimap:** Canvas overview hook in ScaleStore
- **AI Agents:** Mutation entrypoint via ScaleStore.addScale

### 13.2 Potential Extractions
- Mock data → `data/mockScales.js`
- Event binding → `ui/events/`
- Questionnaire logic → `controllers/questionnaireController.js`

---

## 14. Architecture Principles

1. **Surgical Modularization:** Extract without changing behavior
2. **Explicit Contracts:** Every module states what does NOT belong
3. **Enforced Invariants:** Invalid states caught early in dev
4. **Centralized Mutations:** Single source of truth for state changes
5. **Clear Directionality:** UI → Controller → Logic → State
6. **Future-Proofed:** Hooks marked for upcoming features

---

**End of Documentation**  
*Last updated: December 22, 2025*
