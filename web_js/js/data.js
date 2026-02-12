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
// Column Keys - Mapeado a data3.json (orient='records')
// Ahora usa nombres de columna en lugar de índices numéricos
// Column Keys - Mapeado a data_stop.json (orient='records')
window.COLS = {
    // Identificadores Base
    DELITO: 'delito',
    FRECUENCIA: 'frecuencia',
    CODCOM: 'codcom',
    ID_SEMANA: 'id_semana',
    SEMANA_DETALLE: 'semana_detalle',
    FECHA: 'fecha',
    ANIO: 'año',
    MES: 'mes',
    SEMANA: 'semana_numero',
    SEMANA_SAFE: 'semana_numero_safe',

    // Métricas Base (T1-T3)
    CASOS_ACTUAL: 'casos_semana_actual',
    CASOS_ANT: 'casos_semana_anterior',
    DELTA: 'delta',
    ACUM_ANUAL: 'acumulado_anual',
    ACUM_TOTAL: 'acumulado_total',
    ACUM_ANUAL_ANT: 'acumulado_anual_anterior',

    // Comparativas (T2, T12)
    CASOS_YEAR_ANT: 'casos_misma_semana_año_anterior',
    CASOS_MES_YEAR_ANT: 'casos_mismo_mes_año_anterior',

    // Medias Móviles y Stats (T4-T8)
    MEDIA_MOVIL_4S: 'media_movil_4s',
    MEDIA_MOVIL_8S: 'media_movil_8s',
    PROMEDIO_HIST: 'promedio_hist',
    STD_HIST: 'std_hist',
    MAX_HIST: 'max_hist',
    PROMEDIO_HIST_ANUAL: 'promedio_hist_anual',
    STD_HIST_ANUAL: 'std_hist_anual',
    MAX_HIST_ANUAL: 'max_hist_anual',

    // Tendencias, Rachas y Z-Score (T29-T34)
    TENDENCIA: 'tendencia_corto_plazo',
    RACHA_ALZA: 'racha_alza',
    RACHA_BAJA: 'racha_baja',
    RACHA: 'racha',
    VAR_PCT_SEM: 'var_pct_vs_semana_anterior',
    Z_SCORE: 'z_score',
    Z_SCORE_YEAR_ANT: 'z_score_vs_año_anterior',
    Z_CONCL: 'conclusion_z',

    // Alertas y Récords
    SEMANA_MAX_HIST: 'id_semana_max_hist',
    SEMANA_DETALLE_MAX_HIST: 'semana_detalle_max_hist',
    ALERTA: 'alerta_aumento_critico',
    ALERTA_YEAR_ANT: 'alerta_vs_año_anterior',

    // Geografía y Población
    PROVINCIA: 'Provincia',
    COMUNA: 'Comuna',
    REGION: 'Región',
    CODREG: 'Codreg',
    POBLACION_CLASE: 'poblacion_clase',
    CLASE_POBLACION: 'clase_poblacion',
    POBLACION: 'poblacion',
    FACTOR_POBLACION: 'factor_poblacion',

    // Rankings (T13-T18)
    RANKING: 'ranking_comunal_regional',
    RANKING_ANT: 'ranking_comunal_regional_semana_anterior',

    RANK_NAC_SEM: 'ranking_nacional_semanal',
    RANK_NAC_SEM_ANT: 'ranking_nacional_semanal_anterior',

    RANK_REG_PROY: 'ranking_regional_proy_anual',
    RANK_REG_PROY_ANT: 'ranking_regional_proy_anual_anterior',

    RANK_NAC_PROY: 'ranking_nacional_proy_anual',
    RANK_NAC_PROY_ANT: 'ranking_nacional_proy_anual_anterior',

    RANK_CLUSTER_PROY: 'ranking_cluster_proy_anual',
    RANK_CLUSTER_PROY_ANT: 'ranking_cluster_proy_anual_anterior',

    RANK_CLUSTER_SEM: 'ranking_cluster_semanal',
    RANK_CLUSTER_SEM_ANT: 'ranking_cluster_semanal_anterior',

    // Diagnósticos Críticos (T19-T20)
    T19_DELITO: 't19_delito_sem',
    T19_RANK: 't19_rank_sem',
    T19_DELITO_ANT: 't19_delito_ant',
    T19_RANK_ANT: 't19_rank_ant',

    T20_DELITO: 't20_delito_sem',
    T20_RANK: 't20_rank_sem',
    T20_DELITO_ANT: 't20_delito_ant',
    T20_RANK_ANT: 't20_rank_ant',

    // Pareto (T21)
    T21_DELITO_1: 't21_delito_1',
    T21_DELITO_2: 't21_delito_2',
    T21_DELITO_3: 't21_delito_3',
    T21_VAL_1: 't21_val_1',
    T21_VAL_2: 't21_val_2',
    T21_VAL_3: 't21_val_3',

    // Correlación (T23)
    T23_D1: 't23_d1',
    T23_D2: 't23_d2',
    T23_VAL: 't23_val',

    // Aportes (T25)
    CASOS_SEM_REG: 'casos_semana_regional',
    APORTE_PCT: 'aporte_pct_region',
    APORTE_PCT_ANT: 'aporte_pct_region_ant',
    CASOS_SEM_REG_ANT: 'casos_semana_regional_ant',

    // Proyecciones (T4, T9)
    PROYECCION_ANUAL: 'proyeccion_anual',
    PROY_MES: 'proyeccion_mes_actual',
    TASA_SEMANAL: 'tasa_semanal',
    TASA_PROY_ANUAL: 'tasa_proyectada_anual',

    // IDI y Tasas Agregadas (T10-T12, T26-T28, T34)
    IDI_PESO: 'idi_peso',
    IDI_PROY_MES: 'idi_proy_mes',
    IDI_MES_ANT_YEAR: 'idi_mes_ant_year',
    IDI_MES_ANTERIOR: 'idi_mes_anterior',
    IDI_PROY_ANUAL: 'idi_proy_anual',
    IDI_ANUAL_ANT: 'idi_anual_anterior',

    IDI_REGIONAL: 'idi_proy_regional',
    IDI_NACIONAL: 'idi_proy_nacional',
    IDI_CLUSTER: 'idi_proy_cluster',

    TASA_PROY_REGIONAL: 'tasa_proyectada_regional',
    TASA_PROY_NACIONAL: 'tasa_proyectada_nacional',
    TASA_PROY_CLUSTER: 'tasa_proyectada_cluster',

    // Rachas Top 3 (T29, T30)
    PRIORIDAD_VAL: 'prioridad_val',
    ES_RACHA_NEG: 'es_racha_neg',
    ES_RACHA_POS: 'es_racha_pos',

    RACHA_NEG_DELITO_1: 't29_delito_1',
    RACHA_NEG_DELITO_2: 't29_delito_2',
    RACHA_NEG_DELITO_3: 't29_delito_3',
    RACHA_NEG_SEM_1: 't29_semanas_1',
    RACHA_NEG_SEM_2: 't29_semanas_2',
    RACHA_NEG_SEM_3: 't29_semanas_3',

    RACHA_POS_DELITO_1: 't30_delito_1',
    RACHA_POS_DELITO_2: 't30_delito_2',
    RACHA_POS_DELITO_3: 't30_delito_3',
    RACHA_POS_SEM_1: 't30_semanas_1',
    RACHA_POS_SEM_2: 't30_semanas_2',
    RACHA_POS_SEM_3: 't30_semanas_3',

    // Crecimiento (T31, T32)
    MM4S_LAG4: 'mm4s_lag4',
    T31_CAGR: 't31_cagr_4s',
    CASOS_SEM1: 'casos_sem1',
    T32_CAGR: 't32_cagr_anual'
};



