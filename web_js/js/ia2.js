/**
 * IA Module V2 - Strategic Analysis
 * Single Request Pattern, 5-Day Cache
 */
window.IAModuleV2 = {
    // Configuration
    CACHE_KEY: 'ia_analysis_v2_',
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

    async fetchAllAnalyses() {
        if (this.fetching) return;
        this.fetching = true;
        console.log('🤖 IA: Generando nuevo análisis estratégico (API)...');

        const S = window.STATE_DATA;
        const context = this.buildContext(S);

        try {
            const prompt = `
Analiza la seguridad de ${S.comunaName} con estos datos y genera 25 análisis breves (max 20 palabras c/u) para un dashboard.
DATOS: ${JSON.stringify(context)}
Responde SOLO un JSON: {"vista1": "texto...", "vista2": "texto...", ... "vista25": "texto..."}
            `;

            const API_KEY = this.getKey("gfhrsdfsdfseweretfghtddfdf");

            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.MODEL_NAME,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7
                })
            });

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content || '{}';
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            const cleanJson = content.substring(jsonStart, jsonEnd);

            const analyses = JSON.parse(cleanJson);

            this.cache = analyses;
            this.saveCache(analyses);
            this.updateAllViews();

        } catch (e) {
            console.error('IA Error:', e);
            // Fallback
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

    buildContext(S) {
        const C = window.COLS;
        const totalRow = S.allDataHistory_total.find(r => r[C.ID_SEMANA] === S.currentSemana) || {};

        const basics = {
            cases: totalRow[C.CASOS_ACTUAL],
            delta: totalRow[C.DELTA] || 0
        };
        const emerging = S.allDataHistory.filter(r => r[C.ID_SEMANA] === S.currentSemana && (r[C.Z_SCORE] || 0) > 1.5).map(r => r[C.DELITO]);
        const cead = window.STATE_DATA_CEAD?.allDataHistory_total?.[0] || {};

        return {
            comuna: S.comunaName,
            basics,
            top: S.allDataHistory.slice(0, 5).map(r => `${r[C.DELITO]}: ${r[C.CASOS_ACTUAL]}`),
            emerging,
            cead_trend: cead['tendencia'] || 'N/A'
        };
    }
};

window.IAModuleV2.init();
