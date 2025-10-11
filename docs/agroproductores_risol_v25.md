# agroproductores_risol v25 — Revisión Técnica Exhaustiva

Este documento inventaría y evalúa el backend (Django/DRF) y el frontend (Vite/React TS) de agroproductores_risol, con foco en:
- Reglas de negocio, integridad de datos, validaciones y auditoría
- Autenticación, autorizaciones, throttling y seguridad
- Notificaciones centralizadas y contratos FE/BE
- Consistencias e inconsistencias entre módulos
- Código muerto/duplicado y propuestas de limpieza
- Dependencias, configuración y recomendaciones priorizadas


## Resumen Ejecutivo (Prioridades)
- Alta: Corregir middlewares personalizados mal configurados (redirecciones/urls inexistentes) y mover secretos/DEBUG a variables de entorno. Puntos:
  - `backend/agroproductores_risol/middlewares/security.py:14,16,46` usa rutas inexistentes y namespace erróneo (ver Sección Seguridad/Middlewares). 
  - `SECRET_KEY` y credenciales DB están en texto plano; `DEBUG=True` (solo para dev).
- Alta: Declarar dependencias faltantes para evitar errores en runtime: `django-filter`, `drf-spectacular`, `drf-spectacular-sidecar`, `reportlab`, `num2words`, `celery` (si se usa estado de export). 
- Media: Unificar notificaciones y salidas paginadas para consistencia o mantener la convención actual y documentarla — hoy hay variantes entre `GenericPagination` y respuestas custom.
- Media: Eliminar código muerto (apps vacías, slices Redux sin uso, vistas duplicadas) y artefactos no versionables (`__pycache__`, `staticfiles`, logs). 
- Media: Añadir `.gitignore` adecuado; evitar comitear `backend/staticfiles/`, `backend/huerta_registration.log`, `**/__pycache__/`.
- Media: Verificar colisiones de router en `huerta/urls.py` con múltiples viewsets en el mismo prefijo `reportes/` (se resuelve porque usan `@action` detail=False, pero revisar nombres de rutas para evitar ambigüedad).


## Arquitectura & Stack
- Backend: Django 5 + DRF + SimpleJWT + MySQL. 
  - Ubicación: `backend/` (manage, settings, apps del dominio).
  - Apps: `gestion_usuarios`, `gestion_huerta` (núcleo), `gestion_bodega` (vacía), `gestion_venta` (vacía).
  - APIs principales en `backend/agroproductores_risol/urls.py`:
    - `/usuarios/` (auth/usuarios/permiso/auditoría)
    - `/huerta/` (propietarios, huertas, temporadas, cosechas, inversiones, ventas, reportes)
    - `/bodega/` y `/venta/` incluidos pero sin endpoints (apps vacías)
    - JWT: `/api/token/`, `/api/token/refresh/`, `/api/token/verify/`
    - Swagger/Redoc: `/api/docs/*` (drf-spectacular)
- Frontend: Vite + React 19 + TS + MUI + Redux Toolkit + React Router + Tailwind + Axios.
  - Ubicación: `frontend/`
  - Router central: `frontend/src/global/routes/AppRouter.tsx`
  - Rutas de módulos declaradas en `frontend/src/global/routes/moduleRoutes.ts`
  - Auth y permisos en `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx` + `global/store/authSlice.ts`
  - Cliente API y refresh de JWT: `frontend/src/global/api/apiClient.ts`
  - Notificaciones UI: `frontend/src/global/utils/NotificationEngine.ts`


## Backend — Configuración Clave
- `backend/agroproductores_risol/settings.py`
  - CORS restringido a `http://localhost:5173` (ok para dev).
  - DRF: JWT + `DEFAULT_PERMISSION_CLASSES=IsAuthenticated`; `DEFAULT_THROTTLE_CLASSES` definido a `gestion_usuarios.utils.throttles.BaseUserThrottle` y `DEFAULT_PAGINATION_CLASS=agroproductores_risol.utils.pagination.GenericPagination`.
  - Throttling rates definidos (login 20/min, etc.).
  - DB MySQL con credenciales en claro (usar variables de entorno).
  - Logging a archivo `huerta_registration.log` (no versionar logs).
  - INSTALLED_APPS incluye `drf_spectacular` y `authtoken` (authtoken parece no usado). Requiere declarar dependencias.
  - Middlewares personalizados activos: `BlockInactiveUserMiddleware`, `PreventBackAfterLogoutMiddleware`, `RoleBasedRedirectMiddleware`.


