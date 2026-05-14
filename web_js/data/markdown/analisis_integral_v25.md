# Reporte Estratégico de Seguridad - Puerto Montt (Dummy)

Este documento presenta la estructura integral de las 25 vistas estratégicas del sistema RID, con datos referenciales para validación de formato.

---

## Vista 01: Dashboard Principal STOP
- **Casos Totales:** 421 | **Variación Semanal:** +11.4% | **Variación Interanual:** -17.5%
- **Top 5 Delitos:** Consumo Alcohol, Daños, Amenazas, VIF, Hurtos.
> **📊 Visualización:** Gráfico de Barras Horizontales con los 5 delitos de mayor frecuencia y velocímetros (Gauges) para las variaciones porcentuales.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `casos_totales` | Frecuencia absoluta de la semana actual | 421 |
| `var_semanal_pct` | Variación % vs semana anterior | +12.5% |
| `var_interanual_pct` | Variación % vs misma semana año anterior | -5.2% |
| `tasa_x100k` | Casos normalizados por cada 100 mil hab. | 165.5 |
| `nivel_riesgo` | Categorización (Bajo/Medio/Alto) según Z-Score | Alto |
| `z_score_avg` | Promedio de desviaciones de todos los delitos | 1.85 |
| `trend_slope` | Pendiente de la regresión lineal (8 semanas) | -0.42 |

## Vista 02: Evolución Reciente (24 Semanas)
- **Tendencia:** Alza (Media Móvil 4s: 427.0)
> **📈 Visualización:** Gráfico de Líneas Temporal con sombra de área para la Media Móvil de 4 semanas, resaltando puntos de inflexión (Peaks).
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `total_24s` | Acumulado de casos en las últimas 24 semanas | 10,240 |
| `avg_24s` | Promedio semanal del último semestre | 426.7 |
| `global_avg` | Promedio histórico de toda la serie | 412.3 |
| `ma_var` | Variación de la media móvil (útimas 2 semanas) | +2.1% |
| `trend_category` | Clasificación (Expansión/Contracción/Estabilidad) | Expansión |
| `serie_24s` | Dataset con 24 puntos de frecuencia | [401, 420...] |

## Vista 03: Triple Comparativa (Nivel Crítico)
- **Actual:** 421 | Promedio Hist: 482.8
> **📊 Visualización:** Gráfico de Columnas Agrupadas comparando Semana Actual vs Semana Anterior vs Semana Año Anterior vs Promedio Histórico.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `semana_actual` | Casos de la semana vigente | 841 |
| `max_hist_total` | Registro más alto de toda la historia | 1.241 |
| `min_hist_total` | Registro más bajo (excl. semanas 1 y 53) | 655 |
| `avg_53s` | Promedio del último año operativo (53 semanas) | 869 |
| `promedio_hist_total`| Promedio global de toda la serie | 812.3 |

## Vista 04: Patrones Estacionales
- **Peak Histórico:** Octubre 2024 (654 casos).
> **📅 Visualización:** Heatmap (Mapa de Calor) por mes y año, identificando concentraciones de color en los meses de mayor incidencia (Sept/Oct).
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `seasonal_index_cead` | Índice estacional mensual histórico (20 años) | [110.5, 95.2...] |
| `seasonal_index_stop` | Índice estacional operativo reciente (2 años) | [105.1, 98.4...] |
| `meses_nombres` | Etiquetas de los meses para el gráfico | ["Ene", ...] |

## Vista 05: Ley de Pareto (Distribución)
- **Concentración:** 34.4% Consumo de Alcohol.
> **🍩 Visualización:** Gráfico de Donas (Donut Chart) que muestra la cuota de participación de cada delito en el total semanal.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `pareto_ytd` | Lista de delitos ordenados por acumulado anual | [{..}, {..}] |
| `top3_concentration_ytd` | % de casos explicados por los 3 delitos top | 72.5% |
| `total_ytd_cases` | Sumatoria total de casos en el año natural | 12,450 |

## Vista 06: Benchmarking Nacional (Tasas)
- **Tasa x100k:** 165.5
> **📉 Visualización:** Gráfico de Barras Divergentes (Waterfall) que muestra los delitos con mayor alza (+75%) y mayor caída (-60%).
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `tasa_comuna` | Tasa de la semana operativa (x 100k hab) | 165.5 |
| `tasa_nacional` | Tasa nacional de referencia | 98.2 |
| `desviacion_tasa_pct` | % de desviación vs estándar nacional | +68.5% |
| `mayores_aumentos` | Listado de los 3 delitos con alza extrema | [{..}] |
| `mayores_descensos` | Listado de los 3 delitos con caída extrema | [{..}] |

