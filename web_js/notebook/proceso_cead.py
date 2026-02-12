
import pandas as pd
import json
import warnings
import numpy as np
import os
import sys
from datetime import datetime
from statsmodels.tsa.statespace.sarimax import SARIMAX

# =========================================
# 0. CONFIGURACIÓN DE PREDICCIÓN (SARIMA)
# =========================================
# Definir rango de relleno de datos faltantes
START_FILL = "2025-10-01"  # Inicio del periodo a rellenar
END_FILL = "2025-12-01"    # Fin del periodo a rellenar (incluyente)
LIMIT_DATE = "2025-09-01"  # Último mes con datos reales (Septiembre)

# Helper para cálculos de fechas
FILL_PERIODS = pd.date_range(start=START_FILL, end=END_FILL, freq='MS')
def date_to_id(dt): return dt.year * 100 + dt.month
FILL_IDS = [date_to_id(d) for d in FILL_PERIODS]

# Suppress warnings
warnings.filterwarnings('ignore')

# =========================================
# CONFIGURACION DE PROGRESO
# =========================================
try:
    from tqdm import tqdm
    USE_TQDM = True
except ImportError:
    USE_TQDM = False
    print("tqdm no instalado. Usando prints simples.")

def progress_wrapper(iterable, desc="Procesando"):
    if USE_TQDM:
        return tqdm(iterable, desc=desc)
    return iterable

# =========================================
# CONFIGURACIÓN CEAD
# =========================================
# Meses en español (orden calendario)
MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

MES_NUM = {m: i+1 for i, m in enumerate(MESES)}

# Prioridad de delitos CEAD (Descripcion cuando Nivel == 'Familia')
# Se poblará dinámicamente según datos
prioridad_delito = {}

# Función para verificar integridad
def verificar_integridad(df_actual, df_anterior, nombre_paso, debe_crecer=False):
    filas_actuales = len(df_actual)
    filas_anteriores = len(df_anterior)
    
    if debe_crecer:
        if filas_actuales <= filas_anteriores:
            print(f"❌ ERROR EN {nombre_paso}: Se esperaba aumento de filas.")
            sys.exit("Ejecución detenida.")
    else:
        if filas_actuales != filas_anteriores:
            print(f"❌ ERROR EN {nombre_paso}: Filas cambiaron inesperadamente.")
            sys.exit("Ejecución detenida.")
    
    print(f"✅ {nombre_paso}: {filas_actuales} líneas (OK)")

# =========================================
# 1. CARGA DE DATOS
# =========================================
print("=" * 60)
print("PROCESO CEAD - Datos Mensuales")
print("=" * 60)
print("\nIniciando Carga de Datos...")

# Ruta del archivo CEAD
url = r"C:\Users\limc_\Laboratorio\cead2\CEAD_FULL.csv"
if not os.path.exists(url):
    url = r"CEAD_FULL.csv"

if not os.path.exists(url):
    print(f"Error: Data file not found at {url}")
    sys.exit(1)

print("Cargando datos CEAD...")
df_raw = pd.read_csv(url,compression="xz",sep="\t")
df_raw = df_raw[df_raw["tipoValCod"] == "1,2"]

# FILTRO DE GRANULARIDAD: Usar solo códigos > 10000 para evitar duplicación por niveles (Familia/Grupo)
print("\nFiltrando por granularidad (CODIGO > 10000)...")
lineas_antes_gran = len(df_raw)
df_raw = df_raw[df_raw["CODIGO"] > 10000].copy()
print(f"   > Filas eliminadas (niveles agregados): {lineas_antes_gran - len(df_raw):,}")

print(f"   > Filas para proceso: {len(df_raw):,}")
print(f"   > Columnas: {list(df_raw.columns)}")
print(f"   > Niveles granulares disponibles: {df_raw['Nivel'].unique()}")
print(f"   > Tipos disponibles: {df_raw[['tipoValCod','tipoVal']].drop_duplicates().to_string(index=False)}")

# =========================================
# 2. EXPLORAR NIVELES Y PREPARAR DATOS
# =========================================
print("\nExplorando niveles jerárquicos...")
niveles = df_raw['Nivel'].value_counts()
print(f"   > Niveles encontrados:")
for niv, cnt in niveles.items():
    print(f"     - {niv}: {cnt:,} filas")

# Guardar copia del nivel original
df_raw['nivel_original'] = df_raw['Nivel']

# Delitos únicos por nivel
for niv in df_raw['Nivel'].unique():
    delitos_niv = sorted(df_raw[df_raw['Nivel'] == niv]['Descripcion'].unique())
    print(f"\n   > Delitos [{niv}]: {len(delitos_niv)}")
    for i, d in enumerate(delitos_niv[:15]):  # Mostrar máx 15
        print(f"     {i+1}. {d}")
    if len(delitos_niv) > 15:
        print(f"     ... y {len(delitos_niv) - 15} más")

