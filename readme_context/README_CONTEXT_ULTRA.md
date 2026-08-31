# PROJECT EVIDENCE CONTEXT
PROJECT=target
FILES=1865
GENERATED=2026-08-31T01:35:52.590312

## EVIDENCE_POLICY

This context contains repository evidence.
Signals are not guaranteed business features.
Do not infer unsupported functionality.
Prefer explicit files, dependencies and source evidence.
If evidence is insufficient, omit the claim.

## STACK
LANG=JSON,HTML,JavaScript,Markdown,Python,YAML,CSS
TECH=Leaflet[low],Node.js[low],NumPy[medium],Pandas[medium],Tailwind[low],Vue[low]

## STRUCTURE
ROOTS=web_js(1861),.github(2),.gitattributes(1),README.md(1)

## KEY_FILES
README.md,.github/workflows/deploy.yml,.github/workflows/readme.yml,web_js/.config/cead.json,web_js/.config/stop.json,web_js/config/cead.json,web_js/config/cluster.json,web_js/config/delito_class.json,web_js/config/stop.json,web_js/config/union.json,web_js/js/config/columns.js,web_js/js/utils/view-controller.js

## API_EVIDENCE
FETCH sidebar.html [web_js/js/app.js:97]
FETCH ${this.config.viewsPath}/${viewName}.html?t=${Date.now()} [web_js/js/app.js:166]

## CAPABILITY_SIGNALS
Autenticación [confidence=medium]
  auth [web_js/js/ia2.js:257]
  auth [web_js/js/ia.js:314]
  token [web_js/js/ia.js:303]
  token [web_js/js/utils/calidadPrompt.js:6]
  auth [web_js/.review/5.report_refactors.md:265]
  token [.github/workflows/deploy.yml:16]
Mapas / cartografía [confidence=medium]
  mapa [web_js/USO_DATOS_VISTAS.md:16]
  mapa [web_js/js/pdf.js:1057]
  mapa [web_js/vistas/vista9.html:35]
  mapa [web_js/vistas/vista29.html:35]
  mapa [web_js/data/markdown/analisis_integral_v25.md:46]
  mapa [web_js/vistas2/vista16.html:141]
  leaflet [web_js/docs/TECHNICAL_DOC.md:8]
Exportación [confidence=medium]
  csv [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:23]
  export [web_js/index.html:35]
  exportar [web_js/index.html:37]
  csv [web_js/DOCUMENTACION_DATOS.md:172]
  excel [web_js/DOCUMENTACION_DATOS.md:273]
  export [web_js/js/app.js:3]
  exportar [web_js/js/app.js:485]
  export [web_js/js/pdf.js:625]
Carga de archivos [confidence=medium]
  archivo [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:33]
  document [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:1]
  file [web_js/sidebar2.html:17]
  file [web_js/index.html:36]
  document [web_js/index.html:198]
  file [web_js/temp_titles.py:4]
  archivo [web_js/USO_DATOS_VISTAS.md:7]
  document [web_js/USO_DATOS_VISTAS.md:1]
Reportes / analítica [confidence=medium]
  report [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:29]
  dashboard [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:6]
  report [web_js/sidebar2.html:82]
  reporte [web_js/sidebar2.html:82]
  report [web_js/index.html:50]
  reporte [web_js/index.html:50]
  report [web_js/observaciones.md:250]
  reporte [web_js/observaciones.md:250]
Procesamiento de datos [confidence=medium]
  pandas [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:26]
  etl [web_js/CONTEXT_STOP-WEB3-CEAD_20260211.md:6]
  dataframe [web_js/DOCUMENTACION_DATOS.md:324]
  etl [web_js/js/pdf.js:107]
  etl [web_js/js/pdf_vistas2.js:301]
  etl [web_js/docs/TECHNICAL_DOC.md:4]
  pandas [web_js/notebook/proceso.py:2]
  numpy [web_js/notebook/proceso.py:5]

## PYTHON
web_js/temp_titles.py|I=os,re
web_js/temp_cleanup_placeholders.py|I=os,re
web_js/tools/inject_ia.py|I=os,re
web_js/scripts/update_footers.py|I=os,re
web_js/notebook/proceso.py|F=progress_wrapper,verificar_integridad,calc_agg_metrics,calculate_top_correlation,get_top_rachas|I=pandas,json,warnings,numpy,os,sys,datetime,tqdm
web_js/notebook/proceso_cead.py|F=ejecutar_proceso,progress_wrapper,optimize_dtypes,date_to_id,calc_estacionalidad,calc_correlacion_lp,calculate_top_correlation|I=pandas,numpy,os,sys,gc,json,datetime,tqdm
web_js/notebook/comunas.py|F=build,save,_init_module|I=pandas,numpy,warnings,os,sys,proceso,proceso
web_js/notebook/contexto.py|F=_get_clf,_safe,_last_total,_prev_total,_score_nivel,_variacion_pct,_get_slope,_get_seasonal_index,_top_delitos,_tendencia_8s,_serie_anual,_serie_semanal_delito,_top_delitos_completo,build_context|I=pandas,numpy,typing
web_js/notebook/generar_analisis.py|C=_SafeEncoder|F=_prog,default,_prog|I=sys,os,json,warnings,datetime,proceso,proceso_cead,comunas,contexto,tqdm,numpy,gzip
web_js/notebook/celda_analisis.py|C=_SafeEncoder|F=default|I=os,sys,json,datetime,warnings,pandas,glob,contexto,numpy,tqdm
web_js/notebook/union.py|I=pandas

## COMPONENTS
web_js/js/app.js:App,S
web_js/js/pdf.js:PDFModule
web_js/js/ia2.js:OFUSCADO,C,C_CEAD,S_CEAD,S,API_KEY
web_js/js/ia.js:IAModule,OFUSCADO,COLS,V
web_js/js/utils/chart-enhancer.js:ChartEnhancer,OriginalChart
web_js/js/utils/calidadPrompt.js:PromptQuality
web_js/js/utils/logger.js:IS_DEV
web_js/js/utils/view-controller.js:MAX_ATTEMPTS,S,C
web_js/js/utils/chart-helper.js:ChartHelper
web_js/js/utils/ui-helper.js:UI
web_js/scripts/update_footers.js:VIEW_MAP,BASE_DIR

## EXISTING_README
# STOP_WEB3

## DEPLOYMENT_FILES
.github/workflows/deploy.yml,.github/workflows/readme.yml

## README_RULES

Generate README.md only from repository evidence.
Do not invent features.
Do not invent technologies.
Do not invent endpoints.
Do not invent database tables.
Do not invent environment variables.
Do not invent commands.
Do not infer production architecture from filenames alone.
Treat capability signals as signals, not confirmed features.
Prefer explicit source evidence.
Omit unsupported sections.