## Vista 07: Crecimiento Estructural (CEAD 20 Años)
- **Serie CEAD:** Estabilidad mensual (Z-Score: 0.56).
> **🏠 Visualización:** Gráfico de Área Apilada que muestra la transición del perfil delictivo (Violencia vs Propiedad) desde 2005 hasta 2025.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `serie_cead` | Datos históricos CEAD (2005-2025) longitudinar | [{..}, {..}] |
| `tasa_cead_actual` | Tasa según metodología estructural CEAD | 244.8 |
| `z_score_cead_med` | Z-Score en escala mensual histórica delictual | 0.56 |

## Vista 08: Co-ocurrencia Criminal
- **Sincronía:** Correlación 0.65 entre Hurtos y Accesorios.
> **🔗 Visualización:** Matriz de Correlación (Mapa de Calor Cuadrado) que vincula tipos de delitos que ocurren simultáneamente.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `matriz_coocurrencia` | Matriz de correlación entre delitos asociados | [{..}] |
| `cluster_delictual` | Identificación cualitativa de clústeres | "Robo/Hurtos" |

## Vista 09: Tasas vs Estándar (Nacional/Regional)
- **Estado:** 1er lugar regional en tasa anual.
> **🌡️ Visualización:** Gráfico de Termómetro o Escala Lineal que posiciona la tasa comunal frente a la media regional y nacional.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `tasa_comuna` | Tasa de la semana operativa (x 100k hab) | 165.5 |
| `tasa_regional` | Tasa regional de referencia | 112.4 |
| `tasa_nacional` | Tasa nacional de referencia | 98.2 |
| `rank_reg_tasa` | Posición en la región por densidad de casos | 1 |

## Vista 10: Carga Regional (Ranking Volumen)
- **Aporte:** 36.4% regional.
> **🏆 Visualización:** Gráfico de Treemap (Mapa de Árbol) donde el tamaño de los rectángulos representa el volumen de cada comuna en la región.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `casos_comuna` | Volumen total de la semana | 421 |
| `aporte_regional_pct` | Porcentaje de la carga regional (Share %) | 36.4% |
| `rank_regional` | Posición absoluta por volumen en región | 1 |
| `comunas_competencia` | Lista de comunas con volúmenes similares | [{..}] |

## Vista 11: Benchmark Histórico Regional
- **Trayectoria:** 1er lugar regional continuo.
> **🏁 Visualización:** Gráfico de "Bump Chart" (Líneas de Ranking) que muestra la fluctuación de la posición de la comuna año tras año.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `rank_actual` | Posición regional en la semana actual | 1 |
| `rank_historico_anual` | Trayectoria de ranking de los últimos años | [{..}] |

## Vista 12: Contexto Nacional (Ranking 345 Comunas)
- **Ranking Nac:** 4° lugar.
> **🗺️ Visualización:** Mapa Coroplético de Chile resaltando la comuna y gráfico de barras del Top 10 Nacional de incidencia.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `n_comunas_nac` | Universo de comunas integradas (Base 345) | 345 |
| `rank_nac_sem` | Lugar de la comuna en el país (Semana) | 4 |
| `casos_nacionales` | Total de casos país en la semana operativa | 15,430 |
| `tasa_nacional` | Tasa nacional de benchmarking | 98.2 |

## Vista 13: Clúster de Comunas Similares
- **Comparativo:** Osorno (143), Valdivia (123).
> **🕸️ Visualización:** Gráfico de Radar (Radar Chart) que compara tasas, población y Z-Score con las 5 comunas más similares.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `comunas_similares` | Tasas y poblaciones de competidores directos | [{..}] |

## Vista 14: Peso en la Región (Responsabilidad)
- **Carga:** 36.38%.
> **🍕 Visualización:** Gráfico de Tarta (Pie Chart) comparando "Esta Comuna" vs "Resto de la Región".
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `porcentaje_aporte_regional` | Peso relativo sobre el total de la región | 36.4% |
| `frecuencia_regional` | Sumatoria de casos de toda la región | 1,154 |

## Vista 15: Efectividad Policial
- **Ratio de Resolución:** 0.0%.
> **🎯 Visualización:** Gráfico de "Bullet" o Gráfico de Embudo (Funnel) de Casos Reportados vs Detenciones Efectivas.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `casos_ingresados` | Total de delitos reportados (Input) | 421 |
| `detenciones` | Cantidad de detenciones realizadas (Output) | 12 |
| `ratio_resolucion` | Eficiencia operativa porcentual | 2.8% |

