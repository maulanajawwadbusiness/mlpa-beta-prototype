/**
 * MLPA Prototype - CSV Ingest Adapter
 * 
 * Pure CSV parsing and normalization logic.
 * NO DOM access. NO state mutation. NO modals. Pure functions only.
 */

// ============================================================================
// CSV PARSING (PURE FUNCTIONS)
// ============================================================================

/**
 * Parse a complete CSV text into structured data.
 * Auto-detects delimiter (comma or semicolon).
 * 
 * @param {string} text - Raw CSV content
 * @returns {{ headers: string[], items: Object[], rawRowCount: number }}
 */
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

/**
 * Parse a single CSV line, handling quoted values and escaped quotes.
 * 
 * @param {string} line - Single CSV line
 * @param {string} [delimiter=','] - Column delimiter
 * @returns {string[]} Array of column values
 */
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

// ============================================================================
// SCHEMA VALIDATION HELPERS (PURE FUNCTIONS)
// ============================================================================

/**
 * Check if parsed CSV has the expected psychometric columns.
 * 
 * @param {string[]} headers - CSV headers
 * @returns {{ hasItemId: boolean, hasDimension: boolean, hasItemText: boolean }}
 */
function validatePsychometricSchema(headers) {
    const lowerHeaders = headers.map(h => h.toLowerCase());

    return {
        hasItemId: lowerHeaders.some(h => h.includes('item_id') || h.includes('id')),
        hasDimension: lowerHeaders.some(h => h.includes('dimension') || h.includes('dimensi')),
        hasItemText: lowerHeaders.some(h => h.includes('item_text') || h.includes('text') || h.includes('teks'))
    };
}

/**
 * Infer item text from an object by finding the longest string value.
 * Fallback when column names are non-standard.
 * 
 * @param {Object} item - Parsed CSV row object
 * @returns {string} Best guess for item text
 */
function inferItemText(item) {
    let longestText = '';

    for (const value of Object.values(item)) {
        if (typeof value === 'string' && value.length > longestText.length && value.length > 10) {
            longestText = value;
        }
    }

    return longestText;
}

/**
 * Normalize CSV items to standard psychometric format.
 * 
 * @param {Object[]} items - Parsed CSV items
 * @param {string[]} headers - CSV headers
 * @returns {{ id: string|number, dimension: string|null, text: string }[]}
 */
function normalizeItems(items, headers) {
    const schema = validatePsychometricSchema(headers);

    return items.map((item, index) => {
        // Find item_id
        let id = item.item_id || item.id || item.ID || (index + 1);

        // Find dimension
        let dimension = item.dimension || item.dimensi || item.Dimension || null;

        // Find item text
        let text = item.item_text || item.text || item.teks || item.Text || inferItemText(item);

        return {
            id: id,
            dimension: dimension,
            text: text
        };
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

// Browser global export
if (typeof window !== 'undefined') {
    window.CSVIngest = {
        parseCSV,
        parseCSVLine,
        validatePsychometricSchema,
        inferItemText,
        normalizeItems
    };
}

// CommonJS export (for future module systems)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseCSV,
        parseCSVLine,
        validatePsychometricSchema,
        inferItemText,
        normalizeItems
    };
}
