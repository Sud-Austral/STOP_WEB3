# Documentación de Datos - STOP WEB3
## Sistema de Tablero Operacional de Seguridad Pública

---

# PARTE I: GLOSARIO DE INDICADORES
*Guía para analistas y tomadores de decisión*

---

## 1. Indicadores Básicos

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Casos Semana Actual** | Cantidad de delitos ocurridos en los últimos 7 días | Monitorear la carga delictual inmediata |
| **Casos Semana Anterior** | Delitos de la semana pasada | Comparar si subimos o bajamos |
| **Variación Absoluta** | Diferencia numérica entre esta semana y la anterior | Ver cuántos casos más o menos hay |
| **Variación Porcentual** | Cambio expresado en porcentaje | Entender la magnitud del cambio en contexto |

---

## 2. Acumulados y Trayectoria

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Acumulado Año Actual** | Total de casos desde el 1 de enero hasta hoy | Medir el avance del año en curso |
| **Acumulado Año Anterior** | Casos que había a esta misma altura el año pasado | Saber si vamos mejor o peor que el año pasado |
| **Proyección Anual** | Estimación de cuántos casos habrá al 31 de diciembre | Anticipar el cierre del año |
| **Proyección Mensual** | Estimación de casos para fin de mes | Planificar recursos a corto plazo |

---

## 3. Promedios y Tendencias

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Promedio Histórico** | Cantidad típica de casos por semana desde el inicio de los datos | Saber cuál es lo "normal" para la zona |
| **Media Móvil (4 semanas)** | Promedio de las últimas 4 semanas | Suavizar fluctuaciones y ver tendencia real |
| **Tendencia Corto Plazo** | Indica si hay "Alza", "Baja" o está "Estable" | Identificar rápidamente la dirección |
| **Racha** | Semanas consecutivas subiendo | Detectar patrones sostenidos de aumento |

---

## 4. Tasas por 100.000 Habitantes

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Tasa Semanal** | Casos de esta semana ajustados por población | Comparar comunas de distinto tamaño |
| **Tasa Proyectada Anual** | Proyección de tasa al cierre del año | Anticipar la intensidad delictual relativa |
| **Tasa Regional** | Promedio de la tasa en toda la región | Saber cómo está la comuna vs. sus vecinos |
| **Tasa Nacional** | Promedio de la tasa en todo el país | Posicionar a la comuna en el contexto país |

> **¿Por qué usar tasas?** Porque 100 delitos en una comuna de 10.000 habitantes es muy distinto a 100 delitos en una de 500.000. La tasa nivela esta diferencia.

---

## 5. Rankings y Posicionamiento

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Ranking Regional** | Posición de la comuna entre las de su región | Saber si somos un "punto caliente" regional |
| **Ranking Nacional** | Posición entre todas las comunas del país | Entender la situación a nivel país |
| **Ranking por Clúster** | Posición entre comunas de población similar | Comparar con pares (ej: solo comunas rurales) |
| **Variación de Ranking** | Si subimos o bajamos posiciones | Detectar mejoras o empeoramientos relativos |

> **Rank 1 = Más delitos = Peor posición**  
> **Rank alto = Menos delitos = Mejor posición**
>
> **Mejorar en el ranking** = Subir número (ej: de 4° a 5°) → menos delitos relativos  
> **Empeorar en el ranking** = Bajar número (ej: de 6° a 1°) → más delitos relativos

---

## 6. Alertas y Anomalías

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Z-Score** | Qué tan lejos estamos del promedio en términos estadísticos | Detectar si esta semana es anormal |
| **Conclusión Z** | Clasifica como "Bajo", "Normal" o "Alto" | Semáforo simple de alerta |
| **Alerta Aumento Crítico** | Se activa cuando hay subida explosiva + anomalía estadística | Priorizar atención inmediata |
| **Máximo Histórico** | Récord de casos en una semana | Saber el peor escenario registrado |

> **Z-Score > 2** = Situación estadísticamente anormal (revisar urgente)

---

## 7. Contexto Geográfico

| Indicador | ¿Qué significa? |
|:---|:---|
| **Comuna** | Nombre de la comuna analizada |
| **Región** | Región a la que pertenece |
| **Población** | Habitantes de la comuna |
| **Clase Poblacional** | Categoría según tamaño (ej: "Mediana", "Grande") |

