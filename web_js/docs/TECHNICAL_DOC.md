# 📄 Documentación Técnica: STOP WEB 3 (RID SIMULATOR)

## 📌 Visión General
El **RID Simulator (Vistas 2)** es una plataforma de inteligencia delictual basada en estándares web modernos (Vanilla JS + Python ETL). Su objetivo es transformar datos complejos de seguridad pública en visualizaciones estratégicas para la toma de decisiones.

## 🏗️ Arquitectura
El sistema opera bajo un modelo **Client-Side Heavy** con un proceso de ETL previo en Python.
- **Frontend**: Vanilla JS (ES2020+), Chart.js, Leaflet.
- **Backend / Data**: Archivos JSON estáticos generados por Python (`notebook/*.py`).
- **Estado**: `window.STATE_DATA` (Singleton Global).
- **IA**: Integración con GLM-4 vía `js/ia2.js` (Proxy Pattern Simulated).

## 📚 Referencia de API (Módulos Principales)

### `DataManager` (`js/data_manager.js`)
Manejador central de carga de datos.
- **`init(codcom)`**: Inicia la carga paralela de datos STOP y CEAD.
- **`state`**: Objeto reactivo con `isLoaded`, `isLoading`, `stop`, `cead`.
- **Eventos**: Dispara `dataManagerLoaded` cuando los datos están listos.

### `IAModuleV2` (`js/ia2.js`)
Módulo de inteligencia artificial estratégica.
- **`getAnalysis(viewId)`**: Retorna el texto de análisis para una vista específica.
- **`fetchAllAnalyses()`**: Genera análisis para las 25 vistas en una sola petición (Batch Request).
- **`cache`**: Almacena resultados en `localStorage` (TTL: 5 días).

### `UIHelper` (Propuesto)
Utilidades de renderizado.
- **`formatNumber(num)`**: Formato local (miles).
- **`renderTrend(el, val)`**: Inyecta HTML de tendencia (flecha + color).

## 🚀 Guía de Implementación
Para agregar una nueva vista (`vista26.html`):
1.  Crear `vistas2/vista26.html` siguiendo la estructura de `template.html`.
2.  Agregar script de inicialización:
    ```javascript
    (async function initVista26() {
        await waitForData(); // Esperar carga global
        const S = window.STATE_DATA;
        // Lógica de renderizado...
    })();
    ```
3.  Registrar en `index_vistas2.html` (si es necesario para navegación).

## ⚠️ Consideraciones Importantes
- **Datos Asíncronos**: Siempre usar `waitForData()` o escuchar `dataManagerLoaded` antes de acceder a `STATE_DATA`.
- **Performance**: Evitar `innerHTML` masivo. Usar `document.createDocumentFragment()` para listas largas.
- **Seguridad**: Nunca comitear claves de API reales. Usar variables de entorno en el proceso de build o un proxy seguro.
