/**
 * RID SIMULATOR - Data Layer
 * Handles data loading and state management
 */

// Global State
window.STATE_DATA = {
    codcom: 13130,
    allData: [],
    allDataHistory: [],
    stats: {},
    currentSection: 'seccion1',
    comunaName: 'Sin Comuna',
    semanaId: "Sin Semana",
    semanaDetalle: "",
    warning: "",
    isLoaded: false
};

// Column Indices
window.COLS = {
    DELITO: 0,
    FRECUENCIA: 1,
    CODCOM: 2,
    ID_SEMANA: 3,
    SEMANA_DETALLE: 4,
    FECHA: 5,
    ANIO: 6,
    MES: 7,
    SEMANA: 8,
    CASOS_ACTUAL: 9,
    CASOS_ANT: 10,
    CASOS_YEAR_ANT: 11,
    ACUM_MENSUAL: 12,
    ACUM_ANUAL: 13,
    ACUM_ANUAL_ANT: 14,
    MEDIA_MOVIL_4S: 15,
    MEDIA_MOVIL_4S_ANT: 16,
    PROMEDIO_HIST: 17,
    MAX_HIST: 18,
    STD_HIST: 19,
    SEMANA_MAX_HIST: 20,
    VAR_PCT_SEM: 21,
    VAR_PCT_ANUAL: 22,
    DELTA: 23,
    TENDENCIA: 24,
    RACHA: 25,
    RANKING: 26,
    RANKING_ANT: 27,
    Z_SCORE: 28,
    Z_CONCL: 29,
    ALERTA: 30,
    COMUNA: 31
};

// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const codcom_url = params.get('codcom');
const semana_id_url = params.get('semana_id');

/**
 * Data Loader
 */
const dataLoader = {
    async load() {
        try {
            console.log('📊 Loading data...');

            const response = await fetch('data/data2.json.gz');
            if (!response.ok) throw new Error('Error IO Datos');

            const ds = new DecompressionStream('gzip');
            const decompressed = new Response(response.body.pipeThrough(ds));
            const rawData = await decompressed.json();

            // Determine target CODCOM
            const targetCod = codcom_url ? parseInt(codcom_url) : 13101;
            STATE_DATA.codcom = targetCod;

            // Filter by Comuna
            STATE_DATA.allData = rawData.filter(row => row[COLS.CODCOM] == targetCod);
            STATE_DATA.allDataHistory = rawData.filter(row => row[COLS.CODCOM] == targetCod);

            // Get max ID_SEMANA
            const maxSemana = Math.max(...STATE_DATA.allDataHistory.map(row => row[COLS.ID_SEMANA]));
            const targetSemana = semana_id_url ? parseInt(semana_id_url) : maxSemana;

            // Find target week row for metadata
            const targetWeekRow = STATE_DATA.allData.find(row => row[COLS.ID_SEMANA] == targetSemana);

            if (targetWeekRow) {
                STATE_DATA.comunaName = targetWeekRow[COLS.COMUNA];
                STATE_DATA.semanaId = targetWeekRow[COLS.ID_SEMANA];
                STATE_DATA.semanaDetalle = targetWeekRow[COLS.SEMANA_DETALLE];
                STATE_DATA.warning = targetWeekRow[COLS.ALERTA];
            } else if (STATE_DATA.allData.length > 0) {
                // Fallback to first row
                STATE_DATA.comunaName = STATE_DATA.allData[0][COLS.COMUNA];
            }

            STATE_DATA.isLoaded = true;

            console.log(`✅ Loaded ${STATE_DATA.allData.length} records for ${STATE_DATA.comunaName}`);
            console.log(`📅 Max Semana: ${maxSemana}, Target: ${targetSemana}`);

            // Update header
            this.updateHeader();

            // Dispatch event for components waiting on data
            window.dispatchEvent(new CustomEvent('dataLoaded', { detail: STATE_DATA }));

        } catch (error) {
            console.error("❌ Critical Error loading data:", error);
            STATE_DATA.isLoaded = false;
        }
    },

    updateHeader() {
        // Update header subtitle
        const subtitle = document.getElementById('headerSubtitle');
        if (subtitle) {
            const alertClass = STATE_DATA.warning === 'ALTO' ? 'PRECAUCIÓN' :
                STATE_DATA.warning === 'BAJO' ? 'NORMAL' : 'NORMAL';
            subtitle.innerHTML = `${STATE_DATA.semanaDetalle || 'Semana Actual'} | Estado: <span class="${STATE_DATA.warning === 'ALTO' ? 'text-warning' : 'text-success'}">${alertClass}</span>`;
        }

        // Update comuna button
        const comunaBtn = document.getElementById('btnComunaText');
        if (comunaBtn) {
            comunaBtn.textContent = STATE_DATA.comunaName || 'Santiago';
        }
    }
};

// Load data on module init
await dataLoader.load();