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

    // API Configuration (initialized in init())
    API_KEY: null,
    API_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    MODEL_NAME: "GLM-4.7-Flash",

    // Cache Configuration
    CACHE_PREFIX: 'ia_interp_',
    CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 días

    // State to store interpretations
    interpretations: {},
    isLoaded: false,
    isLoading: false,

    /**
     * Initialize the AI module
     */
    init() {
        this.API_KEY = this.getKey("gfhrsdfsdfseweretfghtddfdf");
    },

    /**
     * Build cache key based on codcom + semanaId
     */
    getCacheKey() {
        const codcom = window.STATE_DATA?.codcom || 'default';
        const semana = window.STATE_DATA?.semanaId || 'unknown';
        return this.CACHE_PREFIX + codcom + '_' + semana;
    },

    /**
     * Load interpretations from localStorage cache
     * @returns {object|null} cached interpretations or null if expired/missing
     */
    loadFromCache() {
        try {
            const key = this.getCacheKey();
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const cached = JSON.parse(raw);
            const age = Date.now() - (cached.timestamp || 0);

            if (age > this.CACHE_TTL_MS) {
                localStorage.removeItem(key);
                console.log('[IA] Cache expirado, se renovará');
                return null;
            }

            console.log(`[IA] Cache válido (${(age / 3600000).toFixed(1)}h de ${(this.CACHE_TTL_MS / 3600000)}h)`);
            return cached.data;
        } catch (e) {
            console.warn('[IA] Error leyendo cache:', e);
            return null;
        }
    },

    /**
     * Save interpretations to localStorage cache
     */
    saveToCache(data) {
        try {
            const key = this.getCacheKey();
            const payload = JSON.stringify({ timestamp: Date.now(), data });
            localStorage.setItem(key, payload);

            // Limpiar caches antiguos de otras semanas/comunas
            this.cleanOldCaches(key);
        } catch (e) {
            console.warn('[IA] Error guardando cache:', e);
        }
    },

    /**
     * Remove old cache entries to avoid localStorage bloat
     */
    cleanOldCaches(currentKey) {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.startsWith(this.CACHE_PREFIX) && k !== currentKey) {
                    localStorage.removeItem(k);
                }
            }
        } catch (e) { /* silent */ }
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

        // ... existing STOP data processing ...
        const varSemanal = totalCasosAnt > 0 ? ((totalCasos - totalCasosAnt) / totalCasosAnt * 100).toFixed(1) : 0;
        const varAnual = totalCasosYearAnt > 0 ? ((totalCasos - totalCasosYearAnt) / totalCasosYearAnt * 100).toFixed(1) : 0;

        // Average Z-Score (Weighted by Cases)
        let weightedZSum = 0;
        let totalCasesForZ = 0;

        currentWeekData.forEach(row => {
            const z = row[COLS.Z_SCORE] || 0;
            const c = row[COLS.CASOS_ACTUAL] || 0;
            weightedZSum += z * c;
            totalCasesForZ += c;
        });

        const avgZScore = totalCasesForZ > 0 ? (weightedZSum / totalCasesForZ) : 0;
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

        // CEAD Data Integration
        let ceadSummary = "Datos CEAD no disponibles";
        let ceadTrend = "Desconocida";

        if (window.STATE_DATA_CEAD && window.STATE_DATA_CEAD.isLoaded && window.STATE_DATA_CEAD.allData.length > 0) {
            const ceadData = window.STATE_DATA_CEAD.allData;
            const idxCead = window.COLS_CEAD;

            // Basic CEAD Stats from latest month
            // Assuming sorted by date desc
            const latestCead = ceadData[0];
            const totalCeadMes = ceadData.filter(r => r[idxCead.ANIO] === latestCead[idxCead.ANIO] && r[idxCead.MES_NUM] === latestCead[idxCead.MES_NUM])
                .reduce((acc, r) => acc + (r[idxCead.CASOS_MES_ACTUAL] || 0), 0);

            ceadSummary = `Total Delitos (Último Mes CEAD): ${totalCeadMes}. Alerta: ${latestCead[idxCead.ALERTA_AUMENTO_CRITICO] || 'Normal'}`;

            // Simple trend check (comparing with 3 months ago)
            if (ceadData.length > 3) {
                const prev = ceadData.find(r => r[idxCead.MES_NUM] === ((latestCead[idxCead.MES_NUM] - 3 + 12) % 12) || 12); // Approximate
                // actually just take simple slice if sorted
                // let's just say specific analysis questions cover this.
                ceadTrend = latestCead[idxCead.TENDENCIA_CORTO_PLAZO] || "Estable";
            }
        }

        // Vista 3 - Comparativo Temporal
        const promHist = currentWeekData.reduce((s, r) => s + (r[COLS.PROMEDIO_HIST] || 0), 0);
        const varVsProm = promHist > 0 ? ((totalCasos - promHist) / promHist * 100).toFixed(1) : 0;

        // Vista 19 - Z-Score Total
        const totalRow = (window.STATE_DATA.allDataHistory_total || []).find(r => r[COLS.ID_SEMANA] === maxSemana);
        const zScoreTotal = totalRow ? (totalRow[COLS.Z_SCORE] || 0) : 0;
        const anomalias = currentWeekData.filter(r => Math.abs(r[COLS.Z_SCORE] || 0) > 1.5).length;

        // Vista 18 - Aceleración (media móvil 4s vs 8s)
        const mm4s = totalRow ? (totalRow[COLS.MEDIA_MOVIL_4S] || 0) : 0;
        const mm8s = totalRow ? (totalRow[COLS.MEDIA_MOVIL_8S] || 0) : 0;
        const aceleracion = mm8s > 0 ? ((mm4s - mm8s) / mm8s * 100).toFixed(1) : 0;

        return {
            comunaName,
            semanaId: maxSemana,
            totalCasos,
            totalCasosAnt,
            totalCasosYearAnt,
            varSemanal,
            varAnual,
            avgZScore: avgZScore.toFixed(2),
            topDelitos,
            alertas,
            alertasCriticas,
            highRiskDelitos,
            numDelitos: currentWeekData.length,
            v15_risk: avgZScore > 1 ? 'ALTO' : (avgZScore > 0.5 ? 'MEDIO' : 'BAJO'),
            // Vista 3
            promHist: promHist.toFixed(0),
            varVsProm,
            // Vista 18
            mm4s: mm4s.toFixed(1),
            mm8s: mm8s.toFixed(1),
            aceleracion,
            // Vista 19
            zScoreTotal: parseFloat(zScoreTotal).toFixed(2),
            anomalias,
            // CEAD
            ceadSummary,
            ceadTrend
        };
    },

    /**
     * Generate all interpretations — uses localStorage cache (7 días / por semana+comuna)
     */
    async generateAllInterpretations() {
        if (this.isLoading) return;
        if (this.isLoaded && Object.keys(this.interpretations).length > 0) {
            return this.interpretations;
        }

        this.isLoading = true;

        try {
            // 1. Intentar cargar desde cache
            const cached = this.loadFromCache();
            if (cached && Object.keys(cached).length > 0) {
                this.interpretations = cached;
                this.isLoaded = true;
                this.isLoading = false;
                console.log('[IA] ✅ Interpretaciones cargadas desde cache');
                return this.interpretations;
            }

            // 2. Sin cache válido → llamar API
            const context = this.buildDataContext();
            if (!context) {
                console.warn('[IA] No data available for AI interpretation');
                this.isLoading = false;
                return this.getDefaultInterpretations();
            }

            console.log('[IA] Cache vacío/expirado, consultando API...');
            const prompt = this.buildPrompt(context);

            const requestBody = {
                model: this.MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: "Eres un analista experto en seguridad pública y criminología con un enfoque en comunicación estratégica. Debes generar interpretaciones breves y profesionales para un dashboard de inteligencia delictual municipal. Responde SOLO con el JSON solicitado, sin explicaciones adicionales."
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
                const errBody = await response.text();
                console.error('[IA] API Error:', errBody);
                throw new Error(`API Error: ${response.status} - ${errBody}`);
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';

            // Parse JSON response
            this.interpretations = this.parseAIResponse(content);
            this.isLoaded = true;

            // 3. Guardar en cache para reutilizar durante la semana
            this.saveToCache(this.interpretations);
            console.log('[IA] ✅ Interpretaciones generadas y guardadas en cache');

        } catch (error) {
            console.error('[IA] Error generating AI interpretations:', error);
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
- Promedio histórico semanal: ${context.promHist}
- Variación vs promedio histórico: ${context.varVsProm}%
- Media Móvil 4S: ${context.mm4s}, Media Móvil 8S: ${context.mm8s}
- Aceleración (4S vs 8S): ${context.aceleracion}%
- Z-Score Total: ${context.zScoreTotal}
- Anomalías (|Z|>1.5): ${context.anomalias}
- Info CEAD: ${context.ceadSummary}, Tendencia: ${context.ceadTrend}

Data para vista15 (Diagnóstico Inmediato):
- Casos Actuales: ${context.totalCasos}
- Casos Semana Anterior: ${context.totalCasosAnt}
- Casos Año Anterior: ${context.totalCasosYearAnt}
- Variación Semanal: ${context.varSemanal}%
- Variación Anual: ${context.varAnual}%
- Z-Score Global: ${context.avgZScore}
- Riesgo Global Estimado: ${context.v15_risk}
- Principales Delitos: ${context.topDelitos.slice(0, 3).join(', ')}

Genera un JSON con la siguiente estructura exacta. Cada interpretación debe ser de 1-2 oraciones, profesional y específica:

{
  "vista1": "Interpretación sobre la situación general de seguridad",
  "vista2": "Interpretación sobre alertas activas y anomalías detectadas",
  "vista3": "COMPARATIVO TEMPORAL: Compara los ${context.totalCasos} casos actuales vs semana anterior (${context.totalCasosAnt}, Δ${context.varSemanal}%), vs misma semana año anterior (${context.totalCasosYearAnt}, Δ${context.varAnual}%), y vs promedio histórico (${context.promHist}, Δ${context.varVsProm}%). Diagnostica si hay alza consistente, baja o sin patrón claro.",
  "vista4": "Interpretación sobre la gravedad del perfil delictual (matriz de riesgo)",
  "vista5": "Interpretación sobre violencia vs delitos menores",
  "vista6": "Interpretación sobre comparación regional",
  "vista7": "Interpretación sobre tendencias a largo plazo (10 años)",
  "vista8": "Interpretación sobre estacionalidad de los delitos",
  "vista9": "Interpretación sobre correlación entre tipos de delitos",
  "vista10": "Generando pronóstico hacia fin de año (STOP)",
  "vista11": "Interpretación sobre simulador de impacto",
  "vista12": "Interpretación sobre predicción del próximo peak delictual (STOP)",
  "vista13": "Notas metodológicas y fuentes de datos",
  "vista14": "Interpretación sobre la proyección futura (regresión lineal) y tendencia",
  "vista15": "Utiliza EXCLUSIVAMENTE la sección 'Data para vista15' para generar un diagnóstico situacional objetivo.",
  "vista16": "Interpretación sobre demografía y tasas delictuales por habitante",
  "vista17": "Interpretación sobre ranking regional y contexto geográfico",
  "vista18": "ACELERACIÓN DEL CRECIMIENTO: La media móvil 4S es ${context.mm4s} y la 8S es ${context.mm8s} (aceleración: ${context.aceleracion}%). Interpreta si el crecimiento delictual se está acelerando o desacelerando, y qué implica operativamente.",
  "vista19": "NORMALIDAD ESTADÍSTICA Z-SCORE: El Z-Score total es ${context.zScoreTotal} con ${context.anomalias} anomalías detectadas (|Z|>1.5). Clasifica la semana (normal/atípica/extrema) e interpreta la probabilidad estadística de este nivel de delincuencia.",
  "vista20": "Resumen ejecutivo integral y estado de alertas críticas",
  "vista21": "Análisis de evolución mensual CEAD",
  "vista22": "Comparativa anual/mensual CEAD",
  "vista23": "¿Es un hecho delictivo o una tendencia sostenida (CEAD)? Analiza si la tendencia mensual es creciente o estable.",
  "vista24": "Interpretación de matriz de variaciones CEAD",
  "vista25": "Análisis de distribución territorial CEAD",
  "vista26": "Comparación comunal vs regional CEAD",
  "vista27": "Tendencia histórica CEAD (Largo plazo)",
  "vista28": "Estacionalidad y patrones mensuales CEAD",
  "vista29": "Correlaciones delictuales en datos CEAD",
  "vista30": "¿Qué esperar hacia fin de año? (CEAD). Proyecta basado en la tendencia actual.",
  "vista31": "Simulación de escenarios CEAD",
  "vista32": "¿Cuándo es posible el próximo peak? (CEAD). Identifica patrones cíclicos probables."
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
            vista12: "Prediciendo el próximo peak delictual...",
            vista13: "Revisando fuentes y notas metodológicas...",
            vista14: "Calculando proyección y regresión lineal delictual...",
            vista15: "Generando diagnóstico crítico inmediato de seguridad...",
            vista16: "Analizando tasas ajustadas por población y demografía...",
            vista17: "Calculando posición en el ranking regional...",
            vista18: "Identificando rachas tácticas y patrones operativos...",
            vista19: "Detectando anomalías estadísticas mediante Z-Score...",
            vista20: "Consolidando tablero de mando ejecutivo...",
            vista21: "Analizando evolución histórica CEAD...",
            vista22: "Comparando métricas anuales CEAD...",
            vista23: "Evaluando tendencias sostenidas en el tiempo...",
            vista24: "Calculando variaciones porcentuales...",
            vista25: "Analizando distribución territorial...",
            vista26: "Comparando con promedios regionales...",
            vista27: "Proyectando tendencias a largo plazo...",
            vista28: "Identificando patrones estacionales...",
            vista29: "Analizando correlaciones delictuales...",
            vista30: "Calculando proyección de fin de año...",
            vista31: "Simulando escenarios hipotéticos...",
            vista32: "Prediciendo próximos peaks de actividad..."
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
