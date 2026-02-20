# 📝 RID SIMULATOR — Documentación Técnica

> **Versión**: 2.0  
> **Última Actualización**: 2026-02-19  
> **Stack**: Vanilla JS (ES2020+) · Chart.js · html2canvas · jsPDF  

---

## 1️⃣ OVERVIEW

### Propósito
**RID SIMULATOR** es un panel de inteligencia delictual para seguridad pública municipal. Transforma datos estadísticos policiales de dos fuentes (STOP semanal · CEAD mensual) en dashboards interactivos con:
- 70+ vistas analíticas (KPIs, charts, tablas comparativas).
- Interpretación automática vía IA (GLM-4 Flash).
- Exportación a PDF profesional.
- Comparación inter-comunal.

### Arquitectura General
```
Browser (SPA)
├── index_vistas2.html         ← Entry point V2
├── js/
│   ├── data.js                ← COLS + STATE_DATA definitions
│   ├── data_cead.js           ← COLS_CEAD + STATE_DATA_CEAD definitions
│   ├── data_manager.js        ← Unified loader (STOP + CEAD + Comunas)
│   ├── app.js                 ← Router + View loader + PDF export
│   ├── ia.js                  ← AI interpretations V1 (STOP views)
│   ├── ia2.js                 ← AI interpretations V2 (Strategic views)
│   ├── pdf.js                 ← PDF generation module
│   ├── pdf_vistas2.js         ← PDF V2 extension
│   └── utils/
│       ├── chart-helper.js    ← Chart.js config factory
│       ├── chart-enhancer.js  ← Chart post-processing
│       ├── ui-helper.js       ← KPI rendering utilities
│       ├── waiter.js          ← Data readiness polling
│       └── view-controller.js ← View lifecycle management
├── vistas2/                   ← 27 HTML views (V2 Strategic)
├── vistas/                    ← 45+ HTML views (V1 Legacy)
├── config/
│   ├── stop.json              ← STOP column definitions
│   ├── cead.json              ← CEAD column definitions
│   ├── union.json             ← STOP↔CEAD taxonomy mapping
│   ├── cluster.json           ← Cluster totals config
│   └── delito_class.json      ← Crime classification (violencia)
└── data/                      ← Processed data (gzip JSON)
    ├── stop/                  ← Weekly data by codcom
    ├── cead_split/            ← Monthly data by codcom
    └── comunas/               ← Inter-communal comparison data
```

### Data Pipeline (Python)
```
notebook/proceso.py       → data/stop/{codcom}.json.gz    (semanal)
notebook/proceso_cead.py  → data/cead_split/{codcom}.json.gz (mensual, SARIMA)
notebook/comunas.py       → data/comunas/data_comuna.json.gz (inter-comunal)
notebook/union.py         → config/union.json              (taxonomía)
```

---

## 2️⃣ API REFERENCE

### `window.DataManager`
**Archivo**: `js/data_manager.js`

| Método | Descripción | Parámetros | Retorno |
|--------|-------------|------------|---------|
| `init(codcom?)` | Inicializa y carga todos los datos. Determina `codcom` desde URL o argumento. | `codcom: number \| null` | `Promise<void>` |
| `loadUnionData()` | Carga taxonomía de unificación STOP↔CEAD. | — | `Promise<void>` |
| `loadStopData(id)` | Carga datos semanales STOP para la comuna. | `id: number` | `Promise<void>` |
| `loadCeadData(id)` | Carga datos mensuales CEAD para la comuna. | `id: number` | `Promise<void>` |
| `loadClusterConfig()` | Carga configuración de clusters (totales). | — | `Promise<void>` |
| `loadComunasData()` | Carga datos comparativos inter-comunales. | — | `Promise<void>` |
| `dispatchLegacyEvents()` | Pobla `STATE_DATA` y `STATE_DATA_CEAD` con datos cargados. Emite eventos legacy. | — | `void` |
| `_enrichRow(row)` | Enriquece una fila con metadata de Union Taxonomy. | `row: Object` | `Object` |

**Eventos Emitidos**:
| Evento | Momento | Detail |
|--------|---------|--------|
| `dataManagerLoaded` | Todos los datos cargados exitosamente. | `this.state` |
| `dataManagerError` | Error durante la carga. | `Error` |

---

### `window.STATE_DATA` (Global State — STOP)
**Archivo**: `js/data.js`

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `codcom` | `number` | Código comuna activa (default: `13101`) |
| `allData` | `Array<Object>` | Datos de la semana actual (todos los delitos) |
| `allDataHistory` | `Array<Object>` | Historial completo por delito |
| `allDataHistory_total` | `Array<Object>` | Historial solo fila "Total" |
| `comunaName` | `string` | Nombre de la comuna |
| `semanaId` | `string\|number` | ID de la semana actual |
| `isLoaded` | `boolean` | Flag de datos cargados |
| `currentSemana` | `number` | Semana de referencia |

---

### `window.COLS` (Column Mapping — STOP)
**Archivo**: `js/data.js`

Mapeo de nombres abstractos a nombres reales de columna (output de `proceso.py`):

| Key JS | Valor (columna real) | Uso |
|--------|---------------------|-----|
| `DELITO` | `'delito'` | Nombre del tipo delictual |
| `CASOS_ACTUAL` | `'casos_semana_actual'` | Frecuencia semana vigente |
| `ID_SEMANA` | `'id_semana'` | Identificador temporal (YYYYWW) |
| `Z_SCORE` | `'z_score'` | Desviación estandarizada |
| `TASA_SEMANAL` | `'tasa_semanal'` | Tasa x100k habitantes |
| `MEDIA_MOVIL_4S` | `'media_movil_4s'` | Promedio móvil 4 semanas |

