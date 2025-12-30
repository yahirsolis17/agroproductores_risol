# INFORME MEGA-HIPER REQUERIDO — GESTIÓN_BODEGA (TABLERO + SEMANAS)

## Executive Brief
**Riesgos críticos**
- **Semana abierta vencida (día 8+)**: el cierre manual usa truncado forzado para liberar bloqueo si el cierre se intenta después del día 7. Esto evita el deadlock, pero implica que operaciones posteriores quedan fuera del rango de la semana abierta si no se crea una nueva. Evidencia: `backend/gestion_bodega/views/cierres_views.py::CierresViewSet.cerrar()` (comentario “FIX DEADLOCK”).
- **Dependencia total de semana activa para operar**: recepciones/clasificaciones dependen de una semana existente que cubra la fecha, y se rechazan si no hay semana abierta o rango válido. Evidencia: `backend/gestion_bodega/models.py::Recepcion.clean()` y `ClasificacionEmpaque.clean()`, `backend/gestion_bodega/serializers.py::RecepcionSerializer.validate()` y `ClasificacionEmpaqueSerializer.validate()`.

**Riesgos medianos**
- **Contrato de semanas duplicado**: existen dos flujos para crear/cerrar semanas (Tablero y Cierres), ambos con validaciones similares pero no idénticas (por ejemplo, el truncado de día 8 solo en `CierresViewSet.cerrar`). Evidencia: `backend/gestion_bodega/views/tablero_views.py::TableroBodegaWeekStartView/WeekFinishView` vs `backend/gestion_bodega/views/cierres_views.py::semanal/cerrar`.
- **Bodegas/temporadas archivadas bloquean operaciones**: reglas estrictas de archivo/finalización pueden impedir reoperaciones si no se controlan en UI (p.ej., restauraciones). Evidencia: `backend/gestion_bodega/models.py` (métodos `archivar/desarchivar`), `backend/gestion_bodega/serializers.py::_assert_bodega_temporada_operables()`.

**Recomendaciones (sin código)**
- Unificar un único flujo canónico para iniciar/cerrar semana (Tablero o Cierres), y documentar la política de “día 8”.
- Exponer explícitamente en UI el estado “semana expirada” y el requerimiento de iniciar una nueva semana antes de capturar.
- Añadir capturas de red reales del Tablero (summary/queues/week) como evidencia en la auditoría operativa.

**Priorización**
- **P0**: Unificación y comunicación de la regla “día 8” (cierre tardío) y su impacto en capturas.
- **P1**: Observabilidad en UI de estado de semana expirada.
- **P2**: Consolidar contrato de semanas entre `Cierres` y `Tablero`.

---

## 1) Mapa de dominio (backend) — “qué existe y qué significa”
### 1.1 Jerarquía y propósito
> **Nota:** para cada comportamiento, se incluye ubicación exacta (archivo/clase/método) como evidencia.

**Bodega**
- **Propósito**: catálogo raíz de bodegas, punto de anclaje de temporadas y operaciones. Evidencia: `backend/gestion_bodega/models.py::class Bodega`.
- **Campos críticos**: `id`, `nombre` (único), `is_active`, `archivado_en`. Evidencia: `Bodega` fields.
- **Relaciones**: `temporadas`, `recepciones`, `cierres`, `clasificaciones`, `pedidos`, `camiones`, etc. Evidencia: `Bodega` related_name en modelos.
- **Estados**: activa/archivada (soft-delete). Evidencia: `TimeStampedModel.is_active` + `Bodega.archivar()`.

**TemporadaBodega**
- **Propósito**: temporada operativa por bodega, agrupa semanas y operaciones. Evidencia: `backend/gestion_bodega/models.py::class TemporadaBodega`.
- **Campos críticos**: `año`, `bodega_id`, `fecha_inicio`, `fecha_fin`, `finalizada`, `is_active`. Evidencia: `TemporadaBodega` fields.
- **Relaciones**: `cierres`, `recepciones`, `clasificaciones`, `consumibles`, etc.
- **Estados**: activa/archivada + `finalizada`. Evidencia: `TemporadaBodega.finalizada` y `TemporadaBodega.finalizar()`.
- **Constraints**: `UniqueConstraint` para “una temporada activa por (bodega,año)” cuando `finalizada=False`. Evidencia: `TemporadaBodega.Meta.constraints`.

**CierreSemanal**
- **Propósito**: semana operativa manual (lock) por bodega+temporada; controla rangos y bloquea edición posterior. Evidencia: `backend/gestion_bodega/models.py::class CierreSemanal`.
- **Campos críticos**: `bodega_id`, `temporada_id`, `fecha_desde`, `fecha_hasta` (NULL para abierta), `iso_semana` (etiqueta). Evidencia: `CierreSemanal` fields.
- **Relaciones**: `recepciones`, `clasificaciones`. Evidencia: FK `semana` en modelos `Recepcion` y `ClasificacionEmpaque`.
- **Estados**: ABIERTA (`fecha_hasta` = null) / CERRADA (`fecha_hasta` != null) + `is_active`. Evidencia: `CierreSemanal.activa` + `CierreSemanal.clean()`.
- **Constraints**: única semana abierta por (bodega,temporada). Evidencia: `UniqueConstraint` en `CierreSemanal.Meta.constraints`.