## Backend — Middlewares (observaciones)
- `backend/agroproductores_risol/middlewares/security.py`
  - RoleBasedRedirectMiddleware:
    - Redirige si path inicia con `/usuario/` o `/gestion/`, pero las rutas reales son `/usuarios/`, `/huerta/`, etc. (no coincide). Además usa nombres de ruta `admin_dashboard`/`user_dashboard` no definidos. Hoy es inofensivo (condiciones no se cumplen) pero es confuso y debería quitarse o corregirse.
  - BlockInactiveUserMiddleware:
    - Redirige a `reverse('gestion:login')` (namespace erróneo). Debe ser `gestion_usuarios:login` o ruta front `/login`. En su estado actual puede explotar en un NoReverseMatch si la condición se cumple.
  - ip_restriction.py está comentado (ok). 


## Backend — Autenticación y Permisos
- Modelo de usuario: `gestion_usuarios/models.py` con `telefono` como `USERNAME_FIELD`, roles `admin|usuario`, flags `is_active`, `archivado_en` (soft-delete), `must_change_password`.
- Endpoints clave (`gestion_usuarios/urls.py`):
  - `POST /usuarios/login/` (AllowAny + throttle `LoginThrottle`) genera `access` y `refresh`, y registra actividad.
  - `POST /usuarios/logout/` (blacklist refresh si SimpleJWT blacklist está habilitado).
  - `GET /usuarios/me/` y `GET /usuarios/me/permissions/` devuelven usuario y permisos planos respectivamente.
  - `PATCH /usuarios/users/{id}/set-permisos/` con validación de codenames y colisiones.
  - CRUD `users/` con reglas IsAdmin (list/destroy) e IsSelfOrAdmin (retrieve/update).
  - `POST /usuarios/change-password/` con validaciones y registro de actividad.
- Permisos por codename a nivel módulo: `gestion_usuarios/permissions.HasModulePermission` (admin bypass; si la vista no define `required_permissions`, permite acceso a autenticados).
- Throttles: `gestion_usuarios/utils/throttles.py` (BaseUserThrottle + acciones sensibles y permisos).


## Backend — Auditoría
- Registro de actividades: `gestion_usuarios/models.RegistroActividad` + helper `gestion_usuarios/utils/activity.registrar_actividad`.
- Mixin de auditoría para viewsets: `gestion_huerta/utils/audit.py (ViewSetAuditMixin)` registra create/update/destroy incluyendo diffs de campos en update.
- Endpoints de lectura de actividad:
  - `/usuarios/actividad/` — usado por FE (ver Frontend). 
  - `/huerta/actividad/` — duplicado/alternativo, aparentemente no usado por FE.


## Backend — Notificaciones Centralizadas
- Hay dos handlers casi idénticos, uno por módulo:
  - `gestion_usuarios/utils/notification_handler.py` + `constants.py`
  - `gestion_huerta/utils/notification_handler.py` + `constants.py`
- Contrato uniforme esperado por FE: `{ success, notification: {key, message, type, action?, target?}, data }`.
- Claves silenciosas (sin toast) usadas en listados: `silent_response`, `data_processed_success`.
- Recomendación: Consolidar a un solo handler/constantes a nivel proyecto para evitar divergencias.


