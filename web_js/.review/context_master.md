# 📘 CONTEXTO MAESTRO: STOP WEB V2 (Plataforma de Análisis Delictual)

## 📋 METADATA
- **Fecha**: 2026-02-13T14:26:33-03:00
- **Stack**: Vanilla JS (ES2020+), HTML5, CSS3, Chart.js 4.x
- **Backend/Processing**: Python (Pandas/Statsmodels for SARIMA)
- **Browser Support**: Modern Browsers (Chrome/Edge/Firefox/Safari). **NO IE11** (Uso extensivo de ES6+, Optional Chaining, Async/Await).
- **Criticidad**: ALTA (Información estratégica de seguridad pública).

## 🎯 OBJETIVOS DE NEGOCIO
Proporcionar una interfaz visual interactiva y de alto rendimiento para el análisis táctico y estratégico de datos delictuales (STOP y CEAD). El sistema busca transformar datos crudos en inteligencia accionable (alertas, proyecciones, matrices de decisión) para la toma de decisiones policiales y gubernamentales, priorizando la claridad visual y la respuesta inmediata (client-side rendering).

## 🏗️ ARQUITECTURA TÉCNICA
- **Patrón**: **SPA Híbrida (Vanilla)**. Utiliza un "App Shell" (`index_vistas2.html`) que carga dinámicamente vistas parciales (`vistas2/*.html`) mediante `fetch` e inyección de HTML.
- **Gestión de Estado**: **Global State Object**. Los datos se cargan centralizadamente (`js/data_manager.js`, `js/data_cead.js`) y se exponen en objetos globales (`window.STATE_DATA`, `window.STATE_DATA_CEAD`) que son consumidos por las vistas.
- **Flujo de Datos**:
  1.  **Ingesta**: Scripts Python (`proceso_cead.py`) procesan CSVs/Excels y generan JSONs optimizados.
  2.  **Carga**: El navegador descarga y parsea estos JSONs al inicio.
  3.  **Renderizado**: Las vistas se suscriben a los datos globales o esperan su carga (`waitForData`) y renderizan gráficos con Chart.js y tablas mediante manipulación directa del DOM.
- **Modularidad**: Basada en **IIFEs (Immediately Invoked Function Expressions)** dentro de cada archivo HTML de vista para encapsular lógica y evitar colisiones globales, aunque comparten el estado global.

## ⚠️ RESTRICCIONES Y ÁREAS SENSIBLES
- **Archivos Críticos**:
    - `js/data_manager.js`: Núcleo de la orquestación de datos. Cualquier error aquí rompe toda la app.
    - `notebook/proceso_cead.py`: Fuente de verdad de los datos. Cambios en nombres de columnas impactan directamente al frontend (acoplamiento fuerte).
- **Deuda Técnica Identificada**:
    - **Acoplamiento de Columnas**: Múltiples definiciones de mapeo de columnas (`COLS_CEAD`) en JS y Python que pueden desincronizarse (ej. `casos_mes_actual` vs `frecuencia`).
    - **Hardcoding de Fechas**: Lógica de filtrado y proyecciones a veces hardcodeada en las vistas o el script Python, requiriendo intervención manual periódica.
    - **Gestión de Errores Silenciosa**: Dependencia de `console.log` o fallos silenciosos si los datos no tienen el formato esperado.

## 🎯 INSTRUCCIONES ESPECÍFICAS PARA EL PIPELINE
- **A error-watcher**: "Enfócate en errores de carga de recursos (404 en vistas) y excepciones de referencia nula en el acceso a propiedades profundas de `STATE_DATA` (usar optional chaining)."
- **A compliance-reviewer**: "Prioriza la consistencia entre los datos generados por Python y los consumidos por JS. Verificar que no se expongan datos sensibles no procesados."
- **A code-reviewer**: "Validar el rendimiento del DOM en vistas con tablas grandes (evitar reflows excesivos) y asegurar que las instancias de Chart.js se destruyan o reutilicen correctamente al cambiar de vista para evitar memory leaks."
