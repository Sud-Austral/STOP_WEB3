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
import glob

warnings.filterwarnings("ignore")

ruta_script = r"D:\GitHub\STOP_WEB3\web_js\notebook"
if ruta_script not in sys.path:
    sys.path.insert(0, ruta_script)

from contexto import build_context

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = r"D:\GitHub\STOP_WEB3\web_js\data\analisis"
STOP_DIR = r"D:\GitHub\STOP_WEB3\web_js\data\stop"
CEAD_DIR = r"D:\GitHub\STOP_WEB3\web_js\data\cead_split"
COMUNAS_FILE = r"D:\GitHub\STOP_WEB3\web_js\data\comunas\data_comuna.json"

os.makedirs(OUTPUT_DIR, exist_ok=True)

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

# Get all available codcoms from the STOP_DIR
stop_files = glob.glob(os.path.join(STOP_DIR, '*'))
codcoms = sorted([os.path.basename(f) for f in stop_files])
print(f"▶ {len(codcoms)} comunas · salida: {OUTPUT_DIR}\n")

# Load comunas dataset once
df_comunas = pd.DataFrame()
if os.path.exists(COMUNAS_FILE):
    try:
        df_comunas = pd.read_json(COMUNAS_FILE, compression='gzip')
    except Exception as e:
         print(f"Error loading comunas: {e}")

ok, err = 0, 0
t0 = datetime.datetime.now()

for codcom in iterador(codcoms):
    try:
        codcom_int = int(codcom)

        # Filtro STOP: Read directly from parquet file
        stop_file_path = os.path.join(STOP_DIR, codcom)
        if os.path.exists(stop_file_path):
            df_s = pd.read_json(stop_file_path, compression='gzip')
        else:
             df_s = pd.DataFrame()

        # Filtro CEAD: Read directly from parquet file
        cead_file_path = os.path.join(CEAD_DIR, codcom)
        if os.path.exists(cead_file_path):
             df_c = pd.read_json(cead_file_path, compression='gzip')
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
        if not df_s['id_semana'].isna().all():
            idx_max = df_s['id_semana'].idxmax()
            week = df_s.loc[idx_max, 'semana_detalle'] if 'semana_detalle' in df_s.columns else None
        else:
            week = None

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