## Backend — Módulo Huerta (reglas y endpoints)
- Modelos con soft-delete y validaciones en `save()/clean()`; casi todos verifican `full_clean()` salvo cambios de archivado.
- Propietarios (`Propietario`): nombre/apellidos/teléfono/dirección con validaciones y búsquedas indexadas. Soft-delete con `archivado_en`.
- Huertas propias/rentadas (`Huerta`, `HuertaRentada`): `unique_together` por nombre/ubicación/propietario, validadores de hectáreas, cascada de archivado a temporadas/cosechas/ventas/inversiones.
- Temporadas (`Temporada`): XOR de origen (huerta vs huerta_rentada), validación de año y finalización, cascada de archivado; varias acciones `finalizar/reactivar`, etc.
- Cosechas (`Cosecha`): límite global por temporada, duplicidad por nombre + temporada, finalización/reactivación, filtrados y búsquedas.
- Inversiones (`InversionesHuerta`): validaciones de coherencia con temporada/cosecha, reglas de fecha (solo hoy/ayer), montos > 0, coherencia de origen huerta/huerta_rentada.
- Ventas (`Venta`): coherencia con cosecha/temporada/origen, `ganancia_neta >= 0`, numéricos > 0, bloqueos si temporada/cosecha finalizadas o archivadas. Filtros por rango de fechas, estado y búsqueda.
- Vistas — ejemplos representativos:
  - `gestion_huerta/views/huerta_views.py` — CRUD para propietarios/huertas con `NotificationMixin`, `HasModulePermission` y auditoría.
  - `gestion_huerta/views/temporadas_views.py` — filtrados ricos, validación de origen y finalización con mensajes mapeados.
  - `gestion_huerta/views/cosechas_views.py` — límite por temporada, validación y mapeo fino de errores a `NOTIFICATION_MESSAGES`.
  - `gestion_huerta/views/ventas_views.py` — filtros, prechecks de contexto (cosecha/temporada), mapeo exhaustivo de errores, `DjangoFilterBackend` (requiere `django-filter`).
- Reportes: `gestion_huerta/views/reportes/*` invocan servicios:
  - `services/reportes/cosecha_service.py`, `temporada_service.py`, `perfil_huerta_service.py` — compilan JSON con KPIs, series, tablas. 
  - Exportación: `services/exportacion_service.py` delega a `exportacion/pdf_exporter.py` y `exportacion/excel_exporter.py`.
  - Cache: `gestion_huerta/utils/cache_keys.py` (versión y timeout paramétricos por env).  
  - Nota: `reportes_utils_views.py` importa `celery.result.AsyncResult` para `estado-export` (ver Dependencias).


## Backend — Dependencias y “gaps” detectados
Faltan en `backend/requirements.txt` pese a ser referenciadas en código:
- django-filter (usado en `ventas_views.py`)
- drf-spectacular y drf-spectacular-sidecar (usados en settings/urls)
- reportlab (PDF en exportación)
- num2words (serializadores de huerta rentada)
- celery (si se usará `estado-export`)
- Opcional: django-redis (si se desea cache distribuido para reportes; hoy usa `LocMemCache`)


## Backend — Código muerto / duplicado / inconsistencias
- Apps vacías y rutas sin uso:
  - `backend/gestion_bodega/` — models, views, urls vacíos; no hay llamados desde FE.
  - `backend/gestion_venta/` — vacía; la entidad Venta vive en `gestion_huerta` y FE llama `/huerta/ventas/`.
- Vistas duplicadas de auditoría:
  - `backend/gestion_huerta/views/registro_actividad.py` vs `/usuarios/actividad/` — FE usa `/usuarios/actividad/`.
- Middlewares con rutas inexistentes o namespace equivocado (ver sección Middlewares).
- Archivos de salida/versionables en repo:
  - `backend/staticfiles/` (contenido de collectstatic, no debe comitearse)
  - `backend/huerta_registration.log` (archivo de log de desarrollo)
  - `**/__pycache__/` (bytecode Python)
- `backend/package.json` (Node en backend) sin propósito claro.


## Frontend — Enrutado, Autenticación y Estado
- Rutas públicas/privadas con `PrivateRoute` y `RoleGuard`.
- Módulos expuestos: usuarios (admin), propietarios/huertas/temporadas/cosechas, finanzas por cosecha, reportes.
- AuthContext se integra con Redux para permisos y consume:
  - `/usuarios/login/`, `/usuarios/me/`, `/usuarios/me/permissions/`, `/usuarios/logout/`.
