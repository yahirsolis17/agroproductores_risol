# Auditoria de validaciones, seguridad y consistencia

> Nota 2026-03-15: esta auditoría se conserva como evidencia histórica. Sus referencias a scripts standalone y comandos raíz ya no representan el inventario actual del repo.

Fecha: 2026-03-09
Scope: login, gestion_usuarios, gestion_huerta, gestion_bodega, contratos backend/frontend, notificaciones, paginacion, filtros y codigo zombie visible.

## 1. Objetivo

Validar que el sistema mantenga un comportamiento consistente en estos frentes:

- Validacion fuerte en backend como fuente de verdad.
- Formik + Yup en frontend solo como retroalimentacion de UX.
- Notificaciones disparadas a partir de envelopes del backend, no construidas localmente.
- Paginacion y filtros gobernados por backend.
- Eliminacion de codigo muerto o legado claramente desconectado.

## 2. Hallazgos principales

### 2.1 Configuracion backend inconsistente

Se detecto que [settings.py](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/settings.py) estaba corrupto por una edicion previa:

- contenido duplicado
- `SECRET_KEY` truncada
- riesgo de comportamiento no determinista

Impacto:

- podia romper `manage.py check`
- podia invalidar JWT
- hacia poco confiable cualquier auditoria posterior

### 2.2 Excepciones DRF no canonicas

El backend no tenia un handler global uniforme para convertir errores DRF a envelope canonico. Eso podia dejar respuestas con shapes distintos en login, permisos, validaciones y errores de autenticacion.

### 2.3 Formularios con UX inconsistente

Se detectaron modales/formularios que si usaban `Formik` pero no mostraban banner de errores o tenian manejo silencioso/incompleto:

- [AbonoMaderaModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx)
- [BodegaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx)
- [PropietarioFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx)
- [HuertaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx)

Tambien habia componentes que reaplicaban notificaciones manuales sobre errores que ya llegaban notificados desde backend/interceptor.

### 2.4 Bifurcacion en notificaciones

No se detecto ya generacion funcional de envelopes locales con `handleBackendNotification({ ... })` en el frontend auditado.

Si siguen existiendo llamadas a `handleBackendNotification(...)` en slices y algunas paginas, pero hoy su rol es mostrar envelopes del backend, no inventar mensajes locales. La duplicidad mas riesgosa se limpio en formularios y en flujos concretos de huerta.

### 2.5 Codigo zombie / legacy

Se detecto codigo de bodega sin referencias reales y con rutas obsoletas:

- `frontend/src/modules/gestion_bodega/services/inventarioService.ts`
- `frontend/src/modules/gestion_bodega/services/lotesService.ts`
- `frontend/src/modules/gestion_bodega/utils/hotkeys.ts`
- `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx`

Impacto:

- deuda cognitiva
- riesgo de reuso accidental de rutas inexistentes
- falsa sensacion de cobertura funcional

## 3. Cambios ejecutados

### 3.1 Backend

Se dejo configuracion limpia y determinista en [settings.py](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/settings.py):

- `SECRET_KEY` configurable por entorno
- `DEBUG` configurable por entorno
- `ALLOWED_HOSTS` con `testserver` para pruebas
- DB configurable por entorno
- `CSRF_TRUSTED_ORIGINS` configurable
- flags de seguridad basicos para cookies y headers
- `REST_FRAMEWORK.EXCEPTION_HANDLER` apuntando al handler canonico

Se agrego handler global en [exception_handler.py](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/utils/exception_handler.py) para normalizar:

- `ValidationError`
- `AuthenticationFailed`
- `NotAuthenticated`
- `PermissionDenied`
- `NotFound`
- `Throttled`

Se confirmo la capa canonica existente:

- [notification_handler.py](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/utils/notification_handler.py)
- [pagination.py](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/utils/pagination.py)

Se creo el directorio faltante para estaticos:

- [backend/static/.gitkeep](C:/Users/Yahir/agroproductores_risol/backend/static/.gitkeep)

### 3.2 Frontend: validaciones y formularios

Se homologo el patron `Formik + Yup + backend errors + FormAlertBanner` en formularios clave:

- [CosechaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx)
- [TemporadaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx)
- [CamionFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx)
- [AbonoMaderaModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx)
- [BodegaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx)
- [PropietarioFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx)
- [HuertaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx)

Se mejoro el helper global [backendFieldErrors.ts](C:/Users/Yahir/agroproductores_risol/frontend/src/global/validation/backendFieldErrors.ts) para permitir tambien `setErrors(...)` real de Formik cuando conviene.

### 3.3 Frontend: notificaciones

