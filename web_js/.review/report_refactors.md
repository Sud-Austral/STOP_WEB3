# 🛠️ Plan de Refactorización: STOP WEB V2

## 1️⃣ QUICK WINS (P0/P1) - Estabilidad y Seguridad Inmediata

**🔨 Refactor**: Gestión de Memoria Chart.js
**🎯 Objetivo**: `report_errors.md` (Fuga de Memoria) / `report_code_quality.md` (Memory Leaks)
**💻 Código (After)**:
```javascript
// js/utils/chart-helper.js
let activeCharts = [];
export function registerChart(chart) { activeCharts.push(chart); }
export function destroyAllCharts() { 
    activeCharts.forEach(c => c.destroy()); 
    activeCharts = []; 
}
// En app.js -> loadView:
ChartHelper.destroyAllCharts();
```
**⚠️ Riesgo**: Bajo (Solo afecta limpieza).
**⏱️ Esfuerzo**: S (1 hora).

**🔨 Refactor**: Centralización de `waitForData` (DRY)
**🎯 Objetivo**: `report_code_quality.md` (Duplicación)
**💻 Código (After)**:
```javascript
// js/utils/data-waiter.js
export function waitForData(key = 'STATE_DATA_CEAD', timeout = 10000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const check = () => {
            if (window[key] && window[key].isLoaded) resolve(window[key]);
            else if (Date.now() - start > timeout) reject(new Error('Timeout waiting for data'));
            else requestAnimationFrame(check);
        };
        check();
    });
}
// En vista21.html:
await DataWaiter.waitForData();
```
**⚠️ Riesgo**: Bajo.
**⏱️ Esfuerzo**: S (30 min).

**🔨 Refactor**: Validación de Columnas (`COLS_CEAD`)
**🎯 Objetivo**: `report_errors.md` (Robustez Dinámica)
**💻 Código (After)**:
```javascript
// js/data_cead.js
const REQUIRED_COLS = ['ID_PERIODO', 'DELITO', 'CASOS_ACTUAL'];
function validateCols() {
    REQUIRED_COLS.forEach(c => {
        if (!COLS_CEAD[c]) console.error(`Missing column definition: ${c}`);
    });
}
```
**⚠️ Riesgo**: Medio (Alertará sobre configs rotas).
**⏱️ Esfuerzo**: S (1 hora).

## 2️⃣ MEJORAS DE CALIDAD (P2) - Mantenibilidad

**🔨 Refactor**: Sanitización de `innerHTML`
**🎯 Objetivo**: `report_compliance.md` (XSS)
**💻 Código (After)**:
```javascript
// js/utils/security.js
export function sanitize(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
// Uso:
el.innerHTML = `<b>${sanitize(userData)}</b>`;
```
**⚠️ Riesgo**: Bajo.
**⏱️ Esfuerzo**: M (Revisar todas las vistas).

**🔨 Refactor**: Desacoplamiento de Lógica de Vistas
**🎯 Objetivo**: `report_architecture.md` (Separación de Concerns)
**💻 Código (After)**:
- Mover lógica compleja (`map`, `filter`, `reduce` grandes) de `vista21.html` a `js/services/cead-service.js`.
- Las vistas solo deben llamar `CeadService.getProjections()` y renderizar.
**⚠️ Riesgo**: Medio (Requiere mover código y probar regresión).
**⏱️ Esfuerzo**: M (varias horas por vista).

## 3️⃣ EVOLUCIÓN ARQUITECTÓNICA (P3) - Largo Plazo

**🔨 Refactor**: Adopción de JSDoc Estricto / TypeScript Checking
**🎯 Objetivo**: `report_architecture.md` (Robustez)
**💻 Código (After)**:
- Agregar `@ts-check` al inicio de archivos JS críticos.
- Definir tipos para `STATE_DATA` y `COLS_CEAD` en `js/types.d.js`.
**⚠️ Riesgo**: Bajo (Solo linting).
**⏱️ Esfuerzo**: L (Documentar todo el proyecto).
