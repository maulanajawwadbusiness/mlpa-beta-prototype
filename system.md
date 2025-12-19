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
A custom-built node-based editor for managing scales.

#### **Architecture:**
- **Module:** `flowEditor` object in `app.js`.
- **Rendering:** 
  - `renderAll()`: Clears canvas and rebuilds DOM from state.
  - `createFlowBoxHtml()`: Template literal that generates HTML for each node.
  - `insertAdjacentHTML`: Used for high-performance DOM insertion.
- **Interaction:**
  - **Panning:** Mouse drag events translate the `.flow-boxes` and `.flow-connections` containers.
  - **Hover Tools:** CSS-based hover visibility for Edit, Export, and Branch buttons.
  - **Debug Panel:** Real-time on-screen overlay showing `state.canvasState` data (toggled via `DEBUG_FLOW_EDITOR`).

#### **Data Models (Screen 3):**
**Scale (Flow Box):**
```javascript
{
  scale_id: "skala-asli",
  scale_name: "Skala Asli",
  dimensions: [ ... ], // Array of Dimensions
  position: { x: 100, y: 100 },
  expanded: true
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
  - Transitions: `--transition-smooth`.
- **BEM-ish Naming:** `.flow-box`, `.flow-box-header`, `.flow-box-content`.

## 7. Extensions & Maintenance
- **Adding Features:** Add new properties to `state` and update the relevant render function in `app.js`.
- **Debugging:** Use the built-in Debug Panel in Screen 3 to inspect state without console logging.