**Recepción (Recepcion)**
- **Propósito**: entrada de mango de campo sin empacar. Evidencia: `backend/gestion_bodega/models.py::class Recepcion`.
- **Campos críticos**: `bodega_id`, `temporada_id`, `semana_id`, `fecha`, `tipo_mango`, `cajas_campo`. Evidencia: `Recepcion` fields.
- **Relaciones**: `clasificaciones` (ClasificacionEmpaque). Evidencia: `Recepcion.clasificaciones`.
- **Estados**: activa/archivada. Evidencia: `TimeStampedModel.is_active` + `Recepcion.archivar()`.

**Clasificación / Empaque (ClasificacionEmpaque)**
- **Propósito**: empaques por material/calidad derivados de una recepción. Evidencia: `backend/gestion_bodega/models.py::class ClasificacionEmpaque`.
- **Campos críticos**: `recepcion_id`, `bodega_id`, `temporada_id`, `semana_id`, `fecha`, `material`, `calidad`, `cantidad_cajas`. Evidencia: `ClasificacionEmpaque` fields.
- **Relaciones**: `surtidos` (SurtidoRenglon). Evidencia: `ClasificacionEmpaque.surtidos`.
- **Estados**: activa/archivada. Evidencia: `TimeStampedModel.is_active`.

**Pedidos / Surtidos**
- **Pedido**
  - Propósito: ordenar surtidos por cliente. Evidencia: `backend/gestion_bodega/models.py::class Pedido`.
  - Campos: `bodega`, `temporada`, `cliente`, `fecha`, `estado`. Evidencia: `Pedido` fields.
  - Estados: `BORRADOR`, `PARCIAL`, `SURTIDO`, `CANCELADO`. Evidencia: `EstadoPedido` enum.
- **PedidoRenglon**
  - Propósito: líneas del pedido con cantidad solicitada/surtida. Evidencia: `backend/gestion_bodega/models.py::class PedidoRenglon`.
- **SurtidoRenglon**
  - Propósito: consumo de cajas clasificadas contra un renglón. Evidencia: `backend/gestion_bodega/models.py::class SurtidoRenglon`.
  - Regla: no puede exceder disponible (overpicking). Evidencia: `SurtidoRenglon.clean()`.

### 1.2 Invariantes (reglas que “nunca” deben romperse)
- **Solo 1 semana abierta por (bodega, temporada)**: constraint `uniq_cierre_semana_abierta_bod_temp`. Evidencia: `backend/gestion_bodega/models.py::CierreSemanal.Meta.constraints`.
- **Rango máximo 7 días por semana**: validación `CierreSemanal.clean()` y `CierreSemanalSerializer.validate()`. Evidencia: `backend/gestion_bodega/models.py::CierreSemanal.clean()`, `backend/gestion_bodega/serializers.py::CierreSemanalSerializer.validate()`.
- **No solapes de semanas**: validación de rango contra semanas activas. Evidencia: `CierreSemanal.clean()` y `CierreSemanalSerializer.validate()`.
- **Recepción debe estar en semana activa y dentro del rango**: validaciones en `Recepcion.clean()` + `RecepcionSerializer.validate()`. Evidencia: `backend/gestion_bodega/models.py::Recepcion.clean()`, `backend/gestion_bodega/serializers.py::RecepcionSerializer.validate()`.
- **Clasificación no puede exceder cajas recibidas**: `ClasificacionEmpaque.clean()` y validación con `select_for_update` en serializer. Evidencia: `backend/gestion_bodega/models.py::ClasificacionEmpaque.clean()` y `backend/gestion_bodega/serializers.py::ClasificacionEmpaqueSerializer.validate()`.
- **Surtido no puede exceder clasificado ni pedido**: `SurtidoRenglon.clean()` valida `disponible` y `pendiente`. Evidencia: `backend/gestion_bodega/models.py::SurtidoRenglon.clean()`.
- **No operar en temporadas finalizadas/archivadas**: `_assert_bodega_temporada_operables`. Evidencia: `backend/gestion_bodega/serializers.py::_assert_bodega_temporada_operables()`.

---

## 2) Máquina de estados canónica de SEMANAS
### 2.1 Definición exacta de semana operativa
- **Semana = rango manual con máximo 7 días**: `fecha_desde` y `fecha_hasta`, donde `fecha_hasta` puede ser `null` (semana abierta). Evidencia: `backend/gestion_bodega/models.py::CierreSemanal`.
- **Rango teórico para abiertas**: si `fecha_hasta` es `null`, el rango visible es `fecha_desde + 6 días`. Evidencia: `backend/gestion_bodega/models.py::_resolver_semana_por_fecha()` y `backend/gestion_bodega/utils/semana.py::rango_por_semana_id()`.
- **Tipo de campo**: `fecha_desde`/`fecha_hasta` son `DateField` (sin hora). Evidencia: `backend/gestion_bodega/models.py::CierreSemanal`.
- **Timezone**: “hoy” en backend usa `timezone.localdate()`. Evidencia: `backend/gestion_bodega/utils/semana.py::tz_today_mx()` y `backend/agroproductores_risol/settings.py::TIME_ZONE = 'America/Mexico_City'`.