- Token refresh automático contra `/api/token/refresh/` en `apiClient`.
- Notificaciones UI centralizadas con deduplicación y reglas de redirect en `NotificationEngine.ts`.
- Servicios por módulo apuntan a `/huerta/*` y `/usuarios/*` y respetan el contrato de notificaciones/`data` acordado.
- Redux slices activos: propietarios, huertas, huerta rentada, cosechas, inversiones, ventas, categorías inversión, temporada, breadcrumbs, auth, user, huertas combinadas. 
- Potencial código FE no usado:
  - `frontend/src/global/store/notificationSlice.ts` no tiene consumidores (no se encuentran `setNotification/clearNotification` en uso). El slice figura en `store.ts` pero no es referenciado por componentes.


## Seguridad
- `SECRET_KEY` y credenciales MySQL hardcodeadas y `DEBUG=True` (cambiar a env vars; usar `.env` + `python-dotenv` ya incluido).
- CORS restringido a dev; revisar para producción.
- Autenticación JWT con refresh y blacklist (bien). Tokens en `localStorage` (estándar para SPAs; considerar rotación corta o storage endurecido si el riesgo XSS es relevante).
- Middlewares (ver Observaciones):
  - Arreglar `reverse('gestion:login')` a `reverse('gestion_usuarios:login')` o redirigir a FE `/login`.
  - Considerar remover `RoleBasedRedirectMiddleware` si no hay rutas server-side de dashboards.
- Throttling habilitado (bien). 


## Integridad de Datos y Reglas de Negocio
- Soft-delete generalizado con `is_active + archivado_en` y cascada transaccional.
- Regla de unicidad en huertas (`unique_together`) y verificación de duplicados para restauración.
- Validación de fechas (hoy/ayer) y consistencias de origen en inversiones/ventas.
- Bloqueos si temporada/cosecha finalizadas/archivadas.
- Índices en campos de búsqueda (`models.Index`) en entidades principales.


## Documentación y OpenAPI
- DRF Spectacular configurado pero dependencias no declaradas.
- Endpoints expuestos en `/api/schema`, `/api/docs/swagger`, `/api/docs/redoc`.


## Propuestas de Limpieza (borrables/archivables)
- Eliminar apps vacías y rutas asociadas si no hay planes inmediatos:
  - `backend/gestion_bodega/*` y su include en `agroproductores_risol/urls.py`
  - `backend/gestion_venta/*` y su include en `agroproductores_risol/urls.py`
- Eliminar vista de auditoría duplicada no usada:
  - `backend/gestion_huerta/views/registro_actividad.py` y su registro en `gestion_huerta/urls.py` (mantener `/usuarios/actividad/`)
- Eliminar artefactos no versionables:
  - `backend/staticfiles/`
  - `**/__pycache__/`
  - `backend/huerta_registration.log`
- Remover `backend/package.json` si no hay tooling Node en backend.
- Frontend: quitar `notificationSlice` si se confirma que no se usa.


