# 🏗️ Arquitectura: STOP WEB V2 (SPA/MPA Híbrida)

## 1️⃣ ORGANIZACIÓN Y CAPAS

**🏗️ Aspecto**: Navegación y Carga de Vistas
**📐 Patrón Detectado**: **View Injection**. SPA que carga HTML fragments desde el servidor (`fetch`) e inyecta en el DOM (`innerHTML`). Scripts incrustados (`<script>`) se ejecutan manualmente.
**⚠️ Riesgo Arquitectónico**:
- **Fragilidad**: Dependencia implícita de que `App.loadView` ejecute scripts.
- **Scope Pollution**: Scripts de vistas (`IIFE`) comparten `window`. Conflictos de variables posibles si no se encapsulan bien.
- **SEO/Accesibilidad**: URLs no siempre representan estado navegable (SPA routes?).
**📈 Recomendación**:
- Validar que cada vista use IIFE estricta `(function(){...})()`.
- Considerar un router ligero (`page.js` o similar) si se necesita manejo de historial de navegación robusto.
- **Acción Inmediata**: Centralizar la lógica de carga y desmontaje de vistas para limpieza de memoria (event listeners, timers).

**🏗️ Aspecto**: Gestión de Datos (Data Layer)
**📐 Patrón Detectado**: **Global Store**. Datos cargados en `window.STATE_DATA` y `window.STATE_DATA_CEAD` al inicio. Vistas consumen directamente.
**⚠️ Riesgo Arquitectónico**:
- **Implicit Coupling**: Vistas asumen que los datos ya existen. Si `data_manager.js` falla, todas las vistas fallan.
- **Mutation Risk**: Cualquier vista puede modificar el estado global accidentalmente.
- **Testing**: Difícil de mockear para tests unitarios de vistas aisladas.
**📈 Recomendación**:
- Implementar un patrón **Store/Service** simple (`DataService.getStopData()`) que retorne promesas o datos inmutables (`Object.freeze`).
- Mover la lógica de transformación (`map`, `filter`) fuera de las vistas hacia selectores (`js/selectors/cead.js`) para reutilización y testing.

## 2️⃣ FLUJO DE DATOS Y ESTADO

**🏗️ Aspecto**: Sincronización Backend-Frontend
**📐 Patrón Detectado**: **Tight Coupling**. Nombres de columnas en Python (`frecuencia`) deben coincidir EXACTAMENTE con `COLS_CEAD` en JS.
**⚠️ Riesgo Arquitectónico**:
- **Fragilidad**: Cambio trivial en Python rompe silenciosamente todo el Frontend (gráficos vacíos).
- **Maintenance Hell**: Requiere sincronización manual constante entre equipos/archivos.
**📈 Recomendación**:
- Generar un archivo de *metadata* (`schema.json`) desde Python que defina los nombres de columnas y sea consumido dinámicamente por JS (`data_cead.js`).
- O implementar TypeScript/JSDoc types compartidos (difícil con Python per se, pero posible con generación).

## 3️⃣ ESTRATEGIA DE RENDERIZADO Y DOM

**🏗️ Aspecto**: Componentes de UI
**📐 Patrón Detectado**: **Imperative DOM Manipulation**. Construcción manual de HTML strings (`innerHTML = ...map().join('')`).
**⚠️ Riesgo Arquitectónico**:
- **XSS**: Riesgo inherente si no se sanitiza.
- **Mantenibilidad**: HTML mezclado con JS lógico es difícil de leer y debuggear.
- **Performance**: Re-render completo ante cambios pequeños.
**📈 Recomendación**:
- Usar funciones de template (`renderTable(data)`) puras que retornen strings o nodos.
- Para componentes complejos, evaluar Web Components nativos o una librería ligera de renderizado (`lit-html`) si la complejidad aumenta.
- **Acción Inmediata**: Extraer templates repetitivos (ej. header de tarjetas, loading spinners) a funciones helper (`ui-helper.js`).