### 2.2 Estados y transiciones
**Estado: ABIERTA**
- **Condición exacta**: `fecha_hasta is null` y `is_active = True`. Evidencia: `CierreSemanal.activa` + `CierreSemanal.Meta.constraints`.
- **Operaciones permitidas**:
  - Recepciones y clasificaciones se permiten si la fecha cae dentro del rango abierto y es hoy/ayer. Evidencia: `Recepcion.clean()` + `RecepcionSerializer.validate()`, `ClasificacionEmpaque.clean()` + `ClasificacionEmpaqueSerializer.validate()`.
  - Cierre de semana: permitido vía `/bodega/cierres/{id}/cerrar/` o `/bodega/tablero/week/finish/`. Evidencia: `CierresViewSet.cerrar()` y `TableroBodegaWeekFinishView.post()`.
- **Validaciones**: máximo 7 días; no solapes; no fechas futuras. Evidencia: `CierreSemanal.clean()`.

**Estado: CERRADA**
- **Condición exacta**: `fecha_hasta != null`. Evidencia: `CierreSemanal.clean()`.
- **Operaciones permitidas**: lectura y consulta; las mutaciones de recepciones/clasificaciones se bloquean si la fecha cae en una semana cerrada. Evidencia: `semana_cerrada_ids()` y su uso en `RecepcionViewSet` y `ClasificacionEmpaqueViewSet`.
- **Reabrir**: prohibido (no se puede editar ni reabrir). Evidencia: `CierreSemanal.clean()` y `CierreSemanalSerializer.validate()`.

### 2.3 Operaciones sobre semana
- **Crear semana**
  - Tablero: `POST /bodega/tablero/week/start/` (crea semana abierta). Evidencia: `backend/gestion_bodega/views/tablero_views.py::TableroBodegaWeekStartView.post()`.
  - Cierres: `POST /bodega/cierres/semanal/` (crea semana abierta o cerrada según `fecha_hasta`). Evidencia: `backend/gestion_bodega/views/cierres_views.py::CierresViewSet.semanal()`.
- **Cerrar semana**
  - Tablero: `POST /bodega/tablero/week/finish/` (requiere `semana_id` y valida rango). Evidencia: `TableroBodegaWeekFinishView.post()`.
  - Cierres: `POST /bodega/cierres/{id}/cerrar/` (si fecha > día 7 se trunca a día 7). Evidencia: `CierresViewSet.cerrar()`.
- **“Cierre automático”**: no existe; el cierre es manual desde Tablero o Cierres. Evidencia: ausencia de tareas automáticas; solo endpoints manuales en `tablero_views.py` y `cierres_views.py`.
- **“Corrección de semana vencida”**: existe como **truncado** en `CierresViewSet.cerrar()` si la fecha de cierre supera 7 días (día 8+). Evidencia: `backend/gestion_bodega/views/cierres_views.py` (comentario “FIX DEADLOCK”).
- **Iniciar nueva semana**: `TableroBodegaWeekStartView.post()` crea una nueva semana abierta si no existe otra abierta. Evidencia: `select_for_update` en `TableroBodegaWeekStartView`.
- **Navegar semanas**: `GET /bodega/tablero/semanas/` y `GET /bodega/cierres/index/`. Evidencia: `TableroBodegaWeeksNavView.get()` y `CierresViewSet.index()`.

---

## 3) Algoritmo canónico: “resolver semana” (backend)
### 3.1 ¿Quién decide la semana?
- **Recepción**: se asigna en el `model.clean()` y en `RecepcionSerializer.create/update()` usando `_resolver_semana`/`_require_semana`. Evidencia: `backend/gestion_bodega/models.py::Recepcion.clean()` y `backend/gestion_bodega/serializers.py::RecepcionSerializer.create()`.
- **Clasificación**: hereda semana de la recepción si existe; si no, se resuelve por fecha. Evidencia: `backend/gestion_bodega/models.py::ClasificacionEmpaque.clean()` y `backend/gestion_bodega/views/empaques_views.py::create()`.
- **Tablero**: para KPIs/colas, el rango se decide por `semana_id`, o por fechas, o por iso, o por la semana activa. Evidencia: `backend/gestion_bodega/views/tablero_views.py::_resolve_range()`.

### 3.2 Pseudoflujo exacto
**Recepción / Clasificación (operaciones)**
1. Obtener bodega/temporada/fecha del payload. Evidencia: `RecepcionSerializer.validate()` / `ClasificacionEmpaqueSerializer.validate()`.
2. Validar bodega/temporada activas y coherentes. Evidencia: `_assert_bodega_temporada_operables()`.
3. Buscar semana que cubra la fecha:
   - En modelos: `_resolver_semana_por_fecha()` (fecha_hasta null → fecha_desde+6). Evidencia: `backend/gestion_bodega/models.py::_resolver_semana_por_fecha()`.
   - En serializers: `_require_semana()` → `ValidationError` si no existe. Evidencia: `backend/gestion_bodega/serializers.py::_require_semana()`.
