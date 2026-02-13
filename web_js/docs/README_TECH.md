# 📘 Documentación Técnica: STOP WEB V2

## 1️⃣ OVERVIEW
**STOP WEB V2** es una plataforma de inteligencia delictual basada en Single Page Application (SPA) híbrida construida con **Vanilla JavaScript (ES2020+)**. Su objetivo es visualizar y analizar datos complejos provenientes de fuentes policiales (CEAD/STOP) mediante dashboards interactivos de alto rendimiento.

## 2️⃣ ARCHITECTURE

### Core Components
- **`index_vistas2.html`**: El "App Shell" principal. Carga las librerías base, estilos y el `js/app.js` que orquesta la aplicación.
- **`js/app.js`**: El controlador central. Maneja la carga de vistas (`loadView`), la navegación (`loadSidebar`) y la inicialización de módulos.
- **`js/data_manager.js`**: Gestor de estado global para datos **STOP**. Carga JSONs, normaliza y expone `window.STATE_DATA`.
- **`js/data_cead.js`**: Gestor de estado global para datos **CEAD**. Carga JSONs generados por Python y expone `window.STATE_DATA_CEAD`.
- **`vistas2/*.html`**: Fragmentos de HTML + JS que componen cada pantalla del dashboard. Se inyectan dinámicamente en el `#viewContainer`.

### Data Flow
1.  **Ingesta (Python)**: `notebook/proceso_cead.py` procesa archivos Excel/CSV crudos y genera `data_cead.json`.
2.  **Carga (JS)**: Al inicio, `data_cead.js` descarga `data_cead.json` y lo almacena en memoria (`window.STATE_DATA_CEAD.allData`).
3.  **Renderizado (View)**: Cuando el usuario navega a una vista (ej. `vista21`), el JS de la vista:
    - Espera a que los datos estén listos (`waitForData`).
    - Filtra y transforma los datos globales según la lógica de negocio (ej. filtrar por año, calcular proyecciones).
    - Renderiza gráficos con **Chart.js** y manipula el DOM para mostrar tablas/KPIs.

## 3️⃣ API REFERENCE (Principales Funciones Globales)

### `App` (js/app.js)
- `App.loadView(viewName)`: Carga el HTML de `vistas2/{viewName}.html` e inyecta en `#viewContainer`. Ejecuta scripts embebidos.
- `App.loadSidebar()`: Carga y renderiza el menú lateral (`sidebar2.html`).

### `DataManager` (js/data_manager.js)
- `DataManager.init()`: Inicia la carga de datos STOP.
- `DataManager.state`: Objeto con los datos cargados (`allData`, `comunaName`, etc).

### `ChartHelper` (js/utils/chart-helper.js)
- `ChartHelper.formatNumber(num)`: Formatea números con separadores de miles (CLP standard).
- `ChartHelper.colors`: Paleta de colores corporativa para gráficos.

## 4️⃣ GUÍA DE IMPLEMENTACIÓN DE NUEVAS VISTAS

Para crear una nueva vista (ej. `vista99.html`):
1.  Copiar la estructura base de una vista existente (ej. `vista21.html`).
2.  Implementar la lógica dentro de una **IIFE async** para evitar contaminar el scope global:
    ```javascript
    (async function initVista99() {
        await waitForData(); // Implementar o importar
        const S = window.STATE_DATA_CEAD;
        // Lógica de filtrado y renderizado
    })();
    ```
3.  Agregar la entrada en `sidebar2.html` con `data-view="vista99"`.
4.  Si requiere columnas nuevas, asegurar que `proceso_cead.py` las exporte y agregarlas a `COLS_CEAD` en `js/data_cead.js`.

## 5️⃣ SCRIPTS Y HERRAMIENTAS
- **Python ETL**: `python notebook/proceso_cead.py` (Requiere Pandas, Statsmodels). Genera `data_cead.json`.
- **Servidor Local**: `python -m http.server` o extensión "Live Server" en VSCode. No requiere build step (Webpack/Vite) para desarrollo, es nativo.
