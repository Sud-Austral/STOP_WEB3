# ─────────────────────────────────────────────────────────────────────────────
# CELDA ADICIONAL — Generar data/analisis/{codcom}
# Ejecutar DESPUÉS de haber cargado proceso, proceso_cead y comunas.
# ─────────────────────────────────────────────────────────────────────────────

import os
import sys
import json
import datetime
import warnings
import pandas as pd

warnings.filterwarnings("ignore")

ruta_script = r"D:\GitHub\STOP_WEB3\web_js\notebook"
if ruta_script not in sys.path:
    sys.path.insert(0, ruta_script)

# Los módulos ya están cargados en el notebook principal
# (proceso, proceso_cead, comunas). Sólo importamos build_context.
from contexto import build_context

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = r"D:\GitHub\STOP_WEB3\web_js\data\analisis"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── DataFrames heredados del notebook ─────────────────────────────────────────
df_stop    = proceso.df3
df_cead    = proceso_cead.df3
df_comunas = comunas.df3

# ── Encoder JSON robusto ──────────────────────────────────────────────────────
import numpy as np

class _SafeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):          return int(obj)
        if isinstance(obj, np.floating):
            return None if (np.isnan(obj) or np.isinf(obj)) else float(obj)
        if isinstance(obj, np.bool_):            return bool(obj)
        if isinstance(obj, np.ndarray):          return obj.tolist()
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        return super().default(obj)

# ── Iteración por comunas ─────────────────────────────────────────────────────
try:
    from tqdm import tqdm
    iterador = lambda it: tqdm(it, desc="Análisis")
except ImportError:
    iterador = lambda it: it

codcoms = sorted(df_stop['codcom'].dropna().unique().tolist())
print(f"▶ {len(codcoms)} comunas · salida: {OUTPUT_DIR}\n")

ok, err = 0, 0
t0 = datetime.datetime.now()

for codcom in iterador(codcoms):
    try:
        codcom_int = int(codcom)

        # Filtro STOP
        df_s = df_stop[df_stop['codcom'] == codcom].copy()
        # Filtro CEAD — str→int es el cast más robusto (soporta category, float, object)
        if not df_cead.empty:
            try:
                _cead_ids = df_cead['codcom'].astype(str).str.split('.').str[0].astype(int)
                df_c = df_cead[_cead_ids == codcom_int].copy()
            except Exception:
                df_c = pd.DataFrame()
        else:
            df_c = pd.DataFrame()

        if df_s.empty:
            continue

        # ── build_context ──────────────────────────────────────────────────────
        ctx = build_context(df_s, df_c, df_comunas)

        # ── Metadatos raíz ─────────────────────────────────────────────────────
        # 'comuna': nombre legible de la comuna
        nombre = (
            df_s['Comuna'].dropna().iloc[0]
            if 'Comuna' in df_s.columns and not df_s['Comuna'].dropna().empty
            else ''
        )
        # 'week': id_semana máximo con datos
        week = int(df_s['id_semana'].max()) if not df_s['id_semana'].isna().all() else None

        ctx['comuna'] = str(nombre)
        ctx['week']   = week
        ctx['codcom'] = codcom_int

        # ── Guardar JSON ───────────────────────────────────────────────────────
        out_path = os.path.join(OUTPUT_DIR, f"{codcom_int}.json")
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(ctx, f, cls=_SafeEncoder, ensure_ascii=False, indent=2)

        ok += 1

    except Exception as e:
        err += 1
        print(f"  ❌ {codcom}: {e}")

elapsed = (datetime.datetime.now() - t0).total_seconds()
print(f"\n✅ {ok} comunas · {err} errores · {elapsed:.1f}s")
