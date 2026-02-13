# 🛠️ Reporte de Errores: STOP WEB V2

## 1️⃣ GESTIÓN DE MEMORIA Y DOM

**❗ Problema**: Fuga de Memoria en Chart.js
**📍 Ubicación**: Todas las Vistas en `vistas2/*.html` (ej. `vista21.html`, `vista4.html`)
**💥 Escenario de Fallo**: 
1. Usuario navega a Vista 21. Se crea `new Chart()`.
2. Usuario cambia a Vista 22. El HTML de Vista 21 se elimina.
3. El usuario vuelve a Vista 21. Se crea NUEVO `new Chart()`.
4. La instancia anterior de Chart.js sigue en memoria o intentando renderizar en un canvas destruido, causando errores o fugas.
**⚠️ Impacto**: Medio (Degradación de performance con navegación prolongada).
**🛠️ Fix Sugerido**:
```javascript
// Antes de crear chart:
if (window.myChartInstance) window.myChartInstance.destroy();
window.myChartInstance = new Chart(ctx, ...);
// O registrar instancias en un gestor global para limpieza al desmontar vista.
```

**❗ Problema**: Selectores DOM Frágiles
**📍 Ubicación**: `vistas2/vista21.html`, `vista25.html`, etc.
**💥 Escenario de Fallo**: Si `App.loadView` falla parcialmente o el HTML no coincide exactamente (ids dinámicos), `document.getElementById('v21_...')` retorna `null`. Acceder a `.textContent` lanza excepción y detiene todo el script de la vista.
**⚠️ Impacto**: Alto (Vista rota).
**🛠️ Fix Sugerido**: Uso de Optional Chaining o guards.
```javascript
const el = document.getElementById('id');
if (el) el.textContent = val;
```

## 2️⃣ ASINCRONÍA Y ESTADO

**❗ Problema**: Bucle de espera potencialmente infinito (`waitForData`)
**📍 Ubicación**: Todas las IIFEs de inicio en `vistas2/*.html`.
**💥 Escenario de Fallo**: Si `data_manager.js` falla en cargar (ej. error de red 500 en JSON), `window.STATE_DATA_CEAD.isLoaded` nunca es true. La función recursiva `check()` con `setTimeout` corre indefinidamente consumiendo CPU.
**⚠️ Impacto**: Medio.
**🛠️ Fix Sugerido**: Implementar timeout máximo o contador de reintentos.

## 3️⃣ ROBUSTEZ DINÁMICA

**❗ Problema**: Datos "Fake" o Ceros en Gráficos (Mapeo de Columnas)
**📍 Ubicación**: `vistas2/vista7.html`, `vista4.html`.
**💥 Escenario de Fallo**: Dependencia de `COLS_CEAD.CASOS_ACTUAL`. Si Python cambia el nombre de columna (ej. 'frecuencia' vs 'casos_mes_actual') y `data_manager.js` sobrescribe el mapa incorrectamente, los valores son `undefined` || 0.
**⚠️ Impacto**: Crítico (Decisiones basadas en datos erróneos).
**🛠️ Fix Sugerido**: Centralizar definición de columnas en UN solo archivo (`js/config/columns.js`) y validar existencia de columnas al cargar datos.
