# gestion_bodega Consistency Audit Report

## 🚨 Critical Finding: 4 Different Architectural Patterns

The `gestion_bodega` module uses **4 distinct hook/state patterns**, breaking the "canonical Redux" consistency expected across the system.

---

## Pattern Classification

### Pattern A: Canonical Redux (Direct State)
**Used by:** [useBodegas.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useBodegas.ts)
- ✅ Imports from `global/store/store` ([useAppDispatch](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/store/store.ts#49-50), `useAppSelector`)
- ✅ Direct state access: `useAppSelector((s) => s.bodegas)`
- ✅ Thunks + reducers from slice
- ✅ No selectors

```typescript
const state = useAppSelector((s) => s.bodegas);
```

---

### Pattern B: Selector-Based Redux
**Used by:** [useEmpaques.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts), [useTemporadasBodega.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts)
- ⚠️ Imports from `global/store/hooks` (different path!)
- ⚠️ Uses exported selectors: `selectEmpaques`, `selectEmpaquesMeta`, etc.
- ⚠️ More granular state access

```typescript
const items = useAppSelector(selectEmpaques);
const meta = useAppSelector(selectEmpaquesMeta);
```

---

### Pattern C: React Query Hybrid
**Used by:** [useTableroBodega.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts), [useCierres.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCierres.ts)
- ❌ Uses `@tanstack/react-query` for data fetching
- ❌ Redux only for UI state (filters, modals)
- ❌ Different caching strategy
- ❌ URL sync with `useSearchParams`

```typescript
const summaryQ = useQuery<DashboardSummaryResponse>({
  queryKey: QUERY_KEYS.summary(...),
  queryFn: () => getDashboardSummary(...),
});
```

---

### Pattern D: Legacy Redux
**Used by:** [useCapturas.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCapturas.ts)
- ❌ Uses plain `useDispatch`, `useSelector` (not typed hooks)
- ❌ Inconsistent with typed hook pattern

```typescript
import { useDispatch, useSelector } from "react-redux";
const dispatch = useDispatch<AppDispatch>();
const items = useSelector(selectCapturas);
```

---

## Hook-by-Hook Analysis

| Hook | Pattern | Import Path | State Access | Issues |
|------|---------|-------------|--------------|--------|
| [useBodegas](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useBodegas.ts#26-116) | A | [store](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/hooks/useHuertas.ts#32-33) | Direct | ✅ Reference |
| [useEmpaques](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts#34-128) | B | `hooks` | Selectors | ⚠️ Different path |
| [useTemporadasBodega](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts#40-165) | B | [store](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/hooks/useHuertas.ts#32-33) | Selectors | ⚠️ Hybrid |
| [useTableroBodega](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts#288-879) | C | [store](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/hooks/useHuertas.ts#32-33) | React Query | ❌ Hybrid |
| [useCierres](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCierres.ts#52-277) | C | [store](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/hooks/useHuertas.ts#32-33) | React Query | ❌ Hybrid |
| [useCapturas](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCapturas.ts#25-139) | D | `redux` | Selectors | ❌ Legacy |
| `useIsoWeek` | — | — | — | Utility only |

---

## Stub Hooks (Empty/Placeholder)

These hooks are stubs and need implementation:
- [useCamiones.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCamiones.ts) (105 bytes)
- [useGastos.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useGastos.ts) (103 bytes)
- [useInventarios.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useInventarios.ts) (108 bytes)
- [usePedidos.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/usePedidos.ts) (104 bytes)
- [useReportesBodega.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts) (111 bytes)
- [useTiposMango.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts) (110 bytes)

---

## Redux Slice Analysis

| Slice | Selectors Exported | Pattern |
|-------|-------------------|---------|
| `bodegasSlice` | ❌ No | Direct state |
| `temporadabodegaSlice` | ✅ Yes | Selector-based |
| `tableroBodegaSlice` | ✅ Yes | Minimal (UI only) |
| `cierresSlice` | ✅ Yes | Minimal (UI only) |
| `capturasSlice` | ✅ Yes | Selector-based |
| `empaquesSlice` | ✅ Yes | Selector-based |

---

## Backend Status (Quick Review)

11 view files in `gestion_bodega/views/`:
- [bodegas_views.py](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/bodegas_views.py) (33KB)
- [empaques_views.py](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/empaques_views.py) (19KB)
- [tablero_views.py](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/tablero_views.py) (38KB)
- [recepciones_views.py](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/recepciones_views.py) (20KB)
- [cierres_views.py](file:///c:/Users/Yahir/agroproductores_risol/backend/gestion_bodega/views/cierres_views.py) (11KB)
- Others: camiones, pedidos, inventarios, etc.

> Backend appears consistent with `gestion_huerta` patterns. No immediate concerns.

---

## Recommendations

### 1. Standardize to Pattern A (Canonical)
- **All hooks** should import from `global/store/store`
- **No selectors** in slices (or at least consistent usage)
- Direct state access: `useAppSelector((s) => s.<slice>)`

### 2. Decision on React Query
Either:
- **Remove React Query** entirely and use pure Redux thunks
- **OR** adopt React Query system-wide (not recommended for this project)

### 3. Fix Legacy Imports
- Replace `useDispatch`/`useSelector` with [useAppDispatch](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/store/store.ts#49-50)/`useAppSelector`

---

## Files Requiring Changes

### High Priority (Pattern Violations)
1. [useEmpaques.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts) - Change to Pattern A
2. [useCapturas.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCapturas.ts) - Fix legacy imports
3. [useTableroBodega.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts) - Decision: refactor to Redux or keep hybrid
4. [useCierres.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/hooks/useCierres.ts) - Same as above

### Medium Priority (Slice Consistency)
1. [bodegasSlice.ts](file:///c:/Users/Yahir/agroproductores_risol/frontend/src/global/store/bodegasSlice.ts) - Add selectors OR
2. All other slices - Remove selectors

### Low Priority (Stubs)
- Implement placeholder hooks following Pattern A
