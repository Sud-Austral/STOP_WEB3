# 🔍 Calidad de Código: STOP WEB V2 (Performance y Mantenibilidad)

## 1️⃣ ARQUITECTURA Y MANTENIBILIDAD

**💡 Hallazgo**: Duplicación de lógica de carga de datos (`waitForData`) en todas las vistas
**🏗️ Principio/Métrica**: DRY / Mantenibilidad
**📍 Ubicación**: `vista21.html`, `vista7.html`, `vista4.html`, etc.
**🛠️ Refactor Sugerido**:
- Centralizar la función `waitForData` en `js/utils/loading.js` o `js/app.js` y exponerla globalmente o importarla.
```javascript
// js/utils/waiter.js
export async function waitForData(dataKey = 'STATE_DATA_CEAD') { ... }
```
**📈 Beneficio**: Reduce duplicidad y centraliza la lógica de timeouts/intentos.

**💡 Hallazgo**: Acoplamiento fuerte de nombres de columnas (String Matching)
**🏗️ Principio/Métrica**: Mantenibilidad / Robustez (SOLID - Open/Closed)
**📍 Ubicación**: Múltiples vistas usando cadenas literales para claves de objetos (`r[C.CASOS_ACTUAL]`).
**🛠️ Refactor Sugerido**:
- Definir un objeto `ColumnMap` único y extensible en `js/config/columns.js`.
- Usar claves constantes (Enum-like) en todo el código JS.
**📈 Beneficio**: Evita errores de typo y facilita refactorización si cambia el esquema de Python.

## 2️⃣ PERFORMANCE & DOM

**💡 Hallazgo**: Layout Thrashing potencial al asignar `innerHTML` repetidamente en loops (Menor)
**🏗️ Principio/Métrica**: Layout Thrashing (INP)
**📍 Ubicación**: `vista22.html` (Línea 111, `.map(...).join('')`), `vista8.html`, `vista4.html`.
**🛠️ Refactor Sugerido**:
- El uso actual de `.map(...).join('')` es el correcto (Batching). Se debe evitar usar `list.innerHTML += ...` en loops.
- Verificar que el navegador no esté recalcular el layout innecesariamente si se cambia `style.display` antes de insertar contenido.
**📈 Beneficio**: Asegura renderizado fluido (60fps) en tablas grandes.

**💡 Hallazgo**: Chart.js Memory Leaks (Instancias huérfanas)
**🏗️ Principio/Métrica**: Memory Efficiency (Heap Usage)
**📍 Ubicación**: Todas las vistas con gráficos (`vistas2/*.html`).
**🛠️ Refactor Sugerido**:
- Implementar un gestor de instancias de Chart en `js/app.js` o `js/utils/chart-helper.js` que destruya automáticamente las instancias vinculadas a un canvas que ya no está en el DOM al cambiar de vista.
```javascript
// chart-helper.js
const instances = [];
function createChart(ctx, config) {
   const chart = new Chart(ctx, config);
   instances.push(chart);
   return chart;
}
function cleanup() { instances.forEach(c => c.destroy()); instances.length = 0; }
```
**📈 Beneficio**: Previene fugas de memoria críticas en SPAs de larga ejecución.

## 3️⃣ BUNDLE & CARGA

**💡 Hallazgo**: Carga bloqueante de librerías pesadas (Chart.js, html2canvas) en `index_vistas2.html`
**🏗️ Principio/Métrica**: FCP (First Contentful Paint) / LCP
**📍 Ubicación**: `index_vistas2.html` `<head>`
**🛠️ Refactor Sugerido**:
- Mover scripts no críticos al final del `<body>` o usar `defer`.
- Cargar librerías específicas (ej. `jspdf`, `html2canvas`) bajo demanda solo cuando se requiera exportar.
**📈 Beneficio**: Acelera la carga inicial y la percepción de velocidad.
