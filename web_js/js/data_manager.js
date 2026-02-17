/**
 * RID SIMULATOR - Unified Data Manager
 * Centralizes loading and state management for both STOP (Weekly) and CEAD (Monthly) data sources.
 */

window.DataManager = {
    // ─── Configuration ───
    // ─── Configuration ───
    config: {
        stopPath: 'data/stop',
        ceadPath: 'data/cead_split',
        unionPath: 'config/union.json',
        defaultComuna: 13101
    },

    // ─── Unified State ───
    state: {
        isLoaded: false,
        isLoading: false,
        comunaId: null,

        // Taxonomy Mapping (Union Data)
        union: {
            data: [],
            byStopName: {},  // Map<NormalizedName, UnionRow>
            byCeadCode: {}   // Map<Code, UnionRow>
        },

        // STOP Data (Weekly)
        stop: {
            data: [],           // All raw data
            history: [],        // Filtered: specific crimes
            totalHistory: [],   // Filtered: 'Total' rows
            currentWeek: null,  // ID_SEMANA (e.g., 164)
            weekDetail: '',     // e.g., "Semana 05/2026"
            lastUpdate: null
        },

        // CEAD Data (Monthly)
        cead: {
            data: [],
            history: [],
            totalHistory: [],
            currentPeriod: null,// ID_PERIODO (e.g., 202601)
            periodDetail: '',   // e.g., "Enero 2026"
            lastUpdate: null
        },

        // Metadata
        meta: {
            comuna: 'Cargando...',
            region: '',
            provincia: ''
        }
    },

    // ─── Logic ───

    /**
     * Initialize and load data for a specific comuna
     * @param {number} codcom 
     */
    async init(codcom = null) {
        if (this.state.isLoading) return;
        this.state.isLoading = true;

        // Determine Comuna ID from URL or argument
        const params = new URLSearchParams(window.location.search);
        this.state.comunaId = codcom || parseInt(params.get('codcom')) || this.config.defaultComuna;

        console.log(`🔄 DataManager: Initializing for Comuna ${this.state.comunaId}...`);

        try {
            // Priority: Load Union Taxonomy FIRST
            await this.loadUnionData();

            // Load both sources in parallel
            await Promise.all([
                this.loadStopData(this.state.comunaId),
                this.loadCeadData(this.state.comunaId)
            ]);

            this.state.isLoaded = true;
            this.state.isLoading = false;

            console.log("✅ DataManager: All data loaded successfully.");

            // Backward Compatibility: Dispatch old events for existing views
            this.dispatchLegacyEvents();

            // Dispatch unified event
            window.dispatchEvent(new CustomEvent('dataManagerLoaded', { detail: this.state }));

        } catch (error) {
            console.error("❌ DataManager Error:", error);
            this.state.error = error.message;
            this.state.isLoaded = false;
            window.dispatchEvent(new CustomEvent('dataManagerError', { detail: error }));
            this.state.isLoading = false;
        }
    },

    /**
     * Load Union Taxonomy (STOP <-> CEAD Mapping)
     */
    async loadUnionData() {
        if (this.state.union.data.length > 0) return; // Already loaded

        try {
            const res = await fetch(this.config.unionPath);
            if (!res.ok) throw new Error("Union config not found");

            const data = await res.json();
            this.state.union.data = data;

            // Build indices
            this.state.union.byStopName = {};
            this.state.union.byCeadCode = {};

            data.forEach(row => {
                // Index by STOP Normalized "Delitos min_stop" (e.g. "Homicidios ") -> trim -> "homicidios"
                if (row['Delitos min_stop']) {
                    const stopKey = row['Delitos min_stop'].trim().toLowerCase();
                    this.state.union.byStopName[stopKey] = row;
                }

                // Index by CEAD Code "id_subgrupo" (e.g. 10101)
                if (row.id_subgrupo) {
                    this.state.union.byCeadCode[row.id_subgrupo] = row;
                }
            });
            console.log(`🔗 DataManager: Taxonomy Union Loaded. ${data.length} mappings.`);
        } catch (e) {
            console.warn("⚠️ DataManager: Failed to load Union taxonomy.", e);
        }
    },

    /**
     * Enrich a data row with Union Taxonomy metadata
     */
    _enrichRow(row) {
        // 1. Try enrich via STOP Name (if present)
        if (row.delito) {
            const key = String(row.delito).trim().toLowerCase();
            const meta = this.state.union.byStopName[key];
            if (meta) {
                row.Familia = meta.Familia;
                row.id_familia = meta.id_familia;
                row.Grupo = meta.Grupo;
                row.id_grupo = meta.id_grupo;
                row.Subgrupo = meta.Subgrupo;
                row.id_subgrupo = meta.id_subgrupo; // CEAD Code from mapping
            }
        }

        // 2. Try enrich via CEAD Code (CODIGO / id_subgrupo)
        // Note: CEAD Data uses 'CODIGO' as identifier
        if (row.CODIGO) {
            const meta = this.state.union.byCeadCode[row.CODIGO];
            if (meta) {
                row.Familia = meta.Familia;
                row.id_familia = meta.id_familia;
                row.Grupo = meta.Grupo;
                row.id_grupo = meta.id_grupo;
                row.Subgrupo = meta.Subgrupo;
                row.Delito_STOP_Ref = meta[' Delitos_stop'];
            }
        }
    },

    /**
     * Load Weekly STOP Data
     */
    async loadStopData(id) {
        try {
            const url = `${this.config.stopPath}/${id}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`STOP fetch failed: ${res.status}`);

            // Decompress
            const ds = new DecompressionStream('gzip');
            const blob = await new Response(res.body.pipeThrough(ds)).json();

            // Organize
            // Apply Enrichment
            if (blob && blob.length) blob.forEach(r => this._enrichRow(r));

            this.state.stop.data = blob;
            this.state.stop.history = blob.filter(r => r.delito !== 'Total' && r.delito !== 'TOTAL');
            this.state.stop.totalHistory = blob.filter(r => r.delito === 'Total' || r.delito === 'TOTAL');

            // Find latest week
            // Find latest week
            if (this.state.stop.totalHistory.length > 0) {
                // Determine max week ID
                const maxWeek = Math.max(...this.state.stop.totalHistory.map(r => r.id_semana));
                this.state.stop.currentWeek = maxWeek;

                // Set Metadata
                // Search for Comuna name in ANY row if not found in latest
                const rowWithComuna = this.state.stop.data.find(r => r.Comuna || r.COMUNA || r.comuna);
                const comunaName = rowWithComuna ? (rowWithComuna.Comuna || rowWithComuna.COMUNA || rowWithComuna.comuna) : 'Comuna ' + this.state.comunaId;

                const rowWithRegion = this.state.stop.data.find(r => r.Región || r.Region || r.REGION);
                const regionName = rowWithRegion ? (rowWithRegion.Región || rowWithRegion.Region || rowWithRegion.REGION) : '';

                const latest = this.state.stop.totalHistory.find(r => r.id_semana === maxWeek);

                console.log("   🔎 STOP Metadata Search:", { maxWeek, found: !!latest, comunaDetected: comunaName });

                if (latest) {
                    this.state.stop.weekDetail = latest.semana_detalle;
                }

                this.state.meta.comuna = comunaName;
                this.state.meta.region = regionName || 'Sin Región';
            } else {
                console.warn("   ⚠️ STOP Data: No 'Total' rows found");
            }

            console.log(`   🔹 STOP Data: ${blob.length} rows. Current Week: ${this.state.stop.currentWeek}`);

        } catch (e) {
            console.warn("   ⚠️ STOP Load Warning:", e);
            // Default empty state is already set
        }
    },

    /**
     * Load Monthly CEAD Data
     */
    async loadCeadData(id) {
        try {
            const url = `${this.config.ceadPath}/${id}`;
            const res = await fetch(url);

            // CEAD might be missing for some communes
            if (!res.ok) {
                if (res.status === 404) console.warn(`   ⚠️ CEAD Data not found for ${id}`);
                return;
            }

            // Decompress
            const ds = new DecompressionStream('gzip');
            const blob = await new Response(res.body.pipeThrough(ds)).json();

            // Organize
            // Apply Enrichment
            if (blob && blob.length) blob.forEach(r => this._enrichRow(r));

            this.state.cead.data = blob;
            this.state.cead.history = blob.filter(r => r.delito !== 'Total' && r.delito !== 'TOTAL');
            this.state.cead.totalHistory = blob.filter(r => r.delito === 'Total' || r.delito === 'TOTAL');

            // Find latest period
            if (this.state.cead.totalHistory.length > 0) {
                const maxPeriod = Math.max(...this.state.cead.totalHistory.map(r => r.id_periodo));
                this.state.cead.currentPeriod = maxPeriod;

                const latest = this.state.cead.totalHistory.find(r => r.id_periodo === maxPeriod);
                if (latest) {
                    this.state.cead.periodDetail = latest.periodo_detalle;
                    // Only update meta if STOP didn't (STOP usually more recent/granular)
                    if (this.state.meta.comuna === 'Cargando...') {
                        this.state.meta.comuna = latest.Comuna;
                        this.state.meta.region = latest.Región;
                    }
                }
            }

            console.log(`   🔹 CEAD Data: ${blob.length} rows. Current Period: ${this.state.cead.currentPeriod}`);

        } catch (e) {
            console.warn("   ⚠️ CEAD Load Warning:", e);
        }
    },

    /**
     * Legacy adapter to maintain compatibility with views expecting STATE_DATA and STATE_DATA_CEAD
     * This allows us to switch the backend without breaking all 25 HTML views immediately.
     */
    dispatchLegacyEvents() {

        // --- Helper: Date Formatting based on DATA ---
        window.getFormattedDate = (weekId) => {
            const row = this.state.stop.totalHistory.find(r => r.id_semana === weekId);
            if (row) {
                // Format requested: "SEM XX/YYYY"
                const weekNum = row.semana_numero || row['semana_numero'];
                const year = row.año || row['año'];

                if (weekNum && year) {
                    return `SEM ${String(weekNum).padStart(2, '0')}/${year}`;
                }

                // Fallback: YYYY/MM
                if (row.fecha) {
                    // Fix timezone issue by parsing components directly if string is YYYY-MM-DD
                    // to avoid getting previous day due to UTC conversion
                    const parts = String(row.fecha).split('-');
                    if (parts.length >= 2) {
                        return `${parts[0]}/${parts[1]}`; // YYYY/MM
                    }

                    const d = new Date(row.fecha);
                    if (!isNaN(d.getTime())) {
                        const year = d.getFullYear();
                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                        return `${year}/${month}`;
                    }
                }
                // Fallback: Use 'anio' and 'mes_num'/'mes' if available
                if (row.anio) {
                    const m = row.mes_num || row.mes || 0;
                    return `${row.anio}/${String(m).padStart(2, '0')}`;
                }
            }
            // Fallback to Week ID
            return `S${weekId}`;
        };

        // --- Map to STATE_DATA (STOP) ---
        window.STATE_DATA = {
            isLoaded: true,
            codcom: this.state.comunaId,
            comunaName: this.state.meta.comuna,
            regionName: this.state.meta.region,

            // IMPORTANT: Mapping 'currentSemana' AND 'semanaId' to the same value to fix the bug
            semanaId: this.state.stop.currentWeek,
            currentSemana: this.state.stop.currentWeek, // <--- FIX FOR VISTAS2

            semanaDetalle: this.state.stop.weekDetail,
            allData: this.state.stop.history,
            allDataHistory: this.state.stop.history,
            allDataHistory_total: this.state.stop.totalHistory,

            // Helper for access
            getRaw: () => this.state.stop.data,
            getDateLabel: window.getFormattedDate // Expose helper
        };

        // --- Map to STATE_DATA_CEAD (Monthly) ---
        window.STATE_DATA_CEAD = {
            isLoaded: true,
            codcom: this.state.comunaId,
            comunaName: this.state.meta.comuna,
            regionName: this.state.meta.region,

            periodoId: this.state.cead.currentPeriod,
            periodoDetalle: this.state.cead.periodDetail,

            allData: this.state.cead.history,
            allDataHistory: this.state.cead.history,
            allDataHistory_total: this.state.cead.totalHistory
        };

        // Global COLS mapping (Ensuring keys match what the views expect)
        // Note: The python script outputs JSON with specific keys. 
        // We ensure COLS points to those keys.
        if (!window.COLS) window.COLS = {};
        window.COLS.ID_SEMANA = 'id_semana';
        window.COLS.CASOS_ACTUAL = 'casos_semana_actual';
        window.COLS.CASOS_ANT = 'casos_semana_anterior';
        window.COLS.CASOS_YEAR_ANT = 'casos_misma_semana_año_anterior';
        window.COLS.DELITO = 'delito';
        window.COLS.SEMANA_DETALLE = 'semana_detalle';
        window.COLS.FACTOR_POBLACION = 'factor_poblacion';
        window.COLS.Z_SCORE = 'z_score';
        window.COLS.ALERTA = 'alerta_aumento_critico';

        // COLS_CEAD: Defined primarily in data_cead.js. DataManager respects existing definition.
        if (!window.COLS_CEAD) window.COLS_CEAD = {};

        // Only set defaults if missing to avoid overwriting data_cead.js configuration
        if (!window.COLS_CEAD.ID_PERIODO) window.COLS_CEAD.ID_PERIODO = 'id_periodo';
        if (!window.COLS_CEAD.CASOS_ACTUAL) window.COLS_CEAD.CASOS_ACTUAL = 'frecuencia'; // Correct mapping
        if (!window.COLS_CEAD.DELITO) window.COLS_CEAD.DELITO = 'delito';
        if (!window.COLS_CEAD.PERIODO_DETALLE) window.COLS_CEAD.PERIODO_DETALLE = 'periodo_detalle';

        console.log("🔄 DataManager: Legacy STATE_DATA objects hydrated.");

        // Dispatch Events
        window.dispatchEvent(new CustomEvent('dataLoaded', { detail: window.STATE_DATA }));
        window.dispatchEvent(new CustomEvent('dataCeadLoaded', { detail: window.STATE_DATA_CEAD }));
    }
};

// Auto-init on load
document.addEventListener('DOMContentLoaded', () => {
    DataManager.init();
});
