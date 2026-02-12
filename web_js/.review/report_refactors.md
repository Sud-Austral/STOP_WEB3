# 🛠️ REPORTE DE REFACTORIZACIONES (QUICK WINS)

## 📋 ABSTRACCIÓN Y LIMPIEZA
**Prioridad**: Alta (Mantenibilidad)

---

## ⚡ Refactor: Unificación de Helpers de Vista (Evitar Duplicación)
**Hallazgo**: Los formateadores `fN`, `fP`, `fD` y la función `setEl` se repiten textualmente en cada archivo `vistaX.html`.
**🛠️ Propuesta**: 
Crear `js/utils/view-helper.js` y exponer un objeto global `ViewUtils`.
```javascript
window.ViewUtils = {
    formatNumber: (v) => Math.round(v || 0).toLocaleString('es-CL'),
    formatPercent: (v) => (v > 0 ? '+' : '') + (v || 0).toFixed(1) + '%',
    setText: (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; },
    // ...
};
```
**📈 Beneficio**: Reducción masiva de líneas de código redundantes y punto único de cambio para formatos regionales.

---

## ⚡ Refactor: Guard del Bucle de Carga en IA
**📍 Ubicación**: `js/ia.js` | Línea 519
**Hallazgo**: El bucle `while (this.isLoading)` no tiene límite de tiempo. Si la IA falla, la pestaña se bloquea en un loop infinito.
**🛠️ Propuesta**:
Añadir un contador de reintentos o un timestamp de expiración.
```javascript
let attempts = 0;
while (this.isLoading && attempts < 100) { // Max 10 seg
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
}
```
**📈 Beneficio**: Resiliencia del sistema ante fallos de red o errores de API.

---

## ⚡ Refactor: Mejora del Router de Vistas
**📍 Ubicación**: `js/app.js` | Propiedad `config.views`
**Hallazgo**: La lista de vistas es un array plano de strings. Forzar el nombre `vistaN` limita la flexibilidad.
**🛠️ Propuesta**:
Mover la configuración a un objeto estructurado que defina metadatos (título, categoría, path).
```javascript
config: {
    views: [
        { id: 'vista1', title: 'Dashboard Resumen', category: 'STOP' },
        // ...
    ]
}
```
**📈 Beneficio**: Permite generar automáticamente el sidebar, los badges de fuente y los headers del PDF sin lógica `switch` o `regex` compleja.

---

## ⚡ Refactor: Eliminación de Filtros Hardcoded en Datos
**📍 Ubicación**: `js/data_cead.js` | Línea 287
**Hallazgo**: El filtro `.filter(row => row[COLS_CEAD.ID_PERIODO] <= 202509)` es una "bomba de tiempo" técnica.
**🛠️ Propuesta**:
Hacer que el límite de datos sea configurable desde `App.config` o eliminarlo si el script de Python ya garantiza la integridad del dataset.
**📈 Beneficio**: Permite ver las proyecciones SARIMA de Oct-Dic 2025 de forma inmediata.

---

## 🎯 RESUMEN DE QUICK WINS
Implementar el `ViewUtils` y corregir el filtro de `data_cead.js` son cambios de bajo riesgo con **impacto inmediato** en la calidad del producto y la visibilidad de los datos proyectados.