> Consultar `js/data.js` para la lista completa (~80 keys).

---

### `window.IAModule` / `window.IAModuleV2`
**Archivos**: `js/ia.js`, `js/ia2.js`

| Método | Descripción | Retorno |
|--------|-------------|---------|
| `init()` | Deriva API key y prepara el módulo. | `void` |
| `getInterpretation(viewId)` | Obtiene la interpretación IA para una vista. Usa cache (7 días). | `Promise<string>` |
| `generateAllInterpretations()` | Genera todas las interpretaciones en un solo request a la API. | `Promise<Object>` |
| `buildDataContext()` | Construye el contexto de datos para el prompt IA. | `Object\|null` |

**Cache**: `localStorage` con key `ia_v3_{codcom}_{semanaId}`. TTL: 7 días.

---

### `window.App`
**Archivo**: `js/app.js`

| Método | Descripción | Parámetros |
|--------|-------------|------------|
| `init()` | Inicializa la app: cachea DOM, carga sidebar, bind eventos. | — |
| `loadView(viewName)` | Carga una vista en el contenedor principal. | `viewName: string` |
| `exportPdf()` | Exporta todas las vistas a un PDF consolidado. | — |
| `destroyAllCharts()` | Destruye todas las instancias Chart.js activas. | — |
| `executeScripts(container)` | Re-ejecuta `<script>` tags en HTML cargado dinámicamente. | `container: HTMLElement` |

---

## 3️⃣ GUÍA DE IMPLEMENTACIÓN

### Crear una Nueva Vista (V2)

1. **Crear el archivo HTML** en `vistas2/vistaXX.html`:
```html
<!-- Vista XX: Título de la Vista -->
<div class="card mb-lg">
    <div class="location-source-row" style="margin-bottom: 1rem;">
        <div style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600;">
            <i class="fa-solid fa-chart-bar"></i> 
            <span class="comuna-fill">--</span>
            <span style="margin: 0 8px; color: #cbd5e1;">/</span>
            TÍTULO EN CAPS
        </div>
    </div>

    <div class="question-section" style="background: linear-gradient(90deg, rgba(59,130,246,0.1) 0%, transparent 100%); border-left: 4px solid var(--color-primary); padding: 1.25rem; margin-bottom: 1.5rem; border-radius: 0 8px 8px 0;">
        <h2 style="font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0;">
            ¿Pregunta estratégica?
        </h2>
    </div>

    <!-- Contenido -->
    <div class="chart-wrapper" style="height: 300px;">
        <canvas id="vXX_chart"></canvas>
    </div>
</div>

<script>
(async function initVistaXX() {
    // 1. Esperar datos
    const S = await waitForSTOP(); // Centralizado en waiter.js
    const C = window.COLS;

    // 2. Poblar comuna
    document.querySelectorAll('.comuna-fill').forEach(el => el.textContent = S.comunaName);

    // 3. Procesar datos
    const currentData = S.allDataHistory.filter(r => r[C.ID_SEMANA] === S.currentSemana);
    
    // 4. Renderizar Chart
    const ctx = document.getElementById('vXX_chart').getContext('2d');
    new Chart(ctx, { /* config */ });

    // 5. IA (opcional)
    if (typeof IAModule !== 'undefined') {
        IAModule.getInterpretation('vistaXX').then(txt => {
            const el = document.getElementById('vXX_ia');
            if (el) el.innerHTML = txt;
        });
    }
})();
</script>
```

2. **Registrar en la navegación** (`sidebar2.html`):
```html
<div class="nav-item" data-view="vistaXX">
    <i class="fa-solid fa-icon"></i>
    <span>Nombre Vista</span>
</div>
```

3. **Registrar en `App.config.views`** (`js/app.js`):
```javascript
views: ['vista1', ..., 'vistaXX'],
```

### Agregar una Nueva Columna de Datos

1. Calcularla en `notebook/proceso.py` o `notebook/proceso_cead.py`.
2. Agregar el mapeo en `js/data.js`:
```javascript
window.COLS = {
    // ...
    MI_NUEVA_COL: 'nombre_columna_python',
};
```
3. Usarla en vistas: `r[C.MI_NUEVA_COL]`.

### Dependencias y Web APIs Utilizadas

| API | Uso | Soporte |
|-----|-----|---------|
| Fetch | Carga de datos JSON, llamadas a API IA | Chrome 42+ |
| URLSearchParams | Parse de `?codcom=` | Chrome 49+ |
| Promise.allSettled | Carga paralela tolerante | Chrome 76+ |
| TextEncoder/Decoder | Derivación de API key | Chrome 38+ |
| localStorage | Cache de interpretaciones IA | Universal |
| CustomEvent | Comunicación entre módulos | Chrome 15+ |
| requestAnimationFrame | Sincronización de Chart.js | Universal |

---

## 4️⃣ CONFIGURACIÓN

### URL Parameters
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `codcom` | `number` | `13101` | Código comuna a visualizar |

### Archivos de Configuración
| Archivo | Propósito |
|---------|-----------|
| `config/stop.json` | Metadatos de columnas STOP |
| `config/cead.json` | Metadatos de columnas CEAD |
| `config/union.json` | Mapping STOP↔CEAD por delito |
| `config/cluster.json` | Totales por grupo poblacional |
| `config/delito_class.json` | Clasificación de delitos (violencia, propiedad, otros) |
