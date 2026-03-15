# Analisis de errores de ejecucion de scripts Python

## 1. Contexto de la corrida

- Fecha de corrida: `2026-03-08`
- Scope ejecutado: todos los `.py` de la raiz + `tools/audit_tablero_consistency.py`
- Total scripts: `32`
- Resultado global (corrida mas reciente): `18 OK`, `14 ERROR`, `0 TIMEOUT`
- Evidencia: `./.codex_run_logs_20260308_rerun/results.json`
- Delta vs corrida anterior: sin cambio en conteo global (`18/14/0`) y sin cambio en el conjunto de scripts que fallan.

## 2. Resumen ejecutivo (que esta pasando realmente)

El sistema esta en una transicion de dominio: se eliminaron entidades viejas de logistica/pedidos, pero todavia hay scripts y servicios que las referencian.

Eso produce dos tipos de fallas:

1. Fallas duras de backend por referencias a modelos eliminados (`Pedido`, `SurtidoRenglon`, `CamionItem`).
2. Fallas de scripts de auditoria/debug por contrato de datos desactualizado (`kg` vs `cajas`, `cantidad_cajas` vs `cajas_campo`).
3. Fallas de guardrails de frontend (no son crashes de app): el codigo actual viola politicas de arquitectura (`axios` fuera de `apiClient`, `any` en `global/store`, transformaciones en `services`).

## 3. Error por error, con causa raiz, solucion y por que

---

### Error 1: `analisis_flujo_bodega.py`

- Error observado:
  - `NameError: name 'Pedido' is not defined`
- Donde:
  - `analisis_flujo_bodega.py` linea 28 (`Pedido.objects.count()`)
- Causa raiz:
  - El modelo `Pedido` fue eliminado del dominio (ver migracion `backend/gestion_bodega/migrations/0015_remove_pedido_cliente_and_more.py`).
  - El script aun asume el modelo viejo.
- Solucion:
  - Quitar conteos de `Pedido` y `SurtidoRenglon`.
  - Si necesitas metricas de salida, migrar el analisis a `CamionSalida` + `CamionConsumoEmpaque`.
- Por que funciona:
  - El script deja de importar/usar entidades inexistentes y se alinea al modelo vigente de despacho.

---

### Error 2: `analisis_parte1.py`

- Error observado:
  - `AttributeError: 'Recepcion' object has no attribute 'cantidad_cajas'`
- Donde:
  - `analisis_parte1.py` linea 61
- Causa raiz:
  - En `Recepcion` el campo actual es `cajas_campo` (`backend/gestion_bodega/models.py`, clase `Recepcion`).
  - `cantidad_cajas` corresponde a `ClasificacionEmpaque`, no a `Recepcion`.
- Solucion:
  - Cambiar todas las referencias `rec.cantidad_cajas` por `rec.cajas_campo`.
- Por que funciona:
  - Usa el nombre real del campo en el modelo actual y evita el `AttributeError`.

---

### Error 3: `create_simple_test_data.py`

- Error observado:
  - `ImportError: cannot import name 'CamionItem' from 'gestion_bodega.models'`
- Donde:
  - Import en linea 18
- Causa raiz:
  - `CamionItem` fue eliminado (migracion `0015`).
  - El modelo vigente para consumo de stock en camiones es `CamionConsumoEmpaque`.
- Solucion:
  - Reemplazar `CamionItem` por `CamionConsumoEmpaque`.
  - Crear consumos asi:
    - `CamionConsumoEmpaque(camion=..., clasificacion_empaque=..., cantidad=...)`
- Por que funciona:
  - El script pasa a usar la entidad actual que si existe en `models.py`.

---

### Error 4: `create_test_data.py`

- Error observado:
  - `ImportError: cannot import name 'CamionItem'`
- Donde:
  - Import en linea 20
- Causa raiz:
  - Mismo problema estructural que el error anterior.
- Solucion principal:
  - Migrar de `CamionItem` a `CamionConsumoEmpaque`.
- Soluciones adicionales necesarias (errores potenciales despues del import):
  - `Bodega.get_or_create(... defaults={"direccion": ...})` debe usar `ubicacion` (campo actual de `Bodega`).
  - `LoteBodega` requiere `semana` y no tiene campos `recepcion`, `tipo_mango`, `created_by`.
  - `CamionSalida.numero` es `PositiveIntegerField`, no string tipo `"CAM-001"`.
  - `created_by` no esta en los modelos de bodega mostrados en `models.py`.
- Por que funciona:
  - Corrige no solo el primer bloqueo de import, sino tambien incompatibilidades de esquema que aparecerian despues.

---

### Error 5: `seed_p3_data.py`

