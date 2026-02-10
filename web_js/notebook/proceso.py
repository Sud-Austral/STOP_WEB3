
import pandas as pd
import json
import warnings
import numpy as np
import os
import sys

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

# Configuration

prioridad_delito = {
    "HOMICIDIOS Y FEMICIDIOS": 1,
    "VIOLACIONES Y DELITOS SEXUALES": 2,
    "ROBOS CON VIOLENCIA E INTIMIDACIÓN": 3,
    "ROBOS EN LUGARES HABITADOS Y NO HABITADOS": 4,
    "ROBOS POR SORPRESA": 5,
    "ROBOS DE VEHÍCULOS Y SUS ACCESORIOS": 6,
    "DELITOS EN CONTEXTO DE VIOLENCIA INTRAFAMILIAR": 7,
    "AMENAZAS CON ARMAS": 8,
    "LESIONES GRAVES": 9,
    "LESIONES MENOS GRAVES": 10,
    "LESIONES LEVES": 11,
    "LEY DE CONTROL DE ARMAS": 12,
    "LEY DE DROGAS": 13,
    "OTROS ROBOS CON FUERZA EN LAS COSAS": 14,
    "DAÑOS": 15,
    "HURTOS": 16,
    "AMENAZAS Y RIÑAS": 17,
    "RECEPTACIÓN": 18,
    "INCIVILIDADES": 19,
    "CONSUMO DE ALCOHOL Y DE DROGAS EN LA VÍA PÚBLICA": 20,
    "OTROS DESÓRDENES PÚBLICOS": 21
}

# =========================================
# 1. CARGA DE DATOS
# =========================================
print("Iniciando Carga de Datos...")
# Adjust path relative to script location or use absolute path
# Assuming script runs from web_js root or notebook folder
url = r"../estadistica_stop/ESTADISTICA_DELITO.csv" 
# Use absolute path if run from random location, or ensure relative structure
if not os.path.exists(url):
    # Try alternate location if running from web_js
    url = r"estadistica_stop/ESTADISTICA_DELITO.csv" 

if not os.path.exists(url):
    print(f"Error: Data file not found at {url}")
    # For robust script generation, maybe allow passing path as arg?
    # Keeping it simple for now as requested "exactly the same"
    sys.exit(1)

print("Cargando datos...")
df = pd.read_csv(url)
delito_min = pd.read_excel(r"C:\Users\limc_\Laboratorio\web_stop\delito_min.xlsx")
delito_min.columns = ["delito","delito_min"]
dict_delito = dict(zip(delito_min["delito"],delito_min["delito_min"]))
df["delito"] = df["delito"].map(dict_delito)
#df  = df[df["codcom"] == 13101]

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
# 2. CALCULAR TOTALES
# =========================================
print("Calculando Totales...")
lineas_inicio = len(df)
totales = df.groupby(['codcom', 'id_semana'], as_index=False)['frecuencia'].sum()
totales['delito'] = 'Total'

dim_tiempo = df[['id_semana', 'semana_detalle', 'fecha']].drop_duplicates()
totales = totales.merge(dim_tiempo, on='id_semana', how='left')
totales = totales.reindex(columns=df.columns, fill_value=np.nan)

df = pd.concat([df, totales], ignore_index=True)
verificar_integridad(df, pd.DataFrame(index=range(lineas_inicio)), "Concatenar Totales", debe_crecer=True)

# =========================================
# 3. PREPARACIÓN TEMPORAL
# =========================================
print("Preparando Variables Temporales...")
df['fecha'] = pd.to_datetime(df['fecha'], errors='coerce')
df['año'] = df['fecha'].dt.year
df['mes'] = df['fecha'].dt.month
df['semana_numero'] = df['semana_detalle'].astype(str).str.extract(r'(\d{1,2})').astype(float)
# CRITICAL: Sort explicitly before any temporal calculation
df = df.sort_values(['codcom', 'delito', 'id_semana']).reset_index(drop=True)

# =========================================
# 4. VARIABLES BASE
# =========================================
df['casos_semana_actual'] = df['frecuencia']
df['casos_semana_anterior'] = df.groupby(['delito', 'codcom'])['frecuencia'].shift(1)
df['delta'] = df['casos_semana_actual'] - df['casos_semana_anterior']

# =========================================
# 5. ACUMULADOS
# =========================================
print("Calculando Acumulados...")
df['acumulado_anual'] = df.groupby(['delito', 'codcom', 'año'])['frecuencia'].cumsum()
df['acumulado_total'] = df.groupby(['delito', 'codcom'])['frecuencia'].cumsum()

# Acumulado año anterior
df_prev_acum = df[['delito','codcom','año','semana_numero','acumulado_anual']].copy()
df_prev_acum = df_prev_acum.drop_duplicates(subset=['delito','codcom','año','semana_numero'])
df_prev_acum['año'] += 1
df_prev_acum.rename(columns={'acumulado_anual':'acumulado_anual_anterior'}, inplace=True)

df_len_before = len(df)
df = df.merge(df_prev_acum, on=['delito','codcom','año','semana_numero'], how='left')
verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Acumulado Año Anterior")

# =========================================
# 6. MEDIAS MÓVILES
# =========================================
print("Calculando Medias Móviles...")
df['media_movil_4s'] = df.groupby(['delito','codcom'])['frecuencia'].transform(lambda x: x.rolling(4, min_periods=1).mean())
df['media_movil_8s'] = df.groupby(['delito','codcom'])['frecuencia'].transform(lambda x: x.rolling(8, min_periods=1).mean())

