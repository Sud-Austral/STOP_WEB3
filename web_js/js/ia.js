/**
 * RID SIMULATOR - AI Interpretation Module
 * Generates AI interpretations for all 13 views in a single request
 */

const IAModule = {
    // Decryption utilities
    strToBytes(str) {
        return new TextEncoder().encode(str);
    },

    bytesToStr(bytes) {
        return new TextDecoder().decode(bytes);
    },

    getKey(seed) {
        const OFUSCADO = "VgAMFkZXBBFdUEpXQwFFXRZXA19NXV1XXQdQBVpDFlBIIwMkGxUkEgJcIRAXAUBcBQ==";
        const data = Uint8Array.from(atob(OFUSCADO), c => c.charCodeAt(0));
        const s = this.strToBytes(seed);
        const out = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            out[i] = data[i] ^ s[i % s.length];
        }
        return this.bytesToStr(out);
    },

    // API Configuration
    API_KEY: null,
    API_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    //MODEL_NAME: "GLM-4.6V-Flash",
    MODEL_NAME: "GLM-4.6V",

    // State to store interpretations
    interpretations: {},
    isLoaded: false,
    isLoading: false,

    /**
     * Initialize the AI module
     */
    init() {
        this.API_KEY = this.getKey("gfhrsdfsdfseweretfghtddfdf");
        console.log(this.API_KEY)
    },

    /**
     * Build the context from current data for AI interpretation
     */
    buildDataContext() {
        if (!window.STATE_DATA || !window.STATE_DATA.allDataHistory || window.STATE_DATA.allDataHistory.length === 0) {
            return null;
        }

        const data = window.STATE_DATA.allDataHistory;
        const COLS = window.COLS;
        const comunaName = window.STATE_DATA.comunaName || 'La comuna';

        // Get max week
        const maxSemana = Math.max(...data.map(row => row[COLS.ID_SEMANA]));
        const currentWeekData = data.filter(row => row[COLS.ID_SEMANA] === maxSemana);

        // Calculate key metrics
        const totalCasos = currentWeekData.reduce((sum, row) => sum + (row[COLS.CASOS_ACTUAL] || 0), 0);
        const totalCasosAnt = currentWeekData.reduce((sum, row) => sum + (row[COLS.CASOS_ANT] || 0), 0);
        const totalCasosYearAnt = currentWeekData.reduce((sum, row) => sum + (row[COLS.CASOS_YEAR_ANT] || 0), 0);

        const varSemanal = totalCasosAnt > 0 ? ((totalCasos - totalCasosAnt) / totalCasosAnt * 100).toFixed(1) : 0;
        const varAnual = totalCasosYearAnt > 0 ? ((totalCasos - totalCasosYearAnt) / totalCasosYearAnt * 100).toFixed(1) : 0;

        // Average Z-Score
        const avgZScore = currentWeekData.reduce((sum, row) => sum + (row[COLS.Z_SCORE] || 0), 0) / currentWeekData.length;

        // Top delitos
        const delitoGroups = {};
        currentWeekData.forEach(row => {
            const delito = row[COLS.DELITO];
            const casos = row[COLS.CASOS_ACTUAL] || 0;
            delitoGroups[delito] = (delitoGroups[delito] || 0) + casos;
        });

        const topDelitos = Object.entries(delitoGroups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `${name}: ${count} casos`);

        // Alertas
        const alertas = currentWeekData.filter(row => row[COLS.Z_SCORE] > 1).length;
        const alertasCriticas = currentWeekData.filter(row => row[COLS.Z_SCORE] > 2).length;

        // High risk delitos
        const highRiskDelitos = currentWeekData
            .filter(row => row[COLS.Z_SCORE] > 0.5)
            .sort((a, b) => (b[COLS.Z_SCORE] || 0) - (a[COLS.Z_SCORE] || 0))
            .slice(0, 3)
            .map(row => `${row[COLS.DELITO]} (Z=${(row[COLS.Z_SCORE] || 0).toFixed(2)})`);

        return {
            comunaName,
            semanaId: maxSemana,
            totalCasos,
            varSemanal,
            varAnual,
            avgZScore: avgZScore.toFixed(2),
            topDelitos,
            alertas,
            alertasCriticas,
            highRiskDelitos,
            numDelitos: currentWeekData.length
        };
    },

    /**
     * Generate all 13 interpretations in a single API call
     */
    async generateAllInterpretations() {
        if (this.isLoading) return;
        if (this.isLoaded && Object.keys(this.interpretations).length > 0) {
            return this.interpretations;
        }

        this.isLoading = true;

        try {
            const context = this.buildDataContext();
            if (!context) {
                console.warn('No data available for AI interpretation');
                this.isLoading = false;
                return this.getDefaultInterpretations();
            }

            const prompt = this.buildPrompt(context);

            const requestBody = {
                model: this.MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: "Eres un analista experto en seguridad pública y criminología. Debes generar interpretaciones breves y profesionales para un dashboard de inteligencia delictual municipal. Responde SOLO con el JSON solicitado, sin explicaciones adicionales."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            };

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';

            // Parse JSON response
            this.interpretations = this.parseAIResponse(content);
            this.isLoaded = true;

        } catch (error) {
            console.error('Error generating AI interpretations:', error);
            this.interpretations = this.getDefaultInterpretations();
        }

        this.isLoading = false;
        return this.interpretations;
    },

    /**
     * Build the prompt for generating all interpretations
     */
    buildPrompt(context) {
        return `
Analiza los siguientes datos delictuales de ${context.comunaName} y genera interpretaciones para 13 vistas de un dashboard de seguridad.

DATOS ACTUALES:
- Comuna: ${context.comunaName}
- Semana ID: ${context.semanaId}
- Total casos semana: ${context.totalCasos}
- Variación semanal: ${context.varSemanal}%
- Variación anual: ${context.varAnual}%
- Z-Score promedio: ${context.avgZScore}
- Alertas activas: ${context.alertas}
- Alertas críticas: ${context.alertasCriticas}
- Top 5 delitos: ${context.topDelitos.join(', ')}
- Delitos alto riesgo: ${context.highRiskDelitos.join(', ')}

Genera un JSON con la siguiente estructura exacta. Cada interpretación debe ser de 1-2 oraciones, profesional y específica:

{
  "vista1": "Interpretación sobre la situación general de seguridad",
  "vista2": "Interpretación sobre alertas activas y anomalías detectadas",
  "vista3": "Interpretación sobre si es un hecho aislado o tendencia sostenida",
  "vista4": "Interpretación sobre la gravedad del perfil delictual (matriz de riesgo)",
  "vista5": "Interpretación sobre violencia vs delitos menores",
  "vista6": "Interpretación sobre comparación regional",
  "vista7": "Interpretación sobre tendencias a largo plazo (10 años)",
  "vista8": "Interpretación sobre estacionalidad de los delitos",
  "vista9": "Interpretación sobre correlación entre tipos de delitos",
  "vista10": "Interpretación sobre pronóstico hacia fin de año",
  "vista11": "Interpretación sobre simulador de impacto",
  "vista12": "Interpretación sobre predicción del próximo peak delictual",
  "vista13": "Notas metodológicas y fuentes de datos"
}

Responde ÚNICAMENTE con el JSON, sin texto adicional.`;
    },

    /**
     * Parse the AI response and extract interpretations
     */
    parseAIResponse(content) {
        try {
            // Clean the response - remove markdown code blocks if present
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.slice(7);
            }
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.slice(3);
            }
            if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.slice(0, -3);
            }
            cleanContent = cleanContent.trim();

            // Try to parse as-is first
            try {
                return JSON.parse(cleanContent);
            } catch (e) {
                // If JSON is truncated, try to fix it
                console.warn('JSON truncated, attempting to fix...');

                // Find the last complete key-value pair
                const lastQuoteIndex = cleanContent.lastIndexOf('"');
                if (lastQuoteIndex > 0) {
                    // Try to close the JSON properly
                    let fixedContent = cleanContent.substring(0, lastQuoteIndex + 1);

                    // Check if we need to close the value
                    const afterLastKey = fixedContent.substring(fixedContent.lastIndexOf('": "') + 4);
                    if (!afterLastKey.endsWith('"')) {
                        fixedContent += '"';
                    }

                    // Close the object
                    if (!fixedContent.endsWith('}')) {
                        fixedContent += '\n}';
                    }

                    try {
                        const parsed = JSON.parse(fixedContent);
                        console.log('Successfully recovered partial AI response');

                        // Merge with defaults for missing keys
                        const defaults = this.getDefaultInterpretations();
                        return { ...defaults, ...parsed };
                    } catch (e2) {
                        console.warn('Could not fix truncated JSON');
                    }
                }

                throw e;
            }
        } catch (error) {
            console.error('Error parsing AI response:', error);
            console.log('Raw content:', content.substring(0, 500) + '...');
            return this.getDefaultInterpretations();
        }
    },

    /**
     * Get default interpretations when AI is unavailable
     */
    getDefaultInterpretations() {
        return {
            vista1: "Analizando situación general de la comuna...",
            vista2: "Evaluando alertas y anomalías detectadas...",
            vista3: "Determinando si existe una tendencia sostenida...",
            vista4: "Evaluando el perfil de gravedad delictual...",
            vista5: "Analizando distribución entre violencia y delitos menores...",
            vista6: "Comparando con el contexto regional...",
            vista7: "Analizando tendencias históricas a largo plazo...",
            vista8: "Evaluando patrones estacionales...",
            vista9: "Analizando correlaciones entre tipos de delitos...",
            vista10: "Generando pronóstico hacia fin de año...",
            vista11: "Simulador de impacto disponible...",
            vista12: "Prediciendo próximo peak delictual...",
            vista13: "Metodología basada en datos del CEAD, Fiscalía y Carabineros."
        };
    },

    /**
     * Get interpretation for a specific view
     * @param {string} viewId - e.g., 'vista1', 'vista2', etc.
     */
    async getInterpretation(viewId) {
        if (!this.isLoaded && !this.isLoading) {
            await this.generateAllInterpretations();
        }

        // Wait if still loading
        while (this.isLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return this.interpretations[viewId] || this.getDefaultInterpretations()[viewId];
    },

    /**
     * Update a specific DOM element with the interpretation
     * @param {string} viewId - e.g., 'vista1'
     * @param {string} elementId - DOM element ID to update
     */
    async updateElement(viewId, elementId) {
        const interpretation = await this.getInterpretation(viewId);
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = interpretation;
        }
    }
};

// Initialize the module
IAModule.init();

// Expose globally
window.IAModule = IAModule;
