"""
generar_analisis.py
===================
Genera data/analisis/{codcom} para cada comuna presente en df_stop.

Flujo:
    1. Importa los módulos de proceso (STOP, CEAD, comunas).
    2. Itera sobre todas las comunas disponibles en df_stop.
    3. Filtra df_stop y df_cead por codcom.
    4. Aplica build_context() → dict con vista01..vista25.
    5. Agrega las claves 'comuna' e 'id_semana' al dict raíz.
    6. Serializa a JSON comprimido (gzip) en data/analisis/{codcom}.

Uso standalone:
    python generar_analisis.py

Uso como módulo desde notebook:
    exec(open("generar_analisis.py").read())  # hereda los módulos ya cargados
"""

import sys
import os
import json
import warnings
import datetime

warnings.filterwarnings("ignore")

# ── Rutas ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR  = r"D:\GitHub\STOP_WEB3\web_js\notebook"
ROOT_DIR    = r"D:\GitHub\STOP_WEB3\web_js"
OUTPUT_DIR  = os.path.join(ROOT_DIR, "data", "analisis")

if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# ── Imports de módulos de proceso ─────────────────────────────────────────────
print("▶ Cargando módulos de proceso...")

import proceso
import proceso_cead
import comunas
from contexto import build_context

try:
    from tqdm import tqdm
    def _prog(it, **kw): return tqdm(it, **kw)
except ImportError:
    def _prog(it, desc="", **kw):
        print(f"  {desc}")
        return it

# ── Aliases de DataFrames ─────────────────────────────────────────────────────
df_stop    = proceso.df3          # STOP completo (todas las comunas)
df_cead    = proceso_cead.df3     # CEAD completo (todas las comunas)
df_comunas = comunas.df3          # Una fila por comuna (última semana)

print(f"  STOP:    {len(df_stop):,} filas × {len(df_stop.columns)} cols")
print(f"  CEAD:    {len(df_cead):,} filas × {len(df_cead.columns)} cols")
print(f"  COMUNAS: {len(df_comunas):,} comunas × {len(df_comunas.columns)} cols")

# ── Directorio de salida ──────────────────────────────────────────────────────
os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"▶ Salida: {OUTPUT_DIR}\n")

# ── Lista de comunas a procesar ───────────────────────────────────────────────
codcoms = sorted(df_stop['codcom'].dropna().unique().tolist())
print(f"▶ Comunas a procesar: {len(codcoms)}\n")

# ── Serialización JSON robusta ────────────────────────────────────────────────
class _SafeEncoder(json.JSONEncoder):
    """Maneja tipos no serializables: numpy, datetime, NaN."""
    def default(self, obj):
        import numpy as np
        if isinstance(obj, (np.integer,)):  return int(obj)
        if isinstance(obj, (np.floating,)):
            return None if (np.isnan(obj) or np.isinf(obj)) else float(obj)
        if isinstance(obj, (np.bool_,)):    return bool(obj)
        if isinstance(obj, (np.ndarray,)):  return obj.tolist()
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        return super().default(obj)


# ── Procesamiento por comuna ──────────────────────────────────────────────────
ok, err = 0, 0
errores = []

t0 = datetime.datetime.now()

for codcom in _prog(codcoms, desc="Generando análisis"):

    try:
        codcom_int = int(codcom)

        # 1. Filtrar por comuna
        mask_stop = df_stop['codcom'] == codcom
        mask_cead = df_cead['codcom'].astype(float).astype(int) == codcom_int \
                    if 'codcom' in df_cead.columns else df_cead['codcom'] == codcom

        df_stop_com = df_stop[mask_stop].copy()
        df_cead_com = df_cead[mask_cead].copy()

        if df_stop_com.empty:
            print(f"  ⚠️  {codcom_int}: sin datos STOP — omitido")
            continue

        # 2. build_context
        ctx = build_context(df_stop_com, df_cead_com, df_comunas)

        # 3. Metadatos raíz
        #    - 'comuna': nombre de la comuna (del propio df_stop filtrado)
        #    - 'week':   id_semana máximo disponible en df_stop_com
        id_semana_max = int(df_stop_com['id_semana'].max()) \
                        if not df_stop_com['id_semana'].isna().all() else None

        nombre_comuna = ''
        if 'Comuna' in df_stop_com.columns:
            nombre_comuna = df_stop_com['Comuna'].dropna().iloc[0] \
                            if not df_stop_com['Comuna'].dropna().empty else ''

        ctx['comuna'] = str(nombre_comuna)
        ctx['week']   = id_semana_max
        ctx['codcom'] = codcom_int

        # 4. Serializar a JSON comprimido (gzip)
        import gzip
        out_path = os.path.join(OUTPUT_DIR, str(codcom_int))
        payload  = json.dumps(ctx, cls=_SafeEncoder, ensure_ascii=False)

        with gzip.open(out_path, 'wt', encoding='utf-8', compresslevel=5) as f:
            f.write(payload)

        ok += 1

    except Exception as e:
        err += 1
        errores.append({'codcom': codcom, 'error': str(e)})
        print(f"  ❌ {codcom}: {e}")

# ── Resumen ───────────────────────────────────────────────────────────────────
elapsed = (datetime.datetime.now() - t0).total_seconds()
print(f"\n{'─'*50}")
print(f"✅ Completado en {elapsed:.1f}s")
print(f"   OK:    {ok} comunas")
print(f"   ERROR: {err} comunas")

if errores:
    print("\n   Detalle de errores:")
    for e in errores:
        print(f"   · {e['codcom']}: {e['error']}")
