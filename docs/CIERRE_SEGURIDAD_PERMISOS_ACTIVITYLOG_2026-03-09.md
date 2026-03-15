# Cierre de seguridad, permisos y activity log

Fecha: 2026-03-09

## 1. Objetivo

Cerrar el frente de seguridad y permisos para usuarios comunes y admin, evitando bifurcaciones entre:

- permisos reales del backend
- catalogo que el admin puede asignar
- visibilidad y estados de UI en frontend
- activity log para auditoria operativa y de seguridad

## 2. Riesgos reales que se cerraron

### 2.1 Permisos custom de bodega fuera del catalogo admin

Problema:

- `view_dashboard`
- `close_week`
- `exportpdf_cierresemanal`
- `exportexcel_cierresemanal`

no estaban garantizados en el catalogo filtrado que usa el admin para asignar permisos.

Impacto:

- el backend podia exigir permisos que el admin no podia otorgar desde la UI
- esto rompia el flujo de usuarios comunes en reportes/tablero/cierre semanal

Cierre aplicado:

- se actualizo la policy central y el filtrado final de permisos
- se forzaron codename custom visibles en el catalogo
- se valido por shell que el catalogo filtrado ya incluye estos permisos

### 2.2 Endpoints protegidos solo a medias

Problema:

`HasModulePermission` dejaba pasar vistas sin `required_permissions` explicitos en algunos casos.

Impacto:

- riesgo de rutas protegidas por autenticacion pero no por permiso granular real

Cierre aplicado:

- `HasModulePermission` y `HasModulePermissionAnd` ahora niegan por defecto si una vista no define permisos requeridos
- toda denegacion relevante se registra en activity log

### 2.3 Permisos legacy o inexistentes en bodega

Problema:

Habia vistas usando codenames que ya no existen o no coinciden con los modelos actuales.

Ejemplos corregidos:

- `view_camion` -> `view_camionsalida`
- `add_camion` -> `add_camionsalida`
- `view_compra_madera` -> `view_compramadera`
- `view_clasificacion` -> `view_clasificacionempaque`

Impacto:

- seguridad inconsistente
- UI rota o permisos imposibles de asignar

Cierre aplicado:

- se normalizaron los `_perm_map` de bodega y se revalido el set de codenames usado en codigo contra la BD

### 2.4 UI mostraba acciones que el usuario no podia ejecutar

Problema:

Habia zonas donde un usuario comun podia ver rutas/acciones y enterarse del rechazo solo cuando el backend devolvia 403.

Cierre aplicado:

- rutas con `PermissionGuard`
- tabs de bodega con estado disabled + tooltip
- gastos de bodega con tabs disabled + tooltip
- exportaciones de reportes con disabled + tooltip
- logistica de bodega con boton de crear camion disabled + tooltip
- acciones de semana de bodega con disabled + tooltip
- guardado de empaque sigue desacoplado pero ya se pasa `canSave` real al drawer

### 2.5 Activity log incompleto para seguridad

Problema:

- el admin no veia acciones de admins en el activity log
- login fallido, bloqueo temporal y denegaciones no estaban suficientemente expuestos para auditoria
- el log era poco util para investigacion rapida

Cierre aplicado:

- activity log ya incluye admins
- se registran intentos denegados por permisos
- se registran login fallido, bloqueo temporal, usuario inactivo y logout
- serializer del log ahora expone:
  - `categoria`
  - `severidad`
  - `ruta`
  - `metodo`
  - `es_denegado`
- frontend del activity log ahora soporta:
  - busqueda
  - filtro por rol
  - filtro por dominio/categoria
  - chips de contexto/severidad

## 3. Archivos tocados en este cierre

### Backend

- `backend/gestion_usuarios/permissions_policy.py`
- `backend/gestion_usuarios/permissions.py`
- `backend/gestion_usuarios/views/user_views.py`
- `backend/gestion_usuarios/serializers.py`
- `backend/gestion_bodega/views/camiones_views.py`
- `backend/gestion_bodega/views/compras_madera_views.py`
- `backend/gestion_bodega/views/empaques_views.py`
- `backend/gestion_bodega/views/reportes/reporte_semanal_views.py`
- `backend/gestion_bodega/views/reportes/reporte_temporada_views.py`
- `backend/gestion_bodega/views/tablero_views.py`

### Frontend

- `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx`
- `frontend/src/components/common/PermissionGuard.tsx`
- `frontend/src/global/routes/moduleRoutes.ts`
- `frontend/src/global/routes/AppRouter.tsx`
- `frontend/src/global/constants/navItems.ts`
- `frontend/src/global/store/activityLogSlice.ts`
- `frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx`
- `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx`
- `frontend/src/modules/gestion_bodega/pages/Logistica.tsx`
- `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx`
- `frontend/src/modules/gestion_bodega/components/gastos/GastosPageContent.tsx`
- `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx`
- `frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx`
- `frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx`
- `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx`
- `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts`

## 4. Validacion ejecutada

### Validacion tecnica puntual

- `cd frontend && npx tsc -p tsconfig.json --noEmit --pretty false`
- `cd backend && python manage.py check`
- `python check_response_canon.py`
- `python check_message_keys_canon.py`
- `python check_api_client_usage.py`
- `python check_toast_and_axios_usage.py`
- `python check_ts_core_guard.py`
- `python check_ui_transforms_policy.py`
- `python check_no_react_query.py`
- `python check_docs_source_of_truth.py`
- `python check_list_contracts.py`
- `python check_tablelayout_meta.py`

Resultado: todo OK.

### Smoke de permisos catalogados

Se valido por shell que el catalogo filtrado contiene al menos:

- `view_dashboard`
- `close_week`
- `exportpdf_cierresemanal`
- `exportexcel_cierresemanal`
- permisos actuales de camiones, madera y consumibles

Resultado: `missing=none`

### Smoke del activity log serializado

Se valido que el serializer del activity log ya expone:

- `accion`
- `categoria`
- `detalles`
- `es_denegado`
- `fecha_hora`
- `id`
- `ip`
- `metodo`
- `ruta`
- `severidad`
- `usuario`

### Corrida amplia de scripts Python

Scope:

- todos los `.py` de la raiz
- `tools/audit_tablero_consistency.py`

Evidencia:

- `./.codex_run_logs_20260309_security_closeout_final/results.json`

Resultado:

- `39 total`
- `39 OK`
- `0 ERROR`
- `0 TIMEOUT`

Nota:

Hubo dos intentos previos falsos por wrapper/encoding en PowerShell. La corrida valida es la de `security_closeout_final`.

## 5. Estado final

Estado: cerrado y validado para este alcance.

### Garantias que ya quedan vigentes

- el backend sigue siendo la barrera real
- el admin ya puede asignar los permisos vigentes de bodega que el sistema usa hoy
- el usuario comun ve mejor feedback: botones/tabs disabled y tooltip cuando no tiene permiso
- el activity log ya sirve para auditoria de seguridad y operacion, incluyendo admins
- no quedaron referencias activas a permisos legacy detectadas en este frente

## 6. Residual real

No queda un bloqueo funcional abierto en este alcance.

Lo unico que sigue siendo mejora futura, no bug abierto, es evolucionar el activity log a un esquema mas rico a nivel de modelo si despues se quiere persistir mas contexto estructurado por evento.