# =========================================
# 7. HISTÓRICOS
# =========================================
print("Calculando Históricos...")
df['promedio_hist'] = df.groupby(['delito','codcom'])['frecuencia'].transform(lambda x: x.expanding().mean())
df['std_hist'] = df.groupby(['delito','codcom'])['frecuencia'].transform(lambda x: x.expanding().std())
df['max_hist'] = df.groupby(['delito','codcom'])['frecuencia'].transform(lambda x: x.expanding().max())

# =========================================
# 8. ESTADÍSTICAS AÑO ANTERIOR
# =========================================
print("Calculando Stats Año Anterior...")
df['promedio_hist_anual'] = df.groupby(['delito','codcom','año'])['frecuencia'].transform(lambda x: x.expanding().mean())
df['std_hist_anual'] = df.groupby(['delito','codcom','año'])['frecuencia'].transform(lambda x: x.expanding().std())
df['max_hist_anual'] = df.groupby(['delito','codcom','año'])['frecuencia'].transform(lambda x: x.expanding().max())

stats_prev = df[['delito','codcom','año','semana_numero','promedio_hist_anual','std_hist_anual','max_hist_anual']].copy()
stats_prev = stats_prev.drop_duplicates(subset=['delito','codcom','año','semana_numero'])
stats_prev['año'] += 1
stats_prev.rename(columns={'promedio_hist_anual':'promedio_hist_anual_prev','std_hist_anual':'std_hist_anual_prev','max_hist_anual':'max_hist_anual_prev'}, inplace=True)

df_len_before = len(df)
df = df.merge(stats_prev, on=['delito','codcom','año','semana_numero'], how='left')
verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Stats Año Anterior")

df['promedio_hist_anual'] = df['promedio_hist_anual_prev'].fillna(df['promedio_hist_anual'])
df['std_hist_anual'] = df['std_hist_anual_prev'].fillna(df['std_hist_anual'])
df['max_hist_anual'] = df['max_hist_anual_prev'].fillna(df['max_hist_anual'])
df.drop(columns=['promedio_hist_anual_prev','std_hist_anual_prev','max_hist_anual_prev'], inplace=True)

# =========================================
# 9. TENDENCIA Y RACHA
# =========================================
print("Calculando Tendencias y Rachas...")
df['tendencia_corto_plazo'] = np.where(df['delta'] > 0, 'Alza', np.where(df['delta'] < 0, 'Baja', 'Estable'))

# Logic for robust consecutive streak calculation (Alza and Baja) per group
df = df.sort_values(['codcom', 'delito', 'id_semana'])
g = df.groupby(['codcom', 'delito'])

# Racha Alza (Delta > 0)
df['is_pos'] = df['delta'] > 0
# Identify blocks where 'is_pos' value changes OR we enter a new group
# We use cumsum of these 'change events' to create unique IDs for each contiguous block of True/False per group
df['block_id_pos'] = (df['is_pos'] != df['is_pos'].shift()) | (df['codcom'] != df['codcom'].shift()) | (df['delito'] != df['delito'].shift())
df['block_id_pos'] = df['block_id_pos'].cumsum()
# Count size of each block
df['racha_alza'] = df.groupby('block_id_pos').cumcount() + 1
# Filter: only keep counts where is_pos is True
df['racha_alza'] = np.where(df['is_pos'], df['racha_alza'], 0)

# Racha Baja (Delta < 0)
df['is_neg'] = df['delta'] < 0
df['block_id_neg'] = (df['is_neg'] != df['is_neg'].shift()) | (df['codcom'] != df['codcom'].shift()) | (df['delito'] != df['delito'].shift())
df['block_id_neg'] = df['block_id_neg'].cumsum()
df['racha_baja'] = df.groupby('block_id_neg').cumcount() + 1
df['racha_baja'] = np.where(df['is_neg'], df['racha_baja'], 0)

# Combined 'racha' column for simplified backward compatibility (Magnitude of current trend)
df['racha'] = np.maximum(df['racha_alza'], df['racha_baja'])

# Clean temp cols
df.drop(columns=['is_pos', 'block_id_pos', 'is_neg', 'block_id_neg'], inplace=True)

# =========================================
# 10. MÉTRICAS AVANZADAS (Z-Score)
# =========================================
print("Calculando Z-Score y Alertas...")
df['var_pct_vs_semana_anterior'] = ((df['delta'] / df['casos_semana_anterior'].replace(0, np.nan)) * 100).fillna(0)
df['z_score'] = ((df['frecuencia'] - df['promedio_hist']) / df['std_hist'].replace(0, np.nan)).fillna(0)
df['z_score_vs_año_anterior'] = ((df['frecuencia'] - df['promedio_hist_anual']) / df['std_hist_anual'].replace(0, np.nan)).fillna(0)
df['conclusion_z'] = pd.cut(df['z_score'], bins=[-np.inf, -2, 2, np.inf], labels=['Bajo', 'Normal', 'Alto'])

# =========================================
# 11. LOCALIZACIÓN
# =========================================
print("Fusionando Datos de Localización...")
try:
    # Adjust path as needed
    localiza_path = r"D:\GitHub\LOCALIZA_DB\Localiza Chile (1).xlsx"
    localiza = pd.read_excel(localiza_path)
    localiza2 = localiza[['Provincia', 'Comuna', 'Región', 'Codcom', 'Codreg']].drop_duplicates()
    
    df_len_before = len(df)
    df = df.merge(localiza2, left_on='codcom', right_on='Codcom', how='left')
    verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Localización")
    
    # Rankings
    df = df.sort_values(['Codreg', 'delito', 'Codcom', 'id_semana'])
    df['ranking_comunal_regional'] = df.groupby(['Codreg', 'delito', 'id_semana'])['frecuencia'].rank(method='dense', ascending=False)
    df['ranking_comunal_regional_semana_anterior'] = df.groupby(['Codreg', 'delito', 'Codcom'])['ranking_comunal_regional'].shift(1)
    
