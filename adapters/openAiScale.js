/**
 * MLPA Prototype - OpenAI Scale Adapter
 * 
 * Pure prompt templates and response parsing for OpenAI scale operations.
 * NO UI logic. NO state mutation. NO network calls here.
 * Network calls remain in api.js - this module provides prompt construction only.
 */

// ============================================================================
// V2 SCHEMA LOCK: v2-generated-scale
// GPT returns: { scale_name, dimensions: [{ name, items: [{ text, current_rubric }] }] }
// App injects: item_id, origin_item_id, baseline_rubric, rubric_source
// DO NOT expand this schema without explicit version bump
// ============================================================================

// ============================================================================
// PROMPT TEMPLATES (PURE FUNCTIONS)
// ============================================================================

/**
 * Build the adaptation prompt for GPT scale adaptation.
 * 
 * @param {string} sourceScaleName - Name of the source scale
 * @param {Array} sourceDimensions - Source scale dimensions array
 * @param {string} adaptationIntent - User's adaptation intent text
 * @returns {{ role: string, content: string }} Message object for OpenAI API
 */
function buildAdaptScalePrompt(sourceScaleName, sourceDimensions, adaptationIntent) {
    return {
        role: 'user',
        content: `You are adapting a psychometric scale for a specific audience.

SOURCE SCALE NAME:
${sourceScaleName}

SOURCE SCALE DIMENSIONS:
${JSON.stringify(sourceDimensions.map(d => ({
            name: d.name,
            items: d.items.map(i => i.text)
        })), null, 2)}

ADAPTATION INTENT:
${adaptationIntent}

Return a JSON object with EXACTLY this structure:
{
  "scale_name": "Descriptive name for the adapted scale",
  "dimensions": [
    {
      "name": "Adapted dimension name",
      "items": [
        { 
          "text": "Adapted item text",
          "current_rubric": ["Trait1", "Trait2", "Trait3", ...]
        }
      ]
    }
  ]
}

Rules for ITEM TEXT:
- Adapt item texts to match the cultural context and intent
- Keep the same number of dimensions as the source
- Keep the same number of items per dimension
- Keep dimension names FORMAL and STANDARD (do NOT adapt them to cultural context)

Rules for CURRENT_RUBRIC (CRITICAL):
- Extract RAW TRAITS from YOUR ADAPTED SENTENCE - not from any baseline
- These are the basic psychological components present in the NEW sentence YOU wrote
- Be IGNORANT of any original rubric - only analyze the sentence you created
- Extract: key concepts, actions, emotions, context, perspective from YOUR sentence

Example:
If you write: "Saya berani mencoba hal baru (misalnya ikut kegiatan kampus) tanpa banyak ragu."
Your current_rubric should be: ["Keberanian", "Mencoba hal baru", "Kegiatan kampus", "Tanpa ragu", "Sudut pandang orang pertama"]

These are RAW traits from YOUR sentence - NOT copied from any original.

- Return ONLY valid JSON, no explanation`
    };
}

/**
 * Build the CSV structuring prompt for initial scale parsing.
 * 
 * @param {Array} csvItems - Flat array of parsed CSV items
 * @param {string} filename - Original filename for scale name inference
 * @returns {{ role: string, content: string }} Message object for OpenAI API
 */
