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
        this.cache = this.loadCache();

        // Listen for data load to fetch analysis if needed
        window.addEventListener('dataManagerLoaded', () => {
            if (!this.cache.vista1) { // If cache empty or partial
                this.fetchAllAnalyses();
            } else {
                this.updateAllViews();
            }
        });
    },

    loadCache() {
        try {
            const codcom = window.STATE_DATA?.codcom || 'default';
            const raw = localStorage.getItem(this.CACHE_KEY + codcom);
            if (!raw) return {};

            // Clean bad cache
            if (raw.includes("Sin localización") || raw.includes("anonimato")) {
                console.warn("IA2: Caché con respuesta genérica detectado. Borrando.");
                localStorage.removeItem(this.CACHE_KEY + codcom);
                return {};
            }

            const { timestamp, data } = JSON.parse(raw);
            if (Date.now() - timestamp > this.CACHE_TTL) {
                console.log('🤖 IA: Cache expirado (5 días).');
                return {};
            }
            console.log('🤖 IA: Cache cargado.');
            return data;
        } catch (e) { return {}; }
    },

    saveCache(data) {
        const codcom = window.STATE_DATA?.codcom || 'default';
        localStorage.setItem(this.CACHE_KEY + codcom, JSON.stringify({
            timestamp: Date.now(),
            data
        }));
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
        if (this.fetching) return;
        this.fetching = true;
        console.log('🤖 IA: Generando nuevo análisis estratégico (API)...');

        const S = window.STATE_DATA;
        const context = this.buildContext(S);

        if (!context) {
            console.warn("IA2: Contexto insuficiente.");
            this.fetching = false;
            return;
        }

        try {
            const prompt = `
Eres un analista de inteligencia policial experto en el sistema STOP y CEAD de Carabineros de Chile.
Genera interpretaciones estratégicas breves para el dashboard de seguridad de la comuna de ${context.comuna}.

DATOS CLAVE:
${JSON.stringify(context, null, 2)}

INSTRUCCIONES ESPECÍFICAS PARA VISTAS (Max 25 palabras c/u):
- Vista 1-11: Resumen general de tendencias STOP.
- Vista 12 (Nacional): Contextualiza el ranking nacional (${context.metrics.national_rank}).
- Vista 13 (Clúster): Analiza posición respecto a comunas similares (${context.metrics.cluster_rank}).
- Vista 14 (Aporte): Comenta el peso delictual de la comuna.
- Vista 15 (Efectividad): Evalúa la tasa de detención (${context.metrics.effectiveness_ratio}).
- Vista 16 (Regional): Comparativa regional.
- Vista 17 (Riesgo): Factores socio-delictuales.
- Vista 19 (Emergentes): Alerta sobre: ${context.insights.emerging_short_term} (Corto Plazo) y ${context.insights.emerging_long_term} (Largo Plazo).
- Vista 20 (Disipación): Destaca logros en: ${context.insights.success_stories}.
- Vista 21 (Proyección): Comenta tendencia esperada.
- Vista 22 (Tactical): Prioridad Nº1: ${context.insights.priority_focus}.
- Vista 23 (Acción): Sugiere acción táctica inmediata.
- Vista 24 (Ejecutivo): Veredicto final de mando.
- Vista 25 (Data): Calidad de la información.

FORMATO DE RESPUESTA:
JSON CRUDO con claves "vista1" a "vista25". Sin markdown.
            `;

            const API_KEY = this.getKey("gfhrsdfsdfseweretfghtddfdf"); // Valid key generation

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.MODEL_NAME,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5 // Lower temperature for more analytical output
                })
            });

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{}';

            // Robust JSON extraction
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            const cleanJson = content.substring(jsonStart, jsonEnd);
            const analyses = JSON.parse(cleanJson);

            this.cache = analyses;
            this.saveCache(analyses);
            this.updateAllViews();

        } catch (e) {
            console.error('IA Error:', e);
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
    },
};

window.IAModuleV2.init();
