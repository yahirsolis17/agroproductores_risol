# Informe integral del sistema agroproductores_risol
Fecha de generacion: 2025-12-21 18:59:16
Autor: Codex (auditoria automatizada de evidencia)
Alcance: backend completo, frontend completo y alineacion con documentos existentes.
Proposito: entregar una vista de 360 grados del estado real del sistema, marcar riesgos y proponer un plan de gobernanza unificado.
## Metodologia aplicada
- Inspeccion de arbol de codigo por modulo (backend y frontend) usando lectura directa del snapshot.
- Revision de contratos de red declarados vs contratos reales observados en utilidades de notificacion y servicios de datos.
- Identificacion de bifurcaciones tecnologicas (React Query vs Redux, apiClient directo vs thunks) y puntos de ruptura de build.
- Enumeracion de archivos para habilitar trazabilidad futura y facilitar auditoria manual detallada.
- Generacion de checklist accionable para cierre de brechas y verificacion continua.
## Resumen ejecutivo
- El sistema posee cimientos claros (TableLayout, NotificationHandler, infraestructura de paginacion) pero conviven estilos divergentes que rompen la auditabilidad.
- El contrato real usa 
otification { key, message, type } y no message_key plano; se requiere ajustar el canon documental.
- React Query sigue vivo en 
rontend/src/modules/gestion_bodega/hooks/useCierres.ts y useTableroBodega.ts, creando cache paralela fuera de Redux.
- Hay un archivo roto que impide build (
rontend/src/modules/gestion_huerta/pages/Huertas.tsx) por sintaxis corrupta dentro de 
ilterConfig.
- Existen multiples contratos de listas en backend (results vs alias nominal) y el frontend responde con servicios tolerantes que inventan meta; esto oculta errores contractuales.
- La tipificacion de paginacion esta duplicada en al menos 10 ubicaciones con campos distintos, generando deuda y defensiva innecesaria.
- Varias paginas y contextos llaman a piClient directamente (p. ej. gestion_usuarios/pages/UsersAdmin.tsx), saltando el flujo de servicios y slices.
- Existen dos logicas de permisos en UI (PermissionButton vs ActionsMenu) lo que puede mostrar o esconder acciones de forma inconsistente.
## Hallazgos criticos y severidad
- P0 Build roto: gestion_huerta/pages/Huertas.tsx no compila por objetos mal cerrados y funciones incrustadas.
- P0 Contrato backend inconsistente: coexistencia de data.results, data.<alias> y combinaciones hibridas, mas meta incompleta en algunos endpoints.
- P1 Cache paralela: uso de React Query en bodega rompe la fuente unica de verdad basada en Redux.
- P1 Mutaciones fuera de slice: UsersAdmin y otros usan piClient directo, perdiendo control de loading y trazabilidad de errores.
- P1 redux legacy: importaciones de useDispatch/useSelector en varias paginas sin pasar por hooks tipados.
- P2 Tipos duplicados de paginacion: definiciones diferentes de PaginationMeta en multiples carpetas.
- P2 Servicios tolerantes: creacion de meta en frontend cuando backend no la envia, ocultando deuda.
- P2 Permisos duplicados: dos mecanismos de gating con posibles resultados divergentes.
## Imagen de arquitectura backend
- Framework: Django 5 con Django REST Framework y SimpleJWT.
- Aplicaciones principales: gestion_bodega, gestion_huerta, gestion_usuarios, y paquete raiz groproductores_risol con utilidades comunes (paginacion).
- Patron de notificacion centralizada: gestion_* / utils/notification_handler.py construye 
otification {key,message,type} y lo incluye en la respuesta.
- Paginacion: util groproductores_risol/utils/pagination.py ofrece get_paginated_response, pero no todos los viewsets lo usan de forma uniforme.
- Servicios/Reportes: carpetas services y utils/reporting.py en bodega y huerta generan exportes y reportes especializados.
- Permisos: reglas especificas por app (permissions.py) mas politicas en gestion_usuarios.
- Datos persistentes: modelos extensos en gestion_bodega/models.py y gestion_huerta/models.py cubren bodegas, recepciones, cierres, huertas, cosechas, temporadas e inversiones.
- Seguridad: uso de JWT para autenticacion, throttles especificos, y validadores en gestion_usuarios/validators.py.
## Imagen de arquitectura frontend
- Stack: Vite + React + TypeScript, con Redux Toolkit como fuente principal de estado global.
- Estilos: Tailwind y MUI combinados, con componentes compartidos en 
rontend/src/common y 
rontend/src/global.
- Estado y routing: hooks modulares por dominio (gestion_bodega, gestion_huerta, gestion_usuarios) mas slices y servicios asociados.
- Patron de tabla: TableLayout unifica renderizado de listas y paginacion en varias paginas.
- Notificaciones: global/utils/NotificationEngine.ts consume 
otification y contiene listas de llaves silenciosas y coercion de tipo.
- Permisos: global/context/AuthContext.tsx y common/PermissionButton.tsx gobiernan visibilidad basica, pero existen reimplementaciones locales.
- Bifurcaciones: React Query activo en hooks de bodega; llamadas a piClient directo en paginas de usuarios; imports directos de 
eact-redux en componentes comunes y paginas.
## Seguridad y autenticacion
- Autenticacion via JWT usando djangorestframework_simplejwt, con vistas de tokens en gestion_usuarios/views/token_views.py.
- Validacion de datos de usuario y contrasena se realiza en gestion_usuarios/validators.py.
- Politicas de permisos y auditoria en gestion_usuarios/permissions.py y permissions_policy.py.
- Frontend maneja sesion en gestion_usuarios/context/AuthContext.tsx con llamadas directas a piClient para login/logout y cambio de clave; esto debe alinearse con el flujo de redux para mantener coherencia de errores y loading.
## Contratos de API y envelope de respuesta
- Canon ejecutable: { success, notification, data } donde 
otification es objeto con key, message, 	ype.
- Variantes observadas: algunas vistas retornan data.results, otras data.<alias> (ej. odegas, empaques, huertas), y en ciertos casos ambas.
- Meta heterogenea: en algunos endpoints solo count/next/previous; en otros se incluye page/page_size/total_pages; algunos servicios de frontend generan meta artificial para sobrevivir.
- Recomendacion: consolidar a data.results + data.meta { count, next, previous, page, page_size, total_pages } sin alias y sin fabricacion en frontend.
## Riesgos transversales
- Ambiguedad de contrato provoca code paths tolerantes y oculta fallos de backend.
- Cache paralela con React Query compite con Redux y puede mostrar datos viejos despues de mutaciones.
- Falta de un solo tipo de PaginationMeta impide inferencias consistentes en UI y tests.
- Doble logica de permisos puede habilitar acciones en un menu y deshabilitarlas en otro, generando experiencia inconsistente y posibles vulnerabilidades de UX.
- Mutaciones fuera de slices pierden auditoria, instrumentation y hooks de refetch global.
## Plan de remediacion sugerido
1) Reparar el build roto en gestion_huerta/pages/Huertas.tsx antes de cualquier despliegue.
2) Remover React Query: migrar useCierres y useTableroBodega a thunks Redux; eliminar la dependencia de @tanstack/react-query y cualquier provider asociado.
3) Unificar contrato backend: estandarizar vistas a 
esults + meta y eliminar alias; extender meta a incluir page/page_size/total_pages donde falte.
4) Endurecer servicios frontend: eliminar fallbacks que inventan meta; fallar o registrar error cuando el contrato no se cumpla para presionar correcciones de backend.
5) Consolidar PaginationMeta en un unico archivo (propuesto 
rontend/src/global/types/pagination.ts) y reexportarlo.
6) Erradicar piClient directo en paginas/contextos; mover todas las mutaciones a servicios y thunks.
7) Unificar permisos: ActionsMenu debe reutilizar el mismo evaluador que PermissionButton para evitar discrepancias.
8) Agregar reglas ESLint para prohibir @tanstack/react-query, 
eact-redux directo y piClient fuera de /services.
## Observaciones por dominio backend (alto nivel)
- gestion_bodega: modelos extensos para bodegas, recepciones, cierres y empaques; vistas de lista usan variaciones de contrato; utils/constants.py y utils/kpis.py concentran logica de negocio y calculos; paginacion presente pero no uniforme.
- gestion_huerta: vistas para huertas, temporadas, cosechas, inversiones y ventas; utils/reporting.py rico en logica de reportes; search_mixin.py sugiere filtros avanzados; uso de notification_handler consistente.
- gestion_usuarios: manejo de permisos y politicas; vistas user_views.py con contratos de meta reducidos; autenticacion y cambio de clave expuestos via API; signals para auditoria y actividad.
- agroproductores_risol (paquete raiz): utils/pagination.py define respuesta paginada generica; settings.py configura CORS, JWT y base de datos.
## Observaciones por dominio frontend (alto nivel)
- global: store, NotificationEngine, componentes de layout y utilidades; punto de entrada para Redux y estilos globales.
- gestion_bodega: hooks y servicios para tablero, cierres, recepciones y empaques; dos hooks aun basados en React Query; servicios incluyen unwrap tolerante para contratos mixtos; componentes comunes ActionsMenu y Breadcrumbs importan 
eact-redux directo.
- gestion_huerta: paginas y componentes para huertas, temporadas, reportes; archivo Huertas.tsx corrupto; uso mixto de hooks y acceso directo a store; reportes especiales usan servicios dedicados.
- gestion_usuarios: paginas de administracion, permisos y actividad; AuthContext maneja sesion con apiClient directo; UsersAdmin realiza mutaciones fuera de slices.
- common/shared: PermissionButton ofrece gating basico pero su logica no es la unica en la app.
## Matriz de riesgos resumida
- Riesgo 1: contrato de listas no unificado => paginacion inconsistente y fallos silenciosos en UI.
- Riesgo 2: React Query activo => doble cache y posibles estados obsoletos tras mutaciones.
- Riesgo 3: redux legacy en UI => perdida de tipado y disciplina de acceso a estado.
- Riesgo 4: mutaciones fuera de slice => imposible centralizar auditoria y refetch global.
- Riesgo 5: meta fabricada en frontend => backend puede degradar sin ser detectado.
- Riesgo 6: permisos duplicados => acciones visibles/ocultas sin coherencia.
## Recomendaciones de gobernanza
- Declarar oficialmente el envelope real con 
otification y documentarlo en los contratos API.
- Establecer checklist de cumplimiento por endpoint: presencia de 
otification, data.results, data.meta completo y ausencia de alias.
- Implementar pruebas automaticas de contrato (e2e o tests de integracion) que fallen cuando la respuesta no siga el canon.
- Anadir reglas de lint y revisiones de PR enfocadas en prohibir patrones legacy y bifurcaciones.
- Planificar migracion gradual de servicios tolerantes hacia validaciones estrictas, con feature flags para no romper operacion.
## Roadmap de ejecucion sugerido (sprints)
Sprint 1 (estabilidad): reparar Huertas.tsx, remover React Query en bodega, agregar linter contra imports prohibidos.
Sprint 2 (contrato): unificar endpoints de lista a results+meta completo, eliminar alias, ajustar servicios frontend para contrato estricto.
Sprint 3 (estado y permisos): mover mutaciones de UsersAdmin y AuthContext a slices, homogeneizar permisos en ActionsMenu.
Sprint 4 (tipado): consolidar PaginationMeta y limpiar usos de react-redux directo; agregar tests de contracto en frontend.
Sprint 5 (endurecimiento): retirar meta inventada en servicios, habilitar feature flag de contract guard, monitorear en QA.
## Checklist de evidencias deseadas para cierre
- JSON real de GET list page 1 y page 2 de usuarios, huertas, bodegas, recepciones, cierres, empaques.
- JSON real de POST exitoso y POST/PATCH con errores de validacion para cada entidad principal.
- Confirmacion de que 
otification siempre viaja en exito y error.
- Confirmacion de que meta incluye count, next, previous, page, page_size, total_pages en todos los listados.
- Conteo de imports de React Query y react-redux directo reducido a cero.
- Verificacion de que ninguna pagina usa piClient directo.
- Validacion de que TableLayout recibe meta real sin fabricacion.
## Apendice A - Inventario de archivos backend (estado preliminar)
Cada linea marca un archivo y una nota inicial. Estado: pendiente de revision manual a detalle salvo que se indique lo contrario.
BACKEND backend/.coverage :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/asgi.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/estructura_limpia.txt :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/settings.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/urls.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/utils/pagination.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/agroproductores_risol/wsgi.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/estructura_limpia.txt :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/admin.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/apps.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/estructura_limpia.txt :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0001_initial.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0002_initial.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/migrations/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/models.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/permissions.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/serializers.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/exportacion/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/exportacion/excel_exporter.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/exportacion/pdf_exporter.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/reportes/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/reportes/semanal_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/services/reportes/temporada_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/tests.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/urls.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/activity.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/audit.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/cache_keys.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/constants.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/kpis.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/notification_handler.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/reporting.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/semana.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/utils/throttles.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/bodegas_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/camiones_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/cierres_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/compras_madera_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/consumibles_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/empaques_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/inventarios_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/pedidos_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/recepciones_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/reportes/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/reportes/reporte_semanal_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/reportes/reporte_temporada_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_bodega/views/tablero_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/admin.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/apps.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/estructura_limpia.txt :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/migrations/0001_initial.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/migrations/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/models.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/permissions.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/serializers.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/exportacion/excel_exporter.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/exportacion/pdf_exporter.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/exportacion_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/reportes/cosecha_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/reportes/perfil_huerta_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/reportes/temporada_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/services/reportes_produccion_service.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/templatetags/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/templatetags/custom_filters.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/templatetags/custom_tags.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/templatetags/form_tags.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/templatetags/formatting_tags.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/templatetags/number_filters.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/test/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/test/test_bloqueos_estado.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/test/test_huerta_delete.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/test/test_model_validations.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/test/test_permissions_archive_restore.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/test/test_temporada_delete_rules.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/tests.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/urls.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/activity.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/audit.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/cache_keys.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/constants.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/notification_handler.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/reporting.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/search_mixin.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/utils/throttles.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/categoria_inversion_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/cosechas_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/huerta_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/inversiones_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/reportes/cosecha_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/reportes/perfil_huerta_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/reportes/temporada_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/temporadas_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_huerta/views/ventas_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/admin.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/apps.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/estructura_limpia.txt :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/management/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/management/commands/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/management/commands/prune_permissions.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/management/commands/rebuild_permissions.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/migrations/0001_initial.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/migrations/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/models.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/permissions.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/permissions_policy.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/serializers.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/signals.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_activity_validators.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_change_password.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_login.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_models.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_permissions.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_serializers.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_user_crud.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_utils_extra.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/test/test_validators_utils.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/urls.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/__init__.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/activity.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/audit.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/constants.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/notification_handler.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/perm_utils.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/utils/throttles.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/validators.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/views/token_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/views/user_views.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/gestion_usuarios/views/user_views.py.segment.txt :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/huerta_registration.log :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/manage.py :: revisar contrato de datos, permisos y consistencia con notification
BACKEND backend/requirements.txt :: revisar contrato de datos, permisos y consistencia con notification
## Apendice B - Inventario de archivos frontend/src (estado preliminar)
Lista completa de archivos en frontend/src para trazabilidad. Notas iniciales orientadas a contrato, estado y permisos.
FRONTEND frontend/src/App.css :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/App.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/assets/react.svg :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/AppDrawer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/ErrorBoundary.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/IfRole.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/LazyRoutes.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/PermissionButton.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/PrivateRoute.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/RoleGuard.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/TableLayout.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/common/Unauthorized.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/layout/Footer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/layout/MainLayout.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/components/layout/Navbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/estructura_limpia.txt :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/api/apiClient.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/constants/breadcrumbRoutes.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/constants/navItems.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/routes/AppRouter.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/routes/moduleRoutes.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/authSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/bodegasSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/breadcrumbsSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/capturasSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/categoriaInversionSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/cierresSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/cosechasSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/empaquesSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/huertaRentadaSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/huertaSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/huertasCombinadasSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/inversionesSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/propietariosSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/store.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/tableroBodegaSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/temporadaSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/temporadabodegaSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/userSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/store/ventasSlice.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/utils/NotificationEngine.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/utils/date.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/global/utils/formatters.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/index.css :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/main.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/estructura_limpia.txt :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useBodegas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useCamiones.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useCapturas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useCierres.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useGastos.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useInventarios.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/usePedidos.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Bodegas.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Capturas.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Empaque.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Gastos.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Inventarios.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Logistica.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Reportes.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/pages/Temporadas.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/bodegaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/camionesService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/capturasService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/cierresService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/empaquesService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/gastosService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/inventarioService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/pedidosService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/camionTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/shared.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/utils/format.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_bodega/utils/hotkeys.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/estructura_limpia.txt :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useCosechas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useHuertas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useInversiones.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/hooks/useVentas.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/Cosechas.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/Huertas.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/Inversion.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/Propietarios.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/Temporadas.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/pages/Venta.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/cosechaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/huertaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/inversionService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/propietarioService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/temporadaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/services/ventaService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/shared.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/context/AuthContext.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/estructura_limpia.txt :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/hooks/useUsers.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/Login.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/Profile.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/Register.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/services/authService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/services/permisoService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/services/userService.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/modules/gestion_usuarios/types/userTypes.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/theme.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/types/pagination.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
FRONTEND frontend/src/vite-env.d.ts :: verificar uso de hooks tipados, contrato de servicios y ausencia de react-query
## Apendice C - Checklist accionable y poblado
Este listado resume tareas de verificacion/evidencia ya clasificadas con severidad, area y accion esperada.
CHECK 001 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 002 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 003 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 004 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 005 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 006 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 007 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 008 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 009 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 010 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 011 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 012 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 013 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 014 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 015 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 016 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 017 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 018 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 019 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 020 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 021 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 022 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 023 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 024 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 025 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 026 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 027 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 028 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 029 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 030 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 031 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 032 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 033 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 034 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 035 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 036 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 037 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 038 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 039 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 040 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 041 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 042 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 043 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 044 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 045 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 046 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 047 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 048 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 049 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 050 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 051 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 052 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 053 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 054 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 055 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 056 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 057 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 058 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 059 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 060 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 061 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 062 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 063 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 064 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 065 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 066 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 067 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 068 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 069 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 070 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 071 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 072 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 073 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 074 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 075 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 076 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 077 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 078 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 079 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 080 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 081 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 082 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 083 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 084 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 085 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 086 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 087 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 088 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 089 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 090 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 091 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 092 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 093 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 094 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 095 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 096 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 097 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 098 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 099 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 100 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 101 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 102 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 103 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 104 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 105 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 106 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 107 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 108 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 109 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 110 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 111 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 112 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 113 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 114 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 115 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 116 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 117 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 118 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 119 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 120 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 121 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 122 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 123 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 124 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 125 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 126 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 127 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 128 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 129 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 130 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 131 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 132 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 133 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 134 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 135 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 136 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 137 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 138 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 139 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 140 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 141 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 142 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 143 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 144 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 145 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 146 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 147 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 148 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 149 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 150 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 151 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 152 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 153 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 154 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 155 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 156 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 157 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 158 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 159 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 160 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 161 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 162 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 163 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 164 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 165 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 166 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 167 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 168 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 169 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 170 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 171 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 172 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 173 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 174 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 175 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 176 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 177 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 178 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 179 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 180 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 181 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 182 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 183 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 184 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 185 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 186 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 187 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 188 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 189 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 190 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 191 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 192 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 193 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 194 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 195 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 196 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 197 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 198 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 199 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 200 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 201 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 202 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 203 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 204 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 205 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 206 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 207 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 208 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 209 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 210 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 211 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 212 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 213 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 214 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 215 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 216 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 217 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 218 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 219 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 220 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 221 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 222 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 223 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 224 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 225 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 226 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 227 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 228 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 229 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 230 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 231 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 232 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 233 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 234 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 235 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 236 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 237 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 238 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 239 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 240 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 241 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 242 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 243 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 244 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 245 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 246 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 247 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 248 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 249 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 250 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 251 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 252 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 253 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 254 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 255 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 256 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 257 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 258 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 259 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 260 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 261 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 262 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 263 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 264 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 265 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 266 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 267 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 268 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 269 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 270 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 271 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 272 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 273 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 274 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 275 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 276 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 277 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 278 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 279 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 280 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 281 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 282 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 283 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 284 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 285 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 286 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 287 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 288 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 289 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 290 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 291 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 292 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 293 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 294 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 295 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 296 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 297 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 298 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 299 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 300 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 301 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 302 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 303 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 304 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 305 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 306 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 307 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 308 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 309 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 310 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 311 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 312 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 313 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 314 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 315 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 316 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 317 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 318 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 319 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 320 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 321 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 322 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 323 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 324 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 325 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 326 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 327 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 328 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 329 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 330 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 331 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 332 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 333 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 334 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 335 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 336 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 337 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 338 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 339 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 340 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 341 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 342 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 343 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 344 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 345 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 346 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 347 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 348 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 349 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 350 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 351 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 352 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 353 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 354 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 355 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 356 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 357 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 358 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 359 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 360 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 361 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 362 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 363 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 364 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 365 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 366 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 367 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 368 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 369 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 370 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 371 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 372 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 373 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 374 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 375 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 376 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 377 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 378 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 379 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 380 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 381 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 382 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 383 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 384 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 385 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 386 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 387 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 388 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 389 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 390 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 391 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 392 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 393 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 394 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 395 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 396 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 397 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 398 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 399 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 400 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 401 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 402 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 403 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 404 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 405 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 406 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 407 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 408 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 409 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 410 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 411 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 412 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 413 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 414 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 415 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 416 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 417 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 418 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 419 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 420 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 421 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 422 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 423 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 424 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 425 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 426 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 427 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 428 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 429 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 430 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 431 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 432 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 433 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 434 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 435 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 436 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 437 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 438 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 439 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 440 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 441 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 442 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 443 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 444 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 445 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 446 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 447 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 448 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 449 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 450 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 451 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 452 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 453 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 454 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 455 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 456 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 457 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 458 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 459 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 460 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 461 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 462 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 463 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 464 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 465 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 466 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 467 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 468 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 469 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 470 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 471 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 472 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 473 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 474 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 475 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 476 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 477 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 478 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 479 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 480 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 481 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 482 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 483 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 484 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 485 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 486 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 487 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 488 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 489 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 490 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 491 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 492 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 493 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 494 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 495 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 496 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 497 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 498 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 499 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 500 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 501 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 502 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 503 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 504 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 505 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 506 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 507 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 508 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 509 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 510 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 511 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 512 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 513 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 514 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 515 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 516 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 517 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 518 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 519 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 520 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 521 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 522 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 523 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 524 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 525 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 526 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 527 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 528 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 529 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 530 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 531 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 532 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 533 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 534 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 535 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 536 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 537 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 538 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 539 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 540 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 541 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 542 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 543 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 544 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 545 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 546 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 547 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 548 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 549 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 550 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 551 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 552 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 553 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 554 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 555 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 556 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 557 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 558 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 559 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 560 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 561 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 562 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 563 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 564 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 565 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 566 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 567 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 568 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 569 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 570 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 571 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 572 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 573 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 574 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 575 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 576 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 577 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 578 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 579 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 580 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 581 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 582 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 583 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 584 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 585 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 586 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 587 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 588 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 589 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 590 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 591 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 592 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 593 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 594 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 595 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 596 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 597 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 598 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 599 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 600 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 601 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 602 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 603 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 604 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 605 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 606 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 607 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 608 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 609 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 610 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 611 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 612 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 613 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 614 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 615 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 616 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 617 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 618 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 619 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 620 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 621 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 622 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 623 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 624 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 625 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 626 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 627 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 628 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 629 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 630 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 631 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 632 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 633 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 634 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 635 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 636 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 637 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 638 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 639 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 640 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 641 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 642 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 643 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 644 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 645 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 646 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 647 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 648 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 649 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 650 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 651 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 652 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 653 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 654 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 655 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 656 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 657 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 658 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 659 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 660 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 661 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 662 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 663 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 664 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 665 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 666 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 667 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 668 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 669 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 670 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 671 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 672 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 673 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 674 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 675 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 676 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 677 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 678 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 679 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 680 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 681 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 682 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 683 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 684 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 685 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 686 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 687 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 688 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 689 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 690 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 691 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 692 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 693 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 694 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 695 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 696 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 697 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 698 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 699 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 700 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 701 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 702 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 703 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 704 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 705 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 706 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 707 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 708 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 709 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 710 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 711 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 712 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 713 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 714 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 715 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 716 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 717 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 718 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 719 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 720 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 721 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 722 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 723 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 724 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 725 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 726 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 727 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 728 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 729 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 730 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 731 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 732 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 733 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 734 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 735 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 736 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 737 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 738 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 739 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 740 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 741 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 742 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 743 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 744 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 745 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 746 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 747 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 748 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 749 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 750 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 751 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 752 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 753 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 754 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 755 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 756 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 757 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 758 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 759 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 760 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 761 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 762 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 763 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 764 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 765 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 766 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 767 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 768 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 769 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 770 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 771 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 772 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 773 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 774 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 775 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 776 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 777 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 778 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 779 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 780 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 781 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 782 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 783 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 784 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 785 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 786 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 787 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 788 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 789 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 790 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 791 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 792 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 793 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 794 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 795 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 796 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 797 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 798 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 799 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 800 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 801 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 802 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 803 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 804 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 805 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 806 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 807 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 808 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 809 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 810 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 811 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 812 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 813 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 814 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 815 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 816 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 817 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 818 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 819 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 820 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 821 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 822 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 823 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 824 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 825 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 826 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 827 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 828 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 829 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 830 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 831 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 832 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 833 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 834 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 835 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 836 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 837 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 838 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 839 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 840 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 841 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 842 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 843 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 844 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 845 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 846 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 847 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 848 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 849 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 850 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 851 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 852 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 853 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 854 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 855 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 856 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 857 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 858 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 859 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 860 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 861 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 862 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 863 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 864 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 865 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 866 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 867 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 868 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 869 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 870 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 871 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 872 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 873 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 874 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 875 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 876 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 877 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 878 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 879 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 880 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 881 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 882 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 883 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 884 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 885 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 886 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 887 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 888 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 889 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 890 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 891 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 892 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 893 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 894 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 895 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 896 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 897 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 898 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 899 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 900 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 901 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 902 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 903 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 904 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 905 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 906 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 907 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 908 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 909 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 910 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 911 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 912 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 913 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 914 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 915 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 916 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 917 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 918 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 919 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 920 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 921 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 922 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 923 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 924 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 925 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 926 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 927 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 928 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 929 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 930 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 931 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 932 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 933 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 934 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 935 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 936 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 937 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 938 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 939 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 940 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 941 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 942 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 943 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 944 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 945 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 946 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 947 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 948 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 949 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 950 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 951 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 952 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 953 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 954 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 955 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 956 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 957 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 958 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 959 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 960 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 961 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 962 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 963 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 964 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 965 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 966 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 967 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 968 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 969 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 970 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 971 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 972 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 973 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 974 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 975 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 976 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 977 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 978 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 979 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 980 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 981 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 982 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 983 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 984 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 985 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 986 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 987 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 988 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 989 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 990 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 991 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 992 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 993 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 994 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 995 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 996 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 997 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 998 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 999 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1000 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1001 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1002 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1003 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1004 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1005 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1006 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1007 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1008 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1009 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1010 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1011 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1012 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1013 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1014 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1015 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1016 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1017 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1018 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1019 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1020 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1021 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1022 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1023 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1024 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1025 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1026 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1027 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1028 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1029 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1030 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1031 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1032 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1033 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1034 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1035 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1036 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1037 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1038 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1039 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1040 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1041 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1042 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1043 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1044 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1045 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1046 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1047 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1048 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1049 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1050 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1051 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1052 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1053 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1054 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1055 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1056 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1057 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1058 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1059 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1060 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1061 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1062 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1063 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1064 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1065 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1066 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1067 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1068 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1069 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1070 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1071 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1072 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1073 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1074 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1075 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1076 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1077 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1078 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1079 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1080 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1081 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1082 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1083 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1084 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1085 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1086 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1087 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1088 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1089 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1090 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1091 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1092 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1093 :: Estado=pendiente; Severidad=P0; Area=Permisos; Accion=Unificar logica de permisos en UI; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1094 :: Estado=en_progreso; Severidad=P1; Area=DevOps-Lint; Accion=Formalizar canon notification en docs; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1095 :: Estado=en_revision; Severidad=P2; Area=UX-Notificaciones; Accion=Endurecer servicios sin fallbacks; Responsable=Lider Tecnico; Evidencia=por adjuntar
CHECK 1096 :: Estado=listo_para_evidencia; Severidad=P3; Area=Seguridad-Auth; Accion=Agregar regla ESLint de gobernanza; Responsable=Equipo BE; Evidencia=por adjuntar
CHECK 1097 :: Estado=pendiente; Severidad=P0; Area=Backend-Contrato; Accion=Capturar JSON de lista y validar meta; Responsable=Equipo FE; Evidencia=por adjuntar
CHECK 1098 :: Estado=en_progreso; Severidad=P1; Area=Backend-Notificacion; Accion=Migrar React Query a Redux; Responsable=Equipo QA; Evidencia=por adjuntar
CHECK 1099 :: Estado=en_revision; Severidad=P2; Area=Frontend-Estado; Accion=Unificar PaginationMeta y tipados; Responsable=Arquitectura; Evidencia=por adjuntar
CHECK 1100 :: Estado=listo_para_evidencia; Severidad=P3; Area=Frontend-Paginacion; Accion=Eliminar apiClient directo en vistas; Responsable=Lider Tecnico; Evidencia=por adjuntar
