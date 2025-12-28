# Fuente de la Verdad Definitiva — Agroproductores Risol

Este documento unifica (sin pérdida de texto) los siguientes insumos, en este orden:

1. **Fuente de la Verdad Final** (primero)
2. **Fuente de la Verdad desde Auditoría ZIP** (después)

---

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

---

# (Anexo) Fuente de la Verdad desde Auditoría ZIP

---

# Fuente de la Verdad — Auditoría y Plan Maestro

> Documento canónico y definitivo para la auditoría total del sistema.
> **Todo el trabajo futuro debe derivar de este archivo.**

---

# 0) Canon Global (contratos únicos)

## 0.1 Canon API (Backend → Frontend)
* `response.success`
* `response.notification`
* `response.data.results: T[]`
* `response.data.meta: PaginationMeta`
* Errores: `response.data.errors` (único canal)

## 0.2 Canon State (Redux)
* Listas: `items`, `meta`, `loading`, `error`, `page`, `filters`, `estado`
* Detalle: `current` o `byId` (solo uno)

## 0.3 Canon Hooks
* `items, meta, loading, error`
* `page, setPage`
* `filters, setFilters`
* `estado, setEstado` (si aplica)
* `refetch()`

## 0.4 Canon UI
* Alias permitidos solo en UI: `const huertas = items;`
* Prohibido exponer `huertas`/`ventas`/`cosechas` en hooks o slices

---

# 1) Plan de Acción Definitivo (macro)

## 1.1 Fase Global (obligatoria)
* Unificar `PaginationMeta` en un único módulo global de tipos.
* Unificar `FilterType` (solo `autocomplete-async`).
* Normalizar respuestas backend a `NotificationHandler` + `data.results/meta`.
* Erradicar bifurcaciones de errores: UI solo lee `data.errors`.

## 1.2 Fase por Módulo (orden fijo)
* `gestion_usuarios` → `gestion_huerta` → `gestion_bodega`

## 1.3 Fase por Entidad (dentro de cada módulo)
* Services → Hooks → Slice/State → Pages → Components → Tests

---

# 2) Auditoría completa por archivo (fuente única)

> Para cada archivo: anotar estado, hallazgo y acción exacta.

## 2.1 Backend (todos los archivos)

* `backend/agroproductores_risol/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/agroproductores_risol/asgi.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/agroproductores_risol/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/agroproductores_risol/settings.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/agroproductores_risol/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/agroproductores_risol/utils/pagination.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/agroproductores_risol/wsgi.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0002_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/exportacion/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/exportacion/excel_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/exportacion/pdf_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/reportes/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/reportes/semanal_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/services/reportes/temporada_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/tests.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/cache_keys.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/kpis.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/reporting.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/semana.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/bodegas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/camiones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/cierres_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/compras_madera_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/consumibles_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/empaques_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/inventarios_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/pedidos_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/recepciones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/reportes/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/reportes/reporte_semanal_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/reportes/reporte_temporada_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_bodega/views/tablero_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/exportacion/excel_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/exportacion/pdf_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/exportacion_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/reportes/cosecha_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/reportes/perfil_huerta_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/reportes/temporada_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/services/reportes_produccion_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/templatetags/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/templatetags/custom_filters.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/templatetags/custom_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/templatetags/form_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/templatetags/formatting_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/templatetags/number_filters.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/test/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/test/test_bloqueos_estado.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/test/test_huerta_delete.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/test/test_model_validations.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/test/test_permissions_archive_restore.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/test/test_temporada_delete_rules.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/tests.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/cache_keys.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/reporting.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/search_mixin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/categoria_inversion_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/cosechas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/huerta_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/inversiones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/reportes/cosecha_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/reportes/perfil_huerta_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/reportes/temporada_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/temporadas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_huerta/views/ventas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/management/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/management/commands/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/management/commands/prune_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/management/commands/rebuild_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/permissions_policy.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/signals.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_activity_validators.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_change_password.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_login.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_user_crud.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_utils_extra.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/test/test_validators_utils.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/perm_utils.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/validators.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/views/token_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/views/user_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/gestion_usuarios/views/user_views.py.segment.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/huerta_registration.log` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/manage.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
* `backend/requirements.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.

## 2.2 Frontend (todos los archivos en src)

* `frontend/src/App.css` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/App.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/assets/react.svg` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/AppDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/ErrorBoundary.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/IfRole.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/LazyRoutes.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/PermissionButton.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/PrivateRoute.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/RoleGuard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/TableLayout.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/common/Unauthorized.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/layout/Footer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/layout/MainLayout.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/components/layout/Navbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/api/apiClient.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/constants/breadcrumbRoutes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/constants/navItems.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/routes/AppRouter.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/routes/moduleRoutes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/authSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/bodegasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/breadcrumbsSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/capturasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/categoriaInversionSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/cierresSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/cosechasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/empaquesSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/huertaRentadaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/huertaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/huertasCombinadasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/inversionesSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/propietariosSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/store.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/tableroBodegaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/temporadaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/temporadabodegaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/userSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/store/ventasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/utils/NotificationEngine.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/utils/date.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/global/utils/formatters.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/index.css` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/main.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useBodegas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useCamiones.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useCapturas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useCierres.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useGastos.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useInventarios.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/usePedidos.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Bodegas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Capturas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Empaque.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Gastos.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Inventarios.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Logistica.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Reportes.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/pages/Temporadas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/bodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/camionesService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/capturasService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/cierresService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/empaquesService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/gastosService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/inventarioService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/pedidosService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/camionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/shared.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/utils/format.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_bodega/utils/hotkeys.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useCosechas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useHuertas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useInversiones.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/hooks/useVentas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/Cosechas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/Huertas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/Inversion.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/Propietarios.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/Temporadas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/pages/Venta.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/cosechaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/huertaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/inversionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/propietarioService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/temporadaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/services/ventaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/shared.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/hooks/useUsers.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/Login.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/Profile.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/Register.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/services/authService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/services/permisoService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/services/userService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/modules/gestion_usuarios/types/userTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/theme.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
* `frontend/src/vite-env.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.

