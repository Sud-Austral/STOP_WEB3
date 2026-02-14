# 📘 Documentación Técnica: STOP WEB V2 (Web 3.0)

## 📌 Visión General
STOP WEB V2 es una **plataforma de análisis delictual en tiempo real** desarrollada en JavaScript nativo (Vanilla JS) y HTML5. Su objetivo es visualizar métricas críticas de seguridad ciudadana (STOP y CEAD) a través de un dashboard interactivo de alto rendimiento.

**Arquitectura**: Single Page Application (SPA-Shell) que carga vistas (`vistas2/*.html`) dinámicamente sobre un contenedor principal (`index_vistas2.html`). La gestión de estado es centralizada vía `DataManager` (Singleton).

## 🏗️ Stack Tecnológico
- **Frontend Core**: Vanilla JS (ES2020+), HTML5, CSS3 Custom Properties.
- **Gráficos**: Chart.js 3.x (Canvas Rendering).
- **Datos**: JSON estáticos pre-procesados (Python Pandas/SARIMA).
- **IA**: Integración con BigModel GLM-4 Flash (vía `js/ia.js`).
- **Iconografía**: FontAwesome 6 (CDN).

## 🧩 API Reference & Core Modules

### 1. `DataManager` (js/data_manager.js)
El corazón de la aplicación. Gestiona la carga, transformación y acceso seguro a los datos.
- **`init(codcom)`**: Inicializa la carga paralela de datos STOP, CEAD y Configuración.
- **`loadStopData()`**: Parsea CSVs/JSONs de STOP y normaliza fechas.
- **`loadCeadData()`**: Procesa y enriquece datos mensuales CEAD.
- **`loadUnionData()`**: Indiza la taxonomía unificada (STOP ↔ CEAD).
- **`state.stop.totalHistory`**: Array principal con métricas históricas semanales.

### 2. `App` (index_vistas2.html)
Controlador de la vista y navegación.
- **`loadView(viewId)`**: Descarga el HTML de la vista, inyecta en el contenedor y ejecuta scripts inline.
- **`getDateLabel(id)`**: Formatea IDs de semana a `YYYY/MM`.

### 3. `IAModule` (js/ia.js)
Módulo de Inteligencia Artificial para interpretaciones textuales.
- **`getInterpretation(viewId)`**: Devuelve análisis en lenguaje natural o default si falla.
- **`generateAllInterpretations()`**: Batch request para optimizar costos y latencia.

## 🚀 Guía de Implementación

### Cómo Agregar una Nueva Vista
1. Crear `vistas2/vistaN.html`.
2. Estructura recomendada:
   ```html
   <div class="card">
       <h3>Título</h3>
       <canvas id="miChart"></canvas>
   </div>
   <script>
       (async function() {
           // Usar S.getDateLabel(id) siempre
           const data = S.allDataHistory...;
           new Chart(...);
       })();
   </script>
   ```
3. Registrar en `VIEW_TITLES` (`index_vistas2.html`).

### Estándares de Código
- **Fechas**: Siempre usar `App.getDateLabel(id)` o `S.getDateLabel(id)`. NUNCA `S${id}`.
- **Async**: Usar `async/await` para operaciones asíncronas.
- **Renderizado**: Evitar `innerHTML` con datos no confiables. Usar `textContent`.

## ⚠️ Seguridad y Restricciones
- **API Keys**: La clave de IA está ofuscada en cliente. **Riesgo:** Alta exposición. (Ver `2.report_compliance.md`).
- **Datos**: Los JSONs se asumen confiables (origen interno). No cargar JSONs externos sin validación.
- **Performance**: Evitar re-renderizados completos del DOM en loops de animación.

## 🔄 Flujo de Datos
1. `notebook/proceso_cead.py` → Genera `data_cead_full.json` y aplica SARIMA.
2. `DataManager.init()` → `fetch(json)` → `STATE_DATA`.
3. `App.loadView()` → Lee `STATE_DATA` → Renderiza Chart.js.

## 📞 Soporte
Para reportes de errores de runtime, consultar `.review/1.report_errors.md`.
Para mejoras de código, ver `.review/5.report_refactors.md`.