- Error observado:
  - `ImportError: cannot import name 'CamionItem'`
- Donde:
  - Import en linea 13
- Causa raiz:
  - Referencia a modelo eliminado.
- Solucion principal:
  - Sustituir `CamionItem` por `CamionConsumoEmpaque`.
- Soluciones adicionales necesarias:
  - `CamionConsumoEmpaque.objects.create(...)` requiere `cantidad` (en el script no se esta pasando).
  - Revisar que `ClasificacionEmpaque` se cree con contexto completo (`bodega`, `temporada`, `recepcion`, `semana`) para consistencia.
- Por que funciona:
  - Se ajusta al contrato del modelo vigente y evita errores encadenados.

---

### Error 6: `shell_commands.py`

- Error observado:
  - `NameError: name 'CamionItem' is not defined`
- Donde:
  - Lineas 30, 51, 54
- Causa raiz:
  - Script antiguo que usa el modelo eliminado `CamionItem`.
- Solucion:
  - Reemplazar limpieza y creacion de items con `CamionConsumoEmpaque`.
  - Mantener `CamionSalida` para encabezado de camion.
- Por que funciona:
  - El flujo de salida usa la tabla real de consumos de camion.

---

### Error 7: `debug_tablero_requests.py`

- Error observado:
  - `ImportError: cannot import name 'SurtidoRenglon' from 'gestion_bodega.models'`
- Donde realmente truena:
  - Endpoint `/bodega/empaques/disponibles/`
  - `backend/gestion_bodega/services/inventory_service.py` linea 167
- Causa raiz:
  - `InventoryService.get_available_stock_for_truck` todavia importa `SurtidoRenglon`.
  - `SurtidoRenglon` fue eliminado en migracion `0015`.
- Solucion:
  - Quitar `SurtidoRenglon` del import local y remover dependencia de relaciones `surtidos__...`.
  - Tratar `consumed_orders` como `0` mientras no exista un reemplazo funcional de pedidos.
- Por que funciona:
  - El endpoint deja de intentar cargar un modelo inexistente y vuelve a responder sin 500.

---

### Error 8: `tools/audit_tablero_consistency.py`

- Error observado:
  - Mismo `ImportError: SurtidoRenglon` al llamar `/bodega/empaques/disponibles/`
- Causa raiz:
  - No es un bug del script de audit en si; es el mismo bug backend de `inventory_service`.
- Solucion:
  - Primero arreglar `InventoryService`.
  - Luego rerun del audit.
- Por que funciona:
  - El audit depende de endpoints; si backend cae, el audit siempre fallara.

---

### Error 9: `debug_kpi_live.py`

- Error observado:
  - `KeyError: 'kg'`
- Donde:
  - Linea 72
- Causa raiz:
  - El contrato actual de queue items usa `cajas`, no `kg` (ver `backend/gestion_bodega/utils/kpis.py`, `build_queue_items`).
- Solucion:
  - Cambiar accesos a `item["cajas"]`.
  - Opcional: fallback defensivo `item.get("cajas", item.get("kg", 0))` durante migracion.
- Por que funciona:
  - El script usa la key real que produce el backend hoy.

---

### Error 10: `diagnose_ghosts.py`

- Error observado:
  - `KeyError: 'kg'`
- Donde:
  - Lineas 77 y 81
- Causa raiz:
  - Igual que el caso anterior: contrato viejo (`kg`) vs contrato actual (`cajas`).
- Solucion:
  - Reemplazar `item['kg']` por `item['cajas']`.
- Por que funciona:
  - Alinea debug script con el payload actual.

---

### Error 11: `check_api_client_usage.py`

- Error observado:
  - Falla por `axios` fuera de `apiClient`.
  - Archivo detectado: `frontend/src/global/api/errorUtils.ts`
- Causa raiz:
  - `errorUtils.ts` importa `axios` directamente.
- Solucion:
  - En `errorUtils.ts`, dejar de importar `axios`.
  - Usar helpers exportados por `apiClient.ts`:
    - `isApiClientAxiosError`
    - `ApiClientAxiosError` (tipo)
- Por que funciona:
  - Cumple la regla de arquitectura: todo acceso axios centralizado en `apiClient`.

---

### Error 12: `check_toast_and_axios_usage.py`

- Error observado:
  - Misma violacion de `axios` fuera de `apiClient.ts`.
- Causa raiz:
  - Mismo archivo (`errorUtils.ts`) rompe dos guardrails distintos.
- Solucion:
  - Igual que Error 11.
- Por que funciona:
  - Elimina la unica ocurrencia de axios fuera del archivo permitido.

---

### Error 13: `check_ts_core_guard.py`