except FileNotFoundError:
    print("⚠️ Advertencia: No se encontraron archivos de localización.")
    # Create empty columns to avoid crash
    for col in ['Provincia', 'Comuna', 'Región', 'Codreg', 'ranking_comunal_regional']:
        df[col] = None

# Fix rank 0
# Fix rank 0 for ALL ranking columns
rank_cols = [
    'ranking_comunal_regional',
    'ranking_comunal_regional_semana_anterior',
    'ranking_nacional_semanal',
    'ranking_regional_proy_anual', 
    'ranking_nacional_proy_anual',
    'ranking_cluster_proy_anual',
    'ranking_cluster_semanal'
]

for col in rank_cols:
    if col in df.columns:
         # Apply 999 logic if frequency is 0 (or populate missing)
         df[col] = np.where(df['frecuencia'] == 0, 999, df[col])
         df[col] = df[col].fillna(999)

# =========================================
# 12. POBLACIÓN
# =========================================
print("Fusionando Datos de Población...")
try:
    # Adjust path as needed
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
    if 'Codcom' in df.columns: df = df.drop(columns=['Codcom'])
    
except FileNotFoundError:
    print("⚠️ Advertencia: No se encontraron archivos de población.")
    df['poblacion'] = 100000 # Default
    df['clase_poblacion'] = 'Sin Clasificar'
    # Init empty rankings to avoid subsequent errors
    df['ranking_cluster_semanal'] = 999
    df['ranking_cluster_proy_anual'] = 999

# =========================================
# 13. MÁXIMOS Y ALERTAS
# =========================================
print("Calculando Máximos Históricos...")
idx_max_hist = df.groupby(['delito', 'codcom'])['frecuencia'].idxmax()
info_maximos = df.loc[idx_max_hist, ['delito', 'codcom', 'id_semana', 'semana_detalle']].copy()
info_maximos.rename(columns={'id_semana': 'id_semana_max_hist', 'semana_detalle': 'semana_detalle_max_hist'}, inplace=True)

df_len_before = len(df)
df = df.merge(info_maximos, on=['delito', 'codcom'], how='left')
verificar_integridad(df, pd.DataFrame(index=range(df_len_before)), "Merge Máximos Históricos")

df['alerta_aumento_critico'] = (df['z_score'] > 2) & (df['var_pct_vs_semana_anterior'] > 30)
df['alerta_vs_año_anterior'] = (df['z_score_vs_año_anterior'] > 2) & (df['frecuencia'] > df['max_hist_anual'])

# Casos misma semana año anterior
df_prev_casos = df[['delito', 'codcom', 'año', 'semana_numero', 'frecuencia']].copy()
df_prev_casos['año'] += 1
df_prev_casos.rename(columns={'frecuencia': 'casos_misma_semana_año_anterior'}, inplace=True)
df_prev_casos = df_prev_casos.drop_duplicates(subset=['delito', 'codcom', 'año', 'semana_numero'])
df = df.merge(df_prev_casos, on=['delito', 'codcom', 'año', 'semana_numero'], how='left')

# Casos mismo mes año anterior
monthly_cases = df.groupby(['delito', 'codcom', 'año', 'mes'])['frecuencia'].sum().reset_index(name='total_casos_mes_real')
prev_year_monthly = monthly_cases.copy()
prev_year_monthly['año'] += 1
prev_year_monthly.rename(columns={'total_casos_mes_real': 'casos_mismo_mes_año_anterior'}, inplace=True)
df = df.merge(prev_year_monthly, on=['delito', 'codcom', 'año', 'mes'], how='left')

# =========================================
# 14. TARJETAS COMPLEJAS (T19-T25)
# =========================================
print("Generando Rankings Regionales y Nacionales (T19-T25)...")
if 'ranking_comunal_regional' in df.columns:
    df_delitos = df[df['delito'] != 'Total'].copy()
    df_delitos["prioridad_delito"] = df_delitos["delito"].map(prioridad_delito)
    
    # T19 Peor Regional
    df_delitos.sort_values(by=["codcom", "id_semana", "ranking_comunal_regional", "prioridad_delito"], ascending=[True, True, True, True], inplace=True)
    worst_reg = df_delitos.groupby(["codcom", "id_semana"]).first()[["delito", "ranking_comunal_regional"]]
    worst_reg.rename(columns={'delito': 't19_delito_sem', 'ranking_comunal_regional': 't19_rank_sem'}, inplace=True)
    df = df.merge(worst_reg, on=['codcom', 'id_semana'], how='left')
else:
    df['t19_delito_sem'] = None

# T20 Peor Nacional
df['ranking_nacional_semanal'] = df.groupby(['delito', 'id_semana'])['frecuencia'].rank(method='dense', ascending=False)
df_delitos = df[df['delito'] != 'Total'].copy()
idx_worst_nac = df_delitos.groupby(['codcom', 'id_semana'])['ranking_nacional_semanal'].idxmin()
worst_nac = df.loc[idx_worst_nac][['codcom', 'id_semana', 'delito', 'ranking_nacional_semanal']].copy()
worst_nac.rename(columns={'delito': 't20_delito_sem', 'ranking_nacional_semanal': 't20_rank_sem'}, inplace=True)
df = df.merge(worst_nac, on=['codcom', 'id_semana'], how='left')

