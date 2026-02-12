# 📘 Documentación Técnica: STOP_WEB3 CEAD Integration

## 📋 Overview
**STOP_WEB3** es una plataforma de inteligencia delictual diseñada para la reportabilidad oficial de seguridad pública. Integra datos operativos semanales del sistema **STOP** (Carabineros) con estadísticas mensuales oficiales de **CEAD** (Subsecretaría de Prevención del Delito).

### Arquitectura General
- **Frontend**: Single Page Application (SPA) basada en **Vanilla JS** (ES2022+). Utiliza inyección dinámica de HTML para las vistas.
- **Estado**: Gestión de estado centralizada a través de objetos globales (`STATE_DATA`, `STATE_DATA_CEAD`).
- **Data Layer**: Procesamiento previo en **Python (Pandas/Statsmodels)** con salida en JSON comprimidos (Gzip) para optimización de red.
- **Reporting**: Generación de informes profesionales en PDF directamente en el cliente mediante `html2canvas` y `jsPDF`.

---

## 🛠️ API Reference

### 1. `App` (js/app.js)
El controlador principal de la aplicación. Gestiona el ciclo de vida de las vistas y la navegación.

| Función | Parámetros | Descripción |
| :--- | :--- | :--- |
| `init()` | - | Inicializa la aplicación, cachea elementos y bindea eventos. |
| `loadView(viewName)` | `string` | Carga un archivo HTML remoto (`vistas/`) en el contenedor principal. |
| `exportPdf()` | - | Orquestador de exportación masiva de vistas a formato PDF. |
| `destroyAllCharts()` | - | Limpia instancias de Chart.js para prevenir fugas de memoria. |

### 2. `dataLoader` / `dataLoaderCead` (js/data.js, js/data_cead.js)
Responsables de la hidratación del estado y la descompresión de datos.

| Función | Parámetros | Descripción |
| :--- | :--- | :--- |
| `load()` | - | Fetch de datos Gzip, descompresión vía `DecompressionStream` e hidratación del estado global. |
| `updateHeader()` | - | Actualiza dinámicamente el nombre de la comuna y periodo en el DOM superior. |

### 3. `IAModule` (js/ia.js)
Módulo de interpretación de datos asistido por IA.

| Función | Parámetros | Descripción |
| :--- | :--- | :--- |
| `getInterpretation(viewId)` | `string` | Recupera o genera un análisis de IA para una vista específica. |
| `cleanOldCaches()` | - | Mantenimiento preventivo de `localStorage`. |

### 4. `ChartEnhancer` (js/utils/chart-enhancer.js)
Motor de estética premium para visualizaciones.

| Función | Parámetros | Descripción |
| :--- | :--- | :--- |
| `enhanceAllCharts()` | - | Aplica defaults globales (Fuentes Outfit, bordes redondeados, sombras). |
| `formatViewNumbers()` | - | Aplica formato de moneda y porcentajes locales (`es-CL`). |

---

## 📡 Eventos
La comunicación entre módulos desacoplados se realiza mediante `CustomEvents`.

- **`dataLoaded`**: Disparado por `dataLoader` cuando el estado está listo para ser consumido por las vistas.
- **`DOMContentLoaded`**: Punto de entrada inicial para la inicialización de `App`.

---

## 🚀 Guía de Implementación

### Cómo agregar una nueva vista
1. Crear un archivo HTML en la carpeta `vistas/` (ej: `vista46.html`).
2. Implementar la estructura básica de tarjetas:
```html
<div class="card">
    <div id="v46_kpi">--</div>
</div>
<script>
    (async function() {
        // Lógica de carga de datos desde STATE_DATA
    })();
</script>
```
3. Registrar la vista en `App.config.views` dentro de `js/app.js`.

### Consideraciones de Performance (LCP/INP)
- **Lazy Loading**: Las vistas se cargan bajo demanda vía `fetch`.
- **Gzip**: Es obligatorio que el servidor sirva los archivos de datos con el encabezado correcto o que el cliente use `DecompressionStream`.
- **Render Delay**: Chart.js requiere un pequeño delay (~1.5s) tras la inyección del DOM para calcular dimensiones correctamente dentro de contenedores ocultos durante exportaciones.

---

## 📦 Dependencias
- [Chart.js](https://www.chartjs.org/) (v4.x)
- [html2canvas](https://html2canvas.hertzen.com/)
- [jsPDF](https://rawgit.com/MrRio/jsPDF/master/docs/index.html)
- [FontAwesome](https://fontawesome.com/) (Iconografía)
- [Google Fonts (Outfit)](https://fonts.google.com/specimen/Outfit)

---

**Mantenido por**: Equipo de Inteligencia - Instituto Libertad
**Última actualización**: 2026-02-12