## Vista 16: Semáforo de Alertas Operativas
- **Estado:** ALERT.
> **🚦 Visualización:** Sistema de Semáforo con indicadores LED (Verde/Amarillo/Rojo) basado en la desviación del Z-Score operativo.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `nivel_alerta` | Estado del semáforo operativo (Rojo/Aman/Verde) | Rojo |
| `threshold_critico` | Límite superior de control estadístico | 580.4 |

## Vista 17: Carga vs Población (Densidad)
- **Tasa:** 165.5.
> **🫧 Visualización:** Gráfico de Burbujas donde el eje X es población, eje Y es frecuencia, y el tamaño es la tasa x100k hab.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `tasa_x100k` | Casos normalizados por cada 100 mil hab. | 165.5 |
| `poblacion_total` | Censo proyectado de la zona | 192,450 |
| `densidad_delictual` | Calificación cualitativa (H/M/L) | H |

## Vista 18: Violencia vs Propiedad
- **Distribución:** Predominio Convivencia.
> **⚖️ Visualización:** Gráfico de Barras Apiladas al 100% que divide el volumen total entre Delitos Violentos, Propiedad e Incivilidades.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `pct_violento` | % de delitos con fuerza o intimidación | 12.5% |
| `pct_propiedad` | % de delitos contra bienes materiales | 65.2% |
| `pct_incivilidades` | % de delitos de desorden público | 22.3% |

## Vista 19: Delitos Emergentes (Growth Rate)
- **Aceleración:** +56.5% CAGR 4s.
> **🚀 Visualización:** Gráfico de Velocidad (Spider o Lollipop Chart) resaltando los delitos con crecimiento positivo acelerado.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `delitos_emergentes` | Delitos con racha peak y crecimiento alto | [{..}] |
| `cagr_global_4s` | Tasa de crecimiento corporativa reciente | +5.6% |

## Vista 20: Éxito Sostenido (Rachas Bajas)
- **Rachas:** 3 semanas a la baja.
> **📉 Visualización:** Tabla de "Streaks" (Rachas) con marcadores de iconos que muestran la continuidad de reducción por cada tipo de delito.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `rachas_positivas` | Semanas consecutivas con tendencia a la baja | [{..}] |

## Vista 21: Velocidad de Cambio (Aceleración)
- **CAGR Global:** -5.6%.
> **📐 Visualización:** Gráfico de Vectores (Flechas) que muestran la dirección (Alza/Baja) y la magnitud de la aceleración delictual.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `cagr_global_4s` | Crecimiento compuesto del mes operativo | +5.6% |
| `factor_aceleracion` | Relación entre delta semanal y anual | 0.85 |

## Vista 22: Matriz de Prioridad de Recursos
- **Cuadrante:** Robos de Vehículos (Crítico).
> **🟦 Visualización:** Matriz de 4 Cuadrantes (Eje X: Frecuencia / Eje Y: Crecimiento) para priorización de patrullaje.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `matriz_prioridad` | Mapeo de delitos en cuadrantes Crítico -> Estable | [{..}] |
| `prioridad_score` | Puntaje para asignación táctica de recursos | 85.4 |

## Vista 23: Clasificación por Severidad (Daño Social)
- **Baja Severidad:** 76%.
> **🔻 Visualización:** Pirámide de Inversión Delictual: Severidad Extrema (Cúspide), Grave (Medio), Leve/Incivilidades (Base).
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `distribucion_severidad` | % de casos por clasificación de daño social | [{..}] |

## Vista 24: Rango y Volatilidad Operativa
- **Desviación:** 79.35 casos.
> **📉 Visualización:** Gráfico de "Box Plot" (Caja y Bigotes) mostrando la dispersión semanal y el intervalo de confianza operativo.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `desviacion_estandar` | Volatilidad histórica de la serie semanal | 79.4 |
| `rango_min` | Límite inferior del intervalo de confianza | 210 |
| `rango_max` | Límite superior del intervalo de confianza | 650 |

## Vista 25: Auditoría de Integridad y Veredicto
- **Veredicto:** Riesgo NORMAL.
> **✅ Visualización:** Dashboard de Resumen con Checkboxes de integridad y una etiqueta de "Veredicto Estratégico" destacada.
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `health_score` | Puntuación de calidad (35% STOP, 30% CEAD...) | 92.5% |
| `stop_completion` | % de integridad de la fuente operacional | 98.2% |
| `cead_completion` | % de integridad de la fuente estructural | 85.0% |
| `status_integridad` | Veredicto textual (Total/Parcial/Crítico) | Total |
