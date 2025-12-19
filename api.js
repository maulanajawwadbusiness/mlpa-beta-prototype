/**
 * MLPA Prototype - OpenAI Response API Layer
 * Clean abstraction for GPT-5.2 and GPT-5.2-mini
 */

const OpenAIAPI = (function () {
    'use strict';

    // Configuration
    const config = {
        apiKey: null, // Set via configure()
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-5.2',
        supportedModels: ['gpt-5.2', 'gpt-5.2-mini']
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
     * @param {string} options.model - Model to use (gpt-5.2 or gpt-5.2-mini)
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

    // Public API
    return {
        configure,
        isConfigured,
        createResponse,
        analyzeCSV,
        ask,
        models: config.supportedModels
    };
})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenAIAPI;
}