# Previous values t19/t20
df.sort_values(['codcom', 'delito', 'id_semana'], inplace=True)
for col in ['t19_delito_sem', 't19_rank_sem', 't20_delito_sem', 't20_rank_sem']:
    df[col.replace('sem','ant')] = df.groupby(['delito', 'codcom'])[col].shift(1)

# T23 Correlations Simulation/Placeholder
print("   > (Simulado) Calculando Correlaciones...")
pass 

# T25 Aporte Regional
if 'Codreg' in df.columns:
    df['casos_semana_regional'] = df.groupby(['Codreg', 'delito', 'id_semana'])['frecuencia'].transform('sum')
    df['aporte_pct_region'] = (df['frecuencia'] / df['casos_semana_regional'] * 100).fillna(0)
    df['aporte_pct_region_ant'] = df.groupby(['delito', 'codcom'])['aporte_pct_region'].shift(1)
    df['casos_semana_regional_ant'] = df.groupby(['delito', 'codcom'])['casos_semana_regional'].shift(1)

# =========================================
# 15. COPIAR DF3 BASE
# =========================================
print("Preparando DataFrame Final...")
df3 = df.copy()

# 0. Setup Fechas (Necesario para proyecciones)
df3['fecha_fin'] = df3['fecha']  #+ pd.Timedelta(days=6)

# 1. Proyección Anual (Extrapolación precisa por días)
# Solicitud explícita usuario: "la proyeccion debe hacerse por dias transcurridos"
# Usamos fecha_fin (Domingo) porque el acumulado incluye hasta el final de la semana actual.
# Factor = 365 / DiaAño(Domingo).
df3['dias_año'] = np.where(df3['fecha_fin'].dt.is_leap_year, 366, 365)
df3['dia_año_actual'] = df3['fecha_fin'].dt.dayofyear
df3['factor_expansion_anual'] = df3['dias_año'] / df3['dia_año_actual']
df3['proyeccion_anual'] = df3['acumulado_anual'] * df3['factor_expansion_anual']



# Tasas
# Usar factor_poblacion para tasas
df3['tasa_semanal'] = df3['frecuencia'] / df3['factor_poblacion']
df3['tasa_proyectada_anual'] = df3['proyeccion_anual'] / df3['factor_poblacion']

# Rankings (Regional/Nacional/Cluster Proy)
if 'Codreg' in df3.columns:
    df3['ranking_regional_proy_anual'] = df3.groupby(['Codreg', 'delito', 'id_semana'])['proyeccion_anual'].rank(method='dense', ascending=False)
    
df3['ranking_nacional_proy_anual'] = df3.groupby(['delito', 'id_semana'])['proyeccion_anual'].rank(method='dense', ascending=False)


if 'clase_poblacion' in df3.columns:
    df3['ranking_cluster_proy_anual'] = df3.groupby(['clase_poblacion', 'delito', 'id_semana'])['proyeccion_anual'].rank(method='dense', ascending=False)
    df3['ranking_cluster_semanal'] = df3.groupby(['clase_poblacion', 'delito', 'id_semana'])['frecuencia'].rank(method='dense', ascending=False)

# =====================================================
# 16b. CALCULOS DE RANKINGS ANTERIORES (NO EXISTENTES)
# =====================================================
print("Calculando Rankings Anteriores...")
rank_cols_to_shift = [
    'ranking_nacional_semanal',
    'ranking_regional_proy_anual', 
    'ranking_nacional_proy_anual',
    'ranking_cluster_proy_anual',
    'ranking_cluster_semanal'
]

df3 = df3.sort_values(['codcom', 'delito', 'id_semana'])
for col in rank_cols_to_shift:
    if col in df3.columns:
        # Usamos sufijo '_anterior' para consistencia interna
        new_col = f"{col}_anterior"
        # Shift 1 periodo (semana anterior) agrupado por comuna y delito
        df3[new_col] = df3.groupby(['codcom', 'delito'])[col].shift(1).fillna(0)

# =====================================================
# 16. CALCULOS DE NUEVAS TARJETAS (IDI, RACHAS, CRECIMIENTO)
# =====================================================
print("Calculando IDI y Métricas Avanzadas...")
weights_idi = {
    'HOMICIDIOS Y FEMICIDIOS': 1000,
    'ROBOS CON VIOLENCIA E INTIMIDACIÓN': 150,
    'VIOLACIONES Y DELITOS SEXUALES': 200,
    'LEY DE CONTROL DE ARMAS': 75,
    'LEY DE DROGAS': 30,
    'DELITOS EN CONTEXTO DE VIOLENCIA INTRAFAMILIAR': 40
}
BASE_IDI_ANUAL = 110526
BASE_IDI_MENSUAL = 9279

df3['idi_peso'] = df3['delito'].map(weights_idi).fillna(0)

# Calcular Proyección Mensual si faltante
# Calcular Proyección Mensual (Extrapolación lineal simple del acumulado)
# 1. Fecha Fin de Semana (Lunes + 6 = Domingo)
df3['fecha_fin'] = df3['fecha'] + pd.Timedelta(days=6)
# 2. Días (Lógica vectorizada para manejar cruce de mes)
cond_mismo_mes = df3['fecha_fin'].dt.month == df3['fecha'].dt.month

df3['dias_mes'] = df3['fecha'].dt.days_in_month
# Si estamos en el mismo mes, usamos el día de fin de semana. 
# Si cruzamos de mes, asumimos que el mes base se completó (usamos total días del mes).
df3['dia_actual'] = np.where(cond_mismo_mes, 
                             df3['fecha_fin'].dt.day, 
                             df3['dias_mes'])
   
