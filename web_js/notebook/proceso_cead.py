import pandas as pd
import warnings
import numpy as np
import os
import sys
from statsmodels.tsa.statespace.sarimax import SARIMAX


def ejecutar_proceso():
    print(">>> Iniciando Proceso CEAD (Modo Secuencial)...")
    
    # -----------------------------------------
    # 0. Configuración Progreso (tqdm)
    # -----------------------------------------
    try:
        from tqdm import tqdm
        USE_TQDM = True
    except ImportError:
        USE_TQDM = False

    def progress_wrapper(iterable, desc="Procesando", total=None):
        try:
           if USE_TQDM:
               return tqdm(iterable, desc=desc, total=total, smoothing=0.1)
        except: pass
        return iterable

    # -----------------------------------------
    # 1. Definiciones y Constantes Locales
    # -----------------------------------------    # Configuración de Fechas
    START_FILL = "2025-10-01"
    END_FILL = "2025-12-01" # 
    LIMIT_DATE = "2025-09-01" # 
    MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    
    MESES_CORTOS = {1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
                    7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'}
    
    TRIMESTRES = {1: 'Enero-Marzo', 2: 'Abril-Junio', 3: 'Julio-Septiembre', 4: 'Octubre-Diciembre'}
    
    MES_NUM = {m: i+1 for i, m in enumerate(MESES)}
    
    FILL_PERIODS = pd.date_range(start=START_FILL, end=END_FILL, freq='MS')
    
    def date_to_id(dt): return dt.year * 100 + dt.month

    # -----------------------------------------
    # 2. Funciones Auxiliares (Closures)
    # -----------------------------------------
    def predecir_sarima_secuencial(args):
        """Función de predicción para ejecución secuencial con validación de anomalías."""
        # Silenciar advertencias específicas de este modelo para evitar spam en logs
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            
            (com, tipo, delit, tipo_val_nombre, serie_train) = args
            
            # Promedio base para chequeo de sanidad (últimos 12 meses conocidos)
            avg_base = serie_train.iloc[-12:].mean() if len(serie_train) >= 12 else serie_train.mean()
            if np.isnan(avg_base) or avg_base == 0: avg_base = 0.1

            if len(serie_train) < 24 or serie_train.std() < 0.01:
                last_val = serie_train.iloc[-3:].mean() if len(serie_train) >= 3 else serie_train.mean()
                vals_pred = [max(0, round(last_val))] * len(FILL_PERIODS)
            else:
                try:
                    model = SARIMAX(
                        serie_train,
                        order=(1, 1, 0), 
                        seasonal_order=(0, 1, 0, 12),
                        enforce_stationarity=False,
                        enforce_invertibility=False,
                        simple_differencing=True
                    )
                    result = model.fit(disp=False, maxiter=15, cov_type='none', method='powell')
                    forecast = result.get_forecast(steps=len(FILL_PERIODS))
                    vals_pred = [max(0, round(v)) for v in forecast.predicted_mean]
                    
                    # --- SANITY CHECK ---
                    # Si alguna predicción cae un 50% por debajo del promedio anual base (siendo base > 5)
                    # Lo consideramos una anomalía del modelo (colapso) y usamos promedio simple.
                    is_anomalous = False
                    if avg_base > 5:
                        for v in vals_pred:
                            if v < (avg_base * 0.5): # Umbral estricto: caída > 50% es anomalía
                                is_anomalous = True
                                break
                    
                    if is_anomalous:
                        # Fallback Robusto: Promedio de los últimos 6 meses IGNORANDO ceros finales (posibles datos incompletos)
                        # Tomamos los ultimos 6 meses
                        recent = serie_train.iloc[-6:] if len(serie_train) >= 6 else serie_train
                        
                        # Si el promedio base es alto (>10), filtramos meses con < 5 casos para no ensuciar el promedio
                        fallback_val = avg_base # Default a promedio anual
                        
                        if avg_base > 10:
                            months_valid = recent[recent > 5]
                            if not months_valid.empty:
                                fallback_val = months_valid.mean()
                        else:
                            fallback_val = recent.mean()
                            
                        # print(f"⚠️ Anomalía detectada en {delit} (Pred: {vals_pred[0]} vs Base: {avg_base:.1f}). Corrigiendo a {fallback_val:.1f}")
                        vals_pred = [max(0, round(fallback_val))] * len(FILL_PERIODS)
                        
                except:
                    # Fallback por error de ejecución: Promedio ultimos 3
                    fallback_val = serie_train.iloc[-3:].mean() if len(serie_train) >= 3 else serie_train.iloc[-1]
                    vals_pred = [max(0, round(fallback_val))] * len(FILL_PERIODS)
            
            res = []
            for i, date_f in enumerate(FILL_PERIODS):
                res.append({
                    'codcom': com, 'tipoValCod': tipo, 'delito': delit,
                    'año': date_f.year, 'mes': date_f.month,
                    'id_periodo': date_to_id(date_f), 'fecha': date_f,
                    'frecuencia': vals_pred[i], 'tipoVal': tipo_val_nombre
                })
            return res

    def calc_estacionalidad(group):
        total_rows = group[group['delito'] == 'Total']
        if total_rows.empty: return pd.Series({'t22_mes_nombre': 'N/D', 't22_mes_pct': 0.0, 't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0})
        por_mes = total_rows.groupby('mes')['frecuencia'].sum()
        if por_mes.empty or por_mes.sum() == 0: return pd.Series({'t22_mes_nombre': 'N/D', 't22_mes_pct': 0.0, 't22_trimestre_nombre': 'N/D', 't22_trimestre_pct': 0.0})
        prom_mensual = por_mes.mean()
        mes_max = por_mes.idxmax()
        mes_pct = ((por_mes[mes_max] - prom_mensual) / prom_mensual * 100) if prom_mensual > 0 else 0
        total_rows_q = total_rows.copy(); total_rows_q['trimestre'] = ((total_rows_q['mes'] - 1) // 3) + 1
        por_trim = total_rows_q.groupby('trimestre')['frecuencia'].sum()
        prom_trim = por_trim.mean(); trim_max = por_trim.idxmax() if not por_trim.empty else 1
        trim_pct = ((por_trim[trim_max] - prom_trim) / prom_trim * 100) if prom_trim > 0 else 0
        return pd.Series({'t22_mes_nombre': MESES_CORTOS.get(mes_max, str(mes_max)), 't22_mes_pct': round(mes_pct, 1), 't22_trimestre_nombre': TRIMESTRES.get(trim_max, f'Q{trim_max}'), 't22_trimestre_pct': round(trim_pct, 1)})

    def calc_correlacion_lp(group):
        fam = group[(group['Nivel'] == 'Familia') & (group['delito'] != 'Total')]
        if fam.empty or fam['delito'].nunique() < 2: return pd.Series({f't24_d{i+1}_{j+1}': '-' for i in range(4) for j in range(2)} | {f't24_v{i+1}': 0.0 for i in range(4)})
        pivot = fam.pivot_table(index='id_periodo', columns='delito', values='frecuencia', aggfunc='sum').fillna(0)
        pivot = pivot.loc[:, pivot.std() > 0]
        if pivot.shape[1] < 2 or len(pivot) < 6: return pd.Series({'t24_d1_1': 'Insuf. Datos'} | {f't24_v{i+1}': 0.0 for i in range(4)})
        corr = pivot.corr(); mask = np.triu(np.ones_like(corr, dtype=bool), k=1); pairs = corr.where(mask).stack().sort_values(ascending=False)
        res = {}
        for i in range(4):
            if i < len(pairs): (d1, d2), val = pairs.index[i], pairs.iloc[i]; res[f't24_d{i+1}_1'] = d1[:35]; res[f't24_d{i+1}_2'] = d2[:35]; res[f't24_v{i+1}'] = round(val, 2)
            else: res[f't24_d{i+1}_1'] = '-'; res[f't24_d{i+1}_2'] = '-'; res[f't24_v{i+1}'] = 0.0
        return pd.Series(res)

    def calculate_top_correlation(group):
        if len(group) < 6: return pd.Series({'t23_d1': 'S.D.', 't23_d2': 'S.D.', 't23_val': 0.0})
        pivot = group.pivot(index='id_periodo', columns='delito', values='frecuencia').fillna(0)
        pivot = pivot.loc[:, (pivot != pivot.iloc[0]).any()]
        if pivot.shape[1] < 2: return pd.Series({'t23_d1': 'S.Var', 't23_d2': 'S.Var', 't23_val': 0.0})
        corr_upper = pivot.corr().where(np.triu(np.ones(pivot.corr().shape, dtype=bool), k=1))
        try:
            mv = corr_upper.max().max()
            if pd.isna(mv): return pd.Series({'t23_d1': '-', 't23_d2': '-', 't23_val': 0.0})
            idx = corr_upper.stack().idxmax(); return pd.Series({'t23_d1': idx[0], 't23_d2': idx[1], 't23_val': mv})
        except: return pd.Series({'t23_d1': 'Err', 't23_d2': 'Err', 't23_val': 0.0})
    
    # -----------------------------------------
    # 3. Lógica Principal
    # -----------------------------------------
    url = r"C:\Users\limc_\Laboratorio\cead2\CEAD_FULL.csv"
    if not os.path.exists(url): url = r"CEAD_FULL.csv"
    if not os.path.exists(url): sys.exit(f"Data file not found: {url}")

    df_raw = pd.read_csv(url, compression="xz", sep="\t")
    df_raw = df_raw[df_raw["tipoValCod"] == "1,2"]
    df_raw = df_raw[df_raw["CODIGO"] > 10000].copy()
    df_raw['nivel_original'] = df_raw['Nivel']

    df = df_raw.melt(id_vars=['Codcom', 'Año', 'tipoValCod', 'tipoVal', 'CODIGO', 'Descripcion', 'Nivel', 'nivel_original'], 
                    value_vars=MESES, var_name='mes_nombre', value_name='frecuencia')
    df['mes'] = df['mes_nombre'].map(MES_NUM)
    df['frecuencia'] = pd.to_numeric(df['frecuencia'], errors='coerce').fillna(0).astype(int)
    df.rename(columns={'Codcom': 'codcom', 'Año': 'año', 'Descripcion': 'delito'}, inplace=True)
    df['id_periodo'] = df['año'] * 100 + df['mes']
    df['fecha'] = pd.to_datetime(df['año'].astype(str) + '-' + df['mes'].astype(str) + '-01')
    df['periodo_detalle'] = df['mes_nombre'] + ' ' + df['año'].astype(str)

    delitos_config = df[['delito', 'Nivel', 'nivel_original', 'CODIGO']].drop_duplicates('delito')

    # 4. SARIMA SECUENCIAL
    limit_id = date_to_id(pd.to_datetime(LIMIT_DATE))
    df_train = df[df['id_periodo'] <= limit_id].copy()
    grupos = df_train[df_train['delito'] != 'Total'].groupby(['codcom', 'tipoValCod', 'delito'])

    resultados_raw = []
    print(f"> Procesando {len(grupos):,} series de tiempo secuencialmente...")
    
    for (com, tipo, delit), group in progress_wrapper(grupos, desc="Prediciendo"):
        serie = group.groupby('fecha')['frecuencia'].sum().sort_index().asfreq('MS').fillna(0)
        serie_train = serie.replace(0, np.nan).dropna()
        if serie_train.empty: serie_train = serie
        
        # Ejecución directa sin pool
        res = predecir_sarima_secuencial((com, tipo, delit, group['tipoVal'].iloc[0], serie_train))
        resultados_raw.append(res)

    df_preds = pd.DataFrame([item for sublist in resultados_raw for item in sublist])
    df_preds = df_preds.merge(delitos_config, on='delito', how='left')

    # Redefinir para asegurar scope en entornos extraños de notebook
    meses_map = {1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
                 7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'}
    
    df_preds['mes_nombre'] = df_preds['mes'].map(meses_map)
    df_preds['periodo_detalle'] = df_preds['mes_nombre'] + ' ' + df_preds['año'].astype(str)

    df = pd.concat([df_train, df_preds], ignore_index=True).sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo']).reset_index(drop=True)

    print("> Calculando métricas y acumulados...")
    df = df[df['delito'] != 'Total']
    totales = df.groupby(['codcom', 'id_periodo', 'tipoValCod', 'tipoVal'], as_index=False)['frecuencia'].sum()
    totales['delito'] = 'Total'; totales['CODIGO'] = 0; totales['Nivel'] = 'Total'; totales['nivel_original'] = 'Total'
    time_meta = df[['id_periodo', 'año', 'mes', 'fecha', 'mes_nombre', 'periodo_detalle']].drop_duplicates()
    df = pd.concat([df, totales.merge(time_meta, on='id_periodo')], ignore_index=True).sort_values(['codcom', 'tipoValCod', 'delito', 'id_periodo']).reset_index(drop=True)

    df['media_movil_3m'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.rolling(3, min_periods=1).mean())
    df['promedio_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.expanding().mean())
    df['std_hist'] = df.groupby(['delito', 'codcom', 'tipoValCod'])['frecuencia'].transform(lambda x: x.expanding().std())
    df['acumulado_anual'] = df.groupby(['delito', 'codcom', 'tipoValCod', 'año'])['frecuencia'].cumsum()
    df['proyeccion_anual'] = df['acumulado_anual'] * (12.0 / df['mes'])
    
    print("> Agregando metadatos finales...")
    try:
        localiza = pd.read_excel(r"D:\GitHub\STOP_WEB3\web_js\data\Localiza Chile (1).xlsx")[['Provincia', 'Comuna', 'Región', 'Codcom', 'Codreg']].drop_duplicates()
        df = df.merge(localiza, left_on='codcom', right_on='Codcom', how='left')
    except:
        try:
            localiza = pd.read_excel(r"D:\GitHub\LOCALIZA_DB\Localiza Chile (1).xlsx")[['Provincia', 'Comuna', 'Región', 'Codcom', 'Codreg']].drop_duplicates()
            df = df.merge(localiza, left_on='codcom', right_on='Codcom', how='left')
        except: pass

    try:
        pob = pd.read_excel(r"C:\Users\limc_\Downloads\Factores Población.xlsx", sheet_name="Factores")[['Codcom', 'Año', 'Población', 'Factor Población']]
        df = df.merge(pob.rename(columns={'Año': 'año', 'Factor Población': 'factor_poblacion'}), left_on=['codcom', 'año'], right_on=['Codcom', 'año'], how='left')
    except: df['factor_poblacion'] = 100000

    print("> Calculando Rankings CEAD...")
    # Ranking Regional por Frecuencia (Descendente: Mayor delito = Rank 1)
    if 'Codreg' in df.columns:
        # Ranking mensual
        df['ranking_comunal_regional'] = df.groupby(['Codreg', 'delito', 'id_periodo'])['frecuencia'].rank(method='dense', ascending=False)
        
        # Ranking Anual (Basado en total anual real)
        total_anual = df.groupby(['codcom', 'delito', 'año'])['frecuencia'].sum().reset_index(name='total_año_real')
        df = df.merge(total_anual, on=['codcom', 'delito', 'año'], how='left')
        
        # Rankear sobre dataframe reducido para eficiencia y luego merge
        ranking_anual_df = df[['codcom', 'Codreg', 'delito', 'año', 'total_año_real']].drop_duplicates()
        ranking_anual_df['ranking_regional_anual_metric'] = ranking_anual_df.groupby(['Codreg', 'delito', 'año'])['total_año_real'].rank(method='dense', ascending=False)
        
        df = df.merge(ranking_anual_df[['codcom', 'delito', 'año', 'ranking_regional_anual_metric']], on=['codcom', 'delito', 'año'], how='left')
        
    # Ranking Nacional Mensual
    df['ranking_nacional_mensual'] = df.groupby(['delito', 'id_periodo'])['frecuencia'].rank(method='dense', ascending=False)

    print("> Calculando IDI CEAD (Basado en Union)...")
    try:
        import json
        # 1. Definir Pesos Base STOP
        weights_stop = {
            'HOMICIDIOS Y FEMICIDIOS': 1000,
            'ROBOS CON VIOLENCIA E INTIMIDACIÓN': 150,
            'VIOLACIONES Y DELITOS SEXUALES': 200,
            'LEY DE CONTROL DE ARMAS': 75,
            'LEY DE DROGAS': 30,
            'DELITOS EN CONTEXTO DE VIOLENCIA INTRAFAMILIAR': 40
        }
        
        # 2. Cargar Union
        union_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".config", "union.json")
        if os.path.exists(union_path):
            with open(union_path, 'r', encoding='utf-8') as f:
                union_data = json.load(f)
            
            map_cead_weight = {}
            for item in union_data:
                stop_name = item.get(' Delitos_stop', '').strip()
                weight = weights_stop.get(stop_name, 0)
                if weight > 0:
                    map_cead_weight[item['id_subgrupo']] = weight
            
            # 3. Aplicar mapeo (df['CODIGO'] es el id_subgrupo CEAD)
            df['idi_peso'] = df['CODIGO'].map(map_cead_weight).fillna(0)
            
            # 4. Calcular Métricas IDI
            # IDI Mensual Ponderado por Población (Puntos)
            df['idi_mensual'] = (df['frecuencia'] * df['idi_peso'] / df['factor_poblacion']).fillna(0)
            
            # IDI Acumulado Anual
            df['idi_acumulado_anual'] = df.groupby(['codcom', 'delito', 'año'])['idi_mensual'].cumsum()
            
            print(f"   - Pesos asignados exitosamente usando union.json")
        else:
            print(f"⚠️ Archivo union.json no encontrado en {union_path}")
            df['idi_peso'] = 0
            df['idi_mensual'] = 0
            
    except Exception as e:
        print(f"⚠️ Error calculando IDI CEAD: {e}")
        df['idi_peso'] = 0

    df3 = df.copy()
    est = df3.groupby(['codcom', 'tipoValCod']).apply(calc_estacionalidad).reset_index()
    df3 = df3.merge(est, on=['codcom', 'tipoValCod'], how='left')
    
    df_c = df3[(df3['delito'] != 'Total') & (df3['Nivel'] != 'Familia') & (df3['tipoValCod'] == '1,2')]
    df3 = df3.merge(df_c.groupby('codcom').apply(calculate_top_correlation).reset_index(), on='codcom', how='left')
    df3 = df3.merge(df3.groupby(['codcom', 'tipoValCod']).apply(calc_correlacion_lp).reset_index(), on=['codcom', 'tipoValCod'], how='left')

    out = r"D:\GitHub\STOP_WEB3\web_js\data\cead_split"
    os.makedirs(out, exist_ok=True)
    for i in progress_wrapper(df3["codcom"].unique(), desc="Guardando"):
        df3[df3["codcom"] == i].to_json(fr'{out}/{i}', orient='records', compression='gzip', date_format='iso')

    import json
    import datetime

    # 4. Generar Archivo de Configuración (.config/cead.json)
    print("> Generando metadatos de configuración...")
    config_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".config")
    os.makedirs(config_dir, exist_ok=True)
    
    # Extraer columnas y tipos de datos
    columns_info = {col: str(dtype) for col, dtype in df3.dtypes.items()}
    
    # Extraer rango de fechas
    min_date = df3['fecha'].min().isoformat() if not df3.empty else None
    max_date = df3['fecha'].max().isoformat() if not df3.empty else None
    
    config_data = {
        "timestamp": datetime.datetime.now().isoformat(),
        "source": "proceso_cead.py",
        "rows": len(df3),
        "columns": list(df3.columns),
        "column_types": columns_info,
        "date_range": {
            "start": min_date,
            "end": max_date
        },
        "limits": {
            "start_fill": START_FILL,
            "end_fill": END_FILL,
            "limit_date": LIMIT_DATE
        },
        "mapping_hint": {
            "CASOS_ACTUAL": "frecuencia",
            "CASOS_ANT": "casos_mes_anterior", 
            "DELITO": "delito",
            "ID_PERIODO": "id_periodo"
        }
    }
    
    config_path = os.path.join(config_dir, "cead.json")
    with open(r"D:\GitHub\STOP_WEB3\web_js\.config\cead.json", "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4, ensure_ascii=False)
    
    print(f"✅ Configuración guardada en: {config_path}")

    print(f">>> Completado. {len(df3):,} filas procesadas.")
    return df3


# Inicializar variable global
df3 = None

if __name__ == "__main__":
    df3 = ejecutar_proceso()
else:
    # Carga automática al importar
    print("Iniciando carga automática de proces_cead...")
    try:
        df3 = ejecutar_proceso()
    except Exception as e:
        print(f"❌ Error CRÍTICO en carga automática: {e}")
        # Re-raise para que el usuario vea el trace en el notebook
        raise e
    except SystemExit as e:
        print(f"❌ El proceso detuvo la ejecución (posiblemente falta archivo): {e}")
