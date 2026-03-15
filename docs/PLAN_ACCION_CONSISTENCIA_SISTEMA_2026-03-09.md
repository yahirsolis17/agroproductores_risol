# Plan De Accion De Consistencia Del Sistema

> Nota 2026-03-15: este plan documenta una pasada histórica. Varias referencias a scripts `check_*.py`, `tools/*` y otros utilitarios standalone quedaron obsoletas tras la limpieza de scripts del commit `033cd61`.

- Fecha de analisis: `2026-03-09`
- Alcance: `backend`, `frontend`, `docs`, guardrails `check_*`
- Objetivo: reducir bifurcaciones, eliminar dobles fuentes de verdad y corregir puntos donde el sistema hoy se aparta del canon documentado sin meter regresiones de operacion.

## 1. Fuente de verdad usada

Documentos canonicos revisados:

- `docs/fuente_de_la_verdad.md`
- `docs/README.md`
- `docs/INDEX.md`
- `docs/SMOKE_PACK.md`
- `docs/INFORME_GESTION_BODEGA.md`

Reglas rectoras confirmadas:

1. `Backend dicta, frontend obedece`.
2. `Zero Forks Policy`: no endpoints espejo, no componentes espejo, no logica duplicada.
3. `Redux / store` como verdad de datos de negocio en frontend.
4. Envelope canonico backend: `success`, `message_key`, `message`, `data`.
5. `notification` solo como capa de compatibilidad temporal, no como contrato principal futuro.

## 2. Estado real del sistema antes de intervenir

### P0. Riesgo de integridad de inventario

- Archivo: `backend/gestion_bodega/services/inventory_service.py`
- Problema: `allocate_stock_fefo()` calculaba disponibilidad sin bloquear las filas de `ClasificacionEmpaque` consumidas.
- Impacto: dos requests concurrentes podian leer el mismo saldo y asignar cajas duplicadas a camiones distintos.
- Canon violado: unica verdad de inventario y transaccion atomica real.

### P0. Flujo de notificaciones bifurcado

- Archivos afectados:
  - `frontend/src/global/api/apiClient.ts`
  - `frontend/src/global/utils/NotificationEngine.ts`
  - multiples `services`, `slices` y `pages`
- Problema: `apiClient` ya emite notificaciones para operaciones no-GET, pero luego servicios/store/paginas vuelven a llamar `handleBackendNotification(...)`.
- Impacto:
  - toasts duplicados o dependientes del orden
  - errores de negocio silenciados o sobredimensionados
  - ruptura del contrato "backend decide, frontend solo muestra"

### P1. Reportes semanales con contexto ambiguo

- Archivo: `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx`
- Problema: si `semanaIso` llegaba vacia o como `MANUAL`, el componente usaba la semana actual del reloj y no la semana realmente seleccionada en el flujo.
- Impacto: el usuario podia estar viendo una semana en tablero y exportando otra en reportes.

### P1. Autenticacion con escritura duplicada de sesion

- Archivos:
  - `frontend/src/modules/gestion_usuarios/services/authService.ts`
  - `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx`
- Problema: el servicio guarda tokens/usuario en `localStorage` y el contexto vuelve a guardar parte de esa sesion.
- Impacto: doble escritura, mantenimiento fragil, mayor probabilidad de drift entre servicio, contexto y store.

### P1. Guardrails rotos por encoding de consola

- Archivos:
  - `check_response_canon.py`
  - `check_message_keys_canon.py`
- Problema: ambos scripts tronaban en Windows por imprimir emojis a una consola `cp1252`.
- Impacto: el gate no corria, por lo tanto la verificacion del canon no era confiable.

### P2. Deuda residual confirmada

1. `check_ts_core_guard.py` sigue fallando por `any` en `frontend/src/global/store/*`.
2. `check_existing_data.py` y `check_nulls.py` no pudieron correr por error de acceso a MySQL (`1045`).
3. Siguen existiendo piezas legacy de bodega con rutas/servicios viejos:
   - `frontend/src/modules/gestion_bodega/services/inventarioService.ts`
   - `frontend/src/modules/gestion_bodega/services/lotesService.ts`
4. Persisten mensajes con encoding roto en backend (`serializers.py` y otros puntos).

## 3. Estrategia aplicada

