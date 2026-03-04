"""
contexto.py
===========
Genera el diccionario de contexto para las 25 vistas del Reporte de
Inteligencia Delictual (RID).

Uso:
    from contexto import build_context
    ctx = build_context(df_stop, df_cead, df_comunas)

Parámetros
----------
df_stop : pd.DataFrame
    DataFrame de STOP filtrado por la comuna de interés
    (subconjunto del df3 generado por proceso.py).
df_cead : pd.DataFrame
    DataFrame de CEAD filtrado por la comuna de interés
    (subconjunto del df3 generado por proceso_cead.py).
df_comunas : pd.DataFrame
    DataFrame completo inter-comunal generado por comunas.build().

Retorna
-------
dict
    Claves: vista01 … vista25
    Cada valor es un dict con los datos necesarios para renderizar esa vista.

Convenciones
------------
- Todos los valores numéricos se devuelven como Python float/int nativos
  (no numpy) para facilitar serialización JSON.
- Si un dato no existe retorna None en lugar de lanzar excepción.
- Las series temporales se devuelven como listas ordenadas de dicts
  con claves estandarizadas.
"""

import pandas as pd
import numpy as np
from typing import Optional


# ── Utilidades internas ────────────────────────────────────────────────────────

def _safe(val):
    """Convierte numpy scalars → Python nativos; NaN/inf → None."""
    if val is None:
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    return val


def _last_total(df_stop: pd.DataFrame) -> Optional[pd.Series]:
    """Fila de la última semana para delito='Total'."""
    tot = df_stop[df_stop['delito'].isin(['Total', 'TOTAL'])]
    if tot.empty:
        return None
    return tot.sort_values('id_semana').iloc[-1]


def _prev_total(df_stop: pd.DataFrame) -> Optional[pd.Series]:
    """Fila de la semana anterior para delito='Total'."""
    tot = df_stop[df_stop['delito'].isin(['Total', 'TOTAL'])].sort_values('id_semana')
    if len(tot) < 2:
        return None
    return tot.iloc[-2]


def _score_nivel(z: Optional[float]) -> str:
    """Clasifica nivel de riesgo según Z-Score."""
    if z is None:
        return 'SIN DATOS'
    if z > 2:
        return 'CRÍTICO'
    if z > 1:
        return 'ALTO'
    if z > -1:
        return 'NORMAL'
    return 'BAJO'


def _variacion_pct(actual, anterior) -> Optional[float]:
    if actual is None or anterior is None or anterior == 0:
        return None
    return round((actual - anterior) / abs(anterior) * 100, 1)


def _top_delitos(df_stop: pd.DataFrame, n: int = 5) -> list[dict]:
    """Top N delitos por frecuencia en la última semana (excluye Total)."""
    sem_max = df_stop['id_semana'].max()
    df_sem = df_stop[
        (df_stop['id_semana'] == sem_max) &
        (~df_stop['delito'].isin(['Total', 'TOTAL']))
    ].copy()
    df_top = (
        df_sem.groupby('delito')['frecuencia']
        .sum()
        .reset_index()
        .sort_values('frecuencia', ascending=False)
        .head(n)
    )
    return [
        {'delito': row['delito'], 'casos': _safe(row['frecuencia'])}
        for _, row in df_top.iterrows()
    ]


def _tendencia_8s(df_stop: pd.DataFrame) -> list[dict]:
    """Serie de las últimas 8 semanas para delito='Total' (Línea de Tendencia)."""
    tot = df_stop[df_stop['delito'].isin(['Total', 'TOTAL'])].copy()
    if tot.empty:
        return []
    tot = tot.sort_values('id_semana').tail(8)
    return [
        {
            'id_semana':       _safe(r['id_semana']),
            'semana_detalle':  r.get('semana_detalle', ''),
            'frecuencia':      _safe(r['frecuencia']),
            'media_movil_4s':  _safe(r.get('media_movil_4s')),
        }
        for _, r in tot.iterrows()
    ]


def _serie_anual(df_stop: pd.DataFrame, campo: str = 'frecuencia') -> list[dict]:
    """Serie histórica anual de totales para delito='Total'."""
    tot = df_stop[df_stop['delito'].isin(['Total', 'TOTAL'])].copy()
    if tot.empty or 'año' not in tot.columns:
        return []
    grp = tot.groupby('año')[campo].sum().reset_index()
    return [
        {'año': _safe(r['año']), 'valor': _safe(r[campo])}
        for _, r in grp.iterrows()
    ]


def _serie_semanal_delito(
    df_stop: pd.DataFrame,
    delito: Optional[str] = None,
    n_semanas: int = 52
) -> list[dict]:
    """Serie temporal semanal para un delito específico o 'Total'."""
    filtro = df_stop['delito'].isin(['Total', 'TOTAL']) if delito is None \
        else (df_stop['delito'] == delito)
    sub = df_stop[filtro].sort_values('id_semana').tail(n_semanas)
    return [
        {
            'id_semana':      _safe(r['id_semana']),
            'semana_detalle': r.get('semana_detalle', ''),
            'año':            _safe(r.get('año')),
            'frecuencia':     _safe(r['frecuencia']),
        }
        for _, r in sub.iterrows()
    ]