# 3. Acumulado casos en el mes hasta la fecha
df3 = df3.sort_values(['codcom', 'delito', 'año', 'mes', 'id_semana'])
df3['casos_acum_mes'] = df3.groupby(['codcom', 'delito', 'año', 'mes'])['frecuencia'].cumsum()
   
# 4. Proyección Lineal: Acumulado * (TotalDias / DiasTranscurridos)
# Factor de expansión: Si vamos día 15 de 30 (0.5), factor es 2.
df3['factor_expansion_mes'] = df3['dias_mes'] / df3['dia_actual']
df3['proyeccion_mes_actual'] = df3['casos_acum_mes'] * df3['factor_expansion_mes']

# Calcular Puntos IDI Parciales (Normalizados por Factor Población a nivel fila)
# Fórmula Usuario: Peso * Proyeccion / FactorPoblacion
df3['idi_parcial_mes'] = (df3['idi_peso'] * df3['proyeccion_mes_actual'] / df3['factor_poblacion']).fillna(0)
# Revisado: Cálculo correcto. Usa casos totales reales del mes homólogo año anterior (Cierre Mes vs Proyección Cierre Mes).
df3['idi_parcial_mes_ant_year'] = (df3['idi_peso'] * df3['casos_mismo_mes_año_anterior'] / df3['factor_poblacion']).fillna(0)
df3['idi_parcial_anual_proy'] = (df3['idi_peso'] * df3['proyeccion_anual'] / df3['factor_poblacion']).fillna(0)
df3['idi_parcial_real_sem'] = (df3['idi_peso'] * df3['frecuencia'] / df3['factor_poblacion']).fillna(0)



print("   > Calculando Agregaciones IDI (Nueva Fórmula)...")
# Agregación: Suma de parciales
idi_grp = df3.groupby(['codcom', 'id_semana']).apply(lambda x: pd.Series({
    'sum_idi_mes': x['idi_parcial_mes'].sum(),
    'sum_idi_mes_ant_year': x['idi_parcial_mes_ant_year'].sum(),
    'sum_idi_anual_proy': x['idi_parcial_anual_proy'].sum(),
    'factor_poblacion': x['factor_poblacion'].iloc[0] if len(x) > 0 else 1.0 
})).reset_index()

# IDI Resultados Finales (Suma / Base * 100)
idi_grp['idi_proy_mes'] = (idi_grp['sum_idi_mes'] / BASE_IDI_MENSUAL) * 100
idi_grp['idi_mes_ant_year'] = (idi_grp['sum_idi_mes_ant_year'] / BASE_IDI_MENSUAL) * 100
idi_grp['idi_proy_anual'] = (idi_grp['sum_idi_anual_proy'] / BASE_IDI_ANUAL) * 100

# T34: IDI Mes Anterior (Lag 4 semanas)
idi_grp = idi_grp.sort_values(['codcom', 'id_semana'])
idi_grp['idi_mes_anterior'] = idi_grp.groupby('codcom')['idi_proy_mes'].shift(4)

# T27: IDI Año Anterior (Cierre Real Total)
# Calcular parciales reales históricos
col_idi_real = df3.groupby(['codcom', 'año'])['idi_parcial_real_sem'].sum().reset_index(name='sum_idi_total_real')
# No necesitamos hacer merge de poblacion de nuevo porque ya dividimos por factor en la fila
idi_anual_real = col_idi_real.copy()
idi_anual_real['idi_anual_cierre'] = (idi_anual_real['sum_idi_total_real'] / BASE_IDI_ANUAL) * 100

# Shift Year
idi_anual_real['año_join'] = idi_anual_real['año'] + 1
idi_prev = idi_anual_real[['codcom', 'año_join', 'idi_anual_cierre']].rename(columns={'año_join': 'año', 'idi_anual_cierre': 'idi_anual_anterior'})

# Map and Merge
time_map = df3[['id_semana', 'año']].drop_duplicates()
idi_grp = idi_grp.merge(time_map, on='id_semana', how='left')
idi_grp = idi_grp.merge(idi_prev, on=['codcom', 'año'], how='left')

# Benchmarks
meta_cols = df3[['codcom', 'Codreg', 'clase_poblacion']].drop_duplicates()
idi_grp = idi_grp.merge(meta_cols, on='codcom', how='left')

# --- 11. Agregación Regional, Nacional y Cluster (Corregido) ---
def calc_agg_metrics(group, level_suffix):
    # Filtrar Totales para evitar doble contabilidad en numerador
    # Asumimos que IDI se compone de delitos individuales
    base_data = group[group['delito'] != 'Total']
    
    # 1. IDI Regional/Nacional
    # Numerador: Suma de Puntos IDI (Peso * Proyección Mes) de delitos individuales
    sum_puntos_mes = (base_data['idi_peso'] * base_data['proyeccion_mes_actual']).sum()
    
    # Denominador: Población Total del Grupo (Suma de Factores Únicos de Comunas)
    # Usamos group completo para sacar factores únicos de comunas presentes
    pob_total = group[['codcom', 'factor_poblacion']].drop_duplicates()['factor_poblacion'].sum()
    
    idi_val = (sum_puntos_mes / pob_total / BASE_IDI_MENSUAL) * 100 if pob_total > 0 else 0
    
    # 2. Tasa Proyectada
    # Numerador: Suma de Proyecciones Anuales (delitos individuales)
    sum_proy_anual = base_data['proyeccion_anual'].sum()
    tasa_val = sum_proy_anual / pob_total if pob_total > 0 else 0
    
    return pd.Series({
        f'idi_proy_{level_suffix}': idi_val,
        f'tasa_proyectada_{level_suffix}': tasa_val
    })