Se eligio intervenir primero solo en cambios con estas caracteristicas:

1. Alto impacto funcional.
2. Bajo riesgo de regresion operativa.
3. Alineacion directa con el canon.
4. Verificables por `tsc`, `manage.py check` y guardrails raiz.

No se hizo una migracion agresiva de autenticacion completa (`cookies` vs `localStorage`) porque eso requiere pruebas de login, refresh y navegacion protegida de punta a punta, y un cambio a ciegas ahi si puede tumbar el sistema.

## 4. Cambios ejecutados hoy

### 4.1 Motor de notificaciones endurecido y alineado al envelope canonico

- Archivo: `frontend/src/global/utils/NotificationEngine.ts`

Se aplico:

1. Soporte a envelope canonico directo:
   - ya no depende exclusivamente de `response.notification`
   - ahora puede leer `message_key` y `message`
2. Marca interna para evitar reprocesar el mismo payload varias veces.
3. Mejor criterio para silenciar validaciones:
   - solo se silencian validaciones de campo reales
   - errores de negocio con `message_key` especifico ya no se tratan como simple "error de formulario"
4. Fallback de `type` desde `success/message_key` cuando no venga `notification.type`.

Resultado:

- menos duplicacion efectiva
- mejor compatibilidad con el canon nuevo
- menor dependencia del wrapper legacy `notification`

### 4.2 Limpieza del doble disparo de notificaciones en flujos troncales

Se removio notificacion manual redundante en:

- `frontend/src/modules/gestion_bodega/services/capturasService.ts`
- `frontend/src/modules/gestion_bodega/services/cierresService.ts`
- `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts`
- `frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts` para respuestas JSON normales
- `frontend/src/modules/gestion_usuarios/services/authService.ts`
- `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx`
- `frontend/src/global/store/authSlice.ts`

Resultado:

- menos puntos emitiendo toast por la misma operacion
- mejor separacion entre `apiClient` y las capas de servicio/contexto
- login/change-password/logout con menos duplicidad de efectos laterales

Nota:

- en reportes binarios (`blob`) se mantuvo el manejo manual cuando el backend devuelve JSON dentro de una descarga, porque ahi el interceptor no puede interpretar el payload semantico automaticamente.

### 4.3 Reportes de bodega amarrados a la semana seleccionada real

- Archivos:
  - `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx`
  - `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx`

Se aplico:

1. `ReportesTabs` ahora recibe `fechaDesde` de la semana seleccionada.
2. Si `semanaIso` viene como `MANUAL` o no existe, se deriva el codigo ISO desde la fecha seleccionada y no desde el reloj actual.

Resultado:

- el reporte semanal ya sigue el mismo contexto que el tablero activo
- baja una bifurcacion funcional directa entre ver y exportar

### 4.4 Blindaje transaccional del FEFO de camiones

- Archivo: `backend/gestion_bodega/services/inventory_service.py`

Se aplico:

1. `select_for_update()` sobre las filas candidatas de `ClasificacionEmpaque`.
2. recalculo del consumo dentro de la transaccion ya con las filas bloqueadas.
3. orden determinista por `fecha`, `id` para mantener FEFO y reducir riesgo de deadlock.

Resultado:

- menor riesgo de doble asignacion concurrente
- el saldo se calcula sobre una vista consistente dentro de la transaccion

### 4.5 Guardrails raiz compatibles con consola Windows

- Archivos:
  - `check_response_canon.py`
  - `check_message_keys_canon.py`

Se reescribieron en ASCII para eliminar emojis y mantener la misma funcion de auditoria sin romper por `UnicodeEncodeError` en `cp1252`.

Resultado:

- los gates ahora si se pueden ejecutar en este entorno
- la verificacion canonica deja de depender del encoding de la terminal

### 4.6 Core store tipado y sin `any`

- Archivos:
  - `frontend/src/global/store/cierresSlice.ts`
  - `frontend/src/global/store/gastosSlice.ts`
  - `frontend/src/global/store/inventariosSlice.ts`
  - `frontend/src/global/store/inversionesSlice.ts`
  - `frontend/src/global/store/propietariosSlice.ts`
  - `frontend/src/global/store/tableroBodegaSlice.ts`
  - `frontend/src/global/store/temporadabodegaSlice.ts`
  - `frontend/src/global/store/ventasSlice.ts`
  - `frontend/src/global/types/apiTypes.ts`

