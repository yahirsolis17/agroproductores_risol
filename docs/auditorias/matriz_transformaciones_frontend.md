# Matriz de Transformaciones Frontend (UI-only vs Dataset)

> Inventario generado desde `rg -n "\.filter\(|\.sort\(|\.slice\(" frontend/src`.
> Clasificación bajo **Regla B** (UI-only permitidas).

## Legend
- **UI-only**: presentación/visual (permitido)
- **STATE-UPDATE**: pruning de listas tras mutaciones en store (permitido con marcador)
- **Prohibido**: transformación de dataset de negocio (requiere mover a backend/params)

---

## Componentes UI (permitido)
| Archivo:línea | Operación | Origen | Clasificación | Permitido | Acción |
|---|---|---|---|---|---|
| `frontend/src/components/layout/Navbar.tsx:28` | `.filter` | NAV_ITEMS config | UI-only | Sí | N/A |
| `frontend/src/components/layout/Navbar.tsx:34` | `.filter` | rutas UI | UI-only | Sí | N/A |
| `frontend/src/components/layout/Navbar.tsx:39` | `.filter` | rutas UI | UI-only | Sí | N/A |
| `frontend/src/components/layout/Navbar.tsx:44` | `.filter` | rutas UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx:113` | `.filter` | permisos UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx:226` | `.filter` | filtros UI de inputs | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx:250` | `.slice` | quick actions UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx:264` | `.filter` | UI quick actions | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx:56` | `.slice` | formateo string UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx:66` | `.filter` | filtro visual local | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx:157` | `.slice` | formateo string UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx:119` | `.filter` | normalización UI de permisos | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx:85` | `.sort` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx:101` | `.sort` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx:240` | `.filter` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx:241` | `.filter` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx:242` | `.sort` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx:89` | `.sort` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx:216` | `.filter` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx:217` | `.filter` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx:218` | `.sort` | opciones UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx:47` | `.filter` | parseo UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx:51` | `.filter` | parseo UI | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx:59` | `.slice` | formateo string UI | UI-only | Sí | N/A |

## Reportes (permitido)
| Archivo:línea | Operación | Origen | Clasificación | Permitido | Acción |
|---|---|---|---|---|---|
| `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx:202` | `.sort` | UI tablas reportes | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx:805` | `.sort` | UI tablas reportes | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx:305` | `.filter` | UI charts | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx:343` | `.sort` | UI charts | UI-only | Sí | N/A |
| `frontend/src/modules/gestion_huerta/utils/reportesAdapters.ts:*` | `.filter/.sort/.slice` | adaptación UI reportes | UI-only | Sí | N/A |

## Store (STATE-UPDATE permitido)
| Archivo:línea | Operación | Origen | Clasificación | Permitido | Acción |
|---|---|---|---|---|---|
| `frontend/src/global/store/temporadabodegaSlice.ts:389/418/465` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/cosechasSlice.ts:184/190/199` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/huertaRentadaSlice.ts:164/170/181` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/bodegasSlice.ts:191/198/211` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/temporadaSlice.ts:227` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/capturasSlice.ts:300` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/categoriaInversionSlice.ts:183/189` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/userSlice.ts:154` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/propietariosSlice.ts:224/232/241` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/huertaSlice.ts:164/171/182` | `.filter` | pruning tras mutación | STATE-UPDATE | Sí | N/A |
| `frontend/src/global/store/empaquesSlice.ts:100/276` | `.filter` | pruning/normalización | STATE-UPDATE | Sí | N/A |

## Utilidades canónicas (permitido)
| Archivo:línea | Operación | Origen | Clasificación | Permitido | Acción |
|---|---|---|---|---|---|
| `frontend/src/global/utils/uiTransforms.ts:*` | `.filter/.sort/.slice` | UI helper | UI-only | Sí | N/A |

---

## Prohibidos (requieren acción)
**Ninguno detectado en `pages/` o `services/` tras normalización.**