print("   > Calculando Métricas Agregadas (Reg/Nac/Clus)...")
aggs_reg = df3.groupby(['Codreg', 'id_semana']).apply(calc_agg_metrics, level_suffix='regional').reset_index()
aggs_nac = df3.groupby(['id_semana']).apply(calc_agg_metrics, level_suffix='nacional').reset_index()

if 'clase_poblacion' in df3.columns:
    aggs_clus = df3.groupby(['clase_poblacion', 'id_semana']).apply(calc_agg_metrics, level_suffix='cluster').reset_index()
else:
    aggs_clus = pd.DataFrame()

# Merge back to idi_grp
idi_grp = idi_grp.merge(aggs_reg, on=['Codreg', 'id_semana'], how='left')
idi_grp = idi_grp.merge(aggs_nac, on=['id_semana'], how='left')

if not aggs_clus.empty:
    idi_grp = idi_grp.merge(aggs_clus, on=['clase_poblacion', 'id_semana'], how='left')
else:
    idi_grp['idi_proy_cluster'] = 0
    idi_grp['tasa_proyectada_cluster'] = 0



# T23 Correlations Implementation
print("   > Calculando Correlaciones (Top 1 Par)...")
def calculate_top_correlation(group):
    # Pivot: Index=Week, Columns=Delito, Values=Frecuencia
    # We only care about sufficient data
    if len(group) < 10: return pd.Series({'t23_d1': 'Insuf. Datos', 't23_d2': 'Insuf. Datos', 't23_val': 0.0})
    
    pivot = group.pivot(index='id_semana', columns='delito', values='frecuencia').fillna(0)
    # Filter columns with 0 variance (all zeros)
    pivot = pivot.loc[:, (pivot != pivot.iloc[0]).any()]
    
    if pivot.shape[1] < 2:
        return pd.Series({'t23_d1': 'Sin Var', 't23_d2': 'Sin Var', 't23_val': 0.0})
        
    corr_matrix = pivot.corr()
    # Mask diagonal and lower triangle to avoid duplicates and self-correlation
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)
    corr_upper = corr_matrix.where(mask)
    
    # Find max correlation
    try:
        max_corr_val = corr_upper.max().max()
        if pd.isna(max_corr_val): return pd.Series({'t23_d1': '-', 't23_d2': '-', 't23_val': 0.0})
        
        # Get coordinates of max
        # stack() converts to series, idxmax() gets (Row, Col) index
        max_idx = corr_upper.stack().idxmax()
        d1, d2 = max_idx
        
        return pd.Series({'t23_d1': d1, 't23_d2': d2, 't23_val': max_corr_val})
    except:
        return pd.Series({'t23_d1': 'Error', 't23_d2': 'Error', 't23_val': 0.0})

# Apply per commune
# Note: This operation might be slow on large datasets. Optimization: do it only for target crime or subset?
# Doing it for all crimes in the commune group.
df_corr_base = df3[df3['delito'] != 'Total'][['codcom', 'id_semana', 'delito', 'frecuencia']].copy()
# Only take last 52 weeks for relevance? Or full history?
# Let's take full history available in df3 for better correlation
top_corrs = df_corr_base.groupby('codcom').apply(calculate_top_correlation).reset_index()

# Merge back to df3
# T23 is singular per commune (static property? or dynamic window?)
# Here we calculated it "globally" for the commune based on all history.
# We will broadcast this static finding to all weeks for that commune.
df3 = df3.merge(top_corrs, on='codcom', how='left')

# Update the merge line to include standard Rates
# df3 = df3.merge(idi_grp[['codcom', 'id_semana', ... 'tasa_proyectada_regional', ...]], ...)
# I need to update the column list in the merge command at the end of this block.


df3 = df3.merge(idi_grp[['codcom', 'id_semana', 
    'idi_proy_mes', 'idi_mes_ant_year', 'idi_mes_anterior', 
    'idi_proy_anual', 'idi_anual_anterior', 
    'idi_proy_regional', 'idi_proy_nacional', 'idi_proy_cluster',
    'tasa_proyectada_regional', 'tasa_proyectada_nacional', 'tasa_proyectada_cluster'
]], on=['codcom', 'id_semana'], how='left')

# --- B. Rachas (Prioridad Top 3) ---
print("   > Calculando Rachas (Top 3)...")
df3['prioridad_val'] = df3['delito'].map(prioridad_delito).fillna(99)
df3['es_racha_neg'] = (df3['racha'] > 2) & (df3['tendencia_corto_plazo'] == 'Alza')
df3['es_racha_pos'] = (df3['racha'] > 2) & (df3['tendencia_corto_plazo'] == 'Baja')

def get_top_rachas(df_subset, prefix):
    # Sort by Priority (asc) then Streak Length (desc)
    top3 = df_subset.sort_values(['codcom', 'id_semana', 'prioridad_val', 'racha'], ascending=[True, True, True, False])
    # Group and take head(3)
    top3 = top3.groupby(['codcom', 'id_semana']).head(3)
    # Add rank counter (1, 2, 3)
    top3['rank'] = top3.groupby(['codcom', 'id_semana']).cumcount() + 1
    
    # Pivot to wide format
    pivot = top3.pivot_table(
        index=['codcom', 'id_semana'], 
        columns='rank', 
        values=['delito', 'racha'], 
        aggfunc='first'
    )
    
    # Flatten columns
    pivot.columns = [f'{prefix}_delito_{c[1]}' if c[0] == 'delito' else f'{prefix}_semanas_{c[1]}' for c in pivot.columns]
    return pivot.reset_index()

