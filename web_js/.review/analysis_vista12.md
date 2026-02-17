# Análisis de Ranking Nacional en Vista 12

## ❓ Pregunta
¿Qué dato se utiliza en "Rank Nacional (Tasa Mes)"?

## 🔍 Hallazgo en Código

1.  **Backend (`proceso_cead.py`)**:
    El cálculo de `ranking_nacional_mensual` se realiza en la línea 275:
    ```python
    df['ranking_nacional_mensual'] = df.groupby(['delito', 'id_periodo'])['frecuencia'].rank(method='dense', ascending=False)
    ```
    Usa `frecuencia`, que corresponde a la **cantidad absoluta de casos**.

2.  **Frontend (`vista12.html`)**:
    La etiqueta dice `Rank Nacional (Tasa Mes):`.

## 🚨 Conclusión
Estás usando el **Ranking por Volumen de Casos (Frecuencia Absoluta)**.
Existe una discrepancia: la etiqueta dice "Tasa" pero el dato es "Volumen".

### Recomendación
Si deseas mostrar realmente el ranking por Tasa, se debe modificar `notebook/proceso_cead.py` para calcular la tasa mensual (`frecuencia / poblacion * 100000`) y rankear en base a eso.