---

## 8. Aporte y Concentración

| Indicador | ¿Qué significa? | ¿Para qué sirve? |
|:---|:---|:---|
| **Aporte % Regional** | Qué porcentaje de los delitos de la región aporta esta comuna | Ver el peso relativo en la región |
| **Share Delictual** | Qué porcentaje representa este tipo de delito del total comunal | Identificar el delito predominante |

---

## 9. Interpretación de Conclusiones

| Conclusión | Color | Significado |
|:---|:---:|:---|
| **Aumento** | Rojo | Subieron los casos vs. comparador |
| **Disminución** | Verde | Bajaron los casos vs. comparador |
| **Estable** | Gris | Sin cambios significativos |
| **Mejor que Región/País** | Verde | La comuna tiene menos delitos relativos que el promedio |
| **Peor que Región/País** | Rojo | La comuna tiene más delitos relativos que el promedio |

---

## 10. Temporalidad de los Datos

| Término | Significado |
|:---|:---|
| **Semana Actual** | Los últimos 7 días cerrados |
| **Semana Anterior** | Los 7 días previos a la semana actual |
| **Misma Semana Año Anterior** | La semana equivalente del año pasado |
| **Año a la Fecha (YTD)** | Desde el 1 de enero hasta la última semana cerrada |

---

## 11. Preguntas Frecuentes

**¿Por qué mi comuna tiene tasa alta pero pocos casos?**
> Porque la población es pequeña. 10 delitos en 5.000 habitantes = tasa de 200. 10 delitos en 500.000 habitantes = tasa de 2.

**¿Qué es más importante, el ranking o la tasa?**
> Depende del objetivo. La **tasa** mide intensidad real. El **ranking** mide posición relativa. Ambos son complementarios.

**¿Cada cuánto se actualizan los datos?**
> Semanalmente, al cierre de cada semana epidemiológica.

**¿Qué hago si aparece una alerta roja?**
> Revisar el contexto: ¿es un evento puntual o una tendencia? Consultar las tarjetas de tendencia y media móvil para confirmar.

---

\newpage

# PARTE II: DICCIONARIO TÉCNICO DE COLUMNAS
*Referencia para desarrolladores y analistas de datos*

---

## 1. Identificadores y Tiempo

| Columna | Descripción | Ejemplo |
|:---|:---|:---|
| `codcom` | Código único de la comuna (numérico) | `13101` |
| `delito` | Nombre estandarizado del delito o "Total" | `ROBO CON VIOLENCIA` |
| `id_semana` | ID correlativo único de la semana | `152` |
| `semana_detalle` | Texto descriptivo de la semana | `SEMANA 03/2026 (del 13/01/2026 al 19/01/2026)` |
| `fecha` | Fecha de inicio de la semana (ISO 8601) | `2026-01-13` |
| `año` | Año calendario | `2026` |
| `mes` | Mes del año (1-12) | `1` |
| `semana_numero` | Número de semana del año (1-53) | `3` |

---

## 2. Métricas Base

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `frecuencia` | Conteo de casos en la semana | Columna original del CSV |
| `casos_semana_actual` | Alias de frecuencia | `= frecuencia` |
| `casos_semana_anterior` | Casos semana anterior | `groupby(['delito','codcom']).shift(1)` |
| `delta` | Variación absoluta | `= casos_actual - casos_anterior` |
| `var_pct_vs_semana_anterior` | Variación porcentual | `= (delta / casos_anterior) * 100` |
| `tendencia_corto_plazo` | Texto descriptivo | `"Alza"` / `"Baja"` / `"Estable"` |

---

## 3. Acumulados

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `acumulado_anual` | Suma de casos año actual a la fecha | `groupby(['delito','codcom','año']).cumsum()` |
| `acumulado_total` | Suma histórica total | `groupby(['delito','codcom']).cumsum()` |
| `acumulado_anual_anterior` | Acumulado año anterior misma semana | Merge con año+1 |
| `casos_misma_semana_año_anterior` | Casos semana equivalente año previo | Merge con año+1 |

---

