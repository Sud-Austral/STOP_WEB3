# 🏗️ REPORTE DE ARQUITECTURA TÉCNICA

## 📋 ANÁLISIS ESTRUCTURAL
**Arquitectura**: Monolito de Cliente (Vanilla JS SPA)
**Estado**: 🟡 ACEPTABLE (Para Prototipado) / 🔴 CRÍTICO (Para Producción Masiva)

---

## 🏗️ Hallazgo: Latencia Ineficiente en Exportación (Performance Bloqueante)
**📍 Ubicación**: `js/app.js` | Función `exportPdf` (Línea 376)
**Detalle**: El sistema espera un tiempo fijo de **8 segundos** por cada una de las 45 vistas durante la generación del PDF. Esto resulta en un tiempo de espera total de **6 minutos** para el usuario final.
**⚠️ Impacto**: Abandono del usuario y riesgo de "Timeout" del navegador o la pestaña.
**🛠️ Recomendación**: Implementar una arquitectura basada en **Promesas Concurrentes** o disparar el renderizado mediante eventos (`ChartRendered`). No usar tiempos fijos (*Sleep*).

---

## 🏗️ Hallazgo: Centralización de Estado por Mutación de Globales
**📍 Ubicación**: `js/data.js` | Objeto `window.STATE_DATA`
**Detalle**: El proyecto utiliza un único objeto global mutado por `fetch` y consultado por las vistas. No existe un patrón de **Unidirectional Data Flow** ni reactividad. 
**⚠️ Riesgo**: Condiciones de carrera (Race Conditions). Si un usuario cambia de comuna mientras una exportación está en curso, los datos en el PDF serán inconsistentes (Mix de comunas).
**🛠️ Recomendación**: Migrar a una arquitectura de **Immutable State** o usar un sistema de **Contextos por Operación** especialmente durante la exportación.

---

## 🏗️ Hallazgo: Alta Densidad de Memoria en Captura (DOM-to-Canvas)
**📍 Ubicación**: `js/app.js` | Uso de `html2canvas`
**Detalle**: El ciclo de vida de exportación carga 45 vistas masivas en el DOM de forma secuencial. El almacenamiento de las imágenes resultantes (`canvas.toDataURL`) en formato JPEG de alta calidad puede superar los límites de memoria de dispositivos móviles o PCs con bajos recursos.
**⚠️ Riesgo**: Crash del navegador (Out of Memory).
**🛠️ Recomendación**: Implementar una cola de procesamiento (Task Queue) con liberación activa de memoria o mover la generación de PDF a un **Microservicio de Backend** (ej: Puppeteer).

---

## 🏗️ Hallazgo: Acoplamiento Rígido entre ETL y Frontend
**📍 Ubicación**: `js/data_cead.js` vs `proceso_cead.py`
**Detalle**: Los nombres de las columnas generadas por Python son consumidos directamente por alias en JS (`COLS_CEAD`). Cualquier cambio en el script de análisis rompe el frontend silenciosamente.
**⚠️ Riesgo**: Fragilidad del pipeline de datos.
**🛠️ Recomendación**: Implementar un **Esquema de Contrato** (JSON Schema) para validar los archivos generados antes de que lleguen al frontend.

---

## 🎯 CONCLUSIÓN DE ARQUITECTURA
La arquitectura actual es excelente para un MVP ágil, pero presenta **vicios de escalabilidad** que impedirán su uso por usuarios corporativos con grandes volúmenes de datos. La prioridad debe ser optimizar el tiempo de exportación y estabilizar el manejo de estado para evitar la corrupción de datos en reportes.