# 3) Matriz por módulo y entidad (backend)

## 3.1 gestion_usuarios
### Role
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CustomUserManager
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Users
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### RegistroActividad
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

## 3.2 gestion_huerta
### Propietario
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Huerta
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### HuertaRentada
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Temporada
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CategoriaInversion
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Cosecha
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### InversionesHuerta
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Venta
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

## 3.3 gestion_bodega
### Material
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CalidadMadera
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CalidadPlastico
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### EstadoPedido
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### EstadoCamion
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### TimeStampedModel
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Bodega
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### TemporadaBodega
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Cliente
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Recepcion
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### ClasificacionEmpaque
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### InventarioPlastico
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### MovimientoPlastico
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CompraMadera
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### AbonoMadera
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Pedido
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### PedidoRenglon
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### SurtidoRenglon
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CamionSalida
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CamionItem
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### Consumible
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

### CierreSemanal
* Contrato list (`results/meta`): [ ]
* Contrato detail (`data` único): [ ]
* Errores `data.errors`: [ ]
* Permisos canónicos: [ ]
* Soft-delete: [ ]

# 4) Matriz por módulo y entidad (frontend)

## 4.1 gestion_usuarios
* Services: [ ] Hook: [ ] Slice: [ ] Pages: [ ] Components: [ ]

## 4.2 gestion_huerta
* Services: [ ] Hook: [ ] Slice: [ ] Pages: [ ] Components: [ ]

## 4.3 gestion_bodega
* Services: [ ] Hook: [ ] Slice: [ ] Pages: [ ] Components: [ ]

# 5) Evidencia mínima por hallazgo
* Archivo exacto
* Hallazgo
* Evidencia (comando + línea)
* Acción propuesta
* Estado final

# 6) Comandos de verificación (gates)
```bash
python backend/manage.py check
cd frontend
npm run build
npm run lint
cd ..
rg -n "data\.(huertas|cosechas|ventas|inversiones|propietarios|temporadas|categorias)" frontend/src
rg -n "backend\.errors|(^|\W)errors\s*:|data\?\.(errors)|e\.response\.data\.errors" frontend/src
rg -n "async-select|autocomplete-async" frontend/src
rg -n "meta\.(page_size|total_pages|next|previous)|total_registradas" frontend/src/modules
rg -n "get_paginated_response\(" backend/gestion_huerta
rg -n "return Response\(|HttpResponse\(" backend/gestion_huerta
```