## 4. Estadísticas Históricas (Expanding)

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `promedio_hist` | Promedio histórico progresivo | `groupby().transform(lambda x: x.expanding().mean())` |
| `std_hist` | Desviación estándar histórica | `groupby().transform(lambda x: x.expanding().std())` |
| `max_hist` | Máximo histórico progresivo | `groupby().transform(lambda x: x.expanding().max())` |
| `promedio_diario_historico` | Promedio diario histórico | `= promedio_hist / 7` |

> **Nota**: Se usa `transform()` para asegurar alineamiento correcto de índices.

---

## 5. Medias Móviles (Rolling)

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `media_movil_4s` | Media móvil 4 semanas | `groupby().transform(lambda x: x.rolling(4, min_periods=1).mean())` |
| `media_movil_8s` | Media móvil 8 semanas | `groupby().transform(lambda x: x.rolling(8, min_periods=1).mean())` |
| `proyeccion_mes_actual` | Estimación cierre mes | `= media_movil_4s * 4.33` |
| `promedio_diario_semanal` | Promedio diario actual | `= frecuencia / 7` |

---

## 6. Proyecciones y Tasas

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `proyeccion_anual` | Estimación cierre anual | `= (acumulado_anual / semana_numero) * 52` |
| `tasa_semanal` | Tasa x100k hab semanal | `= (frecuencia / poblacion) * 100000` |
| `tasa_proyectada_anual` | Tasa proyectada cierre año | `= (proyeccion_anual / poblacion) * 100000` |
| `tasa_proyectada_nacional` | Tasa Nacional proyectada | `= Sum(proy_pais) / Sum(pob_pais) * 100000` |
| `tasa_semanal_nacional` | Tasa Nacional actual | `= Sum(frec_pais) / Sum(pob_pais) * 100000` |
| `tasa_proyectada_regional` | Tasa Regional proyectada | `= Sum(proy_region) / Sum(pob_region) * 100000` |
| `tasa_semanal_regional` | Tasa Regional actual | `= Sum(frec_region) / Sum(pob_region) * 100000` |
| `aporte_pct_region` | % comunal de la región | `= (frecuencia / Sum(frec_region)) * 100` |

---

## 7. Comparativas Año Anterior

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `promedio_hist_anual` | Promedio histórico del año anterior | Merge con año+1 de stats anuales |
| `std_hist_anual` | Desviación estándar año anterior | Merge con año+1 |
| `max_hist_anual` | Máximo histórico año anterior | Merge con año+1 |
| `z_score_vs_año_anterior` | Z-Score vs año pasado | `= (frecuencia - prom_hist_anual) / std_hist_anual` |

---

## 8. Z-Score y Alertas

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `z_score` | Puntaje Z (desviación estándar) | `= (frecuencia - promedio_hist) / std_hist` |
| `conclusion_z` | Clasificación | `pd.cut(z_score, [-inf, -2, 2, inf], ['Bajo', 'Normal', 'Alto'])` |
| `racha` | Semanas consecutivas en alza | Cuenta delta > 0 consecutivos |
| `alerta_aumento_critico` | Alerta de aumento explosivo | `(z_score > 2) & (var_pct > 30)` |
| `alerta_vs_año_anterior` | Alerta vs año pasado | `(z_score_ant > 2) & (frec > max_hist_anual)` |
| `id_semana_max_hist` | ID de semana con máximo | Semana donde ocurrió el récord |

---

## 9. Rankings

| Columna | Descripción | Agrupación |
|:---|:---|:---|
| `ranking_comunal_regional` | Posición regional (casos) | `(Codreg, delito, id_semana)` |
| `ranking_comunal_regional_semana_anterior` | Posición semana pasada | `shift(1)` |
| `ranking_regional_proy_anual` | Posición regional (proyección) | `(Codreg, delito, id_semana)` |
| `ranking_nacional_semanal` | Posición nacional (casos) | `(delito, id_semana)` |
| `ranking_nacional_proy_anual` | Posición nacional (proyección) | `(delito, id_semana)` |
| `ranking_cluster_semanal` | Posición en clúster (casos) | `(clase_poblacion, delito, id_semana)` |
| `ranking_cluster_proy_anual` | Posición en clúster (proyección) | `(clase_poblacion, delito, id_semana)` |

---

## 10. Datos Geográficos y Demográficos

