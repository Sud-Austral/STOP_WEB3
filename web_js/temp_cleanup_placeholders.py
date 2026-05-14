import os
import re

vistas_dir = r"d:\GitHub\STOP_WEB3\web_js\vistas2"
files = [f for f in os.listdir(vistas_dir) if f.startswith("vista") and f.endswith(".html")]

print(f"Buscando en {len(files)} archivos...")

for filename in files:
    filepath = os.path.join(vistas_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. <span class="comuna-fill">CARGANDO...</span>
    # 2. <span class="semana-fill">--</span>
    # 3. <span class="comuna-fill">--</span>
    # 4. <span class="comuna-fill">TU COMUNA</span>
    
    new_content = content
    # comuna-fill
    new_content = re.sub(r'class="comuna-fill"(.*?)>CARGANDO\.\.\.</span>', r'class="comuna-fill"\1>&nbsp;</span>', new_content)
    new_content = re.sub(r'class="comuna-fill"(.*?)>--</span>', r'class="comuna-fill"\1>&nbsp;</span>', new_content)
    new_content = re.sub(r'class="comuna-fill"(.*?)>TU COMUNA</span>', r'class="comuna-fill"\1>&nbsp;</span>', new_content)
    
    # semana-fill
    new_content = re.sub(r'class="semana-fill"(.*?)>--</span>', r'class="semana-fill"\1>&nbsp;</span>', new_content)
    new_content = re.sub(r'class="semana-fill"(.*?)>SEMANA ACTUAL</span>', r'class="semana-fill"\1>&nbsp;</span>', new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Modificado: {filename}")
    else:
        # print(f"Sin cambios: {filename}")
        pass

print("Finalizado.")
