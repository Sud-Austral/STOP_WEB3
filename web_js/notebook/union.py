
import pandas as pd


url = r"C:\Users\limc_\Laboratorio\web_stop\Variables Reporte Delincuencia 2.xlsx"
SHEET_NAME = "Delitos CEAD-STOP"

df = pd.read_excel(url, sheet_name=SHEET_NAME)

df.to_json(r"D:\GitHub\STOP_WEB3\web_js\.config\union.json", orient="records", indent=1)