function buildStructureCSVPrompt(csvItems, filename) {
    return {
        role: 'user',
        content: `You are structuring a psychometric scale from CSV data.

FILENAME: ${filename}
ITEM COUNT: ${csvItems.length}

RAW CSV DATA:
${JSON.stringify(csvItems.map((item, i) => ({
            id: item.item_id || i + 1,
            dimension: item.dimension || null,
            text: item.item_text || item.text || Object.values(item).find(v => typeof v === 'string' && v.length > 10) || ''
        })), null, 2)}

TASK 0 - SANITY CHECK (CRITICAL - DO THIS FIRST):
Determine if this CSV contains valid psychometric scale items.

A VALID scale has:
- Multiple items (statements/questions) that measure psychological traits
- Items are self-report statements (e.g., "Saya merasa...", "Saya sering...", "Saya mampu...")
- Items relate to personality, behavior, emotions, attitudes, or abilities

INVALID (reject these):
- Empty CSV or only headers
- Random text, names, shopping lists, or unrelated data
- Corrupted/broken data that cannot be interpreted as scale items
- Less than 3 recognizable scale items

Also check if the CSV already has dimensions:
- If items have a "dimension" field with values, set has_dimensions: true
- If no dimension field or all null, set has_dimensions: false (you will group them)

**FORBIDDEN - NEVER DO THIS:**
- Do NOT invent or hallucinate new items
- Do NOT add items that don't exist in the CSV
- ONLY extract and structure what is actually in the data
- If there are holes or missing data, skip them, do NOT fill them with made-up items

TASK 1 - SCALE NAME:
- If filename clearly indicates scale name (e.g., "Skala Kemalasan.csv"), extract it
- If filename is unsensible, infer from items what psychological construct is measured
- Return a proper Indonesian scale name (e.g., "Skala Kepercayaan Diri")

TASK 2 - DIMENSIONS:
- If has_dimensions is true, use the existing dimension names from the CSV
- If has_dimensions is false, group items into 2-5 logical dimensions based on semantic similarity
- Name each dimension after its core psychological theme

TASK 3 - RUBRIC EXTRACTION (CRITICAL):
Extract "sifat dasar" (basic traits) from the core meaning of each item.

TRAIT COUNT BASED ON COMPLEXITY:
- **Simple sentences** (3 traits): "Aku merasa rajin", "Aku merasa malas"
  → 1 psych trait + 1 feeling verb + perspective
  
- **Complex sentences** (4-7 traits): "Saya merasa percaya diri dalam menghadapi tantangan baru"
  → Multiple psych traits + feeling verbs + time anchor + essential modifiers + perspective

TRAIT TYPES TO EXTRACT:
1. **PSYCH TRAIT(S)** - Core psychological construct(s)
   - Convert adjectives to abstract nouns: "percaya diri" → "Kepercayaan diri", "rajin" → "Kerajinan"
   - Complex sentences may have MULTIPLE psych traits (e.g., "Kepercayaan diri", "Menghadapi tantangan")
   
2. **FEELING VERB(S)** - How the person relates to the trait(s)
   - INFERRED from sentence, not literal: "Merasa", "Mampu", "Berpikir", "Yakin", "Melakukan"
   - Complex sentences may have multiple feeling verbs for different aspects
   
3. **PERSPECTIVE** - Always include (e.g., "Sudut pandang orang pertama")

4. **TIME ANCHOR** - If present (e.g., "Waktu: Sejauh ini", "Waktu: Saat ini", "Waktu: Masa depan")

5. **ESSENTIAL MODIFIERS** - Key qualifiers that change meaning
   - Context: "Dalam situasi baru", "Dengan orang lain"
   - Scope: "Di lingkungan kerja", "Dalam keluarga"
   - Only include if they fundamentally change the psychological meaning

EXAMPLES:

Simple (3 traits):
"Aku merasa rajin"
→ ["Kerajinan", "Merasa", "Sudut pandang orang pertama"]

Complex (5 traits):
"Saya merasa percaya diri dalam menghadapi tantangan baru"
→ ["Kepercayaan diri", "Menghadapi tantangan", "Merasa", "Konteks: Situasi baru", "Sudut pandang orang pertama"]

Complex (6 traits):
"Saya merasa bernilai dan dihargai oleh orang lain"
→ ["Nilai diri", "Dihargai", "Merasa", "Oleh orang lain", "Sudut pandang orang pertama"]

Rules:
- Use SHORT labels, sentence case (e.g., "Kepercayaan diri" not "Kepercayaan Diri")
- Minimum 3 traits (simple sentences)
- Maximum 7 traits (very complex sentences)
- Extract ALL meaningful psychological components, don't artificially limit
- Be explicit, stable, minimal - no poetic language or jargon

RETURN JSON:
{
  "is_valid_scale": true/false,
  "rejection_reason": "..." (only if is_valid_scale is false),
  "has_dimensions": true/false,
  "scale_name": "...",
  "dimensions": [
    {
      "name": "...",
      "items": [
        {
          "item_id": "...",
          "text": "...",
          "baseline_rubric": ["Trait1", "Trait2", "Trait3"]
        }
      ]
    }
  ]
}

If is_valid_scale is false, dimensions array should be empty [].

Return ONLY valid JSON, no explanation.`
    };
}