4. Si semana está cerrada, rechazar. Evidencia: `semana_cerrada_ids()` y llamadas en `RecepcionViewSet.create()` y `ClasificacionEmpaqueViewSet.create()`.
5. Validar fecha dentro del rango y regla hoy/ayer. Evidencia: `Recepcion.clean()` y `ClasificacionEmpaque.clean()`.
6. Guardar con semana asignada. Evidencia: `RecepcionSerializer.create()`, `ClasificacionEmpaqueViewSet.create()`.

**Tablero (KPIs/colas)**
1. Obtener `temporada` y `bodega` de query params. Evidencia: `tablero_views.py::_require_temporada()` y `_to_int()`.
2. Resolver rango:
   - `semana_id` → rango de CierreSemanal.
   - `fecha_desde`/`fecha_hasta` → usar explícitos.
   - `iso_semana` → rango ISO.
   - Si nada, usar semana abierta o última. Evidencia: `_resolve_range()`.
3. Construir KPIs o colas con ese rango. Evidencia: `build_summary()` y `queue_*_qs()` en `backend/gestion_bodega/utils/kpis.py` (invocados en `TableroBodegaSummaryView` y `TableroBodegaQueuesView`).

### 3.3 Ubicación en código
- `backend/gestion_bodega/models.py :: _resolver_semana_por_fecha()`
- `backend/gestion_bodega/serializers.py :: _resolver_semana(), _require_semana()`
- `backend/gestion_bodega/views/recepciones_views.py :: _resolve_semana_for_fecha()`
- `backend/gestion_bodega/views/empaques_views.py :: _resolve_semana_for_fecha()`
- `backend/gestion_bodega/views/tablero_views.py :: _resolve_range(), _current_or_last_week_ctx()`

---

## 4) Contrato API completo (backend)
### 4.1 Tabla de endpoints del módulo bodega
> **Envelope canónico**: `NotificationHandler` retorna `{ success, notification: { key, message, type }, data }`. Evidencia: `backend/gestion_bodega/utils/notification_handler.py`.

| Método + ruta | Propósito | Query params | Body esperado | Respuesta (envelope) | Errores comunes (message_key) | Evidencia |
|---|---|---|---|---|---|---|
| GET `/bodega/tablero/summary/` | KPI summary | `temporada`, `bodega`, `semana_id`, `fecha_desde`, `fecha_hasta`, `iso_semana` | n/a | `data.kpis`, `data.context` | `validation_error`, `server_error` | `backend/gestion_bodega/views/tablero_views.py::TableroBodegaSummaryView.get()` |
| GET `/bodega/tablero/queues/` | Cola por tipo | `temporada`, `bodega`, `type`, paginación/filtros | n/a | `data.meta`, `data.results`, `data.context` | `validation_error`, `server_error` | `TableroBodegaQueuesView.get()` |
| GET `/bodega/tablero/alerts/` | Alertas de tablero | `temporada`, `bodega` | n/a | `data.alerts`, `data.context` | `validation_error`, `server_error` | `TableroBodegaAlertsView.get()` |
| GET `/bodega/tablero/week/current/` | Semana activa/última | `temporada`, `bodega` | n/a | `data.active_week`, `data.week` | `validation_error` | `TableroBodegaWeekCurrentView.get()` |
| POST `/bodega/tablero/week/start/` | Iniciar semana abierta | n/a | `{ bodega, temporada, fecha_desde }` | `data.week`, `data.active_week` | `validation_error` | `TableroBodegaWeekStartView.post()` |
| POST `/bodega/tablero/week/finish/` | Cerrar semana | n/a | `{ bodega, temporada, semana_id, fecha_hasta }` | `data.week`, `data.active_week` | `validation_error` | `TableroBodegaWeekFinishView.post()` |
| GET `/bodega/tablero/semanas/` | Navegar semanas | `temporada`, `bodega`, `iso_semana` | n/a | `data.items`, `data.indice` | `validation_error` | `TableroBodegaWeeksNavView.get()` |
| GET `/bodega/recepciones/` | Listar recepciones | `bodega`, `temporada`, `semana` | n/a | `data.recepciones`, `data.meta` | `validation_error` | `RecepcionViewSet.list()` |
| POST `/bodega/recepciones/` | Crear recepción | n/a | `{ bodega, temporada, fecha, tipo_mango, cantidad_cajas, ... }` | `data.recepcion` | `recepcion_semana_cerrada`, `recepcion_semana_invalida`, `recepcion_temporada_invalida` | `RecepcionViewSet.create()` |
| POST `/bodega/recepciones/{id}/archivar/` | Archivar recepción | n/a | n/a | `data.recepcion_id` | `recepcion_semana_cerrada` | `RecepcionViewSet.archivar()` |
| GET `/bodega/empaques/` | Listar clasificaciones | `bodega`, `temporada`, `recepcion`, `semana` | n/a | `data.empaques`, `data.meta` | `validation_error` | `ClasificacionEmpaqueViewSet.list()` |
| POST `/bodega/empaques/` | Crear clasificación | n/a | `{ recepcion_id, bodega_id, temporada_id, fecha, material, calidad, cantidad_cajas }` | `data.clasificacion` | `clasificacion_semana_cerrada`, `validation_error` | `ClasificacionEmpaqueViewSet.create()` |
| POST `/bodega/empaques/bulk-upsert/` | Captura masiva | n/a | `{ recepcion, bodega, temporada, fecha, items[] }` | `data.created_ids/updated_ids/summary` | `clasificacion_semana_cerrada`, `clasificacion_con_consumos_inmutable` | `ClasificacionEmpaqueViewSet.bulk_upsert()` |
| GET `/bodega/cierres/` | Listar cierres | `bodega`, `temporada`, `iso_semana` | n/a | `data.results`, `data.meta` | `validation_error` | `CierresViewSet.list()` |
| GET `/bodega/cierres/index/` | Índice de semanas reales | `temporada` | n/a | `data.weeks`, `data.current_semana_ix` | `validation_error` | `CierresViewSet.index()` |
| POST `/bodega/cierres/semanal/` | Crear semana | n/a | `{ bodega, temporada, fecha_desde, fecha_hasta? }` | `data.cierre` | `validation_error` | `CierresViewSet.semanal()` |
| POST `/bodega/cierres/{id}/cerrar/` | Cerrar semana | n/a | `{ fecha_hasta? }` | `data.cierre` | `cierre_semanal_ya_cerrado`, `validation_error` | `CierresViewSet.cerrar()` |