# T29: Racha Negativa (Alza)
t29 = get_top_rachas(df3[df3['es_racha_neg']], 't29')

# T30: Racha Positiva (Baja)
t30 = get_top_rachas(df3[df3['es_racha_pos']], 't30')

df3 = df3.merge(t29, on=['codcom', 'id_semana'], how='left')
df3 = df3.merge(t30, on=['codcom', 'id_semana'], how='left')

# --- C. Pareto (Concentración Delictual - T21) ---
print("   > Calculando Pareto (Top 3 Delitos)...")
# Filter only crimes with cases > 0 and exclude 'Total' to avoid noise, sort by frequency desc
pareto_base = df3[(df3['frecuencia'] > 0) & (df3['delito'] != 'Total')].sort_values(['codcom', 'id_semana', 'frecuencia'], ascending=[True, True, False])
# Get Top 3 per group
pareto_top3 = pareto_base.groupby(['codcom', 'id_semana']).head(3)
pareto_top3['rank'] = pareto_top3.groupby(['codcom', 'id_semana']).cumcount() + 1
# Calculate Total Cases per week for pct calculation (exclude 'Total'row from sum to prevent double counting)
week_totals = df3[df3['delito'] != 'Total'].groupby(['codcom', 'id_semana'])['frecuencia'].sum().reset_index(name='total_semanal')
pareto_top3 = pareto_top3.merge(week_totals, on=['codcom', 'id_semana'], how='left')
pareto_top3['pct_contribution'] = (pareto_top3['frecuencia'] / pareto_top3['total_semanal'] * 100).fillna(0)

# Pivot
pivot_pareto = pareto_top3.pivot_table(
    index=['codcom', 'id_semana'],
    columns='rank',
    values=['delito', 'pct_contribution'],
    aggfunc='first'
)
# Flatten
pivot_pareto.columns = [f't21_delito_{c[1]}' if c[0] == 'delito' else f't21_val_{c[1]}' for c in pivot_pareto.columns]
df3 = df3.merge(pivot_pareto.reset_index(), on=['codcom', 'id_semana'], how='left')

# --- D. Tasas de Crecimiento y Aceleración ---
print("   > Calculando Tasas de Crecimiento (T31/T32)...")
df3 = df3.sort_values(['codcom', 'delito', 'id_semana'])

# T31: Aceleración Corto Plazo (CAGR 4 Semanas de la Media Móvil)
# Mide cuánto se está acelerando la tendencia suavizada
df3['mm4s_lag4'] = df3.groupby(['codcom', 'delito'])['media_movil_4s'].shift(4)
# Evitar división por cero y números complejos con bases negativas (aunque MA >=0)
df3['t31_cagr_4s'] = (np.power(df3['media_movil_4s'] / df3['mm4s_lag4'].replace(0, np.nan), 0.25) - 1) * 100
df3['t31_cagr_4s'] = df3['t31_cagr_4s'].fillna(0)

# T32: Crecimiento Estructural (YTD actual vs YTD año anterior)
# Mide la variación acumulada del año
df3['t32_cagr_anual'] = ((df3['acumulado_anual'] / df3['acumulado_anual_anterior'].replace(0, np.nan)) - 1) * 100
df3['t32_cagr_anual'] = df3['t32_cagr_anual'].fillna(0)

# =========================================
# 12. VALIDACIÓN DETALLADA (SIMULACIÓN DASHBOARD)
# =========================================

# Ajustamos para validar una comuna existente, p.ej. Santiago (13101) o la primera que encuentre
target_comuna = 13101 
if target_comuna not in df3['codcom'].unique():
    target_comuna = df3['codcom'].unique()[0]

santiago = df3[(df3['codcom'] == target_comuna) & (df3['delito'] == 'Total')].sort_values('id_semana')

