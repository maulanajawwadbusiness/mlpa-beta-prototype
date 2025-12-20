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
        supportedModels: ['gpt-5.2', 'gpt-5-mini']
    };

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
        // GPT returns: { scale_name, dimensions: [{ name, items: [{ text }] }] }
        // App injects: item_id, origin_item_id, baseline_rubric, current_rubric, rubric_source
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
        { "text": "Adapted item text 1" },
        { "text": "Adapted item text 2" }
      ]
    }
  ]
}

Rules:
- The source scale is called "${sourceScaleName}" - use this as context for naming the adapted scale
- For the adapted scale_name, use a format like "[Adaptation Type] - [What it Measures]"
- Example: if adapting for Gen-Z, name it "Skala Gen-Z - Skala Kepercayaan Diri"
- Keep the same number of dimensions as the source
- Keep the same number of items per dimension
- Adapt dimension names and item texts to match the intent
- Do NOT include item_id, rubrics, or any other fields
- Return ONLY valid JSON, no explanation`
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
     * @param {string} [model='gpt-5-mini'] - Model to use
     * @returns {Promise<Object>} { scale_name, dimensions } or { error }
     */
    async function adaptScale(sourceScaleName, sourceDimensions, adaptationIntent, model = 'gpt-5-mini') {
        console.log(`[OpenAI API] Adapting scale with ${model}...`);

        if (!config.apiKey) {
            return { error: 'API key not configured' };
        }

        // Build messages for Chat Completions API
        const messages = [
            {
                role: 'system',
                content: 'You are adapting a psychometric scale. Return ONLY valid JSON, no explanation.'
            },
            prompts.adaptScale(sourceScaleName, sourceDimensions, adaptationIntent)
        ];

        try {
            const response = await fetch(`${config.baseUrl}/chat/completions`, {
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[OpenAI API] Error response:', errorData);
                return { error: `API Error ${response.status}: ${errorData.error?.message || response.statusText}` };
            }

            const data = await response.json();
            console.log('[OpenAI API] Full response:', data);

            // Extract content from Chat Completions response structure
            const outputText = data.choices?.[0]?.message?.content || '';

            if (!outputText) {
                console.error('[OpenAI API] Could not extract text from response');
                return { error: 'GPT tidak merespons' };
            }

            const parsed = JSON.parse(outputText);
            console.log('[OpenAI API] Scale adaptation complete:', parsed);
            return parsed;
        } catch (error) {
            console.error('[OpenAI API] Adaptation failed:', error);
            return { error: error.message || 'Koneksi gagal' };
        }
    }

    // Public API
    return {
        configure,
        isConfigured,
        createResponse,
        analyzeCSV,
        ask,
        adaptScale,
        models: config.supportedModels
    };
})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenAIAPI;
}