## Recomendaciones (acciones concretas)
1) Seguridad/Config
- Mover `SECRET_KEY`, credenciales y `DEBUG` a `.env` y usar `python-dotenv` (ya en requirements).
- Ajustar CORS para ambientes.
2) Middlewares
- Arreglar/retirar `RoleBasedRedirectMiddleware` y corregir `BlockInactiveUserMiddleware` (namespace / target de login).
3) Dependencias
- Añadir a `backend/requirements.txt`: `django-filter`, `drf-spectacular`, `drf-spectacular-sidecar`, `reportlab`, `num2words`, `celery` (si aplica). 
4) Router de reportes
- Validar que los cuatro viewsets bajo `/huerta/reportes` no colisionen en las rutas base generadas por el router; alternativa: usar `SimpleRouter` dedicado o prefijos diferenciados (`reportes-cosecha`, etc.).
5) Notificaciones
- Unificar `NotificationHandler` y `NOTIFICATION_MESSAGES` a nivel proyecto o documentar la convención dual por módulo. Revisar claves y evitar drift.
6) Paginación
- Mantener consistencia (usar `GenericPagination` o respuesta `notify` con `meta` homogénea). Hoy está mayormente consistente; verificar endpoints de usuarios/actividad.
7) Auditoría
- Consolidar una única vista para historial (preferible en `usuarios`), y documentar filtros.
8) .gitignore
- Agregar: `**/__pycache__/`, `*.pyc`, `backend/staticfiles/`, `backend/*.log`, `.env`, `*.sqlite3` (si existiera), `node_modules/`.
9) Limpieza de apps/archivos muertos
- Quitar `gestion_bodega` y `gestion_venta` si no se usarán.
- Quitar `notificationSlice` del store o consumirlo; hoy todo pasa por `NotificationEngine`.
10) Calidad de código/encoding
- Arreglar caracteres mojibake en comentarios/mensajes (`año`) para legibilidad; definir UTF-8 por defecto en editor/ambiente.


## Trazabilidad FE ↔ BE (mapeo rápido)
- Auth
  - FE: `authService.ts`, `AuthContext.tsx`
  - BE: `/usuarios/login|logout|me|me/permissions|token/refresh`
- Usuarios/Permisos
  - FE: `modules/gestion_usuarios/pages/*.tsx`, `permisoService.ts`
  - BE: `UsuarioViewSet`, `PermisosFiltradosView`, `set-permisos`
- Huerta — CRUD y Soft-delete
  - FE: `huertaService.ts`, `propietarioService.ts`, tablas y modales en `components`
  - BE: `HuertaViewSet`, `PropietarioViewSet` (+ auditoría y notificaciones)
- Temporadas/Cosechas
  - FE: `temporadaService.ts`, `cosechaService.ts` y páginas `Temporadas.tsx`, `Cosechas.tsx`
  - BE: `TemporadaViewSet`, `CosechaViewSet` (reglas y mapeo de errores)
- Finanzas por Cosecha (Inversiones/Ventas)
  - FE: `FinanzasPorCosecha.tsx`, `inversionService.ts`, `ventaService.ts`
  - BE: `InversionHuertaViewSet`, `VentaViewSet` (filtros, coherencias, rangos de fecha)
- Reportes Producción
  - FE: `reportesProduccionService.ts` + páginas de reporte
  - BE: `views/reportes/*` + `services/reportes/*` + exportación PDF/Excel


## Anexos — Archivos clave referenciados
- Settings: `backend/agroproductores_risol/settings.py`
- Middlewares: `backend/agroproductores_risol/middlewares/security.py`
- Rutas: `backend/agroproductores_risol/urls.py`, `backend/gestion_huerta/urls.py`, `backend/gestion_usuarios/urls.py`
- Permisos: `backend/gestion_usuarios/permissions.py`, `backend/gestion_huerta/permissions.py`
- Throttles: `backend/gestion_usuarios/utils/throttles.py`
- Auditoría: `backend/gestion_huerta/utils/audit.py`, `backend/gestion_usuarios/utils/activity.py`
- Notificaciones: `backend/gestion_usuarios/utils/notification_handler.py`, `backend/gestion_huerta/utils/notification_handler.py`
- Paginación: `backend/agroproductores_risol/utils/pagination.py`
- Ventas con filtros: `backend/gestion_huerta/views/ventas_views.py` (requiere `django-filter`)
- Reportes: `backend/gestion_huerta/services/reportes/*.py`, `backend/gestion_huerta/services/exportacion/*.py`
- Frontend router: `frontend/src/global/routes/AppRouter.tsx`, `frontend/src/global/routes/moduleRoutes.ts`
- Frontend auth: `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx`, `frontend/src/global/api/apiClient.ts`
- Frontend notificaciones: `frontend/src/global/utils/NotificationEngine.ts`

---
Si deseas, puedo aplicar los fixes rápidos (middlewares, requirements y .gitignore) en un branch, o preparar PRs con cambios mínimos y verificados.