def _top_delitos_completo(df_stop: pd.DataFrame, n: int = 5) -> list[dict]:
    """Top N delitos con variación semanal e interanual."""
    sem_max = df_stop['id_semana'].max()
    df_sem = df_stop[
        (df_stop['id_semana'] == sem_max) &
        (~df_stop['delito'].isin(['Total', 'TOTAL']))
    ].copy()
    df_top = (
        df_sem.sort_values('frecuencia', ascending=False)
        .head(n)
    )
    result = []
    for _, r in df_top.iterrows():
        result.append({
            'delito':         r['delito'],
            'casos':          _safe(r['frecuencia']),
            'var_pct_sem':    _safe(r.get('var_pct_vs_semana_anterior')),
            'casos_year_ant': _safe(r.get('casos_misma_semana_año_anterior')),
            'z_score':        _safe(r.get('z_score')),
        })
    return result


# ── Constructor principal ──────────────────────────────────────────────────────

def build_context(
    df_stop: pd.DataFrame,
    df_cead: pd.DataFrame,
    df_comunas: pd.DataFrame
) -> dict:
    """
    Construye el diccionario de contexto para las 25 vistas del RID.

    Parámetros
    ----------
    df_stop    : DataFrame STOP filtrado por comuna (proceso.py · df3).
    df_cead    : DataFrame CEAD filtrado por comuna (proceso_cead.py · df3).
    df_comunas : DataFrame inter-comunal completo (comunas.build()).

    Retorna
    -------
    dict  { 'vista01': {...}, 'vista02': {...}, ... 'vista25': {...} }
    """

    ctx: dict = {}

    # ── Fila de referencia (última semana, Total) ──────────────────────────────
    last   = _last_total(df_stop)
    prev   = _prev_total(df_stop)

    # Escalares reutilizables
    casos_actual   = _safe(last['frecuencia'])          if last is not None else None
    casos_ant      = _safe(prev['frecuencia'])          if prev is not None else None
    z_score_actual = _safe(last['z_score'])             if last is not None else None
    tasa_actual    = _safe(last.get('tasa_semanal'))    if last is not None else None
    factor_pob     = _safe(last.get('factor_poblacion'))if last is not None else None
    pob            = _safe(last.get('poblacion'))       if last is not None else None
    acum_anual     = _safe(last.get('acumulado_anual')) if last is not None else None
    proy_anual     = _safe(last.get('proyeccion_anual'))if last is not None else None
    semana_detalle = last.get('semana_detalle', '')     if last is not None else ''
    id_semana      = _safe(last['id_semana'])           if last is not None else None
    anio           = _safe(last.get('año'))             if last is not None else None
    comuna_nombre  = last.get('Comuna', '')             if last is not None else ''
    region_nombre  = last.get('Región', '')             if last is not None else ''
    codreg         = _safe(last.get('Codreg'))          if last is not None else None
    clase_pob      = last.get('clase_poblacion', '')    if last is not None else ''

    # Variación semanal e interanual
    var_sem   = _variacion_pct(casos_actual, casos_ant)
    casos_year_ant = _safe(last.get('casos_misma_semana_año_anterior')) if last is not None else None
    var_year  = _variacion_pct(casos_actual, casos_year_ant)

    # Tasa x100k hab
    tasa_100k = round(tasa_actual * 100_000, 1) if tasa_actual else (
        round(casos_actual / factor_pob * 100_000, 1)
        if casos_actual and factor_pob and factor_pob > 0
        else None
    )

    nivel_riesgo = _score_nivel(z_score_actual)

    # Series temporales comunes
    tendencia_8s     = _tendencia_8s(df_stop)
    top5_delitos     = _top_delitos(df_stop, 5)
    top5_completo    = _top_delitos_completo(df_stop, 5)

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 01 — Dashboard Principal STOP
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista01'] = {
        # KPIs superiores
        'casos_totales':       casos_actual,
        'casos_sem_anterior':  casos_ant,
        'var_semanal_pct':     var_sem,
        'var_interanual_pct':  var_year,
        'casos_year_anterior': casos_year_ant,
        'tasa_x100k':          tasa_100k,
        'nivel_riesgo':        nivel_riesgo,
        'z_score':             z_score_actual,
        # Contexto
        'id_semana':           id_semana,
        'semana_detalle':      semana_detalle,
        'año':                 anio,
        'comuna':              comuna_nombre,
        'region':              region_nombre,
        'poblacion':           pob,
        # Ranking inferior
        'clase_poblacion':     clase_pob,
        # Top 5 delitos
        'top5_delitos':        top5_delitos,
        # Serie línea de tendencia (8 semanas)
        'tendencia_8s':        tendencia_8s,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 02 — Variación Semanal Detallada
    # ════════════════════════════════════════════════════════════════════════════
    # Todos los delitos en la última semana con su variación
    sem_max = df_stop['id_semana'].max() if not df_stop.empty else None
    df_sem_actual = df_stop[df_stop['id_semana'] == sem_max].copy() if sem_max else pd.DataFrame()
    delitos_variacion = []
    for _, r in df_sem_actual[~df_sem_actual['delito'].isin(['Total','TOTAL'])].iterrows():
        delitos_variacion.append({
            'delito':       r['delito'],
            'casos':        _safe(r['frecuencia']),
            'casos_ant':    _safe(r.get('casos_semana_anterior')),
            'delta':        _safe(r.get('delta')),
            'var_pct':      _safe(r.get('var_pct_vs_semana_anterior')),
            'tendencia':    r.get('tendencia_corto_plazo', ''),
        })

    ctx['vista02'] = {
        'id_semana':         id_semana,
        'semana_detalle':    semana_detalle,
        'año':               anio,
        'casos_totales':     casos_actual,
        'var_semanal_pct':   var_sem,
        'delitos_variacion': sorted(delitos_variacion, key=lambda x: (x['casos'] or 0), reverse=True),
        'tendencia_8s':      tendencia_8s,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 03 — Acumulado Anual y Proyección
    # ════════════════════════════════════════════════════════════════════════════
    # Serie histórica anual de totales
    serie_historica = _serie_anual(df_stop, 'frecuencia')
    # Proyección anual por delito
    proy_por_delito = []
    if sem_max:
        df_sem_last = df_stop[
            (df_stop['id_semana'] == sem_max) &
            (~df_stop['delito'].isin(['Total','TOTAL']))
        ]
        for _, r in df_sem_last.iterrows():
            proy_por_delito.append({
                'delito':         r['delito'],
                'acum_anual':     _safe(r.get('acumulado_anual')),
                'proy_anual':     _safe(r.get('proyeccion_anual')),
                'acum_anual_ant': _safe(r.get('acumulado_anual_anterior')),
                'cagr_anual_pct': _safe(r.get('t32_cagr_anual')),
            })

    ctx['vista03'] = {
        'id_semana':       id_semana,
        'semana_detalle':  semana_detalle,
        'año':             anio,
        'acum_anual_total': acum_anual,
        'proy_anual_total': proy_anual,
        'factor_expansion': _safe(last.get('factor_expansion_anual')) if last is not None else None,
        'serie_historica_anual': serie_historica,
        'proy_por_delito': sorted(proy_por_delito, key=lambda x: (x['proy_anual'] or 0), reverse=True),
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 04 — Z-Score y Análisis Estadístico
    # ════════════════════════════════════════════════════════════════════════════
    # Z-score por delito en la última semana
    zscore_por_delito = []
    if sem_max:
        df_z = df_stop[
            (df_stop['id_semana'] == sem_max) &
            (~df_stop['delito'].isin(['Total','TOTAL']))
        ]
        for _, r in df_z.iterrows():
            zscore_por_delito.append({
                'delito':         r['delito'],
                'frecuencia':     _safe(r['frecuencia']),
                'z_score':        _safe(r.get('z_score')),
                'promedio_hist':  _safe(r.get('promedio_hist')),
                'std_hist':       _safe(r.get('std_hist')),
                'conclusion_z':   str(r.get('conclusion_z', '')),
                'alerta_critica': bool(r.get('alerta_aumento_critico', False)),
            })

    ctx['vista04'] = {
        'id_semana':         id_semana,
        'semana_detalle':    semana_detalle,
        'año':               anio,
        'z_score_total':     z_score_actual,
        'nivel_riesgo':      nivel_riesgo,
        'promedio_hist_total': _safe(last.get('promedio_hist')) if last is not None else None,
        'std_hist_total':    _safe(last.get('std_hist'))      if last is not None else None,
        'max_hist_total':    _safe(last.get('max_hist'))      if last is not None else None,
        'zscore_por_delito': sorted(zscore_por_delito, key=lambda x: abs(x['z_score'] or 0), reverse=True),
        'tendencia_8s':      tendencia_8s,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 05 — Rankings Nacionales y Regionales (Volumen)
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista05'] = {
        'id_semana':              id_semana,
        'semana_detalle':         semana_detalle,
        'año':                    anio,
        'region':                 region_nombre,
        'codreg':                 codreg,
        'clase_poblacion':        clase_pob,
        'casos_totales':          casos_actual,
        # Rankings volumen
        'rank_comunal_regional':  _safe(last.get('ranking_comunal_regional'))         if last is not None else None,
        'rank_nacional_semanal':  _safe(last.get('ranking_nacional_semanal'))          if last is not None else None,
        'rank_nacional_proy':     _safe(last.get('ranking_nacional_proy_anual'))       if last is not None else None,
        'rank_cluster_semanal':   _safe(last.get('ranking_cluster_semanal'))           if last is not None else None,
        'rank_cluster_proy':      _safe(last.get('ranking_cluster_proy_anual'))        if last is not None else None,
        'rank_nacional_acum':     _safe(last.get('ranking_nacional_acum'))             if last is not None else None,
        # Rankings semana anterior (para delta de ranking)
        'rank_reg_anterior':      _safe(last.get('ranking_comunal_regional_semana_anterior')) if last is not None else None,
        'rank_nac_semanal_anterior': _safe(last.get('ranking_nacional_semanal_anterior'))    if last is not None else None,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 06 — Rankings por Tasa x100k hab.
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista06'] = {
        'id_semana':              id_semana,
        'semana_detalle':         semana_detalle,
        'año':                    anio,
        'tasa_x100k':             tasa_100k,
        'tasa_semanal':           tasa_actual,
        'tasa_proyectada_anual':  _safe(last.get('tasa_proyectada_anual'))  if last is not None else None,
        # Rankings tasa
        'rank_reg_tasa_sem':      _safe(last.get('ranking_regional_tasa_sem'))    if last is not None else None,
        'rank_reg_tasa_anual':    _safe(last.get('ranking_regional_tasa_anual'))  if last is not None else None,
        'rank_nac_tasa_sem':      _safe(last.get('ranking_nacional_tasa_sem'))    if last is not None else None,
        'rank_nac_tasa_anual':    _safe(last.get('ranking_nacional_tasa_anual'))  if last is not None else None,
        'rank_cluster_tasa_sem':  _safe(last.get('ranking_cluster_tasa_sem'))     if last is not None else None,
        'rank_cluster_tasa_anual':_safe(last.get('ranking_cluster_tasa_anual'))   if last is not None else None,
        # Tasas de referencia (benchmark)
        'tasa_semanal_regional':  _safe(last.get('tasa_regional_semanal'))   if last is not None else None,
        'tasa_semanal_nacional':  _safe(last.get('tasa_nacional_semanal'))   if last is not None else None,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 07 — IDI (Índice de Delitos de Impacto)
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista07'] = {
        'id_semana':       id_semana,
        'semana_detalle':  semana_detalle,
        'año':             anio,
        # IDI mensual proyectado y anual
        'idi_proy_mes':    _safe(last.get('idi_proy_mes'))    if last is not None else None,
        'idi_proy_anual':  _safe(last.get('idi_proy_anual'))  if last is not None else None,
        # IDI de referencia (regional, nacional, cluster)
        'idi_proy_regional': _safe(last.get('idi_proy_regional'))  if last is not None else None,
        'idi_proy_nacional': _safe(last.get('idi_proy_nacional'))  if last is not None else None,
        'idi_proy_cluster':  _safe(last.get('idi_proy_cluster'))   if last is not None else None,
        # Tasas proyectadas de referencia
        'tasa_proy_regional': _safe(last.get('tasa_proyectada_regional')) if last is not None else None,
        'tasa_proy_nacional': _safe(last.get('tasa_proyectada_nacional')) if last is not None else None,
        'tasa_proy_cluster':  _safe(last.get('tasa_proyectada_cluster'))  if last is not None else None,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 08 — Aceleración y CAGR
    # ════════════════════════════════════════════════════════════════════════════
    # CAGR por delito
    cagr_por_delito = []
    if sem_max:
        df_cagr = df_stop[
            (df_stop['id_semana'] == sem_max) &
            (~df_stop['delito'].isin(['Total','TOTAL']))
        ]
        for _, r in df_cagr.iterrows():
            cagr_por_delito.append({
                'delito':         r['delito'],
                'cagr_4s':        _safe(r.get('t31_cagr_4s')),
                'cagr_anual':     _safe(r.get('t32_cagr_anual')),
                'media_movil_4s': _safe(r.get('media_movil_4s')),
                'frecuencia':     _safe(r['frecuencia']),
            })

    ctx['vista08'] = {
        'id_semana':        id_semana,
        'semana_detalle':   semana_detalle,
        'año':              anio,
        'cagr_4s_total':    _safe(last.get('t31_cagr_4s'))   if last is not None else None,
        'cagr_anual_total': _safe(last.get('t32_cagr_anual')) if last is not None else None,
        'media_movil_4s':   _safe(last.get('media_movil_4s')) if last is not None else None,
        'cagr_por_delito':  sorted(cagr_por_delito, key=lambda x: abs(x['cagr_anual'] or 0), reverse=True),
        'tendencia_8s':     tendencia_8s,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 09 — Rachas (Alza / Baja)
    # ════════════════════════════════════════════════════════════════════════════
    rachas_alza, rachas_baja = [], []
    if sem_max:
        df_r = df_stop[
            (df_stop['id_semana'] == sem_max) &
            (~df_stop['delito'].isin(['Total','TOTAL']))
        ]
        for _, r in df_r.iterrows():
            entry = {
                'delito':    r['delito'],
                'racha':     _safe(r.get('racha')),
                'racha_alza': _safe(r.get('racha_alza')),
                'racha_baja': _safe(r.get('racha_baja')),
                'tendencia': r.get('tendencia_corto_plazo', ''),
            }
            if (r.get('racha_alza') or 0) > 0:
                rachas_alza.append(entry)
            if (r.get('racha_baja') or 0) > 0:
                rachas_baja.append(entry)

    ctx['vista09'] = {
        'id_semana':     id_semana,
        'semana_detalle': semana_detalle,
        'año':           anio,
        'rachas_alza':   sorted(rachas_alza, key=lambda x: (x['racha_alza'] or 0), reverse=True),
        'rachas_baja':   sorted(rachas_baja, key=lambda x: (x['racha_baja'] or 0), reverse=True),
        # T29 / T30 pre-calculadas
        't29_delito_1':  _safe(last.get('t29_delito_1')) if last is not None else None,
        't29_semanas_1': _safe(last.get('t29_semanas_1')) if last is not None else None,
        't30_delito_1':  _safe(last.get('t30_delito_1')) if last is not None else None,
        't30_semanas_1': _safe(last.get('t30_semanas_1')) if last is not None else None,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 10 — Pareto (Concentración de Delitos)
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista10'] = {
        'id_semana':     id_semana,
        'semana_detalle': semana_detalle,
        'año':           anio,
        'casos_totales': casos_actual,
        # Top 3 Pareto pre-calculadas
        't21_delito_1':  last.get('t21_delito_1') if last is not None else None,
        't21_delito_2':  last.get('t21_delito_2') if last is not None else None,
        't21_delito_3':  last.get('t21_delito_3') if last is not None else None,
        't21_val_1':     _safe(last.get('t21_val_1')) if last is not None else None,
        't21_val_2':     _safe(last.get('t21_val_2')) if last is not None else None,
        't21_val_3':     _safe(last.get('t21_val_3')) if last is not None else None,
        # Full top 5
        'top5_delitos':  top5_delitos,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 11 — Diagnóstico Regional (T19/T20)
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista11'] = {
        'id_semana':       id_semana,
        'semana_detalle':  semana_detalle,
        'año':             anio,
        'region':          region_nombre,
        'codreg':          codreg,
        # Peor delito a nivel regional (T19)
        't19_delito_sem':  last.get('t19_delito_sem')  if last is not None else None,
        't19_rank_sem':    _safe(last.get('t19_rank_sem'))  if last is not None else None,
        't19_delito_ant':  last.get('t19_delito_ant')  if last is not None else None,
        't19_rank_ant':    _safe(last.get('t19_rank_ant'))  if last is not None else None,
        # Peor delito a nivel nacional (T20)
        't20_delito_sem':  last.get('t20_delito_sem')  if last is not None else None,
        't20_rank_sem':    _safe(last.get('t20_rank_sem'))  if last is not None else None,
        't20_delito_ant':  last.get('t20_delito_ant')  if last is not None else None,
        't20_rank_ant':    _safe(last.get('t20_rank_ant'))  if last is not None else None,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 12 — Aporte Regional (T25)
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista12'] = {
        'id_semana':           id_semana,
        'semana_detalle':      semana_detalle,
        'año':                 anio,
        'region':              region_nombre,
        'codreg':              codreg,
        'casos_totales':       casos_actual,
        'casos_sem_regional':  _safe(last.get('casos_semana_regional'))     if last is not None else None,
        'aporte_pct_region':   _safe(last.get('aporte_pct_region'))         if last is not None else None,
        'aporte_pct_ant':      _safe(last.get('aporte_pct_region_ant'))     if last is not None else None,
        'casos_sem_reg_ant':   _safe(last.get('casos_semana_regional_ant')) if last is not None else None,
        'tasa_regional':       _safe(last.get('tasa_regional_semanal'))     if last is not None else None,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 13 — Correlación de Delitos (T23)
    # ════════════════════════════════════════════════════════════════════════════
    ctx['vista13'] = {
        'id_semana':     id_semana,
        'semana_detalle': semana_detalle,
        'año':           anio,
        't23_d1':        last.get('t23_d1')    if last is not None else None,
        't23_d2':        last.get('t23_d2')    if last is not None else None,
        't23_val':       _safe(last.get('t23_val')) if last is not None else None,
        # Serie de los 2 delitos correlacionados (52 semanas)
        'serie_d1': _serie_semanal_delito(df_stop, last.get('t23_d1') if last is not None else None),
        'serie_d2': _serie_semanal_delito(df_stop, last.get('t23_d2') if last is not None else None),
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 14 — Histórico Multi-período (Serie completa por año)
    # ════════════════════════════════════════════════════════════════════════════
    # Serie semanal completa (todos los datos) para Total
    tot_hist = df_stop[df_stop['delito'].isin(['Total','TOTAL'])].sort_values('id_semana')
    serie_completa = [
        {
            'id_semana':      _safe(r['id_semana']),
            'semana_detalle': r.get('semana_detalle', ''),
            'año':            _safe(r.get('año')),
            'frecuencia':     _safe(r['frecuencia']),
            'media_movil_4s': _safe(r.get('media_movil_4s')),
            'media_movil_8s': _safe(r.get('media_movil_8s')),
        }
        for _, r in tot_hist.iterrows()
    ]

    ctx['vista14'] = {
        'id_semana':      id_semana,
        'semana_detalle': semana_detalle,
        'años_disponibles': sorted(tot_hist['año'].dropna().unique().tolist()) if not tot_hist.empty else [],
        'serie_completa': serie_completa,
        'serie_historica_anual': serie_historica,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 15 — Máximos Históricos
    # ════════════════════════════════════════════════════════════════════════════
    maximos = []
    if sem_max:
        df_mx = df_stop[
            (df_stop['id_semana'] == sem_max) &
            (~df_stop['delito'].isin(['Total','TOTAL']))
        ]
        for _, r in df_mx.iterrows():
            maximos.append({
                'delito':              r['delito'],
                'frecuencia':          _safe(r['frecuencia']),
                'max_hist':            _safe(r.get('max_hist')),
                'semana_max_hist':     _safe(r.get('id_semana_max_hist')),
                'sem_detalle_max':     r.get('semana_detalle_max_hist', ''),
                'pct_del_max':         round(r['frecuencia'] / r['max_hist'] * 100, 1)
                                       if r.get('max_hist') and r['max_hist'] > 0 else None,
                'alerta_critica':      bool(r.get('alerta_aumento_critico', False)),
                'alerta_year_ant':     bool(r.get('alerta_vs_año_anterior', False)),
            })

    ctx['vista15'] = {
        'id_semana':      id_semana,
        'semana_detalle': semana_detalle,
        'año':            anio,
        'max_hist_total': _safe(last.get('max_hist')) if last is not None else None,
        'semana_max_hist': _safe(last.get('id_semana_max_hist')) if last is not None else None,
        'maximos_por_delito': sorted(maximos, key=lambda x: (x['frecuencia'] or 0), reverse=True),
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 16 — Alertas Críticas
    # ════════════════════════════════════════════════════════════════════════════
    alertas = [d for d in maximos if d.get('alerta_critica') or d.get('alerta_year_ant')]

    ctx['vista16'] = {
        'id_semana':        id_semana,
        'semana_detalle':   semana_detalle,
        'año':              anio,
        'nivel_riesgo':     nivel_riesgo,
        'z_score':          z_score_actual,
        'alertas':          alertas,
        'n_alertas':        len(alertas),
        'top5_completo':    top5_completo,
        'tendencia_8s':     tendencia_8s,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 17 — Detalle por Delito Específico (serie larga)
    # ════════════════════════════════════════════════════════════════════════════
    # Devuelve la lista de delitos disponibles + la serie completa de cada uno
    delitos_disponibles = sorted(
        df_stop[~df_stop['delito'].isin(['Total','TOTAL'])]['delito'].unique().tolist()
    )
    series_por_delito = {}
    for d in delitos_disponibles:
        series_por_delito[d] = _serie_semanal_delito(df_stop, d, n_semanas=104)

    ctx['vista17'] = {
        'id_semana':          id_semana,
        'semana_detalle':     semana_detalle,
        'año':                anio,
        'delitos_disponibles': delitos_disponibles,
        'series_por_delito':  series_por_delito,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 18 — Evolución Mensual (agregación por mes)
    # ════════════════════════════════════════════════════════════════════════════
    tot_mes = df_stop[df_stop['delito'].isin(['Total','TOTAL'])].copy()
    if 'mes' in tot_mes.columns and 'año' in tot_mes.columns:
        grp_mes = (
            tot_mes.groupby(['año','mes'])['frecuencia']
            .sum()
            .reset_index()
            .sort_values(['año','mes'])
        )
        serie_mensual = [
            {'año': _safe(r['año']), 'mes': _safe(r['mes']), 'frecuencia': _safe(r['frecuencia'])}
            for _, r in grp_mes.iterrows()
        ]
    else:
        serie_mensual = []

    ctx['vista18'] = {
        'id_semana':      id_semana,
        'semana_detalle': semana_detalle,
        'año':            anio,
        'serie_mensual':  serie_mensual,
        'serie_historica_anual': serie_historica,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 19 — Comparativa con Comunas Similares (cluster)
    # ════════════════════════════════════════════════════════════════════════════
    # Filtra df_comunas para el mismo cluster
    comunas_cluster = pd.DataFrame()
    if not df_comunas.empty and clase_pob:
        comunas_cluster = df_comunas[df_comunas['clase_poblacion'] == clase_pob].copy()

    cluster_list = []
    for _, r in comunas_cluster.iterrows():
        cluster_list.append({
            'codcom':              _safe(r.get('codcom')),
            'comuna':              r.get('Comuna', ''),
            'region':              r.get('Región', ''),
            'frecuencia_total':    _safe(r.get('frecuencia_total')),
            'tasa_semanal':        _safe(r.get('tasa_semanal')),
            'ranking_cluster_sem': _safe(r.get('ranking_cluster_semanal')),
            'z_score':             None,  # No disponible en df_comunas
        })

    ctx['vista19'] = {
        'id_semana':       id_semana,
        'semana_detalle':  semana_detalle,
        'año':             anio,
        'clase_poblacion': clase_pob,
        'casos_totales':   casos_actual,
        'tasa_x100k':      tasa_100k,
        'rank_cluster_sem': _safe(last.get('ranking_cluster_semanal'))  if last is not None else None,
        'n_comunas_cluster': len(cluster_list),
        'comunas_cluster': sorted(cluster_list, key=lambda x: (x['frecuencia_total'] or 0), reverse=True),
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 20 — Comparativa Regional (todas las comunas de la región)
    # ════════════════════════════════════════════════════════════════════════════
    comunas_region = pd.DataFrame()
    if not df_comunas.empty and codreg:
        comunas_region = df_comunas[df_comunas['Codreg'] == codreg].copy()

    region_list = []
    for _, r in comunas_region.iterrows():
        region_list.append({
            'codcom':              _safe(r.get('codcom')),
            'comuna':              r.get('Comuna', ''),
            'frecuencia_total':    _safe(r.get('frecuencia_total')),
            'tasa_semanal':        _safe(r.get('tasa_semanal')),
            'ranking_reg_sem':     _safe(r.get('ranking_comunal_regional')),
            'aporte_pct_region':   _safe(r.get('aporte_pct_region')),
        })

    ctx['vista20'] = {
        'id_semana':       id_semana,
        'semana_detalle':  semana_detalle,
        'año':             anio,
        'region':          region_nombre,
        'codreg':          codreg,
        'casos_totales':   casos_actual,
        'rank_reg_sem':    _safe(last.get('ranking_comunal_regional')) if last is not None else None,
        'n_comunas_region': len(region_list),
        'comunas_region':  sorted(region_list, key=lambda x: (x['frecuencia_total'] or 0), reverse=True),
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 21 — Resumen Nacional (todas las comunas)
    # ════════════════════════════════════════════════════════════════════════════
    nac_list = []
    for _, r in df_comunas.iterrows():
        nac_list.append({
            'codcom':           _safe(r.get('codcom')),
            'comuna':           r.get('Comuna', ''),
            'region':           r.get('Región', ''),
            'codreg':           _safe(r.get('Codreg')),
            'clase_poblacion':  r.get('clase_poblacion', ''),
            'frecuencia_total': _safe(r.get('frecuencia_total')),
            'tasa_semanal':     _safe(r.get('tasa_semanal')),
            'rank_nac_sem':     _safe(r.get('ranking_nacional_semanal')),
            'idi_proy_mes':     _safe(r.get('idi_proy_mes')),
        })

    ctx['vista21'] = {
        'id_semana':       id_semana,
        'semana_detalle':  semana_detalle,
        'año':             anio,
        'n_comunas_nac':   len(nac_list),
        'rank_nac_sem':    _safe(last.get('ranking_nacional_semanal')) if last is not None else None,
        'casos_totales':   casos_actual,
        'comuna_actual':   comuna_nombre,
        'comunas_nac':     sorted(nac_list, key=lambda x: (x['frecuencia_total'] or 0), reverse=True),
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 22 — Semana Crítica Histórica
    # ════════════════════════════════════════════════════════════════════════════
    # Identifica la semana con mayor frecuencia histórica (Total)
    if not tot_hist.empty:
        idx_max = tot_hist['frecuencia'].idxmax()
        semana_critica = tot_hist.loc[idx_max]
    else:
        semana_critica = None

    # Distribución de casos por semana_numero (1-52)
    if not tot_hist.empty and 'semana_numero' in tot_hist.columns:
        dist_semana = (
            tot_hist.groupby('semana_numero')['frecuencia']
            .mean()
            .reset_index()
        )
        dist_sem_list = [
            {'semana_numero': _safe(r['semana_numero']), 'promedio': round(_safe(r['frecuencia']), 1)}
            for _, r in dist_semana.iterrows()
        ]
    else:
        dist_sem_list = []

    ctx['vista22'] = {
        'id_semana':         id_semana,
        'semana_detalle':    semana_detalle,
        'año':               anio,
        'semana_critica_id': _safe(semana_critica['id_semana'])      if semana_critica is not None else None,
        'semana_critica_det': semana_critica.get('semana_detalle','') if semana_critica is not None else None,
        'semana_critica_año': _safe(semana_critica.get('año'))        if semana_critica is not None else None,
        'semana_critica_casos': _safe(semana_critica['frecuencia'])   if semana_critica is not None else None,
        'dist_por_semana_numero': dist_sem_list,
        'serie_completa':    serie_completa,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 23 — Análisis de Año Anterior (comparativa YoY)
    # ════════════════════════════════════════════════════════════════════════════
    yoy_por_delito = []
    if sem_max:
        df_yoy = df_stop[
            (df_stop['id_semana'] == sem_max) &
            (~df_stop['delito'].isin(['Total','TOTAL']))
        ]
        for _, r in df_yoy.iterrows():
            yoy_por_delito.append({
                'delito':           r['delito'],
                'casos_actual':     _safe(r['frecuencia']),
                'casos_year_ant':   _safe(r.get('casos_misma_semana_año_anterior')),
                'var_yoy_pct':      _variacion_pct(
                    _safe(r['frecuencia']),
                    _safe(r.get('casos_misma_semana_año_anterior'))
                ),
                'acum_anual':       _safe(r.get('acumulado_anual')),
                'acum_anual_ant':   _safe(r.get('acumulado_anual_anterior')),
                'z_year_ant':       _safe(r.get('z_score_vs_año_anterior')),
            })

    ctx['vista23'] = {
        'id_semana':         id_semana,
        'semana_detalle':    semana_detalle,
        'año':               anio,
        'casos_actual':      casos_actual,
        'casos_year_ant':    casos_year_ant,
        'var_interanual_pct': var_year,
        'acum_anual_total':  acum_anual,
        'yoy_por_delito':    sorted(yoy_por_delito, key=lambda x: (x['casos_actual'] or 0), reverse=True),
        'serie_historica_anual': serie_historica,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 24 — IDI Histórico y Tendencia
    # ════════════════════════════════════════════════════════════════════════════
    idi_hist = df_stop[df_stop['delito'].isin(['Total','TOTAL'])].sort_values('id_semana')
    idi_serie = [
        {
            'id_semana':      _safe(r['id_semana']),
            'semana_detalle': r.get('semana_detalle', ''),
            'año':            _safe(r.get('año')),
            'idi_proy_mes':   _safe(r.get('idi_proy_mes')),
            'idi_proy_anual': _safe(r.get('idi_proy_anual')),
        }
        for _, r in idi_hist.iterrows()
    ]

    ctx['vista24'] = {
        'id_semana':        id_semana,
        'semana_detalle':   semana_detalle,
        'año':              anio,
        'idi_proy_mes':     _safe(last.get('idi_proy_mes'))    if last is not None else None,
        'idi_proy_anual':   _safe(last.get('idi_proy_anual'))  if last is not None else None,
        'idi_regional':     _safe(last.get('idi_proy_regional')) if last is not None else None,
        'idi_nacional':     _safe(last.get('idi_proy_nacional')) if last is not None else None,
        'idi_cluster':      _safe(last.get('idi_proy_cluster'))  if last is not None else None,
        'idi_serie':        idi_serie,
    }

    # ════════════════════════════════════════════════════════════════════════════
    # VISTA 25 — Dashboard Integrado STOP + CEAD
    # Requiere df_cead además de df_stop
    # ════════════════════════════════════════════════════════════════════════════
    # Último período CEAD (delito='Total')
    if not df_cead.empty:
        cead_tot = df_cead[df_cead['delito'].isin(['Total','TOTAL'])].copy()
        if not cead_tot.empty:
            cead_last = cead_tot.sort_values('id_periodo').iloc[-1]
        else:
            cead_last = None

        # Serie CEAD (últimos 24 meses, Total)
        cead_serie = []
        if cead_last is not None:
            cead_24m = cead_tot.sort_values('id_periodo').tail(24)
            cead_serie = [
                {
                    'id_periodo':      _safe(r['id_periodo']),
                    'periodo_detalle': r.get('periodo_detalle', ''),
                    'año':             _safe(r.get('año')),
                    'mes':             _safe(r.get('mes')),
                    'frecuencia':      _safe(r['frecuencia']),
                    'z_score':         _safe(r.get('z_score')),
                }
                for _, r in cead_24m.iterrows()
            ]

        # Rankings CEAD
        cead_rank_reg  = _safe(cead_last.get('ranking_comunal_regional'))  if cead_last is not None else None
        cead_rank_nac  = _safe(cead_last.get('ranking_nacional_mensual'))   if cead_last is not None else None
        cead_infog_v10 = cead_last.get('infografia_v10', '')                if cead_last is not None else ''
        cead_tasa      = _safe(cead_last.get('tasa_cead'))                  if cead_last is not None else None
    else:
        cead_last   = None
        cead_serie  = []
        cead_rank_reg  = None
        cead_rank_nac  = None
        cead_infog_v10 = ''
        cead_tasa      = None

    ctx['vista25'] = {
        # -- STOP
        'id_semana':          id_semana,
        'semana_detalle':     semana_detalle,
        'año':                anio,
        'casos_stop':         casos_actual,
        'var_sem_pct':        var_sem,
        'var_year_pct':       var_year,
        'z_score':            z_score_actual,
        'nivel_riesgo':       nivel_riesgo,
        'tasa_x100k_stop':    tasa_100k,
        'idi_proy_mes':       _safe(last.get('idi_proy_mes'))    if last is not None else None,
        'idi_proy_anual':     _safe(last.get('idi_proy_anual'))  if last is not None else None,
        'top5_delitos':       top5_delitos,
        'tendencia_8s':       tendencia_8s,
        # -- CEAD
        'cead_periodo':       cead_last.get('periodo_detalle', '') if cead_last is not None else None,
        'casos_cead':         _safe(cead_last.get('frecuencia'))   if cead_last is not None else None,
        'tasa_cead':          cead_tasa,
        'rank_reg_cead':      cead_rank_reg,
        'rank_nac_cead':      cead_rank_nac,
        'infografia_v10':     cead_infog_v10,
        'cead_serie_24m':     cead_serie,
        # -- Contexto compartido
        'comuna':             comuna_nombre,
        'region':             region_nombre,
        'clase_poblacion':    clase_pob,
        'poblacion':          pob,
    }

    return ctx