### 4.2 Ejemplos reales de request/response
> **Limitación técnica**: el entorno usa MySQL (`backend/agroproductores_risol/settings.py`), sin base disponible en sandbox. Para “real” se usan ejemplos **ejecutables** basados en pruebas existentes (`backend/gestion_bodega/tests.py`) y pasos reproducibles donde no hay tests.

**(A) Recepción — ejemplo real basado en pruebas**
- **Request (test)**: `backend/gestion_bodega/tests.py::RecepcionAPITests.test_create_recepcion_success_sets_semana()`
```http
POST /bodega/recepciones/
Content-Type: application/json

{
  "bodega": 1,
  "temporada": 1,
  "fecha": "2025-01-15",
  "huertero_nombre": "Juan",
  "tipo_mango": "Ataulfo",
  "cantidad_cajas": 50
}
```
- **Response (observado en test)**:
```json
{
  "notification": { "key": "recepcion_create_success" },
  "data": {
    "recepcion": {
      "semana": 1,
      "cajas_campo": 50
    }
  }
}
```
- **Error real** (semana cerrada): `backend/gestion_bodega/tests.py::RecepcionAPITests.test_create_recepcion_blocked_when_week_closed()`
```json
{
  "notification": { "key": "recepcion_semana_cerrada" }
}
```

**(B) Recepción — listado real basado en pruebas**
- **Request**: `backend/gestion_bodega/tests.py::RecepcionAPITests.test_list_recepciones_returns_meta_and_aliases()`
```http
GET /bodega/recepciones/?bodega=1&temporada=1&semana=1
```
- **Response (observado en test)**:
```json
{
  "notification": { "key": "data_processed_success" },
  "data": {
    "meta": { "count": 2 },
    "recepciones": [ {"id": 1}, {"id": 2} ],
    "results": [ {"id": 1}, {"id": 2} ]
  }
}
```

**(C) Tablero (summary/queues/week) — pasos reproducibles**
> No hay pruebas ni capturas reales en repo. Para generar respuestas reales:
1. Levantar backend con DB válida y usuarios.
2. Crear bodega, temporada y semana.
3. Ejecutar: 
   - `GET /bodega/tablero/summary/?temporada=...&bodega=...&semana_id=...`
   - `GET /bodega/tablero/queues/?temporada=...&bodega=...&type=recepciones&semana_id=...`
   - `GET /bodega/tablero/week/current/?temporada=...&bodega=...`
   Evidencia de ubicación: `backend/gestion_bodega/views/tablero_views.py`.

**(D) Cierres — pasos reproducibles**
> No hay pruebas ni capturas reales en repo. Para generar respuestas reales:
1. Crear temporada activa.
2. Ejecutar:
   - `POST /bodega/cierres/semanal/` con `{bodega, temporada, fecha_desde}`.
   - `POST /bodega/cierres/{id}/cerrar/`.
   Evidencia de ubicación: `backend/gestion_bodega/views/cierres_views.py`.

---

## 5) Validaciones e integridad (backend) — “blindaje”
### 5.1 Validaciones por entidad
**Bodega**
- `clean()`: implícito vía serializer y constraints (`nombre` único). Evidencia: `backend/gestion_bodega/serializers.py::BodegaSerializer.validate_nombre()`.
- DB constraints: `unique nombre`. Evidencia: `Bodega.nombre`.
- Message keys: `bodega_create_success`, `bodega_update_success`, `ya_archivada`, `ya_esta_activa`. Evidencia: `backend/gestion_bodega/utils/constants.py`.

