import os, re

d = r"d:\GitHub\STOP_WEB3\web_js\vistas2"
files = [f for f in os.listdir(d) if f.startswith('vista') and f.endswith('.html')]
files.sort(key=lambda x: int(re.search(r'\d+', x).group()))

out = {}
for f in files:
    with open(os.path.join(d, f), 'r', encoding='utf-8') as file:
        content = file.read()
        match = re.search(r'<h2[^>]*>([\s\S]*?)</h2>', content)
        if match:
            out[f.split('.')[0]] = match.group(1).strip().replace('\n', ' ')

for k, v in out.items():
    print(f"- {k}: {re.sub(' +', ' ', v)}")