if not santiago.empty:
    ultima = santiago.iloc[-1]
    
    def print_comp(label, actual, anterior):
        try:
            act = float(actual) if pd.notnull(actual) else 0
            ant = float(anterior) if pd.notnull(anterior) else 0
            delta = act - ant
            pct = (delta / ant * 100) if ant > 0 else 0
            return f"{label}: {act:,.1f} vs {ant:,.1f} | Var: {delta:+,.1f} ({pct:+.1f}%)"
        except:
            return f"{label}: {actual} vs {anterior} (Error)"

    print(f"\n=== VALIDACIÓN COMUNA {target_comuna} - SEMANA {ultima['semana_detalle']} ===\n")
    
    # T1-T3: KPIs
    print(f"[T1] Casos Actuales: {ultima.get('frecuencia', 0)}")
    print(f"[T2] Var Semanal: {print_comp('', ultima.get('frecuencia', 0), ultima.get('casos_semana_anterior', 0))}")
    print(f"[T3] Acumulado Anual: {print_comp('', ultima.get('acumulado_anual', 0), ultima.get('acumulado_anual_anterior', 0))}")
    
    # T4-T12: Métricas Base
    print(f"[T4] Proyección Anual: {print_comp('Casos', ultima.get('proyeccion_anual', 0), ultima.get('acumulado_anual_anterior', 0))}")
    print(f"[T5] Desviación Histórica: {print_comp('Casos', ultima.get('frecuencia', 0), ultima.get('promedio_hist', 0))}")
    print(f"[T6] Proyección Mensual: {print_comp('Casos', ultima.get('proyeccion_mes_actual', 0), ultima.get('casos_mismo_mes_año_anterior', 0))}")
    print(f"[T7] Media Móvil 4S: {print_comp('Casos', ultima.get('media_movil_4s', 0), ultima.get('promedio_hist_anual', 0))}")
    
    print(f"[T8] Récords:")
    print(f"  - Prom Diario Sem: {(ultima.get('frecuencia', 0)/7):.1f}")
    print(f"  - Prom Diario Hist: {(ultima.get('promedio_hist', 0)/7):.1f}")
    print(f"  - Prom Sem Hist: {ultima.get('promedio_hist', 0):.1f}")
    print(f"  - Max Sem Hist: {ultima.get('max_hist', 0):.0f} ({ultima.get('semana_detalle_max_hist', '-')})")
    
    tasa_ant = (ultima.get('acumulado_anual_anterior', 0) / ultima.get('factor_poblacion', 1))
    print(f"[T9] Tasa Proy 100k: {print_comp('', ultima.get('tasa_proyectada_anual', 0), tasa_ant)}")
    print(f"[T10] Bench Regional: {print_comp('Tasa', ultima.get('tasa_proyectada_anual', 0), ultima.get('tasa_proyectada_regional', 0))}")
    print(f"[T11] Bench Nacional: {print_comp('Tasa', ultima.get('tasa_proyectada_anual', 0), ultima.get('tasa_proyectada_nacional', 0))}")
    print(f"[T12] Tasas: Sem({ultima.get('tasa_semanal', 0):.1f}) | Proy({ultima.get('tasa_proyectada_anual', 0):.1f}) | Reg({ultima.get('tasa_proyectada_regional', 0):.1f}) | Nac({ultima.get('tasa_proyectada_nacional', 0):.1f})")

    # Rankings
    def print_rank(title, act, ant):
         a = float(act) if pd.notnull(act) else 0
         b = float(ant) if pd.notnull(ant) else 0
         diff = b - a
         print(f"[{title}] Pos {a:.0f} (Ant: {b:.0f}) | Var: {diff:+,.0f}")

    print_rank("T13] Rank Reg Sem", ultima.get('ranking_comunal_regional'), ultima.get('ranking_comunal_regional_semana_anterior'))
    print_rank("T14] Rank Reg Anual", ultima.get('ranking_regional_proy_anual'), ultima.get('ranking_regional_proy_anual_anterior'))
    print_rank("T15] Rank Nac Sem", ultima.get('ranking_nacional_semanal'), ultima.get('ranking_nacional_semanal_anterior'))
    print_rank("T16] Rank Nac Anual", ultima.get('ranking_nacional_proy_anual'), ultima.get('ranking_nacional_proy_anual_anterior'))
    print_rank("T17] Rank Clus Sem", ultima.get('ranking_cluster_semanal'), ultima.get('ranking_cluster_semanal_anterior'))
    print_rank("T18] Rank Clus Anual", ultima.get('ranking_cluster_proy_anual'), ultima.get('ranking_cluster_proy_anual_anterior'))

    # T19-T25
    print(f"[T19] Peor Rank Reg (Sem): {ultima.get('t19_delito_sem', '-')} (#{ultima.get('t19_rank_sem', '-')})")
    print(f"[T20] Peor Rank Nac (Sem): {ultima.get('t20_delito_sem', '-')} (#{ultima.get('t20_rank_sem', '-')})")
    print(f"[T21] Pareto Top 1: {ultima.get('t21_delito_1', '-')} ({ultima.get('t21_val_1', 0):.1f}%)")
    print(f"[T23] Correlación: {ultima.get('t23_d1', '-')} vs {ultima.get('t23_d2', '-')} (R={ultima.get('t23_val', 0):.2f})")
    print(f"[T25] Aporte Regional: {print_comp('Pct', ultima.get('aporte_pct_region', 0), ultima.get('aporte_pct_region_ant', 0))}")

    # T26-T32
    print(f"[T26] IDI Mensual: {print_comp('Puntos', ultima.get('idi_proy_mes', 0), ultima.get('idi_mes_ant_year', 0))}")
    print(f"[T27] IDI Anual: {print_comp('Puntos', ultima.get('idi_proy_anual', 0), ultima.get('idi_anual_anterior', 0))}")
    print(f"[T28] Benchmark IDI: Com({ultima.get('idi_proy_mes', 0):.1f}) vs Reg({ultima.get('idi_proy_regional', 0):.1f}) vs Nac({ultima.get('idi_proy_nacional', 0):.1f})")
    print(f"[T29] Racha Negativa: {ultima.get('t29_delito_1', '-')}")
    print(f"[T30] Racha Positiva: {ultima.get('t30_delito_1', '-')}")
    print(f"[T31] Crecimiento CP (4S): {ultima.get('t31_cagr_4s', 0):.1f}%")
    print(f"[T32] Crecimiento LP (YTD): {ultima.get('t32_cagr_anual', 0):.1f}%")

# =========================================
# OUTPUT
# =========================================
print("Ejecución completada. Generando archivos...")
output_dir = r"D:\GitHub\STOP_WEB3\web_js\data\stop"
os.makedirs(output_dir, exist_ok=True)

unique_comunas = df3["codcom"].unique()
for i in progress_wrapper(unique_comunas, desc="Guardando Comunas"):
    aux = df3[df3["codcom"] == i]
    # Si quieres guardar:
    aux.to_json(fr'{output_dir}/{i}', orient='records', compression='gzip', date_format='iso')

print(f"Total Columnas {len(df3.columns)}")
print("Proceso Finalizado Exitosamente.")