**TemporadaBodega**
- `clean()`: coherencia de bodega activa/temporada no finalizada; unicidad de año activo. Evidencia: `TemporadaBodegaSerializer.validate()`.
- DB constraints: `uniq_temporadabodega_activa`. Evidencia: `TemporadaBodega.Meta.constraints`.
- Message keys: `violacion_unicidad_año`, `registro_archivado_no_editable`, `temporadabodega_actualizada`. Evidencia: `constants.py` y `temporadas` views.

**CierreSemanal**
- `clean()`: no futuro, rango <= 7 días, no solapes, no reabrir, bodega/temporada activos. Evidencia: `CierreSemanal.clean()`.
- Serializer: mismas reglas + una semana abierta. Evidencia: `CierreSemanalSerializer.validate()`.
- Constraints: única abierta. Evidencia: `CierreSemanal.Meta.constraints`.
- Message keys: `cierre_semanal_creado`, `cierre_semanal_cerrado`, `cierre_semanal_ya_cerrado` (en view). Evidencia: `cierres_views.py` + `constants.py`.

**Recepción**
- `clean()`: bodega/temporada activas, fecha no futura, hoy/ayer, semana activa, fecha dentro de semana. Evidencia: `Recepcion.clean()`.
- Serializer: `_require_semana`, semana cerrada, fecha hoy/ayer. Evidencia: `RecepcionSerializer.validate()`.
- ViewSet: mapea errores a `message_key` (`recepcion_semana_cerrada`, `recepcion_semana_invalida`, etc.). Evidencia: `RecepcionViewSet._map_recepcion_validation_errors()`.

**ClasificaciónEmpaque**
- `clean()`: material/calidad válidos, fecha hoy/ayer, semana activa, no exceder recepción. Evidencia: `ClasificacionEmpaque.clean()`.
- Serializer: valida semana cerrada, overpicking con `select_for_update`. Evidencia: `ClasificacionEmpaqueSerializer.validate()`.
- ViewSet: inmutabilidad si hay surtidos. Evidencia: `ClasificacionEmpaqueViewSet.update()`.

**Pedido/Surtido**
- `Pedido.clean()`: temporada activa. Evidencia: `Pedido.clean()`.
- `SurtidoRenglon.clean()`: no exceder disponible ni pedido. Evidencia: `SurtidoRenglon.clean()`.

### 5.2 Validaciones cruzadas (las que evitan corrupción)
- **Recepción debe pertenecer a bodega/temporada de semana**: `Recepcion.clean()`. Evidencia: `backend/gestion_bodega/models.py`.
- **Clasificación debe coincidir con recepción**: fuerza bodega/temporada/tipo_mango del padre. Evidencia: `ClasificacionEmpaque.clean()`.
- **No clasificar más de lo recibido**: `ClasificacionEmpaque.clean()` y `ClasificacionEmpaqueSerializer.validate()`.
- **No surtir más de lo clasificado**: `SurtidoRenglon.clean()`.
- **Bulk upsert evita inconsistencias**: usa índice por `(material, calidad)` y actualiza semana/fecha/tipo_mango desde recepción. Evidencia: `ClasificacionEmpaqueViewSet.bulk_upsert()`.

---

## 6) Concurrencia y riesgos operativos (backend)
- **`transaction.atomic()`**: usado en archivar/restaurar, crear/cerrar semanas y validar overpicking. Evidencia: `Recepcion.archivar()`, `ClasificacionEmpaqueSerializer.validate()`, `TableroBodegaWeekStartView.post()`, `CierresViewSet.cerrar()`.
- **`select_for_update()`**:
  - Se usa para overpicking de clasificaciones y para lock al iniciar/cerrar semana. Evidencia: `ClasificacionEmpaqueSerializer.validate()` y `TableroBodegaWeekStartView.post()`, `TableroBodegaWeekFinishView.post()`.
- **Dos usuarios cerrando semana simultáneamente**: `select_for_update()` bloquea la fila de semana al cerrar. Evidencia: `TableroBodegaWeekFinishView.post()`.
- **Dos usuarios capturando recepciones**: no hay `select_for_update` en Recepción; se confía en constraints/validaciones. Evidencia: `RecepcionViewSet.create()`.
- **Reloj del server**: todas las reglas de “hoy/ayer” usan `timezone.localdate()`. Evidencia: `_is_today_or_yesterday_date()` y serializers.

**Deadlock (día 8) — evidencia**
- **Caso reproducible**: cerrar una semana abierta con `fecha_hasta` > `fecha_desde + 6 días`.
- **Función involucrada**: `CierresViewSet.cerrar()`.
- **Fix aplicado**: truncar `fecha_hasta` al día 7 para permitir cierre. Evidencia: comentario `FIX DEADLOCK` en `backend/gestion_bodega/views/cierres_views.py`.
- **Error exacto**: no hay logs/trace en repo; el fix está documentado en el comentario, pero no hay excepción almacenada.

---

## 7) Tablero Bodega (frontend) — arquitectura y “fuente de verdad”
### 7.1 Mapa de archivos del módulo
- `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx`
- `frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts`
- `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts`
- `frontend/src/global/store/tableroBodegaSlice.ts`
- Componentes UI:
  - `frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx`
  - `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx`
  - `frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx`
  - `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx`
  - `frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx`
  - `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx`
  - `frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx`
