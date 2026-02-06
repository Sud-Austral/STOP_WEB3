# Diccionario de Datos - STOP WEB3 (data3.json.gz)

Este documento describe las columnas contenidas en el archivo `data3.json.gz` generado por el notebook `Intento_ia.ipynb`. Estas columnas alimentan las 25 tarjetas de análisis del dashboard.

## Identificadores y Tiempo
| Columna | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `codcom` | Código comúnico (formato numérico). Usa este para agrupar. | `13101` |
| `delito` | Nombre estandarizado del delito o "Total". | `ROIT` |
| `id_semana` | ID correlativo único de la semana (continuo desde inicio de datos). | `152` |
| `semana_detalle` | Texto descriptivo de la semana. | `Semana 03 2026` |
| `fecha` | Fecha de corte o inicio de la semana (ISO 8601). | `2026-01-15` |
| `año` | Año calendario. | `2026` |
| `mes` | Mes del año (1-12). | `1` |
| `semana_numero` | Número de semana del año (1-53). | `3` |

## Métricas Base (Tarjeta 1)
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `frecuencia` | Conteo de casos registrados en la semana puntual. | **Columna Original del CSV** |
| `casos_semana_actual` | Alias de frecuencia. | `= frecuencia` |
| `casos_semana_anterior` | Casos registrados en la semana `id_semana - 1`. | `shift(1) sobre (delito, codcom)` |
| `delta` | Variación absoluta. | `= casos_semana_actual - casos_semana_anterior` |
| `var_pct_vs_semana_anterior` | Variación porcentual semanal. | `= (delta / casos_semana_anterior) * 100` |
| `tendencia_corto_plazo` | Texto ("Alza", "Baja", "Estable"). | `np.where(delta > 0, "Alza", ...)` |

## Acumulados y Comparativas Anuales (Tarjetas 2, 3, 4)
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `acumulado_anual` | Suma de casos año actual a la fecha. | `groupby(año, codcom, delito)['frecuencia'].cumsum()` |
| `acumulado_total` | Suma histórica total. | `groupby(codcom, delito)['frecuencia'].cumsum()` |
| `acumulado_anual_anterior` | Acumulado año anterior misma semana. | `acumulado_anual del año (A-1) para misma semana_numero` |
| `casos_misma_semana_año_anterior` | Casos semana equivalente año previo. | `frecuencia del año (A-1) para misma semana_numero` |

## Proyecciones y Tasas (Tarjetas 9, 10, 11, 12)
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `proyeccion_anual` | Estimación cierre anual (Lineal). | `= (acumulado_anual / semana_numero) * 52` |
| `tasa_semanal` | Tasa 100k hab semana actual. | `= (frecuencia / poblacion) * 100000` |
| `tasa_proyectada_anual` | Tasa proyectada cierre año. | `= (proyeccion_anual / poblacion) * 100000` |
| `tasa_proyectada_nacional` | Tasa Nacional proyectada promedio. | `= Sum(proyeccion_anual_pais) / Sum(poblacion_pais) * 100000` |
| `tasa_proyectada_regional` | Tasa Regional proyectada promedio. | `= Sum(proyeccion_anual_region) / Sum(poblacion_region) * 100000` |
| `tasa_semanal_nacional` | Tasa Nacional actual. | `= Sum(frecuencia_pais) / Sum(poblacion_pais) * 100000` |
| `tasa_semanal_regional` | Tasa Regional actual. | `= Sum(frecuencia_region) / Sum(poblacion_region) * 100000` |
| `aporte_pct_region` | % de la comuna en su región. | `= (frecuencia / Sum(frecuencia_region)) * 100` |

## Estadísticas Históricas y Anomalías (Tarjetas 5, 7, 8)
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `promedio_hist` | Promedio histórico progresivo. | `expanding().mean() sobre frecuencia` |
| `std_hist` | Desviación estándar histórica. | `expanding().std() sobre frecuencia` |
| `max_hist` | Máximo histórico progresivo. | `expanding().max() sobre frecuencia` |
| `media_movil_4s` | Tendencia corto plazo. | `rolling(4).mean() sobre frecuencia` |
| `media_movil_8s` | Tendencia mediano plazo. | `rolling(8).mean() sobre frecuencia` |
| `z_score` | Desviación estándar actual. | `= (frecuencia - promedio_hist) / std_hist` |
| `conclusion_z` | Semáforo estadístico. | `pd.cut(z_score, bins=[-2, 2])` |
| `promedio_diario_semanal` | Promedio diario actual. | `= frecuencia / 7` |
| `promedio_diario_historico` | Promedio diario histórico. | `= promedio_hist / 7` |
| `proyeccion_mes_actual` | Estimación cierre mes. | `= media_movil_4s * 4.33` |

## Comparativas Año Anterior Avanzadas
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `promedio_hist_anual` | Promedio histórico al año anterior. | `expanding().mean() año (A-1)` |
| `max_hist_anual` | Récord histórico hasta año anterior. | `expanding().max() año (A-1)` |
| `z_score_vs_año_anterior` | Z-Score vs contexto año pasado. | `= (frecuencia - promedio_hist_anual) / std_hist_anual` |

## Rankings y Posicionamiento (Tarjetas 13-20)
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `ranking_comunal_regional` | Posición en la región (casos). | `rank() sobre frecuencia agrupado por (Codreg, delito, id_semana)` |
| `ranking_comunal_regional_semana_anterior` | Posición semana pasada. | `shift(1) sobre ranking_comunal_regional` |
| `ranking_regional_proy_anual` | Posición regional (proyección). | `rank() sobre proyeccion_anual agrupado por (Codreg, delito)` |
| `ranking_regional_proy_anual_anterior` | Posición semana pasada. | `shift(1) sobre ranking_regional_proy_anual` |
| `ranking_nacional_semanal` | Posición nacional (casos). | `rank() sobre frecuencia agrupado por (delito, id_semana)` |
| `ranking_nacional_proy_anual` | Posición nacional (proy). | `rank() sobre proyeccion_anual agrupado por (delito)` |
| `ranking_cluster_semanal` | Posición en Clúster (casos). | `rank() sobre frecuencia agrupado por (clase_poblacion, delito)` |
| `ranking_cluster_proy_anual` | Posición en Clúster (proy). | `rank() sobre proyeccion_anual agrupado por (clase_poblacion)` |

## Datos Geográficos y Demográficos (External)
| Columna | Descripción | Origen |
| :--- | :--- | :--- |
| `Provincia`, `Comuna`, `Región` | Nombres geográficos. | **Excel: Localiza Chile (1).xlsx** |
| `Codreg` | Código región. | **Excel: Localiza Chile (1).xlsx** |
| `poblacion` | Habitantes comuna. | **Excel: Factores Población.xlsx** |
| `clase_poblacion` | Segmento sociodemográfico. | **Excel: Factores Población.xlsx** |

## Alertas y Análisis
| Columna | Descripción | Fórmula / Origen |
| :--- | :--- | :--- |
| `racha` | Semanas consecutivas. | `groupby((delta <= 0).cumsum()).cumsum()` |
| `alerta_aumento_critico` | Alerta Z alto + aumento explosivo. | `(z_score > 2) & (var_pct > 30)` |
| `alerta_vs_año_anterior` | Alerta Z alto vs año pasado. | `(z_score_ant > 2) & (frecuencia > max_hist_anual)` |
| `share_delito_semanal` | Concentración delito (Pareto). | `= (frecuencia / Sum(frecuencia_comuna)) * 100` |

---
**Generado por:** `Intento_ia.ipynb`
**Formato Salida:** JSON Records comprimido (GZIP).
