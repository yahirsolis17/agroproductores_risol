# Pasada final de gestion_usuarios

> Nota 2026-03-15: este cierre es histórico. Los guardrails root y varios scripts Python mencionados aquí fueron retirados del repo en una limpieza posterior.

Fecha: 2026-03-09

## Objetivo

Cerrar la pasada final de `gestion_usuarios` sin romper el contrato canonico del sistema:
- backend como fuente de verdad para validaciones y notificaciones
- frontend solo como capa de retroalimentacion y presentacion
- sin bifurcaciones en persistencia de sesion ni en endpoints de autenticacion

## Cambios aplicados

### 1. Login endurecido del lado backend

Archivo: `backend/gestion_usuarios/serializers.py`

- Se elimino la dependencia del bloqueo en navegador.
- El login ahora aplica lock temporal de 5 minutos usando cache por `telefono + IP`.
- Se mantienen los intentos fallidos en `Users.intentos_fallidos` como dato operativo, pero ya no se usa ese campo como bloqueo permanente.
- Un login exitoso limpia el lock y reinicia intentos.

### 2. Refresh token alineado al endpoint real

Archivos:
- `backend/gestion_usuarios/views/user_views.py`
- `backend/agroproductores_risol/urls.py`

- `CustomTokenRefreshView` ya usa `RefreshTokenThrottle`.
- El endpoint real usado por frontend (`/api/token/refresh/`) ya apunta a esa vista.
- Se elimino el archivo zombie `backend/gestion_usuarios/views/token_views.py`.

### 3. Usuario CRUD con respuesta canonica consistente

Archivo: `backend/gestion_usuarios/views/user_views.py`

- `retrieve`, `update` y `partial_update` ahora responden con `NotificationHandler.generate_response(...)`.
- Ya no quedan shapes distintos entre `list/create/delete` y `retrieve/update`.

### 4. Persistencia de sesion centralizada

Archivos:
- `frontend/src/modules/gestion_usuarios/services/authService.ts`
- `frontend/src/global/store/authSlice.ts`
- `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx`
- `frontend/src/global/api/apiClient.ts`

- La persistencia de tokens, usuario y permisos se centralizo en `authService`.
- `authSlice` y `AuthContext` dejaron de escribir directo en `localStorage`.
- `apiClient` ya actualiza el access token via `authService.setAccessToken(...)`.
- `apiClient` dejo de mandar `withCredentials: true`; el frontend queda operando solo con JWT Bearer.

### 5. Notificaciones duplicadas eliminadas

Archivos:
- `frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx`
- `frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx`
- `frontend/src/modules/gestion_usuarios/services/permisoService.ts`

- Se removieron `handleBackendNotification(...)` manuales donde el interceptor global ya cubria el flujo.
- `permisoService` se alinea a `ensureSuccess(...)` y al envelope canonico.

### 6. Login frontend simplificado

Archivo: `frontend/src/modules/gestion_usuarios/pages/Login.tsx`

- Se retiro el bloqueo local basado en `localStorage` (`loginBlockEndTime`, `loginFailedAttempts`).
- El formulario conserva `Formik + Yup + banner de errores + focusFirstError`.
- La decision de bloqueo ahora viene solo de backend.

### 7. Mensajes backend limpiados

Archivo: `backend/gestion_usuarios/utils/constants.py`

- Se limpiaron textos de baja calidad y sufijos tipo `back`.
- Se dejaron mensajes consistentes con el resto del sistema.

## Verificacion ejecutada

### OK

- `python manage.py check`
- `python -m py_compile backend/gestion_usuarios/serializers.py backend/gestion_usuarios/views/user_views.py backend/gestion_usuarios/utils/constants.py backend/agroproductores_risol/urls.py`
- `npx tsc -p tsconfig.json --noEmit --pretty false`
- `python check_response_canon.py`
- `python check_api_client_usage.py`
- `python check_toast_and_axios_usage.py`
- `python check_message_keys_canon.py`
- `python check_ts_core_guard.py`
- smoke sobre BD local existente:
  - login exitoso
  - lock temporal tras 5 errores
  - `retrieve` canonico de usuarios
  - `resolve('/api/token/refresh/')` apuntando a `CustomTokenRefreshView`

### Bloqueo residual fuera de este cierre

Los tests de Django contra base de pruebas nueva no quedaron utilizables por una deuda previa de migraciones del proyecto, ajena a `gestion_usuarios`:

- al crear `test_agroproductores_risol` aparece un fallo en migraciones de `gestion_bodega`
- error visto: `Key column 'cliente_id' doesn't exist in table`
- archivo involucrado en la traza: `gestion_bodega/migrations/0015_remove_pedido_cliente_and_more.py`

## Estado final

`gestion_usuarios` quedo mas consistente, mas seguro y con menos duplicacion real en:
- login
- refresh token
- persistencia de sesion
- envelopes canonicos
- notificaciones
- eliminacion de codigo zombie

Residual relevante:
- sigue existiendo deuda global de migraciones de prueba en `gestion_bodega`, que impide usar `manage.py test` de forma limpia sobre una test DB nueva.
