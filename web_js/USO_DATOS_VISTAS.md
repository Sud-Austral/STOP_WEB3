# Documentación de Uso de Datos en Vistas STOP

Esta tabla detalla qué fuentes de datos (`STATE_DATA`) utiliza cada vista del sistema STOP.
- `allDataHistory`: Contiene registros individuales por delito (excluyendo el Total).
- `allDataHistory_total`: Contiene exclusivamente los registros pre-calculados del delito "Total".

| Vista | Archivo | Usa `allDataHistory` (Detalle) | Usa `allDataHistory_total` (Totales) | Gráficos y Usos Específicos |
|-------|---------|--------------------------------|--------------------------------------|-----------------------------|
| **Vista 1** | `vista1.html` | ✅ Sí | ✅ Sí | **Total**: KPIs de Cabecera, Gráfico "Evolución Semanal" (Línea de casos y Tendencia).<br>**Detalle**: Gráfico "Distribución" (Doughnut Top 5), Cálculo de Riesgo Ponderado. |
| **Vista 2** | `vista2.html` | ✅ Sí | ✅ Sí | **Total**: KPIs numéricos (Casos, Var%), Gráfico "Comparativa de Indicadores Clave"<br>**Detalle**: Cálculo del Estado (Semáforo) basado en promedio de Z-Scores individuales. |
| **Vista 3** | `vista3.html` | ✅ Sí | ✅ Sí | **Total**: Gráfico de Tendencia (Línea principal).<br>**Detalle**: Otros gráficos de composición o distribución (si existen). |
| **Vista 4** | `vista4.html` | ✅ Sí | ✅ Sí | **Total**: Cálculo del total de casos para determinar tamaño relativo de burbujas.<br>**Detalle**: Gráfico "Matriz de Gravedad" (Scatter Plot, cada punto es un delito). |
| **Vista 5** | `vista5.html` | ✅ Sí | ❌ No | Tabla de desglose por categoría delictual. |
| **Vista 6** | `vista6.html` | ✅ Sí | ❌ No | Tabla completa de datos brutos. |
| **Vista 7** | `vista7.html` | ✅ Sí | ✅ Sí | **Total**: Gráfico "Tendencias a Largo Plazo" (Regresión Anual).<br>**Detalle**: Extracción de lista de años disponibles. |
| **Vista 8** | `vista8.html` | ✅ Sí | ❌ No | Mapas de calor o análisis geográfico (si aplica). |
| **Vista 10** | `vista10.html` | ✅ Sí | ✅ Sí | **Total**: Gráfico de Pronóstico (Regresión Lineal sobre totales).<br>**Detalle**: Extracción de metadatos de semanas. |
| **Vista 11** | `vista11.html` | ✅ Sí | ✅ Sí | **Total**: Cálculo de Tasa Base para el Simulador de Impacto. |
| **Vista 12** | `vista12.html` | ✅ Sí | ✅ Sí | **Total**: Gráfico de Proyección de Peaks (Detección de ciclos en totales). |
| **Vista 15** | `vista15.html` | ✅ Sí | ✅ Sí | **Total**: KPIs (Casos Actuales, Año Ant, Tendencia).<br>**Detalle**: Tarjeta "Concentración Top 3", Slider "Puntaje Z" (Riesgo delictual). |
| **Vista 16** | `vista16.html` | ✅ Sí | ✅ Sí | **Total**: KPI Tasa de Delitos Global.<br>**Detalle**: Gráfico y lista de delitos específicos para PDF. |
| **Vista 20** | `vista20.html` | ✅ Sí | ✅ Sí | **Total**: KPI "Presión Delictual", Gráfico "Evolución de Tasa".<br>**Detalle**: Gráfico "Matriz de Riesgo" (Ranking vs Persistencia), Lista de Alertas Críticas. |
| **Vista 42** | `vista42.html` | ✅ Sí | ✅ Sí | **Total**: Cálculo de Tendencia Táctica (Últimas 4 semanas STOP).<br>**Detalle**: Metadatos de fechas STOP. (Nota: Usa principalmente datos CEAD para estrategia). |
| **Vistas CEAD** | `vista21` - `vista40` | ❌ No | ❌ No | Utilizan `STATE_DATA_CEAD.allDataHistory` independiente del flujo STOP. |

*Generado automáticamente tras la refactorización de separación de datos (Total vs Detalle).*
