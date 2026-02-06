/**
 * RID SIMULATOR - Data Layer
 * Handles data loading and state management
 */

// Global State
window.STATE_DATA = {
    codcom: 13101,
    allData: [],
    allDataHistory: [],
    allDataHistory_total: [],
    stats: {},
    currentSection: 'seccion1',
    comunaName: 'Sin Comuna',
    regionName: 'Sin Región',
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
    DELTA: 11,
    ACUM_ANUAL: 12,
    ACUM_TOTAL: 13,
    MEDIA_MOVIL_4S: 14,
    MEDIA_MOVIL_8S: 15,
    PROMEDIO_HIST: 16,
    STD_HIST: 17,
    MAX_HIST: 18,
    PROMEDIO_HIST_ANUAL: 19,
    STD_HIST_ANUAL: 20,
    MAX_HIST_ANUAL: 21,
    VAR_PCT_SEM: 22,
    Z_SCORE: 23,
    Z_SCORE_YEAR_ANT: 24,
    Z_CONCL: 25,
    TENDENCIA: 26,
    RACHA: 27,
    SEMANA_MAX_HIST: 28,
    ALERTA: 29,
    ALERTA_YEAR_ANT: 30,
    CASOS_YEAR_ANT: 31,
    PROVINCIA: 32,
    COMUNA: 33,
    REGION: 34,
    CODREG: 35,
    RANKING: 36,
    RANKING_ANT: 37,
    POBLACION_CLASE: 38,
    CLASE_POBLACION: 39,
    POBLACION: 40,
    FACTOR_POBLACION: 41
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

            const response = await fetch('data/data3.json.gz');
            if (!response.ok) throw new Error('Error IO Datos');

            const ds = new DecompressionStream('gzip');
            const decompressed = new Response(response.body.pipeThrough(ds));
            const rawData = await decompressed.json();

            // Determine target CODCOM
            const targetCod = codcom_url ? parseInt(codcom_url) : 13101;
            STATE_DATA.codcom = targetCod;

            // Filter by Comuna first
            const comunaData = rawData.filter(row => row[COLS.CODCOM] == targetCod);

            // Separate 'Total' from individual Delitos
            // Assuming 'Total' or 'TOTAL' as the identifier
            STATE_DATA.allDataHistory = comunaData.filter(row => row[COLS.DELITO] !== 'Total' && row[COLS.DELITO] !== 'TOTAL');
            STATE_DATA.allDataHistory_total = comunaData.filter(row => row[COLS.DELITO] === 'Total' || row[COLS.DELITO] === 'TOTAL');
            console.log("Datos totales", STATE_DATA.allDataHistory_total)
            // Main allData currently points to history of individual crimes
            STATE_DATA.allData = STATE_DATA.allDataHistory;

            // Get max ID_SEMANA
            const maxSemana = Math.max(...STATE_DATA.allDataHistory.map(row => row[COLS.ID_SEMANA]));
            const targetSemana = semana_id_url ? parseInt(semana_id_url) : maxSemana;

            // Find target week row for metadata
            //const targetWeekRow = STATE_DATA.allData.find(row => row[COLS.ID_SEMANA] == targetSemana);
            const targetWeekRow = STATE_DATA.allDataHistory_total.find(row => row[COLS.ID_SEMANA] == targetSemana);

            if (targetWeekRow) {
                STATE_DATA.comunaName = String(targetWeekRow[COLS.COMUNA] || 'Sin Comuna');
                STATE_DATA.regionName = String(targetWeekRow[COLS.REGION] || 'Sin Región');
                STATE_DATA.semanaId = targetWeekRow[COLS.ID_SEMANA];
                STATE_DATA.semanaDetalle = targetWeekRow[COLS.SEMANA_DETALLE];
                STATE_DATA.warning = targetWeekRow[COLS.ALERTA];
                STATE_DATA.warningZ = targetWeekRow[COLS.Z_CONCL];

            } else if (STATE_DATA.allData.length > 0) {
                // Fallback to first row
                STATE_DATA.comunaName = String(STATE_DATA.allData[0][COLS.COMUNA] || 'Sin Comuna');
            }

            // Debug: Log first row
            if (STATE_DATA.allData.length > 0) {
                console.log('🔍 First Row Data:', STATE_DATA.allData[0]);
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