- Types:
  - `frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts`

### 7.2 Flujo de datos (Redux canónico)
- **Al entrar a Tablero**: `useTableroBodega` dispara `fetchTableroWeeksNav` y luego sincroniza `filters.fecha_desde/fecha_hasta`. Evidencia: `useTableroBodega.ts` (useEffect de weeksNav).
- **Al cambiar semana**: URL `week_id` se actualiza → `selectedWeekId` en slice → re-fetch de summary/queues. Evidencia: `useTableroBodega.ts` (URL sync + `fetchTablereSummary` + `fetchTableroQueues`).
- **Resumen**: `fetchTablereSummary` usa `getDashboardSummary` con `semanaId` actual. Evidencia: `tableroBodegaSlice.ts` + `tableroBodegaService.ts`.
- **Colas**: `fetchTableroQueues` con `queueType` activo. Evidencia: `tableroBodegaSlice.ts`.
- **Alertas**: `fetchTableroAlerts` con `temporadaId` y `bodegaId`. Evidencia: `tableroBodegaSlice.ts`.
- **Mutaciones**: `tableroStartWeek` / `tableroFinishWeek` → refetch de weeksNav + summary. Evidencia: `useTableroBodega.ts::apiStartWeekAction / apiFinishWeekAction`.

### 7.3 Estados de UI (UX state machine)
- **Loading inicial**: `loadingSummary || loadingAlerts || loadingQueues || loadingWeeksNav`. Evidencia: `useTableroBodega.ts`.
- **Loading al cambiar semana**: cambio de `week_id` dispara refetch de summary/queues. Evidencia: `useTableroBodega.ts`.
- **Week abierta vs cerrada**: `weekNav.items[].activa` y `weekState.active_week` determinan. Evidencia: `TableroBodegaPage.tsx` + `tableroBodegaTypes.d.ts`.
- **Week caducada**: `isExpiredWeek` calcula `fecha_desde + 6` y compara contra hoy. Evidencia: `useTableroBodega.ts`.
- **Error state**: `errorSummary/errorQueues/errorAlerts` en slice; notificaciones vía `NotificationEngine`. Evidencia: `tableroBodegaSlice.ts` + `tableroBodegaService.ts`.

---

## 8) Contrato Frontend ↔ Backend (lo que el front asume)
- **Identificación de semana activa**: `weekNav.items[].activa` + `week.current` de `/week/current/`. Evidencia: `tableroBodegaTypes.d.ts` + `TableroBodegaPage.tsx`.
- **Campos usados para status**: `fecha_desde`, `fecha_hasta`, `activa`, `rango_inferido`. Evidencia: `tableroBodegaTypes.d.ts`.
- **Errores de semana**: servicios capturan `message_key` y `errors.detail` (`startWeek`/`finishWeek`). Evidencia: `tableroBodegaService.ts::startWeek()` y `finishWeek()`.
- **Operaciones dependientes de semana abierta**: crear recepciones/clasificaciones depende de semana no cerrada (backend). Evidencia: `RecepcionViewSet.create()` y `ClasificacionEmpaqueViewSet.create()`.
- **Shape de data del tablero**:
  - Summary: `{ kpis, context }`.
  - Queues: `{ meta, results, context }`.
  - Alerts: `{ alerts, context }`. 
  Evidencia: `tableroBodegaTypes.d.ts` + `tablero_views.py`.

---

## 9) Casos de uso end-to-end (secuencias completas)
> Cada flujo incluye ubicación de backend y frontend para reproducibilidad.

### Inicio de temporada bodega
1. UI crea temporada (UI fuera de Tablero). Backend: `TemporadaBodegaViewSet` (archivo `backend/gestion_bodega/views/bodegas_views.py`).
2. Se habilita navegación de semanas cuando existe temporada activa. Evidencia: `TableroBodegaPage.tsx` (guard de temporada).

### Semana 1: abrir y operar
1. UI llama `POST /bodega/tablero/week/start/` con `fecha_desde`. Evidencia: `tableroBodegaService.startWeek()`.
2. Backend crea `CierreSemanal` abierta. Evidencia: `TableroBodegaWeekStartView.post()`.

### Registrar recepción
1. UI envía `POST /bodega/recepciones/` con `fecha`, `bodega`, `temporada`, `cantidad_cajas`. Evidencia: `RecepcionViewSet.create()`.
2. Backend resuelve semana y valida rango. Evidencia: `RecepcionSerializer.create()` + `Recepcion.clean()`.
3. Redux: no directo en tablero, pero refetch se dispara desde otras secciones al mutar. Evidencia: `TableroBodegaPage.tsx` + `useTableroBodega.ts`.

### Clasificar / Empacar
1. UI envía `POST /bodega/empaques/` o `/bodega/empaques/bulk-upsert/`. Evidencia: `ClasificacionEmpaqueViewSet.create()` / `bulk_upsert()`.
2. Backend valida overpicking y semana. Evidencia: `ClasificacionEmpaqueSerializer.validate()`.