| Columna | Descripción | Origen |
|:---|:---|:---|
| `Comuna` | Nombre de la comuna | Excel: Localiza Chile |
| `Provincia` | Nombre de la provincia | Excel: Localiza Chile |
| `Región` | Nombre de la región | Excel: Localiza Chile |
| `Codreg` | Código de región | Excel: Localiza Chile |
| `poblacion` | Habitantes de la comuna | Excel: Factores Población |
| `clase_poblacion` | Segmento poblacional | Excel: Factores Población |
| `facor_poblacion` | Factor de ajuste poblacional | Excel: Factores Población |

---

## 11. Concentración Delictual

| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `share_delito_semanal` | % del delito sobre total comunal | `= (frecuencia / Sum(frec_comuna)) * 100` |
| `casos_semana_regional` | Total casos de la región | `groupby(Codreg, delito, id_semana).sum()` |

---

## 12. Información del Archivo

| Atributo | Valor |
|:---|:---|
| **Archivo Global** | `data/data3.json.gz` |
| **Archivos por Comuna** | `data/stop/{codcom}` |
| **Formato** | JSON Records comprimido (GZIP) |
| **Generado por** | `notebook/Intento_ia.ipynb` |
| **Total columnas** | 86 |
| **Frecuencia actualización** | Semanal |

---

## 13. Cambios Técnicos Importantes

### Corrección de Cálculos de Ventana (v2.0)

Se corrigió el cálculo de columnas `rolling()` y `expanding()` usando `transform()` en lugar de asignación directa con `reset_index()`.

**Antes (problemático):**
```python
g = df.groupby(['delito', 'codcom'])
df['promedio_hist'] = g['frecuencia'].expanding().mean().reset_index(level=[0,1], drop=True)
```

**Después (correcto):**
```python
df['promedio_hist'] = df.groupby(['delito', 'codcom'])['frecuencia'].transform(
    lambda x: x.expanding().mean()
)
```

**Razón:** El método `reset_index()` puede desalinear los índices cuando el DataFrame no está ordenado consecutivamente, causando que los valores se asignen a filas incorrectas.

### Nuevas Métricas Avanzadas y Diagnósticos (v3.0)
Se han integrado las tarjetas complejas (T19 a T25) que agregan las siguientes columnas:

#### Diagnósticos Críticos (T19, T20)
| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `t19_delito_sem` | Delito con peor ranking regional | `idxmin(ranking_comunal_regional)` |
| `t19_rank_sem` | Posición del peor ranking | Valor del ranking mínimo |
| `t19_delito_ant` | Peor delito semana anterior | `shift(1)` |
| `t19_rank_ant` | Posición semana anterior | `shift(1)` |
| `t20_delito_sem` | Delito con peor ranking nacional | `idxmin(ranking_nacional_semanal)` |
| `t20_rank_sem` | Posición del peor ranking nacional | Valor del ranking |

#### Concentración de Pareto (T21)
| Columna | Descripción |
|:---|:---|
| `t21_delito_1` | Delito #1 con más casos |
| `t21_val_1` | % del total que representa el delito 1 |
| `t21_delito_2` | Delito #2 |
| `t21_val_2` | % delito 2 |
| `t21_delito_3` | Delito #3 |
| `t21_val_3` | % delito 3 |

#### Correlación (T23)
| Columna | Descripción | Detalles |
|:---|:---|:---|
| `t23_d1` | Primer delito del par | Del par con mayor correlación (Pearson) |
| `t23_d2` | Segundo delito del par | Calculado sobre las últimas 53 semanas |
| `t23_val` | Coeficiente de Correlación | Valor entre 0 y 1 (absoluto) |

#### Aporte Regional (T25)
| Columna | Descripción | Fórmula |
|:---|:---|:---|
| `casos_semana_regional` | Total casos en la región | Suma por Codreg |
| `aporte_pct_region` | % Aporte Comunal | `(casos_comuna / casos_regional) * 100` |
| `aporte_pct_region_ant` | % Aporte semana anterior | `shift(1)` |
| `casos_semana_regional_ant` | Total regional semana anterior | `shift(1)` |

---

*Documento generado para STOP WEB3 - Dashboard de Seguridad Comunal*
*Fecha de actualización: Febrero 2026*