Se limpiaron puntos de doble emision innecesaria en formularios y auth:

- [Login.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/pages/Login.tsx)
- [Register.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/pages/Register.tsx)
- [HuertaRentadaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx)
- [CategoriaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx)
- [CategoriaInversionEditModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx)
- [InversionFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx)
- [VentaFormModal.tsx](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx)
- [reportesProduccionService.ts](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts)

Se mantuvieron notificaciones manuales solo donde todavia son razonables:

- blobs/json de exportacion
- algunos slices/paginas que muestran envelopes backend ya normalizados

### 3.4 Codigo zombie eliminado

Se eliminaron los modulos desconectados de bodega:

- `frontend/src/modules/gestion_bodega/services/inventarioService.ts`
- `frontend/src/modules/gestion_bodega/services/lotesService.ts`
- `frontend/src/modules/gestion_bodega/utils/hotkeys.ts`
- `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx`

Y se limpiaron referencias documentales en:

- [estructura_limpia.txt](C:/Users/Yahir/agroproductores_risol/frontend/src/estructura_limpia.txt)
- [estructura_limpia.txt](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_bodega/estructura_limpia.txt)

## 4. Estado de paginacion y filtros

### 4.1 Backend

La paginacion y meta estan unificadas con [GenericPagination](C:/Users/Yahir/agroproductores_risol/backend/agroproductores_risol/utils/pagination.py).

Se confirmo uso backend en vistas principales de:

- usuarios
- huertas
- temporadas
- cosechas
- inversiones
- ventas
- bodegas
- recepciones
- empaques
- camiones
- cierres
- consumibles
- compras de madera

### 4.2 Frontend

La UI consume `meta.count`, `meta.page_size`, `meta.total_pages` y params backend. No se detectaron fabricaciones locales nuevas de paginacion en las pantallas auditadas.

Nota:

- existen servicios defensivos que toleran shape legacy si backend no responde canonico, por ejemplo temporadas de bodega. Eso hoy funciona como compatibilidad, no como segunda fuente de verdad activa.

## 5. Verificacion ejecutada

Compilacion y checks ejecutados:

```txt
cd frontend && npx tsc -p tsconfig.json --noEmit --pretty false
cd backend && python manage.py check
python check_response_canon.py
python check_message_keys_canon.py
python check_api_client_usage.py
python check_toast_and_axios_usage.py
python check_no_react_query.py
python check_docs_source_of_truth.py
python check_list_contracts.py
python check_tablelayout_meta.py
python check_ui_transforms_policy.py
python check_ts_core_guard.py
```

Resultado:

- TypeScript: OK
- Django check: OK
- Response canon: OK
- Message keys: OK
- axios/toasts policy: OK
- React Query guard: OK
- docs source of truth: OK
- list contracts: OK
- tablelayout meta: OK
- ui transforms policy: OK
- ts core guard: OK

## 6. Residual real que sigue existiendo

### 6.1 Riesgo principal de seguridad pendiente

La autenticacion sigue almacenando JWT en `localStorage` en [authService.ts](C:/Users/Yahir/agroproductores_risol/frontend/src/modules/gestion_usuarios/services/authService.ts).

Eso implica:

- mayor exposicion frente a XSS
- sesion hibrida porque `apiClient` usa `withCredentials` y ademas Bearer token persistido

No se cambio en esta pasada para no romper autenticacion ni logout/refresh actuales. Si se quiere subir el estandar real de seguridad, el siguiente paso correcto es migrar a cookies `HttpOnly` con refresh controlado en backend y eliminar persistencia de tokens en `localStorage`.

### 6.2 Consolidacion total de notificaciones

Todavia existen llamadas a `handleBackendNotification(...)` en slices Redux. Hoy ya no se detecto construccion local de envelopes funcionales, pero todavia no todo esta consolidado en un unico mecanismo de despacho.

Estado actual:

- backend sigue siendo la fuente del mensaje
- frontend todavia tiene mas de un punto de visualizacion del envelope

Siguiente mejora recomendable:

- elegir una sola estrategia: `apiClient` o thunks/slices, no ambos

## 7. Conclusion

El sistema quedo mas consistente y mas seguro que al inicio de la auditoria:

- backend con excepciones canonicas
- configuracion limpia y verificable
- formularios criticos con el mismo patron UX
- no se detectaron notificaciones locales inventadas en los modulos auditados
- paginacion y filtros mayormente gobernados por backend
- codigo zombie obvio eliminado

No lo considero "seguridad perfecta" por la deuda de `localStorage` en auth, pero si quedo en un estado bastante mas robusto, homogeno y auditable.
