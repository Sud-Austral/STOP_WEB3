const STATE_DATA = {
    codcom: 13130, // Default San Miguel
    allData: [],
    allDataHistory: [],
    stats: {}, // Processed data
    currentSection: 'seccion1',
    comunaName: 'Sin Comuna',
    semanaId: "Sin Semana",
    warning: ""
};

const COLS = {
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

const params = new URLSearchParams(window.location.search);
const codcom_url = params.get('codcom');
const semana_id_url = params.get('semana_id');

const dataLoader = {
    load: async () => {
        try {
            const response = await fetch('data/data2.json.gz');
            if (!response.ok) throw new Error('Error IO Datos');

            const ds = new DecompressionStream('gzip');
            const decompressed = new Response(response.body.pipeThrough(ds));
            const rawData = await decompressed.json();

            // 1. Determine Target CODCOM & SEMANA
            let targetCod = codcom_url ? parseInt(codcom_url) : 13101;
            let targetSemana = semana_id_url ? parseInt(semana_id_url) : 162;

            // Update STATE
            STATE_DATA.codcom = targetCod;

            console.log(`Loading Data for CODCOM: ${targetCod}, SEMANA: ${targetSemana}`);

            // Filter by Comuna (Keep History for Charts)
            STATE_DATA.allData = rawData.filter(row => row[COLS.CODCOM] == targetCod); // Use loose eq for string/int safety
            STATE_DATA.allDataHistory = rawData.filter(row => row[COLS.CODCOM] == targetCod);
            // Extract Metadata for Header from the specific target week
            const targetWeekRow = STATE.allData.find(row => row[COLS.ID_SEMANA] == targetSemana);

            if (targetWeekRow) {
                STATE_DATA.comunaName = targetWeekRow[COLS.COMUNA];
                STATE_DATA.semanaId = targetWeekRow[COLS.SEMANA_DETALLE];
                STATE_DATA.warning = targetWeekRow[COLS.ALERTA];
                console.log("Header Metadata Found:", STATE.comunaName, STATE.semanaId, STATE.warning);
            } else {
                console.warn("Target week not found for header metadata, using defaults or latest.");
                if (STATE_DATA.allData.length > 0) {
                    // Fallback to latest
                    const latest = STATE.allData[0]; // Assuming originally sorted or we sort next
                    STATE_DATA.comunaName = latest[COLS.COMUNA];
                }
            }
            console.log(`Loaded ${STATE.allData.length} total records for ${STATE.comunaName}`);

        } catch (error) {
            console.error("Critical Error loading data:", error);
            alert("Error cargando los datos del sistema. Asegúrate de ejecutar esto en un servidor local.");
        }
    }
};


await dataLoader.load();