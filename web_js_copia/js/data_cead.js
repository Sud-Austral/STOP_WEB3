/**
 * CEAD Data Layer
 * Handles data loading for CEAD cases
 */

// Global State for CEAD
window.STATE_DATA_CEAD = {
    codcom: 13101,
    allData: [],
    allDataHistory: [],
    stats: {},
    comunaName: 'Sin Comuna',
    warning: "",
    isLoaded: false,
    lastMonth: null, // To store the latest available month/year
    lastYear: null
};

// CEAD Column Indices
window.COLS_CEAD = {
    CODCOM: 0,
    DESCRIPCION: 1,
    NIVEL: 2,
    MES: 3,
    FRECUENCIA: 4,
    MES_NUM: 5,
    FECHA: 6,
    ANIO: 7,
    PROVINCIA: 8,
    COMUNA: 9,
    REGION: 10,
    CODREG: 11,
    CASOS_MES_ACTUAL: 12,
    CASOS_MES_ANTERIOR: 13,
    CASOS_MISMO_MES_ANIO_ANTERIOR: 14,
    ACUMULADO_MENSUAL: 15,
    ACUMULADO_ANUAL: 16,
    ACUMULADO_ANUAL_ANIO_ANTERIOR: 17,
    MEDIA_MOVIL_4M: 18,
    MEDIA_MOVIL_4M_ANIO_ANTERIOR: 19,
    PROMEDIO_HIST: 20,
    MAX_HIST: 21,
    STD_HIST: 22,
    VAR_PCT_VS_MES_ANTERIOR: 23,
    VAR_PCT_VS_ANIO_ANTERIOR: 24,
    DELTA: 25,
    TENDENCIA_CORTO_PLAZO: 26,
    RACHA: 27,
    Z_SCORE: 28,
    CONCLUSION_Z: 29,
    ALERTA_AUMENTO_CRITICO: 30,
    RANKING_COMUNAL_REGIONAL: 31,
    RANKING_COMUNAL_REGIONAL_MES_ANTERIOR: 32
};

// Parse URL parameters
const paramsCead = new URLSearchParams(window.location.search);
const codcom_url_cead = paramsCead.get('codcom');

/**
 * CEAD Data Loader
 */
const dataLoaderCead = {
    async load() {
        try {
            console.log('📊 Loading CEAD data...');

            // Determine target CODCOM first to know which file to load
            const targetCod = codcom_url_cead ? parseInt(codcom_url_cead) : 13101;
            STATE_DATA_CEAD.codcom = targetCod;

            console.log(`📊 Loading CEAD data for comuna ${targetCod}...`);

            // Use the split data file for the specific comuna
            const fileUrl = `data/cead_split/${targetCod}.json`;

            const response = await fetch(fileUrl);
            if (!response.ok) {
                // If specific file not found, maybe fallback or error
                if (response.status === 404) {
                    console.warn(`Data file for ${targetCod} not found. Using empty dataset.`);
                    STATE_DATA_CEAD.allData = [];
                } else {
                    throw new Error(`Failed to load ${fileUrl}: ${response.status} ${response.statusText}`);
                }
            } else {
                STATE_DATA_CEAD.allData = await response.json();
            }

            // allDataHistory is same as allData here
            STATE_DATA_CEAD.allDataHistory = [...STATE_DATA_CEAD.allData];

            if (STATE_DATA_CEAD.allData.length > 0) {
                // Determine latest date (max FECHA or ANIO/MES)
                // Sort to find the latest "current" state
                STATE_DATA_CEAD.allData.sort((a, b) => {
                    // Sort by year desc, then month_num desc
                    if (b[COLS_CEAD.ANIO] !== a[COLS_CEAD.ANIO]) {
                        return b[COLS_CEAD.ANIO] - a[COLS_CEAD.ANIO];
                    }
                    return b[COLS_CEAD.MES_NUM] - a[COLS_CEAD.MES_NUM];
                });

                const latestRow = STATE_DATA_CEAD.allData[0];
                STATE_DATA_CEAD.comunaName = latestRow[COLS_CEAD.COMUNA];
                STATE_DATA_CEAD.lastMonth = latestRow[COLS_CEAD.MES];
                STATE_DATA_CEAD.lastYear = latestRow[COLS_CEAD.ANIO];
                STATE_DATA_CEAD.warning = latestRow[COLS_CEAD.ALERTA_AUMENTO_CRITICO];
            }

            STATE_DATA_CEAD.isLoaded = true;

            console.log(`✅ Loaded ${STATE_DATA_CEAD.allData.length} CEAD records for ${STATE_DATA_CEAD.comunaName}`);

            // Dispatch event
            window.dispatchEvent(new CustomEvent('dataCeadLoaded', { detail: STATE_DATA_CEAD }));

        } catch (error) {
            console.error("❌ Critical Error loading CEAD data:", error);
            STATE_DATA_CEAD.isLoaded = false;
        }
    }
};

// Load data immediately
// Load data immediately (IIFE to avoid top-level await issues)
(async () => {
    await dataLoaderCead.load();
})();