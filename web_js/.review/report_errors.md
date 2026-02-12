# ⚒️ REPORTE DE ERRORES: RUNTIME & RELIABILITY

## 📋 RESUMEN DE SALUD
**Estado**: ⚠️ ATENCIÓN REQUERIDA
**Hallazgos**: 1 Crítico, 3 Altos, 2 Medios.

---

## ❗ Problema: Bloqueo de Datos Proyectados (Filtro Hardcoded)
**📍 Ubicación**: `js/data_cead.js` | Línea 287
**💥 Escenario de Fallo**: El script `proceso_cead.py` genera predicciones exitosas para Oct-Dic 2025 (ID 202510, 202511, 202512). Sin embargo, el frontend filtra todo lo superior a 202509, haciendo que las predicciones sean invisibles para el usuario.
**⚠️ Impacto**: **CRÍTICO**. Invalida el objetivo de negocio de "Proyecciones de Cierre de Año".
**🛠️ Fix Sugerido**:
```javascript
// ELIMINAR O AMPLIAR:
// const filteredData = rawData.filter(row => row[COLS_CEAD.ID_PERIODO] <= 202509);
// CAMBIAR A:
const filteredData = rawData; // Confiar en el filtrado previo del ETL Python
```

---

## ❗ Problema: Fuga de Memoria y Colisión de Listeners
**📍 Ubicación**: `js/app.js` | Función `executeScripts` (Línea 295)
**💥 Escenario de Fallo**: Un usuario navega entre `vista1` y `vista2` repetidamente. Si una vista registra un listener en `window` (ej: `window.addEventListener('resize', ...)`), cada navegación añade un nuevo listener duplicado. El consumo de RAM sube y la CPU se satura al procesar el mismo evento N veces.
**⚠️ Impacto**: **ALTO**. Degradación de performance tras sesiones largas.
**🛠️ Fix Sugerido**: Implementar un sistema de `cleanup` por vista o desacoplar los listeners del script inyectado, moviéndolos a funciones globales controladas por `App`.

---

## ❗ Problema: Condición de Carrera en Aplicación de Estilos (Race Condition)
**📍 Ubicación**: `js/app.js` | Línea 189 (`setTimeout` de 500ms)
**💥 Escenario de Fallo**: En sistemas lentos o con datos masivos (CEAD), la inyección del HTML de la vista tarda >500ms. `ChartEnhancer` se ejecuta sobre un DOM aún vacío o incompleto, fallando en aplicar colores de variación y formato de tablas.
**⚠️ Impacto**: **ALTO**. Reportes PDF y vistas con visualización "rota" o sin formato profesional.
**🛠️ Fix Sugerido**: Utilizar un bloque `try/retry` o disparar `ChartEnhancer` mediante un evento personalizado `viewRendered` emitido por cada vista tras completar su lógica interna.

---

## ❗ Problema: Bloqueo de Promise en IA (Busy Wait)
**📍 Ubicación**: `js/ia.js` | Línea 519
**💥 Escenario de Fallo**: Si la llamada a la API de IA falla o el servidor no responde y no captura el error correctamente (manteniendo `isLoading: true`), la función `getInterpretation` entrará en un bucle infinito de `setTimeout(100)`, bloqueando la ejecución lógica del componente.
**⚠️ Impacto**: **MEDIO**. Congelamiento de componentes específicos.
**🛠️ Fix Sugerido**: Añadir un `timeout` o un contador máximo de reintentos en el bucle `while`.

---

## ❗ Problema: Fallo en Búsqueda de Tendencia CEAD (Null Safety)
**📍 Ubicación**: `js/ia.js` | Línea 193
**💥 Escenario de Fallo**: `ceadData.find(...)` puede devolver `undefined` si los datos están incompletos. Acceder a `undefined[idxCead.TENDENCIA...]` provocará un crash inmediato de la carga de IA.
**⚠️ Impacto**: **MEDIO**. Interrupción de la generación de interpretaciones.
**🛠️ Fix Sugerido**: Uso de Optional Chaining: `latestCead?.[idxCead.TENDENCIA_CORTO_PLAZO] ?? "Estable"`.

---

## 🎯 RECOMENDACIÓN EJECUTIVA
Priorizar la eliminación del filtro temporal en `js/data_cead.js` para habilitar las visualizaciones SARIMA. Refactorizar el cargador de scripts en `app.js` para evitar el crecimiento descontrolado del árbol de listeners en memoria.
