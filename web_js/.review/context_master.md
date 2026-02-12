# 📘 CONTEXTO MAESTRO: STOP_WEB3 CEAD INTEGRATION

## 📋 METADATA
- **Fecha**: 2026-02-12
- **Stack**: Vanilla JS (ES2022+), Python 3.10+ (Pandas/Statsmodels)
- **Browser Support**: Modern Browsers (Chrome 80+, Edge, Firefox). Dependencia crítica de `DecompressionStream`.
- **Criticidad**: ALTA (Reportabilidad Oficial de Seguridad Pública)

## 🎯 OBJETIVOS DE NEGOCIO
Proporcionar una plataforma de inteligencia delictual que unifique los datos operativos semanales (STOP) con las estadísticas oficiales mensuales (CEAD), permitiendo proyecciones de cierre de año mediante modelos econométricos para la toma de decisiones presupuestarias y tácticas en municipios.

## 🏗️ ARQUITECTURA TÉCNICA
- **Patrón**: State Management Centralizado vía Mutación de Globales (`STATE_DATA`). Arquitectura de Componentes basada en Inyección de HTML Remoto (`fetch` de vistas).
- **Flujo de Datos**: 
    1. **ETL (Python)**: Procesa CSVs masivos, aplica SARIMA para proyectar Oct-Dic 2025, y segmenta por comuna.
    2. **Middleware (Gzip)**: Almacena JSONs comprimidos para optimizar ancho de banda.
    3. **Frontend (JS)**: Descomprime al vuelo, mapea columnas CEAD a alias STOP y renderiza dinámicamente.
- **Web Standards Compliance**: Alto. Uso de `modules`, `async/await`, `CSS Variable Tokens` y `HTML5 Semantic Tags`.
- **Restricciones de Entorno**: No-framework (Vanilla JS estricto). Generación de PDF en cliente vía `html2canvas` + `jsPDF`.

## ⚠️ RESTRICCIONES Y ÁREAS SENSIBLES
- **Área Sensible**: `js/app.js` → Cualquier cambio en `loadView` afecta a los 3 archivos index del proyecto.
- **Área Sensible**: `notebook/proceso_cead.py` → El filtrado por `CODIGO > 10000` es vital para evitar el doble conteo de familias/grupos.
- **Deuda Técnica**: El manejo de estado por mutación global de `window.STATE_DATA` requiere cuidado extremo con las condiciones de carrera (Race Conditions) durante cargas sucesivas.

## 🎯 INSTRUCCIONES ESPECÍFICAS PARA EL PIPELINE
- **A error-watcher**: "Enfócate en la integridad de los subtotales proyectados vs históricos en el dashboard CEAD."
- **A compliance-reviewer**: "Validar que la sanitización de nombres de delitos en el script Python prevenga posibles XSS o errores de parseo en el JS."
- **A code-reviewer**: "Validar DOM Thrashing en vista0.html y asegurar persistencia de referencias en STATE_DATA."

---
**Resumen Ejecutivo**: Proyecto de seguridad ciudadana escalable. Implementación exitosa de analítica predictiva SARIMA. Arquitectura modular optimizada para reportabilidad PDF de alto rendimiento.

**NOMBRE DE ARCHIVO PARA PERSISTENCIA**: `.review/context_master.md`
