/**
 * IA Module V2 - Strategic Analysis
 * Single Request Pattern, 5-Day Cache
 */
window.IAModuleV2 = {
    // Configuration
    CACHE_KEY: 'ia_v2_fix_', // Changed key to force refresh
    CACHE_TTL: 2 * 24 * 60 * 60 * 1000, // 5 days
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
            console.log('🤖 IA [EVENT]: dataManagerLoaded detectado. Esperando 3s para sincronización de UI...');
            setTimeout(() => {
                this.cache = this.loadCache();
                if (!this.cache.vista1) {
                    console.log('🤖 IA [CACHE]: Vacío o incompleto. Solicitando análisis...');
                    this.fetchAllAnalyses();
                } else {
                    console.log('🤖 IA [CACHE]: Cargado desde local con', Object.keys(this.cache).length, 'vistas.');
                    this.updateAllViews();
                }
            }, 3000);
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
        const cagr_4s = totalRow[C.T31_CAGR_4S] || 0;

        // --- Specific Vistas Metrics ---
        const nationalRank = totalRow['ranking_nacional_semanal'] || totalRow[C.RANK_NAC] || '--';
        const clusterRank = totalRow[C.RANK_CLUSTER_SEM] || totalRow[C.RANK_CLUSTER] || '--';
        const regionalRank = totalRow['ranking_regional_semanal'] || '--';
        const effectiveness = (totalRow[C.DETENIDOS] || 0) / (cases || 1) * 100;

        // Crime breakdown (Top 5 actual week)
        const currentData = S.allDataHistory.filter(r => r[C.ID_SEMANA] === S.currentSemana).sort((a, b) => (b[C.CASOS_ACTUAL] || 0) - (a[C.CASOS_ACTUAL] || 0));
        const topCrimes = currentData.slice(0, 5).map(r => `${r[C.DELITO]}: ${r[C.CASOS_ACTUAL]}`);
        const risingCrimes = currentData.filter(r => (r[C.CASOS_ACTUAL] > r[C.CASOS_ANT])).map(r => `${r[C.DELITO]} (+${r[C.CASOS_ACTUAL] - r[C.CASOS_ANT]})`);
        const fallingCrimes = currentData.filter(r => (r[C.CASOS_ACTUAL] < r[C.CASOS_ANT])).map(r => `${r[C.DELITO]} (${r[C.CASOS_ACTUAL] - r[C.CASOS_ANT]})`);

        // V19 & V21: Emerging & Momentum
        const stopEmerging = currentData
            .filter(r => r[C.CASOS_ACTUAL] > 0 && r[C.CASOS_ACTUAL] > (r[C.CASOS_ANT] * 1.5))
            .map(r => r[C.DELITO]).slice(0, 3);

        const highMomentum = currentData
            .filter(r => r[C.DELITO] !== 'Total' && r[C.T31_CAGR_4S] > 0)
            .sort((a, b) => b[C.T31_CAGR_4S] - a[C.T31_CAGR_4S])
            .map(r => `${r[C.DELITO]} (CAGR 4S: ${r[C.T31_CAGR_4S].toFixed(1)}%)`).slice(0, 3);

        const ceadEmerging = S_CEAD && S_CEAD.allDataHistory
            ? S_CEAD.allDataHistory.filter(r => r[C_CEAD.ID_PERIODO] === S_CEAD.periodoId && r[C_CEAD.Z_SCORE] > 1.5).map(r => r[C_CEAD.DELITO]).slice(0, 2)
            : [];

        // V20: Success
        const stopSuccess = currentData
            .filter(r => r[C.CASOS_ACTUAL] === 0 && r[C.CASOS_ANT] > 0)
            .map(r => r[C.DELITO]).slice(0, 3);

        // V22: Priority
        const priorityCrime = currentData
            .filter(r => r[C.CASOS_ACTUAL] > 5 && r[C.CASOS_ACTUAL] > r[C.CASOS_ANT])
            .map(r => r[C.DELITO])[0] || 'N/A';

        return {
            comuna: S.comunaName,
            week: S.semanaDetalle,
            metrics: {
                total_cases: cases,
                total_cases_last_week: prev,
                weekly_delta_percent: delta.toFixed(1) + '%',
                overall_momentum_cagr_4s: cagr_4s.toFixed(1) + '%',
                communal_rate: (totalRow[C.TASA_SEMANAL] || 0).toFixed(1),
                national_rank: nationalRank,
                regional_rank: regionalRank,
                cluster_rank: clusterRank,
                effectiveness_ratio: effectiveness.toFixed(1) + '%'
            },
            insights: {
                top_crimes_volume: topCrimes.join(', '),
                crimes_increasing_wow: risingCrimes.join(', '),
                crimes_decreasing_wow: fallingCrimes.join(', '),
                emerging_short_term: stopEmerging.join(', '),
                emerging_long_term: ceadEmerging.join(', '),
                crimes_with_high_momentum: highMomentum.join(', '),
                success_stories: stopSuccess.join(', '),
                priority_focus: priorityCrime
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
        const context = this.buildContext(S);

        if (!context) {
            console.warn("🤖 IA [WARN]: Contexto insuficiente (faltan datos o comuna).");
            this.fetching = false;
            return;
        }

        try {
            const prompt = `
Eres un analista de inteligencia estratégica y perfilador criminal experto en el sistema STOP y CEAD de Carabineros de Chile.
Tu misión es generar interpretaciones estratégicas DETALLADAS, ANALÍTICAS y EJECUTIVAS para el dashboard de seguridad de la COMUNA DE ${context.comuna.toUpperCase()}.

CONTEXTO OPERATIVO (${context.week}):
${JSON.stringify(context, null, 2)}

REGLAS CRÍTICAS DE RESPUESTA:
- ESTILO MILITAR ULTRA-CONCISO: Respuestas de impacto, máximo 20 a 30 palabras por vista. Ve directo a la conclusión operativa.
- Menciona siempre la comuna ("${context.comuna}") para contextualizar territorialmente de manera natural y formal.
- Adopta un tono de mando policial técnico, directo, sin eufemismos, orientado puramente a toma de decisiones y mitigación de crisis. Elimina verbosidad inútil.
- Relaciona los hallazgos directamente con los datos entregados en el CONTEXTO OPERATIVO. Si falta algún dato empírico, realiza inferencias lógicas y razonables según la criminología y el comportamiento habitual en Chile.

PREGUNTAS A RESPONDER DETALLADAMENTE (UNA RESPUESTA CERRADA Y COMPLETA POR VISTA):
- vista1: ¿Qué ha pasado en la última semana? (Veredicto general STOP: casos actuales, variación semanal y nivel de riesgo compuesto de la comuna).
- vista2: ¿Hay alertas activas o anomalías esta semana? (Evalúa el estado de alerta según Z-Score: cuántos delitos están en estado crítico, precaución o normal, e identifica el más urgente).
- vista3: ¿Estamos mejor o peor que en períodos anteriores? (Compara la semana actual contra la semana anterior, mismo período del año anterior y el promedio histórico; determina si la situación mejora o se deteriora).
- vista4: ¿Cuál es el nivel de riesgo por tipo de delito según su Z-Score? (Clasifica los delitos en Alto, Moderado y Bajo Impacto basándose en la matriz de Z-Score; identifica cuáles están estadísticamente sobre la norma histórica).
- vista5: ¿La violencia está aumentando o predominan delitos menores en STOP? (Analiza la distribución delictual por naturaleza y tipo: ¿predominan delitos violentos o contra la propiedad? ¿Qué tipos concentran mayor frecuencia?).
- vista6: ¿Qué delitos se mueven de manera conjunta o correlacionada? (Analiza las correlaciones de Pearson del heatmap: ¿cuáles coocurren? ¿Hay asociaciones delictuales que sugieran bandas o patrones multicriminales?).
- vista7: ¿Cuáles son las tendencias históricas de la última década en STOP? (Evalúa la evolución anual de los últimos 10 años: ¿hay crecimiento estructural, reducción sostenida o estabilidad en el largo plazo?).
- vista8: ¿Existe estacionalidad en el comportamiento delictual mensual? (Identifica patrones mensuales: ¿qué meses son críticos históricamente? ¿La semana actual corresponde a un período estacionalmente alto o bajo?).
- vista9: ¿Existe relación entre el consumo de alcohol/drogas y los delitos de la comuna? (Analiza la correlación entre casos de ley de alcoholes y los delitos violentos o contra las personas observados).
- vista10: ¿Qué se puede esperar en las próximas semanas según el pronóstico? (Evalúa la proyección basada en series históricas: ¿la tendencia indica alza, baja o estabilidad? ¿Hay intervalos de confianza preocupantes?).
- vista11: ¿Qué pasaría si ciertos delitos se intensificaran en la simulación de hipótesis? (Interpreta el impacto proyectado en el índice de riesgo si robos +%, hurtos +% o consumo alcohol +% según los parámetros del simulador).
- vista12: ¿Cuándo es posible el próximo peak delictual según el modelo NVP? (Identifica la semana proyectada para el próximo máximo según análisis de series de tiempo; qué tipo de delito lo podría liderar).
- vista13: Vista de Metodología y Anexos técnicos del informe. No aplica análisis de IA sobre datos delictuales. Responde únicamente: "Documentación técnica del sistema STOP: metodología validada, fuentes certificadas, algoritmo IR calibrado."
- vista14: ¿Cuál es la situación delictual con proyección de tendencia lineal? (Evalúa la evolución histórica y la regresión de las últimas 12 semanas: ¿la tendencia proyectada a 4 semanas es al alza, a la baja o estable?).
- vista15: ¿Qué pasó esta semana según el diagnóstico inmediato? (Evalúa Z-Score global, variación semana a semana, concentración en top 3 delitos, nivel de riesgo compuesto y score numérico).
- vista16: ¿La tasa delictual de la comuna es alta o baja en relación a su tamaño poblacional? (Analiza la tasa por 100k hab. y la clasificación por grupo poblacional: ¿estamos sobre o bajo la norma para comunas de este segmento de población?).
- vista17: ¿Cómo se posiciona la comuna en el ranking regional por tipo de delito? (Evalúa ranking promedio regional, cuántos delitos están en el top 3 más crítico de la región y si la posición empeoró o mejoró vs semana anterior).
- vista18: ¿El problema delictual está acelerando o desacelerando su crecimiento? (Analiza la segunda derivada: tasa de crecimiento 4S vs 8S, el delta de aceleración expresado en puntos porcentuales y el momentum estructural YTD).
- vista19: ¿Esta semana representa un evento estadísticamente extraordinario o es comportamiento normal? (Evalúa el Z-Score de normalidad estadística: ¿dentro del rango +/-1.96 sigma? ¿Hay delitos específicos con valores extremos fuera de la distribución normal?).
- vista20: ¿Cuál es el veredicto ejecutivo integral de la comuna según el tablero 360°? (Sintetiza: presión delictual por 10k hab., persistencia máxima en semanas consecutivas, posición regional y número de focos con Z-Score crítico).
- vista21: ¿Cuál es la situación general mensual según datos CEAD? (Evalúa casos del mes actual, variación vs mes anterior y vs año anterior, acumulado anual y nivel de riesgo según Z-Score promedio CEAD).
- vista22: ¿Hay alertas o anomalías en los datos mensuales CEAD? (Determina el estado: ALERTA, PRECAUCIÓN o NORMAL según Z-Score promedio CEAD; identifica el delito con mayor Z-Score y la media móvil de 4 meses).
- vista23: ¿Es un hecho aislado o una tendencia sostenida en los datos CEAD? (Analiza la pendiente de regresión lineal de los últimos 12 meses CEAD: ¿la tendencia mensual es creciente, decreciente o estable? ¿Confirma o contradice los datos STOP?).
- vista24: ¿El nivel delictual mensual CEAD es grave o moderado? (Evalúa la distribución de delitos en el scatter Z-Score CEAD: cuántos son de alto impacto vs moderados o bajo impacto, e identifica el delito más crítico del mes).
- vista25: ¿La violencia está aumentando o predominan delitos menores en CEAD? (Analiza el perfil delictual mensual CEAD comparando mes actual vs mes anterior vs promedio histórico por tipo de delito: ¿qué naturaleza delictual lidera?).

FORMATO DE RESPUESTA:
NUNCA uses JSON. Devuelve tu respuesta como texto simple, separando cada análisis con una etiqueta de corchetes.
Tu respuesta debe lucir exactamente así:
[vista1]
Tu análisis para la vista 1 aquí...
[vista2]
Tu análisis para la vista 2 aquí...
(Y así sucesivamente hasta [vista25]). No agregues encabezados ni despedidas.`;

            // Auditoría de Calidad Preventiva
            if (window.PromptQuality && !window.PromptQuality.audit(prompt, context)) {
                this.updateAllViews(true);
                this.fetching = false;
                return;
            }

            const API_KEY = this.getKey("gfhrsdfsdfseweretfghtddfdf");
            const fetchController = new AbortController();
            // Aumentamos a 240s (4 minutos) para evitar abortar durante procesamiento complejo
            const fetchTimeoutId = setTimeout(() => {
                console.warn('🤖 IA [TIMEOUT]: La petición excedió los 240s y será abortada.');
                fetchController.abort();
            }, 240000);

            const payload = {
                model: this.MODEL_NAME,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5
            };

            // jitter
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

            let response;
            try {
                response = await fetch(this.API_URL, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: fetchController.signal
                });
            } finally {
                clearTimeout(fetchTimeoutId);
            }

            if (response.status === 429) {
                let errorDetails = "Límite de peticiones alcanzado (429).";
                try {
                    const errorJson = await response.json();
                    if (errorJson.error && errorJson.error.message) {
                        errorDetails += " Detalle: " + errorJson.error.message;
                    }
                } catch (e) {
                    // Si no es JSON, intentar como texto
                    try {
                        const errorText = await response.text();
                        if (errorText) errorDetails += " Info: " + errorText.substring(0, 100);
                    } catch (e2) { }
                }
                console.error('🤖 IA [ERROR]:', errorDetails);
                throw new Error(errorDetails);
            }

            if (!response.ok) {
                let failMsg = `HTTP Error ${response.status}`;
                try {
                    const failBody = await response.text();
                    failMsg += ` - ${failBody.substring(0, 150)}`;
                } catch (e) { }
                throw new Error(failMsg);
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '';

            // Parser de Texto Libre (RegEx) para extraer [vistaX]
            const analyses = {};
            const regex = /\[(vista\d+)\]([\s\S]*?)(?=\[vista\d+\]|$)/gi;
            let match;

            while ((match = regex.exec(content)) !== null) {
                const vistaKey = match[1].toLowerCase();
                const textVal = match[2].trim();
                analyses[vistaKey] = textVal;
            }

            if (Object.keys(analyses).length === 0) {
                throw new Error("El modelo generó un texto pero no se detectaron etiquetas de vistas.");
            }

            this.cache = analyses;
            this.saveCache(analyses);
            this.updateAllViews();

        } catch (e) {
            console.error('🤖 IA [ERROR]:', e);
            if (e.name === 'AbortError') {
                console.error('🤖 IA [CRITICAL]: La petición fue cancelada por timeout.');
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
                        parent.classList.remove('alert--info');
                        parent.classList.add('alert--danger');
                        parent.style.backgroundColor = 'rgba(254, 226, 226, 0.5)';
                        parent.style.borderColor = '#fca5a5';
                        parent.style.color = '#b91c1c';
                    }
                } else if (this.cache[vid]) {
                    el.textContent = this.cache[vid];
                    if (parent) {
                        parent.classList.add('alert--info');
                        parent.classList.remove('alert--danger');
                        parent.style.backgroundColor = '';
                        parent.style.borderColor = '';
                        parent.style.color = '';
                    }
                }
            }
        }
    }
};

window.IAModuleV2.init();