# Construir prioridad desde Familia
delitos_familia = sorted(df_raw[df_raw['Nivel'] == 'Familia']['Descripcion'].unique())
for i, d in enumerate(delitos_familia):
    prioridad_delito[d] = i + 1

# =========================================
# 3. MELT: Convertir meses columna → filas (formato largo)
#    Incluye TODOS los niveles
# =========================================
print("\nConvirtiendo a formato largo (melt) — TODOS los niveles...")
id_vars = ['Codcom', 'Año', 'tipoValCod', 'tipoVal', 'CODIGO', 'Descripcion', 'Nivel', 'nivel_original']
df = df_raw.melt(
    id_vars=id_vars,
    value_vars=MESES,
    var_name='mes_nombre',
    value_name='frecuencia'
)

# Convertir mes nombre a número
df['mes'] = df['mes_nombre'].map(MES_NUM)
df['frecuencia'] = pd.to_numeric(df['frecuencia'], errors='coerce').fillna(0).astype(int)

# Renombrar y sanitizar nombres de delitos
df.rename(columns={
    'Codcom': 'codcom',
    'Año': 'año',
    'Descripcion': 'delito'
}, inplace=True)

# Sanitización de nombres (remover espacios extra y caracteres no deseados)
df['delito'] = df['delito'].str.strip()

# Crear id_periodo (año*100 + mes) como equivalente a id_semana
df['id_periodo'] = df['año'] * 100 + df['mes']

# Crear fecha (primer día del mes) necesaria para SARIMA
df['fecha'] = pd.to_datetime(df['año'].astype(str) + '-' + df['mes'].astype(str) + '-01', errors='coerce')
# Detalle período legible
df['periodo_detalle'] = df['mes_nombre'] + ' ' + df['año'].astype(str)

# Guardar metadatos para predicciones (Mapeo único de Delito -> Atributos)
# Usamos .drop_duplicates('delito') para asegurar que cada delito tenga una única configuración asignada
delitos_config = df[['delito', 'Nivel', 'nivel_original', 'CODIGO']].drop_duplicates('delito')

# =========================================
# 4. MOTOR DE PREDICCIÓN SARIMA (Completar Oct–Dic 2025)
# =========================================
print(f"\nIniciando Motor de Predicción SARIMA ({START_FILL} hasta {END_FILL})...")

