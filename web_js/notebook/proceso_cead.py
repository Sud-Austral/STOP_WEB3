
import pandas as pd
import json
import warnings
import numpy as np
import os
import sys
import multiprocessing
from datetime import datetime
from functools import partial
from statsmodels.tsa.statespace.sarimax import SARIMAX

# =========================================
# 0. CONFIGURACIÓN DE PREDICCIÓN (SARIMA)
# =========================================
# Definir rango de relleno de datos faltantes
START_FILL = "2025-10-01"  # Inicio del periodo a rellenar
END_FILL = "2025-12-01"    # Fin del periodo a rellenar (incluyente)
LIMIT_DATE = "2025-09-01"  # Último mes con datos reales (Septiembre)

# Diccionarios de mapeo global
MESES_CORTOS = {1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
                7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'}
TRIMESTRES = {1: 'Enero-Marzo', 2: 'Abril-Junio', 3: 'Julio-Septiembre', 4: 'Octubre-Diciembre'}
MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
MES_NUM = {m: i+1 for i, m in enumerate(MESES)}

# Helper para cálculos de fechas
FILL_PERIODS = pd.date_range(start=START_FILL, end=END_FILL, freq='MS')
def date_to_id(dt): return dt.year * 100 + dt.month
FILL_IDS = [date_to_id(d) for d in FILL_PERIODS]

# Suppress warnings
warnings.filterwarnings('ignore')

# =========================================
# CONFIGURACIÓN PROGRESO
# =========================================
try:
    from tqdm import tqdm
    USE_TQDM = True
except ImportError:
    USE_TQDM = False
    print("tqdm no instalado. Usando prints simples.")

def progress_wrapper(iterable, desc="Procesando", total=None):
    if USE_TQDM:
        return tqdm(iterable, desc=desc, total=total)
    return iterable

# =========================================
# FUNCIONES AUXILIARES Y WORKERS
# =========================================

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

def predecir_sarima_worker(args):
    """Función para ejecutar predicción en paralelo."""
    (com, tipo, delit, tipo_val_nombre, serie_train) = args
    
    # 0. Filtro rápido: Si la serie es muy pobre, fallback inmediato
    if len(serie_train) < 24:
        last_val = serie_train.iloc[-3:].mean() if len(serie_train) >= 3 else serie_train.mean()
        vals_pred = [max(0, round(last_val))] * len(FILL_PERIODS)
    else:
        try:
            # Optimización SARIMA: menos iteraciones y parámetros reducidos para velocidad
            model = SARIMAX(
                serie_train,
                order=(1, 1, 0), 
                seasonal_order=(0, 1, 0, 12),
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            # fit(maxiter=25) reduce el tiempo drásticamente
            result = model.fit(disp=False, maxiter=25)
            forecast = result.get_forecast(steps=len(FILL_PERIODS))
            vals_pred = [max(0, round(v)) for v in forecast.predicted_mean]
        except:
            vals_pred = [max(0, round(serie_train.iloc[-1]))] * len(FILL_PERIODS)
    
    # Construir resultados
    res = []
    for i, date_f in enumerate(FILL_PERIODS):
        res.append({
            'codcom': com,
            'tipoValCod': tipo,
            'delito': delit,
            'año': date_f.year,
            'mes': date_f.month,
            'id_periodo': date_to_id(date_f),
            'fecha': date_f,
            'frecuencia': vals_pred[i],
            'tipoVal': tipo_val_nombre
        })
    return res

def calc_estacionalidad(group):
    """Calcula mes y trimestre con mayor frecuencia histórica para Total."""
    total_rows = group[group['delito'] == 'Total']
    if total_rows.empty:
        return pd.Series({
            't22_mes_nombre': 'N/D', 't22_mes_pct': 0.0,
            't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0
        })
    
    por_mes = total_rows.groupby('mes')['frecuencia'].sum()
    if por_mes.empty or por_mes.sum() == 0:
        return pd.Series({
            't22_mes_nombre': 'N/D', 't22_mes_pct': 0.0,
            't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0
        })
    
    prom_mensual = por_mes.mean()
    mes_max = por_mes.idxmax()
    mes_pct = ((por_mes[mes_max] - prom_mensual) / prom_mensual * 100) if prom_mensual > 0 else 0
    
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

def calc_correlacion_lp(group):
    """Top 4 pares de correlación entre delitos Familia, usando toda la historia."""
    fam = group[(group['Nivel'] == 'Familia') & (group['delito'] != 'Total')]
    if fam.empty or fam['delito'].nunique() < 2:
        return pd.Series({
            't24_d1_1': '-', 't24_d1_2': '-', 't24_v1': 0.0,
            't24_d2_1': '-', 't24_d2_2': '-', 't24_v2': 0.0,
            't24_d3_1': '-', 't24_d3_2': '-', 't24_v3': 0.0,
            't24_d4_1': '-', 't24_d4_2': '-', 't24_v4': 0.0
        })
    pivot = fam.pivot_table(index='id_periodo', columns='delito', values='frecuencia', aggfunc='sum').fillna(0)
    pivot = pivot.loc[:, pivot.std() > 0]
    if pivot.shape[1] < 2 or len(pivot) < 6:
        return pd.Series({'t24_d1_1': 'Insuf. Datos', 't24_d1_2': '-', 't24_v1': 0.0,
                         't24_d2_1': '-', 't24_d2_2': '-', 't24_v2': 0.0,
                         't24_d3_1': '-', 't24_d3_2': '-', 't24_v3': 0.0,
                         't24_d4_1': '-', 't24_d4_2': '-', 't24_v4': 0.0})
    corr = pivot.corr()
    mask = np.triu(np.ones_like(corr, dtype=bool), k=1)
    pairs = corr.where(mask).stack().sort_values(ascending=False)
    result = {}
    for i in range(4):
        if i < len(pairs):
            (d1, d2), val = pairs.index[i], pairs.iloc[i]
            result[f't24_d{i+1}_1'] = d1[:35] if len(d1) > 35 else d1
            result[f't24_d{i+1}_2'] = d2[:35] if len(d2) > 35 else d2
            result[f't24_v{i+1}'] = round(val, 2)
        else:
            result[f't24_d{i+1}_1'] = '-'
            result[f't24_d{i+1}_2'] = '-'
            result[f't24_v{i+1}'] = 0.0
    return pd.Series(result)

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

# =========================================
# FLUJO PRINCIPAL
# =========================================

if __name__ == "__main__":
    print("=" * 60)
    print("PROCESO CEAD - Datos Mensuales")
    print("=" * 60)
    print("\nIniciando Carga de Datos...")

    url = r"C:\Users\limc_\Laboratorio\cead2\CEAD_FULL.csv"
    if not os.path.exists(url): url = r"CEAD_FULL.csv"
    if not os.path.exists(url):
        print(f"Error: Data file not found at {url}")
        sys.exit(1)

    df_raw = pd.read_csv(url, compression="xz", sep="\t")
    df_raw = df_raw[df_raw["tipoValCod"] == "1,2"]

    # FILTRO DE GRANULARIDAD
    print("\nFiltrando por granularidad (CODIGO > 10000)...")
    df_raw = df_raw[df_raw["CODIGO"] > 10000].copy()
    df_raw['nivel_original'] = df_raw['Nivel']

    # Prioridad Delitos
    prioridad_delito = {}
    delitos_familia = sorted(df_raw[df_raw['Nivel'] == 'Familia']['Descripcion'].unique())
    for i, d in enumerate(delitos_familia):
        prioridad_delito[d] = i + 1

    # 3. MELT
    print("\nConvirtiendo a formato largo (melt)...")
    id_vars = ['Codcom', 'Año', 'tipoValCod', 'tipoVal', 'CODIGO', 'Descripcion', 'Nivel', 'nivel_original']
    df = df_raw.melt(id_vars=id_vars, value_vars=MESES, var_name='mes_nombre', value_name='frecuencia')
    df['mes'] = df['mes_nombre'].map(MES_NUM)
    df['frecuencia'] = pd.to_numeric(df['frecuencia'], errors='coerce').fillna(0).astype(int)
    df.rename(columns={'Codcom': 'codcom', 'Año': 'año', 'Descripcion': 'delito'}, inplace=True)
    df['delito'] = df['delito'].str.strip()
    df['id_periodo'] = df['año'] * 100 + df['mes']
    df['fecha'] = pd.to_datetime(df['año'].astype(str) + '-' + df['mes'].astype(str) + '-01', errors='coerce')
    df['periodo_detalle'] = df['mes_nombre'] + ' ' + df['año'].astype(str)

    delitos_config = df[['delito', 'Nivel', 'nivel_original', 'CODIGO']].drop_duplicates('delito')

    # 4. MOTOR SARIMA PARALELO
    print(f"\nIniciando Motor SARIMA ({START_FILL} hasta {END_FILL})...")
    limit_id = date_to_id(pd.to_datetime(LIMIT_DATE))
    df_train = df[df['id_periodo'] <= limit_id].copy()
    grupos = df_train[df_train['delito'] != 'Total'].groupby(['codcom', 'tipoValCod', 'delito'])

    trabajos = []
    for (com, tipo, delit), group in grupos:
        serie_train = group.groupby('fecha')['frecuencia'].sum().sort_index().asfreq('MS').fillna(0)
        serie_train = serie_train.replace(0, np.nan).dropna()
        if serie_train.empty: serie_train = group.groupby('fecha')['frecuencia'].sum().sort_index().asfreq('MS').fillna(0)
        trabajos.append((com, tipo, delit, group['tipoVal'].iloc[0], serie_train))

    n_procs = max(1, multiprocessing.cpu_count() - 1)
    with multiprocessing.Pool(processes=n_procs) as pool:
        resultados_raw = list(progress_wrapper(pool.imap_unordered(predecir_sarima_worker, trabajos), total=len(trabajos), desc="Prediciendo"))

    preds_list = [item for sublist in resultados_raw for item in sublist]
    df_preds = pd.DataFrame(preds_list)
    df_preds = df_preds.merge(delitos_config, on='delito', how='left')
    df_preds['mes_nombre'] = df_preds['mes'].map(MESES_CORTOS)
    df_preds['periodo_detalle'] = df_preds['mes_nombre'] + ' ' + df_preds['año'].astype(str)

    df = pd.concat([df_train, df_preds], ignore_index=True)
    df = df.sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo']).reset_index(drop=True)

    # 5. RE-CALCULAR TOTALES
    print("\nRecalculando Totales...")
    df = df[df['delito'] != 'Total']
    totales = df.groupby(['codcom', 'id_periodo', 'tipoValCod', 'tipoVal'], as_index=False)['frecuencia'].sum()
    totales['delito'] = 'Total'
    totales['CODIGO'] = 0
    totales['Nivel'] = 'Total'
    totales['nivel_original'] = 'Total'
    time_meta = df[['id_periodo', 'año', 'mes', 'fecha', 'mes_nombre', 'periodo_detalle']].drop_duplicates()
    totales = totales.merge(time_meta, on='id_periodo', how='left')
    df = pd.concat([df, totales], ignore_index=True).sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo']).reset_index(drop=True)

    # 6. VARIABLES BASE Y ACUMULADOS
    print("\nCalculando métricas base...")
    df['casos_mes_actual'] = df['frecuencia']
    df['casos_mes_anterior'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].shift(1)
    df['delta'] = df['casos_mes_actual'] - df['casos_mes_anterior']
    df['acumulado_anual'] = df.groupby(['delito', 'codcom', 'tipoValCod', 'año'])['frecuencia'].cumsum()
    
    df_prev_acum = df[['delito', 'codcom', 'tipoValCod', 'año', 'mes', 'acumulado_anual']].copy()
    df_prev_acum['año'] += 1
    df_prev_acum.rename(columns={'acumulado_anual': 'acumulado_anual_anterior'}, inplace=True)
    df = df.merge(df_prev_acum.drop_duplicates(subset=['delito', 'codcom', 'tipoValCod', 'año', 'mes']), 
                  on=['delito', 'codcom', 'tipoValCod', 'año', 'mes'], how='left')

    df['media_movil_3m'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.rolling(3, min_periods=1).mean())
    df['max_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.expanding().max())
    df['std_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.expanding().std())
    df['promedio_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.expanding().mean())

    # 10. TENDENCIA
    df['tendencia_corto_plazo'] = np.where(df['delta'] > 0, 'Alza', np.where(df['delta'] < 0, 'Baja', 'Estable'))
    df['z_score'] = ((df['frecuencia'] - df['promedio_hist']) / df['std_hist'].replace(0, np.nan)).fillna(0)

    # 12-13. LOCALIZACION Y POBLACION
    print("Agregando metadatos geográficos y poblacionales...")
    try:
        localiza = pd.read_excel(r"D:\GitHub\LOCALIZA_DB\Localiza Chile (1).xlsx")[['Provincia', 'Comuna', 'Región', 'Codcom', 'Codreg']].drop_duplicates()
        df = df.merge(localiza, left_on='codcom', right_on='Codcom', how='left')
        df['ranking_comunal_regional'] = df.groupby(['Codreg', 'tipoValCod', 'delito', 'id_periodo'])['frecuencia'].rank(method='dense', ascending=False)
    except: pass

    try:
        pob_path = r"C:\Users\limc_\Downloads\Factores Población.xlsx"
        clasePoblacion = pd.read_excel(pob_path, sheet_name="Clase Población")[['Codcom', 'Población', 'Clase Población']]
        clasePoblacion.columns = ['Codcom', 'poblacion_clase', 'clase_poblacion']
        factor = pd.read_excel(pob_path, sheet_name="Factores")[['Codcom', 'Año', 'Población', 'Factor Población']]
        factor.columns = ['Codcom', 'año', 'poblacion', 'factor_poblacion']
        df = df.merge(clasePoblacion, left_on='codcom', right_on='Codcom', how='left').merge(factor, left_on=['codcom', 'año'], right_on=['Codcom', 'año'], how='left')
    except:
        df['factor_poblacion'] = 100000

    # 14. MAXIMOS
    idx_max_hist = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].idxmax()
    info_maximos = df.loc[idx_max_hist, ['delito', 'codcom', 'tipoValCod', 'periodo_detalle']].copy().rename(columns={'periodo_detalle': 'periodo_detalle_max_hist'})
    df = df.merge(info_maximos, on=['delito', 'codcom', 'tipoValCod'], how='left')

    # Proyección Anual
    df['proyeccion_anual'] = df['acumulado_anual'] * (12.0 / df['mes'])
    df['ranking_nacional_mensual'] = df.groupby(['tipoValCod', 'delito', 'id_periodo'])['frecuencia'].rank(method='dense', ascending=False)

    # T22. ESTACIONALIDAD
    print("Calculando Estacionalidad (T22)...")
    df3 = df.copy()
    estacionalidad = df3.groupby(['codcom', 'tipoValCod']).apply(calc_estacionalidad).reset_index()
    df3 = df3.merge(estacionalidad, on=['codcom', 'tipoValCod'], how='left')

    # T23/24 Correlaciones
    print("Calculando Correlaciones Finales...")
    df_corr_base = df3[(df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia') & (df3['tipoValCod'] == '1,2')]
    top_corrs = df_corr_base.groupby('codcom').apply(calculate_top_correlation).reset_index()
    df3 = df3.merge(top_corrs, on='codcom', how='left')
    
    correlaciones_lp = df3.groupby(['codcom', 'tipoValCod']).apply(calc_correlacion_lp).reset_index()
    df3 = df3.merge(correlaciones_lp, on=['codcom', 'tipoValCod'], how='left')

    # OUTPUT
    print("\nGenerando archivos de salida...")
    output_dir = r"D:\GitHub\STOP_WEB3\web_js\data\cead_split"
    os.makedirs(output_dir, exist_ok=True)
    unique_comunas = df3["codcom"].unique()
    for i in progress_wrapper(unique_comunas, desc="Guardando Comunas"):
        aux = df3[df3["codcom"] == i]
        aux.to_json(fr'{output_dir}/{i}', orient='records', compression='gzip', date_format='iso')

    print(f"\nProceso CEAD Finalizado. Filas: {len(df3):,}")
    print(f"Archivos en: {output_dir}")
