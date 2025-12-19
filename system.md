# MLPA Prototype Technical Documentation

## 1. Project Overview
The **MLPA (Multidimensional Likert Psychometric Assessment)** prototype is a web-based tool designed for psychometric scale management. It allows users to upload CSV data, visualize psychometric scales, run assessments, and edit/adapt scales using a node-based flow interface.

**Target Audience:** Psychometricians and researchers.
**Key Focus:** Clean, Apple-like minimal UI, responsive flow editing, and AI-assisted scale adaptation (GPT-5.2 ready).

---

## 2. Technology Stack
- **Core:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Frameworks:** None (Zero-dependency architecture).
- **External Integrations:** OpenAI API (abstracted in `api.js`).
- **Data Format:** CSV (Input), JSON (Internal State).

---

## 3. File Structure

| File | Purpose |
|------|---------|
| `index.html` | Content structure and screen containers (Upload, Questionnaire, Tampilan Edit). |
| `styles.css` | Global styling, CSS variables, screen transitions, and component styles. |
| `app.js` | Main application logic, state management, event handling, and Flow Editor module. |
| `api.js` | Abstraction layer for OpenAI GPT-5.2 API interactions. |
| `config.js` | Configuration values (e.g., API keys - kept local). |

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

  // Tampilan Edit State (Screen 3)
  canvasState: {
    scales: Map<string, Scale>,  // The core graph data
    connections: [],             // Visual bezier lines
    pan: { x: 0, y: 0 },         // Canvas offset
    activeScaleId: null
  }
};
```

### 4.2 Screen System
The app functions as a Single Page Application (SPA).
- **Navigation:** `showScreen(n)` helper toggles visibility using CSS classes (`.active`, `.hidden`).
- **Inner Screens:** Sidebar navigation switches between "Tampilan Preview" and "Tampilan Edit" without reloading.

### 4.3 Data Flow
1. **Input:** User uploads CSV or uses Mock Data.
2. **Parsing:** Custom CSV parser converts text to JSON objects.
3. **Transformation:** Data is structured into Scales > Dimensions > Items.
4. **Rendering:** active screen reads from `state` and updates the DOM.
5. **Output:** Global or per-scale CSV export.

---

## 5. Key Modules & Systems

### 5.1 Questionnaire Engine (Screen 2)
- **Logic:** Renders one item at a time or grid view (preview mode).
- **Components:** Likert scale (1-5 dots), progress bar, navigation buttons.

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
  - `createItemHtml()`: Renders individual items with `i{n}:` prefix

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
  - Fixed 56px width strip, absolute positioned
  - `flex-direction: row` with 2px gap between columns
  - Font size: 0.72em, line-height: 1.05

#### **Item Indexing:**
- **Global Counter:** Items numbered continuously across all dimensions within each flow box
- **Format:** `i1: {text}`, `i2: {text}`, etc.
- **Implementation:** Counter initialized in `createFlowBoxHtml()`, incremented per dimension

#### **Data Models (Screen 3):**
**Scale (Flow Box):**
```javascript
{
  scale_id: "skala-asli",
  scale_name: "Skala Asli",
  parent_scale_id: null,
  is_root: true,
  dimensions: [ ... ], // Array of Dimensions
  position: { x: 100, y: 100 },
  expanded: false,  // Default collapsed state
  __positionInitialized: false  // Internal flag for optical centering
}
```

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
  baseline_rubric: [],       // Immutable original traits
  current_rubric: [],        // Mutable current traits (AI generated)
  dimension: "Kepercayaan Diri"
}
```

### 5.3 OpenAI API Layer (`api.js`)
- **Purpose:** Abstract GPT-5.2 complexity.
- **Methods:** `analyzeCSV`, `ask`, `createResponse`.
- **Config:** Supports `gpt-5.2` and `gpt-5.2-mini`.

---

## 6. Styling System (`styles.css`)
- **Philosophy:** "Apple-like" minimalism. High whitespace, subtle borders, no distinct backgrounds for headers.
- **Variables:** extensive use of `:root` for consistency.
  - Colors: `--color-bg`, `--sidebar-bg` (Dark mode sidebar, Light mode content).
  - Spacing: `--space-min` (24px).
  - Typography: `--font-size-xs` (11px), `--font-size-base` (16px).
  - Transitions: `--transition-smooth`.
- **BEM-ish Naming:** `.flow-box`, `.flow-box-header`, `.flow-box-content`.
- **Flow Mode:** `.flow-mode` class enforces compact typography (12.5px, line-height 1.35) for system-map aesthetic.

## 7. Current UI State
- **Default Flow Box State:** Collapsed (expanded: false)
- **Initial Positioning:** Root flow boxes optically centered at 50% viewport height
- **Dimension Labels:** Two-line vertical text with 2px gap
- **Item Display:** Prefixed with global index (i1, i2, i3...)
- **Canvas Bounds:** Dynamically updated after render and expand/collapse

## 8. Extensions & Maintenance
- **Adding Features:** Add new properties to `state` and update the relevant render function in `app.js`.
- **Debugging:** Use the built-in Debug Panel in Screen 3 to inspect state without console logging.
- **Canvas Clipping Issues:** Ensure transforms are applied to `#flow-world`, not `#flow-canvas`.
- **Item Indexing:** Counter lives in `createFlowBoxHtml()`, resets per flow box.
