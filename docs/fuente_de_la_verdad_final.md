# Fuente de la Verdad (FINAL) — Agroproductores Risol
**Fecha:** 2025-12-28  
**Alcance:** Global + módulos (`gestion_usuarios`, `gestion_huerta`, `gestion_bodega`) + backend relacionado.  
**Objetivo:** eliminar bifurcaciones (lógicas paralelas), inconsistencias, y bugs sistémicos, consolidando un **canon único** para: contratos API, notificaciones, data-fetching/estado, paginación/filtrado, y patrones de slices/hooks/services/UI.

---

## 0) Principio rector
1. **Un solo contrato, un solo flujo.** Si una excepción existe, debe estar documentada aquí con: *motivación*, *criterio de uso*, *responsable* y *test/guardrail*.
2. **La UI reacciona; la verdad vive en el backend.** El frontend no reinterpreta mensajes ni inventa estados.
3. **Sin “mixes”.** No se permiten dos frameworks de cache/estado para el mismo tipo de dato.

---

## 1) Decisiones canónicas (lo que se aplica siempre)

### D1. Estado y fetching (Opción recomendada: A)
- **Canon:** Redux Toolkit como única fuente de estado remoto y cache funcional de entidades (listado/detalle).
- **Prohibido:** React Query para “state remoto” mientras el sistema esté en modo de unificación (evita doble cache y doble invalidación).
- **Permitido:** React local state para UI efímera (modales, tabs, drafts de formularios, control de inputs).

### D2. Contrato API Backend → Frontend (único)
Todas las respuestas deben respetar una estructura única:

- **Éxito (genérico):**
```json
{
  "success": true,
  "message_key": "SOME_KEY",
  "message": "Texto final",
  "data": { }
}
```

- **Listados paginados:**
```json
{
  "success": true,
  "message_key": "LIST_OK",
  "message": "…",
  "data": {
    "results": [],
    "meta": {
      "count": 0,
      "page": 1,
      "page_size": 10,
      "next": null,
      "previous": null
    }
  }
}
```

- **Errores de validación (campo):**
```json
{
  "success": false,
  "message_key": "VALIDATION_ERROR",
  "message": "Revisa los campos marcados",
  "data": {
    "errors": {
      "campo": ["mensaje…"]
    }
  }
}
```

> Regla: el frontend **no** rompe este contrato. Si el backend devuelve otra forma, se considera bug del backend.

### D3. Notificaciones (canon vs excepciones)
**Canon (siempre):**
- El backend define el mensaje (message + message_key) y el éxito (success).
- El frontend muestra notificación **solo** mediante un único punto de entrada: `NotificationEngine`.
- Nadie fuera de `NotificationEngine` llama `toast.*`.

**Excepciones permitidas (documentadas):**
1. **Errores de validación de formulario:** se muestran **inline** (debajo del campo) usando `data.errors`. Se puede acompañar de un toast genérico (“Revisa los campos”) pero no es obligatorio.
2. **Errores “silent” de background/refetch:** no disparan toast; solo logging interno (para evitar spam).
3. **Bootstrapping (antes de tener respuesta del backend):** se usa fallback genérico desde `NotificationEngine` (ej. “No hay conexión”).

---

## 2) Bloqueadores actuales (deben resolverse antes de migraciones masivas)
1. `npm run build` falla por errores de sintaxis/parse en `frontend/src/modules/gestion_huerta/pages/Huertas.tsx`.
2. `npm run lint` reporta un volumen alto de errores (uso de `any`, parsing, reglas de hooks/TS, etc.).
3. Cualquier endpoint o thunk que retorne estructuras distintas a `{success, message_key, message, data}` rompe el canon.

---

## 3) Plan de acción definitivo (orden obligatorio)

### Fase 0 — Freeze & Baseline (1 commit)
- Congelar cambios funcionales.
- Generar baseline: build, lint, typecheck, tests (si existen) y un reporte de “violaciones al canon” (grep + reglas).
- Entregable: `docs/fuente_de_la_verdad.md` + `docs/baseline.md` con métricas.

### Fase 1 — Reparar build/lint “hard blockers”
- Corregir `Huertas.tsx` (parse/JSX).
- Eliminar `@ts-ignore` (migrar a `@ts-expect-error` si aplica y justificar).
- Reducir `any` empezando por *capas core* (API, slices base, NotificationEngine).

### Fase 2 — Canon global (la base que evita bifurcaciones)
**Frontend (global):**
- Unificar `httpClient` (Axios) + `request()` + normalización de errores.
- Unificar `NotificationEngine` y prohibir `toast` fuera de él (guardrail ESLint).
- Tipos: `ApiResponse<T>`, `Paginated<T>`, `FieldErrors`.
- Patrón único: `service → thunk → slice → hook → page → components`.

**Backend (global):**
- Asegurar que *todas* las respuestas pasen por `NotificationHandler`.
- Unificar paginación/filtrado con `GenericPagination` en todas las entidades.

### Fase 3 — Módulo GOLD: `gestion_usuarios` (se mantiene como referencia)
- Revalidar que cumple el canon en 100% (sin excepciones).
- Extraer patrones reutilizables hacia `src/global/` (sin duplicar lógica).

### Fase 4 — Migración `gestion_huerta` (en orden)
1) Propietarios  
2) Huertas / Huertas Rentadas  
3) Temporadas  
4) Cosechas  
5) Finanzas por Cosecha (Inversiones/Ventas/Categorías)

Meta: que todo el módulo consuma `{results, meta}` y notificaciones canónicas.

### Fase 5 — Migración `gestion_bodega` (la más sensible)
- Detectar bifurcaciones: hooks con lógica distinta, servicios que retornan formas distintas, tablas con paginación propia, etc.
- Normalizar: `TableroBodega` / `Capturas` / `Empaques` / `Recepciones` sobre el mismo canon.
- Prioridad: experiencia fluida (sin flicker), pero sin inventar caches paralelos.

### Fase 6 — Hardening
- Guardrails: ESLint rules + scripts CI locales.
- Smoke tests de endpoints y flujos críticos (login, listar, crear, archivar, restaurar, eliminar, paginar, filtrar).
- Checklist de UX: skeletons, estados vacíos, botones protegidos por permisos.

---

## 4) Guardrails (para que no regresen bifurcaciones)
1. **ESLint:** prohibir `toast.*` fuera de `NotificationEngine` y prohibir `axios` directo fuera de `httpClient`.
2. **Typescript:** prohibir `any` en capas core (`global/api`, `global/store`, `global/notifications`).
3. **Contrato:** tests (o asserts runtime) para validar shape de respuesta antes de entrar al store.
4. **Auditoría automatizada:** script que liste todos los archivos y busque patrones prohibidos.

---

## 5) Inventario “sin que se escape uno”
Este documento debe mantenerse con inventario **autogenerado** (recomendado) para evitar omisiones.
- Método sugerido: `git ls-files` → generar tabla `OK / CHANGE / DELETE / VERIFY`.
- Mientras se integra el script, se usa el inventario manual existente como punto de partida.

---

## 6) Regla de cambio
Ningún cambio que toque arquitectura/patrón se acepta si:
- no actualiza esta Fuente de la Verdad, o
- introduce un segundo patrón para el mismo problema.