def predecir_sarima(serie):
    """Aplica SARIMA y devuelve N pasos de predicción."""
    if len(serie) < 24: # Necesitamos al menos 2 años de historia
        # Fallback: Media de los últimos 3 meses si no hay datos para SARIMA
        last_val = serie.iloc[-3:].mean() if len(serie) >= 3 else serie.mean()
        return [max(0, round(last_val))] * len(FILL_PERIODS)
    
    try:
        model = SARIMAX(
            serie,
            order=(1, 1, 1),
            seasonal_order=(1, 1, 1, 12),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        result = model.fit(disp=False)
        forecast = result.get_forecast(steps=len(FILL_PERIODS))
        return [max(0, round(v)) for v in forecast.predicted_mean]
    except:
        return [max(0, round(serie.iloc[-1]))] * len(FILL_PERIODS)

# Filtrar datos de entrenamiento (solo hasta Septiembre 2025 y asegurar que no hay ceros espurios)
limit_id = date_to_id(pd.to_datetime(LIMIT_DATE))
df_train = df[df['id_periodo'] <= limit_id].copy()

# Agrupar por Comuna, Tipo de Valor y Delito
grupos = df_train[df_train['delito'] != 'Total'].groupby(['codcom', 'tipoValCod', 'delito'])
preds_list = []

print(f"   > Procesando {len(grupos)} series temporales...")
count = 0
for (com, tipo, delit), group in grupos:
    count += 1
    if count % 500 == 0: print(f"     - {count} series procesadas...")
    
    # Preparar serie: Agrupar por fecha por si hay duplicados en el origen, y establecer frecuencia mensual
    serie_temp = group.groupby('fecha')['frecuencia'].sum().sort_index()
    serie_temp = serie_temp.asfreq('MS').fillna(0)
    
    # IMPORTANTE: Si los últimos meses de entrenamiento son 0 y el usuario dice que el dato llega hasta Septiembre,
    # debemos confiar en el histórico real y no en los ceros placeholders.
    # Eliminamos ceros al final de la serie de entrenamiento
    serie_train = serie_temp.replace(0, np.nan).dropna()
    if serie_train.empty: serie_train = serie_temp # Si todo es cero, nada que hacer
    
    # Obtener predicciones
    vals_pred = predecir_sarima(serie_train)
    
    # Crear filas nuevas
    for i, date_f in enumerate(FILL_PERIODS):
        preds_list.append({
            'codcom': com,
            'tipoValCod': tipo,
            'delito': delit,
            'año': date_f.year,
            'mes': date_f.month,
            'id_periodo': date_to_id(date_f),
            'fecha': date_f,
            'frecuencia': vals_pred[i],
            'tipoVal': group['tipoVal'].iloc[0],
            'mes_nombre': date_f.strftime('%B').capitalize(), # Requiere locale o map, usaremos map después
            'periodo_detalle': f"{date_f.strftime('%B').capitalize()} {date_f.year}"
        })

df_preds = pd.DataFrame(preds_list)

# Unir con metadatos de niveles
df_preds = df_preds.merge(delitos_config, on='delito', how='left')

# Localización de nombres de meses en español para las predicciones
df_preds['mes_nombre'] = df_preds['mes'].map(MESES_CORTOS) # Usar el dict existente
df_preds['periodo_detalle'] = df_preds['mes_nombre'] + ' ' + df_preds['año'].astype(str)

# Concatenar predicciones al dataframe original
df = pd.concat([df_train, df_preds], ignore_index=True)

# Re-ordenar id_periodo
df = df.sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo']).reset_index(drop=True)

print(f"   > Predicciones integradas: {len(df_preds)} nuevas filas.")

# =========================================
# 5. RE-CALCULAR TOTALES (Suma de Familia post-predicción)
# =========================================
print("\nRecalculando Totales y Familias con predicciones integradas...")
# IMPORTANTE: Eliminamos los totales viejos y recalculamos todo para que las predicciones cuadren
df = df[df['delito'] != 'Total']

# Calcular Gran Total (Suma de todos los delitos granulares filtrados)
totales = df.groupby(['codcom', 'id_periodo', 'tipoValCod', 'tipoVal'], as_index=False)['frecuencia'].sum()
totales['delito'] = 'Total'
totales['CODIGO'] = 0
totales['Nivel'] = 'Total'
totales['nivel_original'] = 'Total'

# Agregar metadatos de tiempo a los totales
time_meta = df[['id_periodo', 'año', 'mes', 'fecha', 'mes_nombre', 'periodo_detalle']].drop_duplicates()
totales = totales.merge(time_meta, on='id_periodo', how='left')

df = pd.concat([df, totales], ignore_index=True)
df = df.sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo']).reset_index(drop=True)

print(f"   > Dataset final completo: {len(df):,} filas.")


# =========================================
# 5. VARIABLES BASE
# =========================================
print("\nCalculando variables base...")
df['casos_mes_actual'] = df['frecuencia']
df['casos_mes_anterior'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].shift(1)
df['delta'] = df['casos_mes_actual'] - df['casos_mes_anterior']

# =========================================
# 6. ACUMULADOS
# =========================================
print("Calculando Acumulados...")
df['acumulado_anual'] = df.groupby(['delito', 'codcom', 'tipoValCod', 'año'])['frecuencia'].cumsum()
df['acumulado_total'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].cumsum()

# Acumulado año anterior (merge por mes equivalente)
df_prev_acum = df[['delito', 'codcom', 'tipoValCod', 'año', 'mes', 'acumulado_anual']].copy()
df_prev_acum = df_prev_acum.drop_duplicates(subset=['delito', 'codcom', 'tipoValCod', 'año', 'mes'])
df_prev_acum['año'] += 1
df_prev_acum.rename(columns={'acumulado_anual': 'acumulado_anual_anterior'}, inplace=True)

df_len_before = len(df)
df = df.merge(df_prev_acum, on=['delito', 'codcom', 'tipoValCod', 'año', 'mes'], how='left')
verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Acumulado Año Anterior")

# =========================================
# 7. MEDIAS MÓVILES (3 meses y 6 meses)
# =========================================
print("Calculando Medias Móviles...")
df['media_movil_3m'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(
    lambda x: x.rolling(3, min_periods=1).mean())
df['media_movil_6m'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(
    lambda x: x.rolling(6, min_periods=1).mean())

# =========================================
# 8. HISTÓRICOS
# =========================================
print("Calculando Históricos...")
df['promedio_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(
    lambda x: x.expanding().mean())
df['std_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(
    lambda x: x.expanding().std())
df['max_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(
    lambda x: x.expanding().max())

# =========================================
# 9. ESTADÍSTICAS AÑO ANTERIOR
# =========================================
print("Calculando Stats Año Anterior...")
df['promedio_hist_anual'] = df.groupby(['delito', 'codcom', 'tipoValCod', 'año'])['frecuencia'].transform(
    lambda x: x.expanding().mean())
df['std_hist_anual'] = df.groupby(['delito', 'codcom', 'tipoValCod', 'año'])['frecuencia'].transform(
    lambda x: x.expanding().std())
df['max_hist_anual'] = df.groupby(['delito', 'codcom', 'tipoValCod', 'año'])['frecuencia'].transform(
    lambda x: x.expanding().max())

stats_prev = df[['delito', 'codcom', 'tipoValCod', 'año', 'mes',
                  'promedio_hist_anual', 'std_hist_anual', 'max_hist_anual']].copy()
stats_prev = stats_prev.drop_duplicates(subset=['delito', 'codcom', 'tipoValCod', 'año', 'mes'])
stats_prev['año'] += 1
stats_prev.rename(columns={
    'promedio_hist_anual': 'promedio_hist_anual_prev',
    'std_hist_anual': 'std_hist_anual_prev',
    'max_hist_anual': 'max_hist_anual_prev'
}, inplace=True)

df_len_before = len(df)
df = df.merge(stats_prev, on=['delito', 'codcom', 'tipoValCod', 'año', 'mes'], how='left')
verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Stats Año Anterior")

df['promedio_hist_anual'] = df['promedio_hist_anual_prev'].fillna(df['promedio_hist_anual'])
df['std_hist_anual'] = df['std_hist_anual_prev'].fillna(df['std_hist_anual'])
df['max_hist_anual'] = df['max_hist_anual_prev'].fillna(df['max_hist_anual'])
df.drop(columns=['promedio_hist_anual_prev', 'std_hist_anual_prev', 'max_hist_anual_prev'], inplace=True)

# =========================================
# 10. TENDENCIA Y RACHA
# =========================================
print("Calculando Tendencias y Rachas...")
df['tendencia_corto_plazo'] = np.where(df['delta'] > 0, 'Alza',
                               np.where(df['delta'] < 0, 'Baja', 'Estable'))

df = df.sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo'])

# Racha Alza
df['is_pos'] = df['delta'] > 0
df['block_id_pos'] = (df['is_pos'] != df['is_pos'].shift()) | \
                     (df['codcom'] != df['codcom'].shift()) | \
                     (df['delito'] != df['delito'].shift()) | \
                     (df['tipoValCod'] != df['tipoValCod'].shift())
df['block_id_pos'] = df['block_id_pos'].cumsum()
df['racha_alza'] = df.groupby('block_id_pos').cumcount() + 1
df['racha_alza'] = np.where(df['is_pos'], df['racha_alza'], 0)

# Racha Baja
df['is_neg'] = df['delta'] < 0
df['block_id_neg'] = (df['is_neg'] != df['is_neg'].shift()) | \
                     (df['codcom'] != df['codcom'].shift()) | \
                     (df['delito'] != df['delito'].shift()) | \
                     (df['tipoValCod'] != df['tipoValCod'].shift())
df['block_id_neg'] = df['block_id_neg'].cumsum()
df['racha_baja'] = df.groupby('block_id_neg').cumcount() + 1
df['racha_baja'] = np.where(df['is_neg'], df['racha_baja'], 0)

df['racha'] = np.maximum(df['racha_alza'], df['racha_baja'])
df.drop(columns=['is_pos', 'block_id_pos', 'is_neg', 'block_id_neg'], inplace=True)

# =========================================
# 11. Z-SCORE Y ALERTAS
# =========================================
print("Calculando Z-Score y Alertas...")
df['var_pct_vs_mes_anterior'] = ((df['delta'] / df['casos_mes_anterior'].replace(0, np.nan)) * 100).fillna(0)
df['z_score'] = ((df['frecuencia'] - df['promedio_hist']) / df['std_hist'].replace(0, np.nan)).fillna(0)
df['z_score_vs_año_anterior'] = ((df['frecuencia'] - df['promedio_hist_anual']) / df['std_hist_anual'].replace(0, np.nan)).fillna(0)
df['conclusion_z'] = pd.cut(df['z_score'], bins=[-np.inf, -2, 2, np.inf], labels=['Bajo', 'Normal', 'Alto'])

# =========================================
# 12. LOCALIZACIÓN
# =========================================
print("Fusionando Datos de Localización...")
try:
    localiza_path = r"D:\GitHub\LOCALIZA_DB\Localiza Chile (1).xlsx"
    localiza = pd.read_excel(localiza_path)
    localiza2 = localiza[['Provincia', 'Comuna', 'Región', 'Codcom', 'Codreg']].drop_duplicates()
    
    df_len_before = len(df)
    df = df.merge(localiza2, left_on='codcom', right_on='Codcom', how='left')
    verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Localización")
    
    # Rankings regionales
    df = df.sort_values(['Codreg', 'tipoValCod', 'delito', 'Codcom', 'id_periodo'])
    df['ranking_comunal_regional'] = df.groupby(['Codreg', 'tipoValCod', 'delito', 'id_periodo'])['frecuencia'].rank(
        method='dense', ascending=False)
    df['ranking_comunal_regional_mes_anterior'] = df.groupby(['Codreg', 'tipoValCod', 'delito', 'Codcom'])[
        'ranking_comunal_regional'].shift(1)
    
except FileNotFoundError:
    print("⚠️ Advertencia: No se encontraron archivos de localización.")
    for col in ['Provincia', 'Comuna', 'Región', 'Codreg', 'ranking_comunal_regional']:
        df[col] = None

# =========================================
# 13. POBLACIÓN
# =========================================
print("Fusionando Datos de Población...")
try:
    pob_path = r"C:\Users\limc_\Downloads\Factores Población.xlsx"
    clasePoblacion = pd.read_excel(pob_path, sheet_name="Clase Población")
    factor = pd.read_excel(pob_path, sheet_name="Factores")
    
    clasePoblacion2 = clasePoblacion[['Codcom', 'Población', 'Clase Población']].copy()
    clasePoblacion2.columns = ['Codcom', 'poblacion_clase', 'clase_poblacion']
    
    factor2 = factor[['Codcom', 'Año', 'Población', 'Factor Población']].copy()
    factor2.columns = ['Codcom', 'año', 'poblacion', 'factor_poblacion']
    
    df_len_before = len(df)
    df = df.merge(clasePoblacion2, on='Codcom', how='left').merge(factor2, on=['Codcom', 'año'], how='left')
    verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Población")
    if 'Codcom' in df.columns:
        df = df.drop(columns=['Codcom'])
    
except FileNotFoundError:
    print("⚠️ Advertencia: No se encontraron archivos de población.")
    df['poblacion'] = 100000
    df['clase_poblacion'] = 'Sin Clasificar'
    df['factor_poblacion'] = 100000

# =========================================
# 14. MÁXIMOS Y ALERTAS
# =========================================
print("Calculando Máximos Históricos...")
idx_max_hist = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].idxmax()
info_maximos = df.loc[idx_max_hist, ['delito', 'codcom', 'tipoValCod', 'id_periodo', 'periodo_detalle']].copy()
info_maximos.rename(columns={
    'id_periodo': 'id_periodo_max_hist',
    'periodo_detalle': 'periodo_detalle_max_hist'
}, inplace=True)

df_len_before = len(df)
df = df.merge(info_maximos, on=['delito', 'codcom', 'tipoValCod'], how='left')
verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Máximos Históricos")

df['alerta_aumento_critico'] = (df['z_score'] > 2) & (df['var_pct_vs_mes_anterior'] > 30)
df['alerta_vs_año_anterior'] = (df['z_score_vs_año_anterior'] > 2) & (df['frecuencia'] > df['max_hist_anual'])

# Casos mismo mes año anterior
df_prev_casos = df[['delito', 'codcom', 'tipoValCod', 'año', 'mes', 'frecuencia']].copy()
df_prev_casos['año'] += 1
df_prev_casos.rename(columns={'frecuencia': 'casos_mismo_mes_año_anterior'}, inplace=True)
df_prev_casos = df_prev_casos.drop_duplicates(subset=['delito', 'codcom', 'tipoValCod', 'año', 'mes'])
df = df.merge(df_prev_casos, on=['delito', 'codcom', 'tipoValCod', 'año', 'mes'], how='left')

# =========================================
# 15. PREPARAR DF3 FINAL
# =========================================
print("\nPreparando DataFrame Final...")
df3 = df.copy()

# Proyección Anual (extrapolación por meses transcurridos)
df3['factor_expansion_anual'] = 12.0 / df3['mes']
df3['proyeccion_anual'] = df3['acumulado_anual'] * df3['factor_expansion_anual']

# Tasas
df3['tasa_mensual'] = df3['frecuencia'] / df3['factor_poblacion']
df3['tasa_proyectada_anual'] = df3['proyeccion_anual'] / df3['factor_poblacion']

# Rankings Nacionales
df3['ranking_nacional_mensual'] = df3.groupby(['tipoValCod', 'delito', 'id_periodo'])['frecuencia'].rank(
    method='dense', ascending=False)

if 'Codreg' in df3.columns:
    df3['ranking_regional_proy_anual'] = df3.groupby(['Codreg', 'tipoValCod', 'delito', 'id_periodo'])[
        'proyeccion_anual'].rank(method='dense', ascending=False)

df3['ranking_nacional_proy_anual'] = df3.groupby(['tipoValCod', 'delito', 'id_periodo'])[
    'proyeccion_anual'].rank(method='dense', ascending=False)

if 'clase_poblacion' in df3.columns:
    df3['ranking_cluster_proy_anual'] = df3.groupby(['clase_poblacion', 'tipoValCod', 'delito', 'id_periodo'])[
        'proyeccion_anual'].rank(method='dense', ascending=False)
    df3['ranking_cluster_mensual'] = df3.groupby(['clase_poblacion', 'tipoValCod', 'delito', 'id_periodo'])[
        'frecuencia'].rank(method='dense', ascending=False)

# Rankings anteriores
print("Calculando Rankings Anteriores...")
rank_cols_to_shift = [
    'ranking_nacional_mensual',
    'ranking_regional_proy_anual',
    'ranking_nacional_proy_anual',
    'ranking_cluster_proy_anual',
    'ranking_cluster_mensual'
]

df3 = df3.sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo'])
for col in rank_cols_to_shift:
    if col in df3.columns:
        new_col = f"{col}_anterior"
        df3[new_col] = df3.groupby(['codcom', 'tipoValCod', 'delito'])[col].shift(1).fillna(0)

# Fix rank 0
rank_all = [c for c in df3.columns if 'ranking_' in c]
for col in rank_all:
    df3[col] = np.where(df3['frecuencia'] == 0, 999, df3[col])
    df3[col] = df3[col].fillna(999)

# =========================================
# 16. TARJETAS AVANZADAS
# =========================================
print("Generando Rankings y Métricas Avanzadas...")

# T19 Peor Regional (usar solo delitos individuales, NO Familia ni Total)
if 'ranking_comunal_regional' in df3.columns:
    df_delitos = df3[(df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia')].copy()
    df_delitos["prioridad_delito"] = df_delitos["delito"].map(prioridad_delito).fillna(999)
    
    df_delitos.sort_values(
        by=["codcom", "tipoValCod", "id_periodo", "ranking_comunal_regional", "prioridad_delito"],
        ascending=[True, True, True, True, True], inplace=True)
    worst_reg = df_delitos.groupby(["codcom", "tipoValCod", "id_periodo"]).first()[
        ["delito", "ranking_comunal_regional"]]
    worst_reg.rename(columns={'delito': 't19_delito', 'ranking_comunal_regional': 't19_rank'}, inplace=True)
    df3 = df3.merge(worst_reg, on=['codcom', 'tipoValCod', 'id_periodo'], how='left')
else:
    df3['t19_delito'] = None

# T20 Peor Nacional (solo delitos individuales)
df_delitos = df3[(df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia')].copy()
idx_worst_nac = df_delitos.groupby(['codcom', 'tipoValCod', 'id_periodo'])['ranking_nacional_mensual'].idxmin()
worst_nac = df3.loc[idx_worst_nac][['codcom', 'tipoValCod', 'id_periodo', 'delito', 'ranking_nacional_mensual']].copy()
worst_nac.rename(columns={'delito': 't20_delito', 'ranking_nacional_mensual': 't20_rank'}, inplace=True)
df3 = df3.merge(worst_nac, on=['codcom', 'tipoValCod', 'id_periodo'], how='left')

# Aporte Regional
if 'Codreg' in df3.columns:
    df3['casos_regional'] = df3.groupby(['Codreg', 'tipoValCod', 'delito', 'id_periodo'])['frecuencia'].transform('sum')
    df3['aporte_pct_region'] = (df3['frecuencia'] / df3['casos_regional'] * 100).fillna(0)
    df3['aporte_pct_region_ant'] = df3.groupby(['tipoValCod', 'delito', 'codcom'])['aporte_pct_region'].shift(1)

# Correlaciones
print("   > Calculando Correlaciones (Top 1 Par)...")
def calculate_top_correlation(group):
    if len(group) < 6:
        return pd.Series({'t23_d1': 'Insuf. Datos', 't23_d2': 'Insuf. Datos', 't23_val': 0.0})
    
    pivot = group.pivot(index='id_periodo', columns='delito', values='frecuencia').fillna(0)
    pivot = pivot.loc[:, (pivot != pivot.iloc[0]).any()]
    
    if pivot.shape[1] < 2:
        return pd.Series({'t23_d1': 'Sin Var', 't23_d2': 'Sin Var', 't23_val': 0.0})
    
    corr_matrix = pivot.corr()
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)
    corr_upper = corr_matrix.where(mask)
    
    try:
        max_corr_val = corr_upper.max().max()
        if pd.isna(max_corr_val):
            return pd.Series({'t23_d1': '-', 't23_d2': '-', 't23_val': 0.0})
        max_idx = corr_upper.stack().idxmax()
        d1, d2 = max_idx
        return pd.Series({'t23_d1': d1, 't23_d2': d2, 't23_val': max_corr_val})
    except:
        return pd.Series({'t23_d1': 'Error', 't23_d2': 'Error', 't23_val': 0.0})

# Solo para tipoValCod == '1,2' (Casos), excluyendo Familia (subtotales)
df_corr_base = df3[(df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia') & (df3['tipoValCod'] == '1,2')][
    ['codcom', 'id_periodo', 'delito', 'frecuencia']].copy()
top_corrs = df_corr_base.groupby('codcom').apply(calculate_top_correlation).reset_index()
df3 = df3.merge(top_corrs, on='codcom', how='left')

# Pareto (Top 3 delitos)
print("   > Calculando Pareto (Top 3 Delitos)...")
pareto_base = df3[(df3['frecuencia'] > 0) & (df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia')].sort_values(
    ['codcom', 'tipoValCod', 'id_periodo', 'frecuencia'], ascending=[True, True, True, False])
pareto_top3 = pareto_base.groupby(['codcom', 'tipoValCod', 'id_periodo']).head(3)
pareto_top3['rank'] = pareto_top3.groupby(['codcom', 'tipoValCod', 'id_periodo']).cumcount() + 1

# Usar solo filas individuales para total mensual del Pareto (sin Familia para evitar doble conteo)
week_totals = df3[(df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia')].groupby(
    ['codcom', 'tipoValCod', 'id_periodo'])['frecuencia'].sum().reset_index(name='total_mensual')
pareto_top3 = pareto_top3.merge(week_totals, on=['codcom', 'tipoValCod', 'id_periodo'], how='left')
pareto_top3['pct_contribution'] = (pareto_top3['frecuencia'] / pareto_top3['total_mensual'] * 100).fillna(0)

pivot_pareto = pareto_top3.pivot_table(
    index=['codcom', 'tipoValCod', 'id_periodo'],
    columns='rank',
    values=['delito', 'pct_contribution'],
    aggfunc='first')
pivot_pareto.columns = [f't21_delito_{c[1]}' if c[0] == 'delito' else f't21_val_{c[1]}' for c in pivot_pareto.columns]
df3 = df3.merge(pivot_pareto.reset_index(), on=['codcom', 'tipoValCod', 'id_periodo'], how='left')

# Tasas de Crecimiento
print("   > Calculando Tasas de Crecimiento...")
df3 = df3.sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo'])

# Aceleración 3M
df3['mm3m_lag3'] = df3.groupby(['codcom', 'tipoValCod', 'delito'])['media_movil_3m'].shift(3)
df3['cagr_3m'] = (np.power(
    df3['media_movil_3m'] / df3['mm3m_lag3'].replace(0, np.nan), 1/3) - 1) * 100
df3['cagr_3m'] = df3['cagr_3m'].fillna(0)

# Crecimiento YTD
df3['cagr_anual'] = ((df3['acumulado_anual'] / df3['acumulado_anual_anterior'].replace(0, np.nan)) - 1) * 100
df3['cagr_anual'] = df3['cagr_anual'].fillna(0)

# =========================================
# T22. ESTACIONALIDAD HISTÓRICA CRÍTICA
# =========================================
print("   > Calculando Estacionalidad Histórica (T22)...")

MESES_CORTOS = {1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
                7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'}
TRIMESTRES = {1: 'Enero-Marzo', 2: 'Abril-Junio', 3: 'Julio-Septiembre', 4: 'Octubre-Diciembre'}

def calc_estacionalidad(group):
    """Calcula mes y trimestre con mayor frecuencia histórica para Total."""
    # Solo usar filas de delito=='Total'
    total_rows = group[group['delito'] == 'Total']
    if total_rows.empty:
        return pd.Series({
            't22_mes_nombre': 'N/D', 't22_mes_pct': 0.0,
            't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0
        })
    
    # Sumar frecuencia por mes (histórico completo)
    por_mes = total_rows.groupby('mes')['frecuencia'].sum()
    if por_mes.empty or por_mes.sum() == 0:
        return pd.Series({
            't22_mes_nombre': 'N/D', 't22_mes_pct': 0.0,
            't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0
        })
    
    prom_mensual = por_mes.mean()
    mes_max = por_mes.idxmax()
    # Guard contra división por cero o promedios nulos
    mes_pct = ((por_mes[mes_max] - prom_mensual) / prom_mensual * 100) if prom_mensual > 0 else 0
    
    # Sumar por trimestre
    total_rows_q = total_rows.copy()
    total_rows_q['trimestre'] = ((total_rows_q['mes'] - 1) // 3) + 1
    por_trim = total_rows_q.groupby('trimestre')['frecuencia'].sum()
    prom_trim = por_trim.mean()
    if por_trim.empty or prom_trim == 0:
        return pd.Series({
            't22_mes_nombre': MESES_CORTOS.get(mes_max, str(mes_max)),
            't22_mes_pct': round(mes_pct, 1),
            't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0
        })
        
    trim_max = por_trim.idxmax()
    trim_pct = ((por_trim[trim_max] - prom_trim) / prom_trim * 100) if prom_trim > 0 else 0
    
    return pd.Series({
        't22_mes_nombre': MESES_CORTOS.get(mes_max, str(mes_max)),
        't22_mes_pct': round(mes_pct, 1),
        't22_trimestre_nombre': TRIMESTRES.get(trim_max, f'Q{trim_max}'),
        't22_trimestre_pct': round(trim_pct, 1)
    })

estacionalidad = df3.groupby(['codcom', 'tipoValCod']).apply(calc_estacionalidad).reset_index()
df3 = df3.merge(estacionalidad, on=['codcom', 'tipoValCod'], how='left')
print(f"     T22 calculado para {len(estacionalidad)} grupos codcom×tipoValCod")

# =========================================
# T24. CORRELACIÓN DE FACTORES (Largo Plazo)
# =========================================
print("   > Calculando Correlaciones Largo Plazo (T24)...")

def calc_correlacion_lp(group):
    """Top 4 pares de correlación entre delitos Familia, usando toda la historia."""
    # Solo Familia, excluyendo Total
    fam = group[(group['Nivel'] == 'Familia') & (group['delito'] != 'Total')]
    
    if fam.empty or fam['delito'].nunique() < 2:
        return pd.Series({
            't24_d1_1': '-', 't24_d1_2': '-', 't24_v1': 0.0,
            't24_d2_1': '-', 't24_d2_2': '-', 't24_v2': 0.0,
            't24_d3_1': '-', 't24_d3_2': '-', 't24_v3': 0.0,
            't24_d4_1': '-', 't24_d4_2': '-', 't24_v4': 0.0
        })
    
    # Pivot: filas = id_periodo, columnas = delito
    pivot = fam.pivot_table(index='id_periodo', columns='delito', values='frecuencia', aggfunc='sum').fillna(0)
    
    # Eliminar columnas sin varianza
    pivot = pivot.loc[:, pivot.std() > 0]
    
    if pivot.shape[1] < 2 or len(pivot) < 6:
        return pd.Series({
            't24_d1_1': 'Insuf. Datos', 't24_d1_2': '-', 't24_v1': 0.0,
            't24_d2_1': '-', 't24_d2_2': '-', 't24_v2': 0.0,
            't24_d3_1': '-', 't24_d3_2': '-', 't24_v3': 0.0,
            't24_d4_1': '-', 't24_d4_2': '-', 't24_v4': 0.0
        })
    
    corr = pivot.corr()
    # Triangular superior (evitar duplicados y diagonal)
    mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
    pairs = corr.where(mask).stack().sort_values(ascending=False)
    
    result = {}
    for i in range(4):
        if i < len(pairs):
            (d1, d2), val = pairs.index[i], pairs.iloc[i]
            # Truncar nombres largos
            d1_short = d1[:35] if len(d1) > 35 else d1
            d2_short = d2[:35] if len(d2) > 35 else d2
            result[f't24_d{i+1}_1'] = d1_short
            result[f't24_d{i+1}_2'] = d2_short
            result[f't24_v{i+1}'] = round(val, 2)
        else:
            result[f't24_d{i+1}_1'] = '-'
            result[f't24_d{i+1}_2'] = '-'
            result[f't24_v{i+1}'] = 0.0
    
    return pd.Series(result)

correlaciones_lp = df3.groupby(['codcom', 'tipoValCod']).apply(calc_correlacion_lp).reset_index()
df3 = df3.merge(correlaciones_lp, on=['codcom', 'tipoValCod'], how='left')
print(f"     T24 calculado para {len(correlaciones_lp)} grupos")

# =========================================
# 17. VALIDACIÓN
# =========================================
target_comuna = 13101
if target_comuna not in df3['codcom'].unique():
    target_comuna = df3['codcom'].unique()[0]

# Validar solo tipo Casos (1,2)
val = df3[(df3['codcom'] == target_comuna) & (df3['delito'] == 'Total') & 
          (df3['tipoValCod'] == '1,2')].sort_values('id_periodo')

if not val.empty:
    ultima = val.iloc[-1]
    print(f"\n{'='*60}")
    print(f"VALIDACIÓN COMUNA {target_comuna} - {ultima['periodo_detalle']}")
    print(f"{'='*60}")
    print(f"[T1] Casos Mes Actual: {ultima.get('frecuencia', 0)}")
    print(f"[T2] Mismo Mes Año Ant: {ultima.get('casos_mismo_mes_año_anterior', 0)}")
    print(f"[T3] Acumulado Anual: {ultima.get('acumulado_anual', 0)}")
    print(f"[T4] Proyección Anual: {ultima.get('proyeccion_anual', 0):.0f}")
    print(f"[T5] Media Móvil 3M: {ultima.get('media_movil_3m', 0):.1f}")
    print(f"[T6] Z-Score: {ultima.get('z_score', 0):.2f}")
    print(f"[T7] Max Histórico: {ultima.get('max_hist', 0):.0f} ({ultima.get('periodo_detalle_max_hist', '-')})")
    print(f"[T8] Racha: {ultima.get('racha', 0)} ({ultima.get('tendencia_corto_plazo', '-')})")

# =========================================
# OUTPUT
# =========================================
print("\n" + "=" * 60)
print("Generando archivos de salida...")
output_dir = r"D:\GitHub\STOP_WEB3\web_js\data\cead_split"
os.makedirs(output_dir, exist_ok=True)

unique_comunas = df3["codcom"].unique()
for i in progress_wrapper(unique_comunas, desc="Guardando Comunas CEAD"):
    aux = df3[df3["codcom"] == i]
    aux.to_json(fr'{output_dir}/{i}', orient='records', compression='gzip', date_format='iso')

print(f"\nTotal Columnas: {len(df3.columns)}")
print(f"Total Filas: {len(df3):,}")
print(f"Comunas procesadas: {len(unique_comunas)}")
print(f"Archivos guardados en: {output_dir}")
print("Proceso CEAD Finalizado Exitosamente. ✅")
