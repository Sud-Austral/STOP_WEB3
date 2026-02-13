/**
 * RID SIMULATOR - Unified Data Manager
 * Centralizes loading and state management for both STOP (Weekly) and CEAD (Monthly) data sources.
 */

window.DataManager = {
    // ─── Configuration ───
    config: {
        stopPath: 'data/stop',
        ceadPath: 'data/cead_split',
        defaultComuna: 13101
    },

    // ─── Unified State ───
    state: {
        isLoaded: false,
        isLoading: false,
        comunaId: null,

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
            // Load both sources in parallel
            await Promise.all([
                this.loadStopData(this.state.comunaId),
                this.loadCeadData(this.state.comunaId)
            ]);

            this.state.isLoaded = true;
            this.state.isLoading = false;

            console.log("✅ DataManager: All data loaded successfully.");

            // Dispatch unified event
            window.dispatchEvent(new CustomEvent('dataManagerLoaded', { detail: this.state }));

            // Backward Compatibility: Dispatch old events for existing views
            this.dispatchLegacyEvents();

        } catch (error) {
            console.error("❌ DataManager Error:", error);
            this.state.isLoading = false;
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
            if (row && row.fecha) {
                // Assuming format YYYY-MM-DD or similar
                const d = new Date(row.fecha);
                if (!isNaN(d)) {
                    const month = (d.getMonth() + 1).toString().padStart(2, '0');
                    const day = d.getDate().toString().padStart(2, '0');
                    return `${day}/${month}`;
                }
            }
            // Fallback to S{id}
            return `S${weekId % 100}`;
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