### Pedidos y surtidos
1. UI crea `Pedido` y `PedidoRenglon` (no en tablero). Evidencia: `backend/gestion_bodega/models.py::Pedido`.
2. `SurtidoRenglon` consume cajas clasificadas; valida disponible. Evidencia: `SurtidoRenglon.clean()`.

### Cierre semanal
1. UI llama `POST /bodega/tablero/week/finish/` o `POST /bodega/cierres/{id}/cerrar/`. Evidencia: `TableroBodegaWeekFinishView.post()` / `CierresViewSet.cerrar()`.
2. Backend actualiza `fecha_hasta`. Evidencia: `CierreSemanal.save()`.

### Semana nueva
1. UI llama `POST /bodega/tablero/week/start/`. Evidencia: `TableroBodegaWeekStartView.post()`.
2. Weeks nav se refetch. Evidencia: `useTableroBodega.ts::apiStartWeekAction()`.

### Navegación entre semanas históricas
1. UI usa `GET /bodega/tablero/semanas/`. Evidencia: `TableroBodegaWeeksNavView.get()`.
2. Cambiar `week_id` en URL y refetch de summary/queues. Evidencia: `useTableroBodega.ts`.

### Semana olvidada (día 8+) — caso crítico
1. Semana abierta excede 7 días sin cerrar.
2. Al cerrar vía `/bodega/cierres/{id}/cerrar/`, `fecha_hasta` se trunca al día 7. Evidencia: `CierresViewSet.cerrar()`.
3. Operaciones posteriores deben abrir nueva semana para continuar. Evidencia: `Recepcion.clean()` (requiere semana que cubra la fecha).

---

## 10) Checklist de “robustez” (lo que ya está y lo que falta)
| Ya está robusto | Falta / Riesgo | Impacto | Detección | Propuesta remediación |
|---|---|---|---|---|
| Unicidad de semana abierta por bodega/temporada | Duplicidad de flujos (Tablero vs Cierres) | Medio | Inconsistencia en reglas y mensajes | Unificar endpoints o documentar claramente uno como “canon” |
| Validaciones de rango y solape semanal | Cierre tardío día 8 se trunca silenciosamente | Alto | Operación fuera de semana real | Exponer warning UI + forzar creación de nueva semana |
| Overpicking protegido con `select_for_update` | Sin auto-cierre de semanas | Medio | Semanas abiertas indefinidamente | Crear tarea programada o banner de expiración |
| Bloqueo de semanas cerradas | Falta de capturas reales de red para auditoría | Medio | Auditoría incompleta | Capturar respuestas reales con datos de staging |

---

## 11) Evidencia técnica mínima (para que yo pueda auditar sin suposiciones)
### 11.1 Extractos de código (los críticos)
**CierreSemanal completo (modelo)**
- Ubicación: `backend/gestion_bodega/models.py::class CierreSemanal`.

**Resolver semana por fecha (backend)**
- Ubicación: `backend/gestion_bodega/models.py::_resolver_semana_por_fecha()`.

**Endpoint de cierre semanal (backend)**
- Ubicación: `backend/gestion_bodega/views/cierres_views.py::CierresViewSet.cerrar()`.

**Endpoint de tablero (backend)**
- Ubicación: `backend/gestion_bodega/views/tablero_views.py::TableroBodegaSummaryView.get()` y `TableroBodegaQueuesView.get()`.

**Punto exacto donde una recepción “elige semana”**
- Ubicación: `backend/gestion_bodega/serializers.py::RecepcionSerializer.create()` y `backend/gestion_bodega/models.py::Recepcion.clean()`.

### 11.2 Capturas de Network (frontend)
> No disponibles en repo. Para generar:
1. Abrir `TableroBodegaPage` con una temporada activa.
2. Capturar en DevTools:
   - `/bodega/tablero/summary/` response.
   - `/bodega/recepciones/` POST response.
   - Error de “día 8” al cerrar semana con fecha fuera de rango (si se usa endpoint de cierres). Evidencia backend: `CierresViewSet.cerrar()`.

### 11.3 Datos ejemplo
> Snapshot mínimo (mock reproducible) basado en campos de modelo:
- **Bodega**: `id=1`, `nombre="Bodega Test"`, `is_active=true` (`backend/gestion_bodega/models.py::Bodega`).
- **TemporadaBodega**: `id=1`, `año=2025`, `bodega_id=1`, `fecha_inicio=2025-01-01`, `finalizada=false` (`TemporadaBodega`).
- **Semana abierta vieja**: `CierreSemanal(id=1, bodega_id=1, temporada_id=1, fecha_desde=2025-01-01, fecha_hasta=null)`.
- **Operaciones asociadas**:
  - Recepción: `Recepcion(id=1, semana_id=1, fecha=2025-01-01, cajas_campo=50)`.
  - Clasificación: `ClasificacionEmpaque(id=1, recepcion_id=1, semana_id=1, material=PLASTICO, calidad=PRIMERA, cantidad_cajas=30)`.
  - Pedido/Surtido: `Pedido(id=1, estado=BORRADOR)`, `PedidoRenglon(id=1, cantidad_solicitada=10)`, `SurtidoRenglon(id=1, cantidad=10)`.