// Parse URL parameters
const params = new URLSearchParams(window.location.search);
const codcom_url = params.get('codcom');
const semana_id_url = params.get('semana_id');
const targetCod = codcom_url ? parseInt(codcom_url) : 13101;

/**
 * Data Loader
 */
const dataLoader = {
    _loadingInProgress: false,
    _hasLoaded: false,

    async load() {
        // Guard: Evitar cargas múltiples
        if (this._loadingInProgress || this._hasLoaded) {
            console.warn('⚠️ DataLoader: Carga ya en progreso o completada, ignorando');
            return;
        }
        this._loadingInProgress = true;

        try {
            console.log('📊 Loading data...');

            const response = await fetch(`data/stop/${targetCod}`);

            if (!response.ok) throw new Error('Error IO Datos');

            const ds = new DecompressionStream('gzip');
            const decompressed = new Response(response.body.pipeThrough(ds));
            const rawData = await decompressed.json();

            STATE_DATA.codcom = targetCod;

            // El archivo ya contiene solo datos de esta comuna (no necesita filtro)
            // rawData es un array de objetos con claves como nombres de columna
            console.log('🔍 Raw Data Sample:', rawData[0]);
            console.log('🔍 Total rows loaded:', rawData.length);

            // Separar 'Total' de delitos individuales
            STATE_DATA.allDataHistory = rawData.filter(row => row[COLS.DELITO] !== 'Total' && row[COLS.DELITO] !== 'TOTAL');
            STATE_DATA.allDataHistory_total = rawData.filter(row => row[COLS.DELITO] === 'Total' || row[COLS.DELITO] === 'TOTAL');

            console.log('📊 Delitos individuales:', STATE_DATA.allDataHistory.length);
            console.log('📊 Filas Total:', STATE_DATA.allDataHistory_total.length);

            // Main allData currently points to history of individual crimes
            STATE_DATA.allData = STATE_DATA.allDataHistory;

            // Get max ID_SEMANA
            const allSemanas = STATE_DATA.allDataHistory.map(row => row[COLS.ID_SEMANA]).filter(s => s != null);
            const maxSemana = allSemanas.length > 0 ? Math.max(...allSemanas) : 0;
            const targetSemana = semana_id_url ? parseInt(semana_id_url) : maxSemana;
            console.log('📅 Semana objetivo:', targetSemana);

            console.log('📅 Semanas encontradas:', allSemanas.length, 'Max:', maxSemana);

            // Find target week row for metadata (from Total row)
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
            this._hasLoaded = true;
            this._loadingInProgress = false;

            console.log(`✅ Loaded ${STATE_DATA.allData.length} records for ${STATE_DATA.comunaName}`);
            console.log(`📅 Max Semana: ${maxSemana}, Target: ${targetSemana}`);

            // Update header
            this.updateHeader();

            // Dispatch event for components waiting on data
            window.dispatchEvent(new CustomEvent('dataLoaded', { detail: STATE_DATA }));

        } catch (error) {
            console.error("❌ Critical Error loading data:", error);
            STATE_DATA.isLoaded = false;
            this._loadingInProgress = false;
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
// await dataLoader.load(); // DISABLED: Using Unified DataManager