- Error observado:
- Multiples usos de `any` en `frontend/src/global/store/*` (ej: `cierresSlice`, `gastosSlice`, `inventariosSlice`, `tableroBodegaSlice`, `temporadabodegaSlice`, etc).
- Causa raiz:
  - Deuda tecnica de tipado en capa core.
  - El guardrail esta disenado para fallar cuando hay `any`.
- Solucion:
  - Reemplazar `any` por tipos de payload/error concretos.
  - Reutilizar `extractApiError` y tipos compartidos de respuesta API.
  - En reducers, tipar `action.payload` con `PayloadAction<...>`.
- Por que funciona:
  - El guardrail busca justamente la ausencia de `any`; al tipar correctamente, el script pasa y el codigo queda mas seguro.

---

### Error 14: `check_ui_transforms_policy.py`

- Error observado:
  - Transformacion `.filter(...)` en `frontend/src/modules/gestion_bodega/services/empaquesService.ts:231`
- Causa raiz:
  - Politica vigente: transformaciones de colecciones deben vivir en UI/adapters, no en `services/pages`.
- Solucion:
  - Mover el bloque de filtrado/agrupacion de `listDisponiblesAgrupados` a una utilidad permitida (ej. `frontend/src/global/utils/uiTransforms.ts`) o hacerlo en backend.
- Por que funciona:
  - Se respeta separacion de capas: service = transporte/IO, UI-utils = transformacion de presentacion.

## 4. Hallazgo estructural critico en backend (prioridad alta)

Archivo: `backend/gestion_bodega/services/inventory_service.py`

Referencias rotas detectadas:

- Import local de modelo eliminado:
  - `linea 167`: `from gestion_bodega.models import SurtidoRenglon, CamionConsumoEmpaque`
- Relaciones eliminadas usadas en queries:
  - `linea 194`: `surtidos__cantidad`
  - `linea 243`: `clasificacion.surtidos.filter(...)`
  - `linea 274`: `surtidos__is_active=True`
  - `linea 329`: `surtidos__cantidad`

Que implica:

- Cualquier endpoint que pase por `get_available_stock_for_truck` puede lanzar 500.
- Afecta directamente scripts de debug/auditoria y posiblemente UI real de logistica.

## 5. Orden recomendado de correccion (para destrabar rapido)

1. **Backend critico**: limpiar `inventory_service.py` de dependencias a `SurtidoRenglon/surtidos`.
2. **Scripts legacy de dominio**: migrar `CamionItem` -> `CamionConsumoEmpaque`; quitar `Pedido`.
3. **Scripts KPI/debug**: cambiar `kg` -> `cajas`, `cantidad_cajas` -> `cajas_campo` en recepciones.
4. **Guardrails frontend**:
   - quitar `axios` de `errorUtils.ts`
   - remover `any` en `global/store`
   - mover transformaciones de `services` a `uiTransforms`/adapter.

## 6. Snippets de referencia (orientativos)

### 6.1 `kg` a `cajas` (debug scripts)

```python
# antes
print(item["kg"])

# despues
print(item["cajas"])
# o transitorio:
print(item.get("cajas", item.get("kg", 0)))
```

### 6.2 `Recepcion.cantidad_cajas` a `Recepcion.cajas_campo`

```python
# antes
rec.cantidad_cajas

# despues
rec.cajas_campo
```

### 6.3 `CamionItem` a `CamionConsumoEmpaque`

```python
from gestion_bodega.models import CamionConsumoEmpaque

CamionConsumoEmpaque.objects.create(
    camion=camion,
    clasificacion_empaque=clasificacion,
    cantidad=50,
)
```

### 6.4 Evitar `axios` directo en `errorUtils.ts`

```ts
// antes
import axios, { AxiosError } from "axios";

// despues
import { isApiClientAxiosError, ApiClientAxiosError } from "./apiClient";

export function isAxiosError<T = unknown>(err: unknown): err is ApiClientAxiosError {
  return isApiClientAxiosError(err);
}
```

## 7. Nota importante sobre los guardrails

Los scripts `check_*` no son "tests funcionales de runtime". Son **reglas de arquitectura** y estan pensados para fallar si detectan deuda o violaciones de convenciones.

O sea:

- Que fallen no siempre significa que la app no corre.
- Si quieres un pipeline limpio, hay que corregir esas convenciones tambien.

## 8. Estado final de esta auditoria

- Documento generado en: `output_analysis.md`
- Fuente de datos usada: `./.codex_run_logs_20260308_rerun/`
- Conclusion: la mayor parte de los errores duros viene de desalineacion entre scripts/servicios legacy y el modelo actual de bodega.
