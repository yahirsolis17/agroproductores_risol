# Política de Transformaciones UI-only (Regla B)

## Regla B (UI-only transforms permitidas)
Se permite usar `.filter()`, `.sort()` y `.slice()` en frontend **solo** si cumple todas:

1) **No opera sobre un dataset de negocio** proveniente del backend (p. ej. `data.results` de un listado paginado).
2) **No cambia el conjunto real de entidades** que el usuario considera su listado (no simula paginación, no simula filtros, no simula ordenamiento de negocio).
3) **Solo afecta presentación UI**:
   - visibilidad de menú
   - orden visual
   - recortes UI (top-N KPI)
   - agrupaciones o cálculos de display
4) **No reemplaza query params del backend** (ni oculta filtros/orden reales).

## Prohibido
Se prohíbe usar `.filter()/.sort()/.slice()` para:
- recortar resultados del backend para simular paginación
- filtrar localmente entidades que deberían venir filtradas del backend
- ordenar localmente listados de negocio cuando el backend debe controlar el orden

## Criterio de auditoría
- Transformación sobre `results` (dataset de negocio) → **NO**
- Transformación sobre UI-only (presentación) → **SÍ**

## Ubicaciones permitidas (arquitectura)
- **UI-only** en `frontend/src/components/**`
- **Reportes UI-only** en `frontend/src/modules/**/components/reportes/**`
- **Utilidades puras** en `frontend/src/global/utils/uiTransforms.ts`
- **Adapters de reportes** en `frontend/src/modules/gestion_huerta/utils/reportesAdapters.ts`
- **Store (state update)** en `frontend/src/global/store/**` **solo** para pruning de listas tras mutaciones y con marcador `STATE-UPDATE` en el archivo.

## Ubicaciones prohibidas
- `frontend/src/**/services/**`
- `frontend/src/**/pages/**`

## Comentario obligatorio (UI-only)
Para transformaciones fuera de los directorios permitidos:

```ts
// UI-ONLY: transform for presentation, not dataset business filtering
```

## Comentario obligatorio (store)
En reducers que podan listas tras mutaciones:

```ts
// STATE-UPDATE: local list pruning after mutations; allowed by UI-only policy.
```

## Enforced by auditoría
Se valida con el script:
- `check_ui_transforms_policy.py`

Si el script falla → G1/G2 se consideran **NO**.
