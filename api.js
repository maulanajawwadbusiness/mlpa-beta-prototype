/**
 * MLPA Prototype - OpenAI Response API Layer
 * Clean abstraction for GPT-5.2 and gpt-5-mini
 */

const OpenAIAPI = (function () {
    'use strict';

    // Configuration
    const config = {
        apiKey: null, // Set via configure()
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-5.2',
        supportedModels: ['gpt-5.2', 'gpt-5-mini'],
        timeout: 15000 * 4,  // 60 seconds
        maxRetries: 3
    };

    // Error types for structured error handling
    const ErrorType = {
        OFFLINE: 'OFFLINE',
        TIMEOUT: 'TIMEOUT',
        RATE_LIMIT: 'RATE_LIMIT',
        SERVER_ERROR: 'SERVER_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        API_ERROR: 'API_ERROR'
    };

    // Sleep utility for retry delays
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Fetch with retry, timeout, and structured error handling
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} - Fetch response
     * @throws {Object} - { type: ErrorType, message: string }
     */
    async function fetchWithRetry(url, options = {}) {
        // Check online status first
        if (!navigator.onLine) {
            throw { type: ErrorType.OFFLINE, message: 'Tidak ada koneksi internet' };
        }

        for (let attempt = 0; attempt < config.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), config.timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(timeout);

                // Handle specific HTTP errors
                if (response.status === 429) {
                    throw { type: ErrorType.RATE_LIMIT, message: 'Batas penggunaan API tercapai. Coba lagi dalam beberapa menit.' };
                }
                if (response.status >= 500) {
                    // Retry on server errors
                    if (attempt < config.maxRetries - 1) {
                        console.log(`[OpenAI API] Server error ${response.status}, retry ${attempt + 1}/${config.maxRetries}`);
                        await sleep(Math.pow(2, attempt) * 500);  // 500ms, 1s, 2s
                        continue;
                    }
                    throw { type: ErrorType.SERVER_ERROR, message: 'Server sedang sibuk. Silakan coba lagi nanti.' };
                }
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw { type: ErrorType.API_ERROR, message: errorData.error?.message || `Error ${response.status}` };
                }

                return response;

            } catch (error) {
                clearTimeout(timeout);

                // Already structured error
                if (error.type) throw error;

                // AbortController timeout
                if (error.name === 'AbortError') {
                    if (attempt < config.maxRetries - 1) {
                        console.log(`[OpenAI API] Timeout, retry ${attempt + 1}/${config.maxRetries}`);
                        await sleep(Math.pow(2, attempt) * 500);
                        continue;
                    }
                    throw { type: ErrorType.TIMEOUT, message: 'Koneksi terlalu lama. Periksa internet Anda.' };
                }

                // Network error (fetch failed)
                if (attempt < config.maxRetries - 1) {
                    console.log(`[OpenAI API] Network error, retry ${attempt + 1}/${config.maxRetries}`);
                    await sleep(Math.pow(2, attempt) * 500);
                    continue;
                }
                throw { type: ErrorType.NETWORK_ERROR, message: 'Koneksi terputus. Periksa internet Anda.' };
            }
        }
    }

    // Prompt templates (separated from logic)
    const prompts = {
        csvToJson: (csvContent) => ({
            role: 'user',
            content: `You are a data parsing assistant. Read the following CSV content and return a JSON representation of the items.

CSV Content:
\`\`\`
${csvContent}
\`\`\`

Instructions:
1. Parse the CSV faithfully, preserving all original text
2. Return a JSON object with:
   - "headers": array of column names (if present)
   - "items": array of row objects with column values
   - "rawRowCount": total number of data rows
3. If headers are unclear, infer reasonable names
4. Return ONLY valid JSON, no explanation

Respond with the JSON object only.`
        }),

        // ============================================================================
        // V2 SCHEMA LOCK: v2-generated-scale
        // GPT returns: { scale_name, dimensions: [{ name, items: [{ text, current_rubric }] }] }
        // App injects: item_id, origin_item_id, baseline_rubric, rubric_source
        // DO NOT expand this schema without explicit version bump
        // ============================================================================
        adaptScale: (sourceScaleName, sourceDimensions, adaptationIntent) => ({
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
        }),

        // ============================================================================
        // CSV STRUCTURING: Convert flat CSV items into structured Scale
        // GPT returns: { is_valid_scale, has_dimensions, scale_name, dimensions: [...] }
        // Uses gpt-5.2 for sophisticated rubric extraction
        // ============================================================================
        structureCSVToScale: (csvItems, filename) => ({
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
        })
    };

    /**
     * Configure the API with credentials
     * @param {Object} options - Configuration options
     * @param {string} options.apiKey - OpenAI API key
     */
    function configure(options) {
        if (options.apiKey) {
            config.apiKey = options.apiKey;
        }
    }

    /**
     * Check if API is configured
     * @returns {boolean}
     */
    function isConfigured() {
        return !!config.apiKey;
    }

    /**
     * Make a Response API call to OpenAI
     * @param {Object} options - Request options
     * @param {string} options.model - Model to use (gpt-5.2 or gpt-5-mini)
     * @param {Array} options.input - Input messages array
     * @param {Object} options.text - Text response format config
     * @returns {Promise<Object>} API response
     */
    async function createResponse(options) {
        const model = options.model || config.defaultModel;

        if (!config.supportedModels.includes(model)) {
            throw new Error(`Unsupported model: ${model}. Supported: ${config.supportedModels.join(', ')}`);
        }

        if (!config.apiKey) {
            throw new Error('OpenAI API key not configured. Call OpenAIAPI.configure({ apiKey: "..." }) first.');
        }

        const requestBody = {
            model: model,
            input: options.input || [],
            text: options.text || { format: { type: 'text' } }
        };

        try {
            const response = await fetch(`${config.baseUrl}/responses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(`API Error ${response.status}: ${error.error?.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[OpenAI API] Request failed:', error);
            throw error;
        }
    }

    /**
     * Analyze CSV content using GPT
     * @param {string} csvContent - Raw CSV text
     * @param {string} [model='gpt-5.2'] - Model to use
     * @returns {Promise<Object>} Parsed JSON representation
     */
    async function analyzeCSV(csvContent, model = 'gpt-5.2') {
        console.log(`[OpenAI API] Analyzing CSV with ${model}...`);

        const response = await createResponse({
            model: model,
            input: [prompts.csvToJson(csvContent)],
            text: {
                format: { type: 'json_object' }
            }
        });

        // Extract the text content from response
        const outputText = response.output?.[0]?.content?.[0]?.text || response.output_text || '';

        try {
            const parsed = JSON.parse(outputText);
            console.log('[OpenAI API] CSV analysis complete:', parsed);
            return parsed;
        } catch (e) {
            console.warn('[OpenAI API] Could not parse JSON response, returning raw:', outputText);
            return { raw: outputText, parseError: true };
        }
    }

    /**
     * Generic prompt call for future extensibility
     * @param {string} prompt - User prompt text
     * @param {string} [model='gpt-5.2'] - Model to use
     * @returns {Promise<string>} Response text
     */
    async function ask(prompt, model = 'gpt-5.2') {
        const response = await createResponse({
            model: model,
            input: [{ role: 'user', content: prompt }]
        });

        return response.output?.[0]?.content?.[0]?.text || response.output_text || '';
    }

    /**
     * Adapt a scale for a specific audience (V2: dimensions + items)
     * Uses Chat Completions API with JSON response format
     * @param {string} sourceScaleName - Name of the source scale
     * @param {Array} sourceDimensions - Source scale dimensions
     * @param {string} adaptationIntent - User's adaptation intent
     * @param {string} [model='gpt-5.2'] - Model to use
     * @returns {Promise<Object>} { scale_name, dimensions } or { error }
     */
    async function adaptScale(sourceScaleName, sourceDimensions, adaptationIntent, model = 'gpt-5.2') {
        console.log(`[OpenAI API] Adapting scale with ${model}...`);

        if (!config.apiKey) {
            throw { type: ErrorType.API_ERROR, message: 'API key tidak dikonfigurasi' };
        }

        // Build messages for Chat Completions API
        const messages = [
            {
                role: 'system',
                content: 'You are adapting a psychometric scale. Return ONLY valid JSON, no explanation.'
            },
            prompts.adaptScale(sourceScaleName, sourceDimensions, adaptationIntent)
        ];

        const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                response_format: { type: 'json_object' }
            })
        });

        const data = await response.json();
        console.log('[OpenAI API] Full response:', data);

        // Extract content from Chat Completions response structure
        const outputText = data.choices?.[0]?.message?.content || '';

        if (!outputText) {
            console.error('[OpenAI API] Could not extract text from response');
            throw { type: ErrorType.API_ERROR, message: 'GPT tidak merespons' };
        }

        const parsed = JSON.parse(outputText);
        console.log('[OpenAI API] Scale adaptation complete:', parsed);
        return parsed;
    }

    /**
     * Structure CSV items into a proper Scale with dimensions and rubrics
     * @param {Array} csvItems - Flat array of parsed CSV items
     * @param {string} filename - Original filename for scale name inference
     * @param {string} [model='gpt-5.2'] - Model to use (gpt-5.2 for sophisticated rubric extraction)
     * @returns {Promise<Object>} { scale_name, dimensions }
     * @throws {Object} - { type: ErrorType, message: string }
     */
    async function structureCSVToScale(csvItems, filename, model = 'gpt-5.2') {
        console.log(`[OpenAI API] Structuring CSV to Scale with ${model}...`);

        if (!config.apiKey) {
            throw { type: ErrorType.API_ERROR, message: 'API key tidak dikonfigurasi' };
        }

        const messages = [
            {
                role: 'system',
                content: 'You are a psychometric scale structuring assistant. Extract semantic rubrics (sifat dasar) from item core meanings. Return ONLY valid JSON.'
            },
            prompts.structureCSVToScale(csvItems, filename)
        ];

        const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                response_format: { type: 'json_object' }
            })
        });

        const data = await response.json();
        console.log('[OpenAI API] Full response:', data);

        const outputText = data.choices?.[0]?.message?.content || '';

        if (!outputText) {
            console.error('[OpenAI API] Could not extract text from response');
            throw { type: ErrorType.API_ERROR, message: 'GPT tidak merespons' };
        }

        const parsed = JSON.parse(outputText);
        console.log('[OpenAI API] CSV structuring complete:', parsed);
        return parsed;
    }

    // Public API
    return {
        configure,
        isConfigured,
        createResponse,
        analyzeCSV,
        ask,
        adaptScale,
        structureCSVToScale,
        ErrorType,  // Expose error types for app error handling
        models: config.supportedModels
    };
})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenAIAPI;
}
