# 📝 DOCUMENTACIÓN TÉCNICA: STOP_WEB3 (Frontend Architecture)

## 1. OVERVIEW
El frontend de STOP_WEB3 está diseñado como una aplicación de múltiples páginas (MPA) basada en **Vanilla JavaScript** y estándares web modernos. El sistema prioriza el rendimiento y la fidelidad visual sin la sobrecarga de frameworks externos, utilizando un cargador de datos centralizado y una capa de visualización basada en Chart.js.

### Arquitectura de Datos
El núcleo del sistema es el `DataManager` (`js/data_manager.js`), el cual gestiona el ciclo de vida de la información:
1. **Fetch**: Recupera datos dinámicos comprimidos en gzip.
2. **Decompress**: Utiliza la API nativa `DecompressionStream`.
3. **State**: Mantiene el estado global en `window.STATE_DATA`.
4. **Events**: Despacha `dataManagerLoaded` para notificar a las vistas.

---

## 2. API REFERENCE

### DataManager Object
| Método | Descripción | Parámetros |
| :--- | :--- | :--- |
| `init(codcom)` | Inicializa la carga para una comuna específica. | `codcom` (Number, opcional) |
| `loadUnionData()` | Carga la taxonomía de mapeo STOP <-> CEAD. | Ninguno |
| `loadClusterConfig()` | Carga la configuración de totales por clúster. | Ninguno |

### UIHelper (window.RID.UI)
| Función | Propósito |
| :--- | :--- |
| `renderKpi(valId, deltaId, value, deltaPct, inverse)` | Renderiza un KPI con indicador de tendencia coloreado. |
| `fillHeaders(comuna, semana)` | Popula los elementos de cabecera en toda la vista. |
| `formatNumber(n)` | Formatea números para el estándar chileno (punto como separador de miles). |

---

## 3. GUÍA DE IMPLEMENTACIÓN

### Añadir una nueva Vista (vistaX.html)
Para integrar una nueva vista, siga este patrón estándar:

```html
<div class="comuna-fill">--</div>
<div id="vX_mi_grafico"></div>

<script>
    (async function init() {
        // 1. Esperar a que DataManager esté listo
        await new Promise(r => {
            const check = () => window.STATE_DATA?.isLoaded ? r() : setTimeout(check, 100);
            check();
        });

        // 2. Acceder a los datos
        const S = window.STATE_DATA;
        const C = window.COLS;
        const totalRow = S.allDataHistory_total.find(r => r[C.ID_SEMANA] === S.currentSemana);

        // 3. Renderizar usando componentes centralizados
        UIHelper.renderKpi('vX_kpi', 'vX_delta', totalRow[C.CASOS_ACTUAL], 5.2);
    })();
</script>
```

### Considerantes de Performance
- Siempre prefiera `.textContent` antes que `.innerHTML` por seguridad y rendimiento.
- Cachee los nodos del DOM si va a realizar actualizaciones frecuentes para evitar el *Layout Thrashing*.
