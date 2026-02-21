/**
 * IA Module V2 - Strategic Analysis
 * Single Request Pattern, 5-Day Cache
 */
window.IAModuleV2 = {
    // Configuration
    CACHE_KEY: 'ia_v2_fix_', // Changed key to force refresh
    CACHE_TTL: 5 * 24 * 60 * 60 * 1000, // 5 days
    API_URL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    MODEL_NAME: "GLM-4.7-Flash",

    // Obfuscated Key (Same as ia.js)
    getKey(seed) {
        const OFUSCADO = "VgAMFkZXBBFdUEpXQwFFXRZXA19NXV1XXQdQBVpDFlBIIwMkGxUkEgJcIRAXAUBcBQ==";
        const data = Uint8Array.from(atob(OFUSCADO), c => c.charCodeAt(0));
        const s = new TextEncoder().encode(seed);
        const out = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) out[i] = data[i] ^ s[i % s.length];
        return new TextDecoder().decode(out);
    },

    init() {
        console.log('🤖 IA [INIT]: Módulo inicializado. Esperando datos...');
        this.cache = {};

        window.addEventListener('dataManagerLoaded', () => {
            console.log('🤖 IA [EVENT]: dataManagerLoaded detectado. Esperando 30s de cortesía (Legacy Stable Delay)...');
            setTimeout(() => {
                this.cache = this.loadCache();
                if (!this.cache.vista1) {
                    console.log('🤖 IA [CACHE]: Vacío o incompleto. Solicitando análisis...');
                    this.fetchAllAnalyses();
                } else {
                    console.log('🤖 IA [CACHE]: Cargado desde local con', Object.keys(this.cache).length, 'vistas.');
                    this.updateAllViews();
                }
            }, 30000);
        });

        window.addEventListener('viewLoaded', () => {
            this.updateAllViews();
        });
    },

    loadCache() {
        try {
            const codcom = window.STATE_DATA?.codcom || 'default';
            const raw = localStorage.getItem(this.CACHE_KEY + codcom);
            if (!raw) return {};

            if (raw.includes("Sin localización") || raw.includes("anonimato")) {
                console.warn("🤖 IA [CACHE]: Datos genéricos detectantes. Limpiando.");
                localStorage.removeItem(this.CACHE_KEY + codcom);
                return {};
            }

            const { timestamp, data } = JSON.parse(raw);
            if (Date.now() - timestamp > this.CACHE_TTL) {
                console.log('🤖 IA [CACHE]: Expirado por tiempo.');
                return {};
            }
            return data;
        } catch (e) { return {}; }
    },

    saveCache(data) {
        const codcom = window.STATE_DATA?.codcom || 'default';
        const key = this.CACHE_KEY + codcom;
        try {
            localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (e) {
            // ERR-009: Handle QuotaExceededError
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                LOG.warn('[IA2] localStorage lleno, limpiando caches antiguos...');
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(this.CACHE_KEY) && k !== key) localStorage.removeItem(k);
                }
                try { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data })); } catch (_) { }
            }
        }
    },

    buildContext(S) {
        const C = window.COLS;
        const C_CEAD = window.COLS_CEAD;
        const S_CEAD = window.STATE_DATA_CEAD;

        if (!S.comunaName || S.comunaName.includes('Cargando')) return null;
        if (!S.allDataHistory_total || S.allDataHistory_total.length === 0) return null;

        // --- Core Data (STOP) ---
        const totalRow = S.allDataHistory_total.find(r => r[C.ID_SEMANA] === S.currentSemana) || {};
        const cases = totalRow[C.CASOS_ACTUAL] || 0;
        const prev = totalRow[C.CASOS_ANT] || 0;
        const delta = prev > 0 ? ((cases - prev) / prev * 100) : 0;

        // --- Specific Vistas Metrics ---

        // V12-V16: Context & Ranks (Simulated/Calculated)
        const nationalRank = totalRow[C.RANK_NAC] || 120; // Example
        const clusterRank = totalRow[C.RANK_CLUSTER] || 5;
        const effectiveness = (totalRow[C.DETENIDOS] || 0) / (cases || 1) * 100;

        // V19: Emerging (STOP & CEAD)
        const stopEmerging = S.allDataHistory
            .filter(r => r[C.ID_SEMANA] === S.currentSemana && r[C.CASOS_ACTUAL] > r[C.CASOS_ANT] * 1.2)
            .map(r => r[C.DELITO]).slice(0, 2);

        const ceadEmerging = S_CEAD && S_CEAD.allDataHistory
            ? S_CEAD.allDataHistory.filter(r => r[C_CEAD.ID_PERIODO] === S_CEAD.periodoId && r[C_CEAD.Z_SCORE] > 1.5).map(r => r[C_CEAD.DELITO]).slice(0, 2)
            : [];

        // V20: Success
        const stopSuccess = S.allDataHistory
            .filter(r => r[C.ID_SEMANA] === S.currentSemana && r[C.CASOS_ACTUAL] < r[C.CASOS_ANT] * 0.8)
            .map(r => r[C.DELITO]).slice(0, 2);

        // V21: Forecast (Simplified)
        const forecastTrend = "Estable"; // Placeholder for complex SARIMA logic output

        // V22: Priority
        const priorityCrime = S.allDataHistory
            .filter(r => r[C.ID_SEMANA] === S.currentSemana)
            .sort((a, b) => (b[C.CASOS_ACTUAL] * (b[C.CASOS_ACTUAL] / b[C.CASOS_ANT] || 1)) - (a[C.CASOS_ACTUAL] * (a[C.CASOS_ACTUAL] / a[C.CASOS_ANT] || 1)))
            .map(r => r[C.DELITO])[0] || 'N/A';

        return {
            comuna: S.comunaName,
            week: S.semanaDetalle,
            metrics: {
                total_cases: cases,
                weekly_delta: delta.toFixed(1) + '%',
                communal_rate: (totalRow[C.TASA_SEMANAL] || 0).toFixed(1),
                national_rank: nationalRank,
                cluster_rank: clusterRank,
                effectiveness_ratio: effectiveness.toFixed(1) + '%'
            },
            insights: {
                emerging_short_term: stopEmerging.join(', '),
                emerging_long_term: ceadEmerging.join(', '),
                success_stories: stopSuccess.join(', '),
                priority_focus: priorityCrime,
                forecast_trend: forecastTrend
            }
        };
    },

    async fetchAllAnalyses() {
        if (this.fetching) {
            console.log('🤖 IA [INFO]: Petición en curso, ignorando duplicado.');
            return;
        }
        this.fetching = true;
        console.log('🤖 IA [START]: Generando nuevo análisis estratégico...');

        const S = window.STATE_DATA;
        console.log('🤖 IA [DEBUG]: Construyendo contexto para', S?.comunaName);
        const context = this.buildContext(S);

        if (!context) {
            console.warn("🤖 IA [WARN]: Contexto insuficiente (faltan datos o comuna).");
            this.fetching = false;
            return;
        }

        try {
            console.log('🤖 IA [FETCH]: Iniciando llamada a API Zhipu (GLM-4)...');
            const prompt = `
Eres un analista de inteligencia policial experto en el sistema STOP y CEAD de Carabineros de Chile.
Tu misión es generar interpretaciones estratégicas CONCISAS y EJECUTIVAS para el dashboard de seguridad de la COMUNA DE ${context.comuna.toUpperCase()}.

CONTEXTO OPERATIVO (${context.week}):
${JSON.stringify(context.metrics, null, 2)}

REGLAS CRÍTICAS:
- Máximo 30 palabras por vista. Sin rodeos.
- Menciona SIEMPRE la comuna: "${context.comuna}".
- Usa lenguaje de mando policial: directo, sin eufemismos.
- Si el dato es positivo (baja), destácalo como logro. Si es negativo (alza), como alerta.

INSTRUCCIONES POR VISTA:
- vista1: Veredicto general de la semana. ¿Alza o baja? ¿Cuánto? ¿Qué delito lidera?
- vista2: Tendencia de los últimos 6 meses. ¿Estamos sobre o bajo el promedio histórico?
- vista3: ¿La semana actual está cerca del máximo o mínimo histórico? ¿Qué implica?
- vista4: ¿Qué mes o trimestre concentra históricamente más delitos? ¿Estamos en ese período?
- vista5: ¿Qué delito concentra el 80% del problema (Pareto)? Nombra el top 1.
- vista6: ¿Qué delito tuvo el mayor salto porcentual esta semana? ¿Es preocupante?
- vista7: ¿Qué delito lleva más semanas consecutivas al alza (racha negativa)?
- vista8: ¿Existe correlación entre delitos que deba alertar al mando?
- vista9: ¿Cuál es la tasa delictual por habitante y cómo se compara con la región?
- vista10: ¿En qué posición del ranking regional está ${context.comuna} esta semana?
- vista11: En perspectiva de 20 años, ¿estamos en un período de alza estructural o baja?
- vista12: Ranking nacional (${context.metrics.national_rank}). ¿Mejora o deterioro vs semana anterior?
- vista13: Clúster (${context.metrics.cluster_rank}). ¿Mejor o peor que comunas de tamaño similar?
- vista14: ¿Qué porcentaje del total regional aporta ${context.comuna}? ¿Aumentó o bajó?
- vista15: Tasa de detención (${context.metrics.effectiveness_ratio}). ¿Es suficiente para el nivel de delitos?
- vista16: Comparativa regional. ¿${context.comuna} está sobre o bajo la media de la región?
- vista17: Proyección de cierre anual. ¿Vamos a terminar el año mejor o peor que el anterior?
- vista18: Análisis de rachas. ¿Cuántas semanas consecutivas en alza o baja?
- vista19: Delitos emergentes de corto plazo: ${context.insights.emerging_short_term || 'sin datos'}. ¿Qué acción inmediata se requiere?
- vista20: Delitos en disipación: ${context.insights.success_stories || 'sin datos'}. ¿Qué factor explica la baja?
- vista21: Momentum de crecimiento. ¿La tendencia de aceleración es preocupante o controlada?
- vista22: Prioridad táctica N°1: ${context.insights.priority_focus}. Justifica en una frase.
- vista23: Recomendación de acción inmediata para el mando comunal. Sé específico.
- vista24: Veredicto ejecutivo final. ¿La situación de ${context.comuna} requiere intervención urgente?
- vista25: Calidad del dato. ¿Hay semanas sin información que afecten el análisis?

FORMATO DE RESPUESTA:
JSON CRUDO con claves "vista1" a "vista25". Sin markdown. Sin explicaciones adicionales.
            `;

            const API_KEY = this.getKey("gfhrsdfsdfseweretfghtddfdf");
            const fetchController = new AbortController();
            // Aumentamos a 90s por latencia y carga de la API GLM-4
            const fetchTimeoutId = setTimeout(() => {
                console.warn('🤖 IA [TIMEOUT]: La petición excedió los 90s y será abortada.');
                fetchController.abort();
            }, 90000);

            // jitter
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

            let response;
            try {
                response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: this.MODEL_NAME,
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.5
                    }),
                    signal: fetchController.signal
                });
                console.log('🤖 IA [RES]: HTTP Status', response.status);
            } finally {
                clearTimeout(fetchTimeoutId);
            }

            if (response.status === 429) {
                throw new Error("Límite de peticiones alcanzado (429). Reintentando en próxima sesión.");
            }
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{}';
            console.log('🤖 IA [DATA]: Respuesta recibida (longitud:', content.length, ')');

            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            const cleanJson = content.substring(jsonStart, jsonEnd);
            const analyses = JSON.parse(cleanJson);

            console.log('🤖 IA [OK]: Análisis parseado correctamente. Actualizando UI.');
            this.cache = analyses;
            this.saveCache(analyses);
            this.updateAllViews();

        } catch (e) {
            console.error('🤖 IA [ERROR]:', e);
            if (e.name === 'AbortError') {
                console.error('🤖 IA [CRITICAL]: La petición fue cancelada por timeout o señal externa.');
            }
            this.updateAllViews(true);
        } finally {
            this.fetching = false;
        }
    },

    updateAllViews(isError = false) {
        for (let i = 1; i <= 25; i++) {
            const vid = `vista${i}`;
            const el = document.getElementById(`v${i}_ia_analysis`);
            if (el) {
                const parent = el.closest('.alert');
                if (isError) {
                    el.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Servicio de IA no disponible. Verifique conexión.';
                    if (parent) {
                        // Cambiar estilo a Error visualmente
                        parent.style.backgroundColor = 'rgba(254, 226, 226, 0.5)'; // Rojo claro
                        parent.style.borderColor = '#fca5a5';
                        parent.style.color = '#b91c1c';
                        // Intentar quitar alert--info si entra en conflicto
                        parent.classList.remove('alert--info');
                        parent.classList.add('alert--danger');
                    }
                }
                else if (this.cache[vid]) {
                    el.textContent = this.cache[vid];
                    if (parent) {
                        // Restaurar estilo Info
                        parent.style.backgroundColor = '';
                        parent.style.borderColor = '';
                        parent.style.color = '';
                        parent.classList.add('alert--info');
                        parent.classList.remove('alert--danger');
                    }
                }
            }
        }
    }
};

window.IAModuleV2.init();