// ============================================================================
// RESPONSE VALIDATION (PURE FUNCTIONS)
// ============================================================================

/**
 * Validate GPT scale adaptation response.
 * 
 * @param {Object} gptResult - Parsed GPT response
 * @param {Object} [sourceScale] - Source scale for structure comparison (optional)
 * @returns {{ valid: boolean, error?: string, warnings?: string[] }}
 */
function validateAdaptScaleResponse(gptResult, sourceScale = null) {
    const warnings = [];

    if (!gptResult) return { valid: false, error: 'No response' };
    if (gptResult.error) return { valid: false, error: gptResult.error };
    if (!gptResult.scale_name || typeof gptResult.scale_name !== 'string') {
        return { valid: false, error: 'Missing scale_name' };
    }
    if (!Array.isArray(gptResult.dimensions) || gptResult.dimensions.length === 0) {
        return { valid: false, error: 'Missing or empty dimensions' };
    }

    // Validate items
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

    // Structure comparison (warn only, don't fail)
    if (sourceScale) {
        if (gptResult.dimensions.length !== sourceScale.dimensions.length) {
            warnings.push(
                `Dimension count mismatch: expected=${sourceScale.dimensions.length}, got=${gptResult.dimensions.length}`
            );
        }

        for (let i = 0; i < Math.min(gptResult.dimensions.length, sourceScale.dimensions.length); i++) {
            const gptDim = gptResult.dimensions[i];
            const sourceDim = sourceScale.dimensions[i];
            if (gptDim.items.length !== sourceDim.items.length) {
                warnings.push(
                    `Item count mismatch in dimension "${gptDim.name}": expected=${sourceDim.items.length}, got=${gptDim.items.length}`
                );
            }
        }
    }

    return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Validate CSV structuring response.
 * 
 * @param {Object} gptResult - Parsed GPT response
 * @returns {{ valid: boolean, isValidScale: boolean, rejectionReason?: string, error?: string }}
 */
function validateStructureCSVResponse(gptResult) {
    if (!gptResult) return { valid: false, error: 'No response' };

    // Check if GPT determined it's not a valid scale
    if (gptResult.is_valid_scale === false) {
        return {
            valid: true,
            isValidScale: false,
            rejectionReason: gptResult.rejection_reason || 'Invalid scale data'
        };
    }

    // Must have scale_name and dimensions for valid scale
    if (!gptResult.scale_name || typeof gptResult.scale_name !== 'string') {
        return { valid: false, error: 'Missing scale_name' };
    }
    if (!Array.isArray(gptResult.dimensions)) {
        return { valid: false, error: 'Missing dimensions array' };
    }

    return { valid: true, isValidScale: true };
}

// ============================================================================
// ITEM EXPANSION (PURE FUNCTION)
// ============================================================================

/**
 * Expand GPT items with app-injected fields (rubrics, IDs).
 * 
 * @param {Array} gptDimensions - GPT-generated dimensions [{ name, items: [{ text, current_rubric? }] }]
 * @param {string} scaleId - Scale ID for namespacing item IDs
 * @param {Array} sourceDimensions - Source dimensions for origin_item_id and baseline_rubric mapping
 * @returns {Array} Full dimensions with all required fields
 */
function expandWithRubrics(gptDimensions, scaleId, sourceDimensions) {
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
}

// ============================================================================
// EXPORTS
// ============================================================================

// Browser global export
if (typeof window !== 'undefined') {
    window.OpenAIScaleAdapter = {
        buildAdaptScalePrompt,
        buildStructureCSVPrompt,
        validateAdaptScaleResponse,
        validateStructureCSVResponse,
        expandWithRubrics
    };
}

// CommonJS export (for future module systems)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildAdaptScalePrompt,
        buildStructureCSVPrompt,
        validateAdaptScaleResponse,
        validateStructureCSVResponse,
        expandWithRubrics
    };
}
