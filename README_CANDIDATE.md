# STOP_WEB3

## Stack técnico
- Lenguajes: JSON, HTML, JavaScript, Markdown, Python, YAML, CSS
- Tecnologías: Leaflet, Node.js, NumPy, Pandas, Tailwind, Vue

## Estructura del proyecto
- `web_js/`: Directorio principal de la aplicación web (1861 archivos)
  - `.config/`: Archivos de configuración (cead.json, stop.json)
  - `config/`: Archivos de configuración adicionales (cead.json, cluster.json, delito_class.json, stop.json, union.json)
  - `js/`: Código JavaScript de la aplicación
    - `app.js`: Módulo principal de la aplicación (App, S)
    - `pdf.js`: Módulo para generación de PDF (PDFModule)
    - `ia.js` e `ia2.js`: Módulos de inteligencia artificial (IAModule, OFUSCADO, C, C_CEAD, S_CEAD, S, API_KEY)
    - `utils/`: Utilidades varias
      - `chart-enhancer.js`: Mejorador de gráficos (ChartEnhancer, OriginalChart)
      - `calidadPrompt.js`: Calidad de prompts (PromptQuality)
      - `logger.js`: Logging (IS_DEV)
      - `view-controller.js`: Controlador de vistas (MAX_ATTEMPTS, S, C)
      - `chart-helper.js`: Ayuda para gráficos (ChartHelper)
      - `ui-helper.js`: Ayuda para UI (UI)
  - `vistas/` y `vistas2/`: Vistas HTML de la aplicación
  - `notebook/`: Scripts de Python para procesamiento de datos
    - `proceso.py`: Funciones para procesamiento de datos (progress_wrapper, verificar_integridad, calc_agg_metrics, calculate_top_correlation, get_top_rachas)
    - `proceso_cead.py`: Funciones específicas para CEAD (ejecutar_proceso, progress_wrapper, optimize_dtypes, date_to_id, calc_estacionalidad, calc_correlacion_lp, calculate_top_correlation)
    - `comunas.py`: Módulo para manejo de comunas (build, save, _init_module)
    - `contexto.py`: Módulo para construcción de contexto (_get_clf, _safe, _last_total, _prev_total, _score_nivel, _variacion_pct, _get_slope, _get_seasonal_index, _top_delitos, _tendencia_8s, _serie_anual, _serie_semanal_delito, _top_delitos_completo, build_context)
    - `generar_analisis.py`: Generación de análisis (_SafeEncoder, _prog, default)
    - `celda_analisis.py`: Análisis por celda (_SafeEncoder, default)
    - `union.py`: Unión de datos (pandas)
  - `data/`: Datos y documentación
    - `markdown/`: Documentación en formato markdown
    - `USO_DATOS_VISTAS.md`: Documentación sobre el uso de datos en vistas
    - `CONTEXT_STOP-WEB3-CEAD_20260211.md`: Contexto del proyecto
    - `DOCUMENTACION_DATOS.md`: Documentación de datos
    - `observaciones.md`: Observaciones
  - `temp_titles.py`, `temp_cleanup_placeholders.py`, `tools/inject_ia.py`, `scripts/update_footers.py`: Scripts auxiliares
- `.github/workflows/`: Flujos de trabajo de GitHub
  - `deploy.yml`: Flujo de despliegue
  - `readme.yml`: Flujo de actualización del README

## Capabilities
- Autenticación: Evidencia de módulos de autenticación y manejo de tokens.
- Mapas / cartografía: Uso de Leaflet para mapas.
- Exportación: Capacidad de exportar a CSV y Excel.
- Carga de archivos: Posibilidad de cargar documentos.
- Reportes / analítica: Generación de reportes y dashboards.
- Procesamiento de datos: Uso de Pandas y NumPy para procesamiento ETL.

## API
La aplicación carga vistas dinámicamente mediante:
- `fetch('sidebar.html')` en `web_js/js/app.js:97`
- `fetch(${this.config.viewsPath}/${viewName}.html?t=${Date.now()})` en `web_js/js/app.js:166`

## Despliegue
El proyecto utiliza flujos de trabajo de GitHub Actions para despliegue, definidos en `.github/workflows/deploy.yml`.
