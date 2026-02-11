# DOCUMENTO DE CONTEXTO DE CÓDIGO: STOP_WEB3 CEAD INTEGRATION

## 📋 METADATA
- **Fecha de análisis:** 2026-02-11
- **Lenguaje principal:** Python 3.10+ / JavaScript (Vanilla ES6+)
- **Tipo de proyecto:** Dashboard Analítico / Pipeline ETL
- **Criticidad:** ALTA (Genera indicadores para toma de decisiones de seguridad pública)

## 🎯 PROPÓSITO Y ALCANCE
El proyecto integra la base de datos nacional **CEAD (Centro de Estudios y Análisis del Delito)** en la plataforma **STOP_WEB3**. Su función principal es proporcionar una visión estadística mensual consolidada que complemente la operatividad semanal de Carabineros (STOP).

El sistema permite identificar patrones que no son visibles en el corto plazo, como:
- **Estacionalidad Histórica (T22)**: Meses y trimestres de mayor riesgo estructural.
- **Correlaciones de Largo Plazo (T24)**: Relaciones estructurales entre tipos delictuales (ej: Alcohol vs VIF).
- **Proyecciones Anuales**: Estimación de cierre de año basada en acumulados mensuales.

## 🏗️ ARQUITECTURA Y ESTRUCTURA
- **Patrón arquitectónico**: Pipeline ETL desacoplado con Front-end orquestado por estado global mutado.
- **Componentes principales**:
  - `proceso_cead.py`: Motor de ingeniería de datos. Maneja jerarquías complejas y cálculos estadísticos (Pearson, Z-Score, CAGR).
  - `data_cead.js`: Capa de transporte con soporte de descompresión GZIP nativa y mapeo de compatibilidad STOP.
  - `index2_cead.html`: Orquestador de la UI que permite la reutilización de componentes visuales preexistentes.
- **Flujo de datos**: CSV ➔ ETL (Python) ➔ JSON.gz ➔ Browser Decompression ➔ Global State Mutation ➔ View Rendering.

## 🔧 STACK TECNOLÓGICO
- **Frameworks**: Pandas (Data Processing), Chart.js (Visualización).
- **Bibliotecas Críticas**: 
  - `DecompressionStream` (API nativa para GZIP).
  - `html2canvas` / `jspdf` (Motor de reportabilidad).
- **Infraestructura**: Despliegue estático basado en fragmentación de datos (sharding) por código de comuna.

## 📊 CARACTERÍSTICAS OPERACIONALES
- **Volumen**: ~345 fragmentos de datos (un archivo por comuna).
- **Performance**: Carga asíncrona con polling de estado para evitar bloqueos de UI.
- **Seguridad**: Los datos son públicos pero el sistema está diseñado para uso interno en gestión municipal/prefectura.

## ⚠️ RESTRICCIONES Y CONSIDERACIONES
- **Jerarquías**: El pipeline debe evitar el doble conteo sumando solo el nivel "Familia" para los totales.
- **Compatibilidad**: Se requiere mantener el objeto `window.STATE_DATA` como punto de verdad único para que las vistas heredadas de STOP funcionen.
- **Sanitización**: Los nombres de delitos provienen de fuentes externas y requieren limpieza de espacios y caracteres especiales para consistencia en IDs.

## 🎯 OBJETIVOS DE LA REVISIÓN
PRIORIDADES:
1. **Exactitud Estadística**: Validar la lógica de Pareto y Correlaciones.
2. **Robustez de Carga**: Asegurar que las condiciones de carrera (Race Conditions) en el cargador JS estén mitigadas.
3. **Mantenibilidad de Aliases**: Mantener un mapeo claro entre campos CEAD y campos STOP.

## 🔍 ÁREAS DE ATENCIÓN ESPECIAL
1. **Módulo de Correlación (T24)**: El cálculo de Pearson sobre 10 años requiere validación de significancia estadística.
2. **Mutación de Estado**: El paso de persistencia de `STATE_DATA_CEAD` a el objeto global `STATE_DATA` es el punto más sensible de la integración UI.
3. **Z-Score**: La lógica de normalización histórica es la base de todas las alertas críticas del tablero.

---
*Fin del Documento de Contexto*