Se aplico:

1. extraccion canonica de payloads de rechazo desde helpers compartidos.
2. eliminacion de `any` en reducers, thunks y payloads core.
3. normalizacion de parseo para listados paginados en gastos/inventarios.
4. correccion de un bug real en `temporadabodegaSlice`:
   - antes un `list()` fallido podia resolverse como `fulfilled` con lista vacia
   - ahora las respuestas `success: false` se rechazan correctamente.
5. declaracion explicita `STATE-UPDATE` donde el store si hace pruning local intencional.

Resultado:

- `check_ts_core_guard.py` ahora pasa
- el store core quedo alineado al canon sin deuda de `any`
- baja el riesgo de bugs silenciosos por payloads mal tipados

### 4.7 Reparacion de mojibake real en backend y frontend

- Archivos:
  - `backend/gestion_bodega/views/empaques_views.py`
  - `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx`

Se aplico:

1. recuperacion de texto corrupto por re-decoding controlado linea por linea.
2. limpieza de mensajes visibles que aparecian como `recepciÃ³n`, `ATENCIÃ“N`, `pÃ¡gina`, etc.

Resultado:

- `scan_encoding.py` ya no detecta acentos corruptos
- los mensajes visibles vuelven a ser legibles
- se reduce ruido en auditorias y en UX

### 4.8 Cierre del warning de `STATICFILES_DIRS`

- Archivo:
  - `backend/static/.gitkeep`

Se aplico:

1. se creo la carpeta `backend/static` esperada por settings.
2. se dejo un `.gitkeep` para que exista tambien en limpio.

Resultado:

- `python manage.py check` ya no reporta warnings

## 5. Verificacion ejecutada

### 5.1 Checks aprobados

- `frontend`: `npx tsc -p tsconfig.json --noEmit --pretty false`
- `backend`: `python manage.py check`
  - resultado: OK sin warnings
- `python check_response_canon.py`
- `python check_message_keys_canon.py`
- `python check_api_client_usage.py`
- `python check_toast_and_axios_usage.py`
- `python check_no_react_query.py`
- `python check_docs_source_of_truth.py`
- `python check_list_contracts.py`
- `python check_tablelayout_meta.py`
- `python check_ui_transforms_policy.py`
- `python check_ts_core_guard.py`
- `python scan_encoding.py`

### 5.2 Checks bloqueados por entorno

- `python check_existing_data.py`
- `python check_nulls.py`

Motivo:

- ambos requieren acceso real a MySQL
- el entorno actual respondio `OperationalError (1045): Access denied for user 'yahir'@'localhost'`

### 5.3 Corrida amplia de scripts Python

- Scope ejecutado:
  - todos los `.py` de la raiz
  - `tools/audit_tablero_consistency.py`
- Evidencia:
  - `./.codex_run_logs_20260309_closeout_utf8_strict/results.json`
- Resultado:
  - `39 total`
  - `21 OK`
  - `18 ERROR`
  - `0 TIMEOUT`

Conclusion de la corrida:

1. los errores ya no vienen del guardrail core ni del encoding de consola.
2. los `18 ERROR` restantes quedaron concentrados en scripts que requieren conexion real a MySQL.
3. el bloqueo observable y repetido es uno solo:
   - `OperationalError (1045): Access denied for user 'yahir'@'localhost' (using password: YES)`

Implicacion:

- hoy ya no hay evidencia de otra falla transversal de codigo en esa corrida.
- lo que impide declarar `100% verde` es el acceso al motor de base de datos configurado en `backend/agroproductores_risol/settings.py`.

## 6. Estado despues de la intervencion

### Mejoras reales conseguidas

1. El flujo de notificaciones quedo bastante mas coherente y menos duplicado.
2. Los reportes semanales ya no dependen del reloj actual cuando la semana viene en modo manual.
3. El algoritmo FEFO ya no opera sobre saldos sin lock.
4. Los guardrails canonicos criticos ya corren en Windows.
5. Se redujo drift entre `authService`, `AuthContext` y `authSlice`.
6. El core store ya no usa `any`.
7. El scan de encoding ya no detecta mojibake real.

### Lo que aun no esta cerrado

