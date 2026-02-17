# Documentación de Fórmulas de Ranking (proceso.py)

## 📌 Ranking Nacional Tasa Anual

El indicador `ranking_nacional_tasa_anual` clasifica a las comunas basándose en la **proyección de la tasa delictual anualizada**.

### 1️⃣ Proyección de Casos Anuales
Se extrapola linealmente el acumulado de casos del año en curso.

```python
factor_expansion = 365 / dia_del_año_actual
proyeccion_anual = acumulado_anual * factor_expansion
```
*Si es año bisiesto, se usa 366.*

### 2️⃣ Cálculo de la Tasa Proyectada
Se normaliza la proyección por cada 100,000 habitantes usando el `factor_poblacion` específico de la comuna.

```python
tasa_proyectada_anual = (proyeccion_anual / factor_poblacion) * 100000
```

### 3️⃣ Generación del Ranking
Se ordenan las comunas de mayor a menor tasa para cada delito y semana.

```python
ranking = df.groupby(['delito', 'id_semana'])['tasa_proyectada_anual'].rank(method='dense', ascending=False)
```

---

## 📌 Ranking Nacional Tasa Semanal

El indicador `ranking_nacional_tasa_sem` clasifica a las comunas basándose en la **tasa delicitual de la semana específica**.

### 1️⃣ Cálculo de la Tasa Semanal
Se usan los casos absolutos de la semana (`frecuencia`).

```python
tasa_semanal = (frecuencia / factor_poblacion) * 100000
```
La `frecuencia` es la columna `CASOS ACTUALES`.

### 2️⃣ Generación del Ranking
Se ordenan las comunas de mayor a menor tasa para cada delito y semana.

```python
ranking = df.groupby(['delito', 'id_semana'])['tasa_semanal'].rank(method='dense', ascending=False)
```

### ⚠️ Manejo de Ceros
Si la frecuencia es 0, el ranking se fuerza a **999** para indicar que no hubo delitos esa semana, en lugar de rankearlo como último lugar numérico.