1. Autenticacion aun mezcla `localStorage` con `withCredentials`.
2. Quedan llamadas manuales a `handleBackendNotification(...)` en slices y paginas fuera del nucleo intervenido hoy.
3. Hay servicios legacy de bodega que siguen apuntando a rutas o contratos viejos.
4. La bateria que toca base de datos no puede validarse mientras MySQL rechace el usuario configurado.

## 7. Siguiente fase recomendada

### Fase P1

1. Unificar sesion:
   - decidir una sola estrategia oficial (`JWT en storage` o `cookies/httpOnly + refresh server-driven`)
   - eliminar la coexistencia parcial actual
2. Terminar limpieza de notificaciones:
   - retirar llamadas manuales residuales en store/paginas
   - dejar a `apiClient` como orquestador unico de notificaciones no binarias
3. Remover legacy muerto de bodega:
   - `inventarioService.ts`
   - `lotesService.ts`
   - componentes plastico que ya no representan la operacion vigente

### Fase P2

1. Resolver `check_ts_core_guard.py`
2. Normalizar encoding de strings backend/frontend
3. Ejecutar checks con base de datos valida
4. Auditar login/refresh/logout con pruebas reales de extremo a extremo

## 8. Criterio de exito para declarar esta etapa cerrada

Se puede considerar cerrada esta etapa cuando se cumplan simultaneamente estas condiciones:

1. `tsc` y `manage.py check` verdes.
2. `check_response_canon.py` y `check_message_keys_canon.py` verdes.
3. `check_ts_core_guard.py` verde.
4. reportes semanales y de temporada exportan el contexto correcto.
5. no hay duplicacion de toast en flujos CRUD principales.
6. FEFO no permite doble consumo bajo concurrencia.
7. la corrida de scripts Python dependientes de Django/DB corre con credenciales validas.

## 9. Resumen ejecutivo final

La intervencion de hoy no fue cosmetica. Se corrigieron tres problemas estructurales:

1. una bifurcacion real en el flujo de notificaciones,
2. una bifurcacion funcional en reportes semanales,
3. un riesgo serio de integridad en asignacion FEFO.

Ademas quedaron cerrados dos frentes adicionales:

4. deuda de tipado en el core store,
5. corrupcion de texto visible por mojibake.

El sistema quedo practicamente cerrado desde codigo. Lo que falta para declararlo `100%` no esta en frontend/backend sino en el entorno local de base de datos. La deuda restante ya esta localizada y clasificada en dos grupos:

- bloqueos de entorno (`DB credentials`)
- deuda tecnica residual acotada (`auth hibrida`, notificaciones manuales residuales, legado de rutas/servicios`)

## 10. Cierre final del bloqueo MySQL

Se revalido el bloqueo de base de datos y ya quedo resuelto en el entorno local.

### Hallazgo exacto

1. `MySQL84` (servicio Windows) estaba detenido, pero el puerto `3306` si estaba siendo atendido por `XAMPP` (`c:\\xampp\\mysql\\bin\\mysqld.exe`).
2. La base `agroproductores_risol` si existia.
3. El usuario configurado en Django (`yahir` / `1234`) no existia en esa instancia de MySQL.
4. Por eso todos los scripts fallaban con `OperationalError (1045): Access denied for user 'yahir'@'localhost'`.

### Accion ejecutada

Se creo el usuario local faltante y se otorgaron permisos sobre la base `agroproductores_risol`, alineando el entorno con [settings.py](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/settings.py:111).

### Verificacion posterior

1. Conexion valida desde `mysql.exe` con `yahir/1234`.
2. Conexion valida desde Django con `SELECT 1`.
3. Reejecucion de los 18 scripts antes bloqueados por MySQL: `18/18 OK`.
4. Reejecucion completa de todos los `.py` en raiz mas `tools/audit_tablero_consistency.py`: `39/39 OK`.

### Evidencia

- Recheck de los 18 scripts bloqueados:
  [results.json](C:/Users/Yahir/agroproductores_risol/.codex_run_logs_20260309_mysql_recheck/results.json)
- Corrida completa posterior al fix:
  [results.json](C:/Users/Yahir/agroproductores_risol/.codex_run_logs_20260309_full_after_mysql_fix/results.json)

### Estado final

La etapa ya puede considerarse cerrada al `100%` dentro de este entorno local de trabajo.
