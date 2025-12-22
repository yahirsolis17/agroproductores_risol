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
- React Query sigue vivo en rontend/src/modules/gestion_bodega/hooks/useCierres.ts y useTableroBodega.ts, creando cache paralela fuera de Redux.
- Hay un archivo roto que impide build (rontend/src/modules/gestion_huerta/pages/Huertas.tsx) por sintaxis corrupta dentro de ilterConfig.
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
- Estilos: Tailwind y MUI combinados, con componentes compartidos en rontend/src/common y rontend/src/global.
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
5) Consolidar PaginationMeta en un unico archivo (propuesto rontend/src/global/types/pagination.ts) y reexportarlo.
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
## Apendice C - Checklist numerado para verificacion continua
Cada item sirve como recordatorio accionable para el equipo. Marcar como completado a medida que se cierre la brecha correspondiente.
CHECK 001 :: pendiente de verificacion y evidencia
CHECK 002 :: pendiente de verificacion y evidencia
CHECK 003 :: pendiente de verificacion y evidencia
CHECK 004 :: pendiente de verificacion y evidencia
CHECK 005 :: pendiente de verificacion y evidencia
CHECK 006 :: pendiente de verificacion y evidencia
CHECK 007 :: pendiente de verificacion y evidencia
CHECK 008 :: pendiente de verificacion y evidencia
CHECK 009 :: pendiente de verificacion y evidencia
CHECK 010 :: pendiente de verificacion y evidencia
CHECK 011 :: pendiente de verificacion y evidencia
CHECK 012 :: pendiente de verificacion y evidencia
CHECK 013 :: pendiente de verificacion y evidencia
CHECK 014 :: pendiente de verificacion y evidencia
CHECK 015 :: pendiente de verificacion y evidencia
CHECK 016 :: pendiente de verificacion y evidencia
CHECK 017 :: pendiente de verificacion y evidencia
CHECK 018 :: pendiente de verificacion y evidencia
CHECK 019 :: pendiente de verificacion y evidencia
CHECK 020 :: pendiente de verificacion y evidencia
CHECK 021 :: pendiente de verificacion y evidencia
CHECK 022 :: pendiente de verificacion y evidencia
CHECK 023 :: pendiente de verificacion y evidencia
CHECK 024 :: pendiente de verificacion y evidencia
CHECK 025 :: pendiente de verificacion y evidencia
CHECK 026 :: pendiente de verificacion y evidencia
CHECK 027 :: pendiente de verificacion y evidencia
CHECK 028 :: pendiente de verificacion y evidencia
CHECK 029 :: pendiente de verificacion y evidencia
CHECK 030 :: pendiente de verificacion y evidencia
CHECK 031 :: pendiente de verificacion y evidencia
CHECK 032 :: pendiente de verificacion y evidencia
CHECK 033 :: pendiente de verificacion y evidencia
CHECK 034 :: pendiente de verificacion y evidencia
CHECK 035 :: pendiente de verificacion y evidencia
CHECK 036 :: pendiente de verificacion y evidencia
CHECK 037 :: pendiente de verificacion y evidencia
CHECK 038 :: pendiente de verificacion y evidencia
CHECK 039 :: pendiente de verificacion y evidencia
CHECK 040 :: pendiente de verificacion y evidencia
CHECK 041 :: pendiente de verificacion y evidencia
CHECK 042 :: pendiente de verificacion y evidencia
CHECK 043 :: pendiente de verificacion y evidencia
CHECK 044 :: pendiente de verificacion y evidencia
CHECK 045 :: pendiente de verificacion y evidencia
CHECK 046 :: pendiente de verificacion y evidencia
CHECK 047 :: pendiente de verificacion y evidencia
CHECK 048 :: pendiente de verificacion y evidencia
CHECK 049 :: pendiente de verificacion y evidencia
CHECK 050 :: pendiente de verificacion y evidencia
CHECK 051 :: pendiente de verificacion y evidencia
CHECK 052 :: pendiente de verificacion y evidencia
CHECK 053 :: pendiente de verificacion y evidencia
CHECK 054 :: pendiente de verificacion y evidencia
CHECK 055 :: pendiente de verificacion y evidencia
CHECK 056 :: pendiente de verificacion y evidencia
CHECK 057 :: pendiente de verificacion y evidencia
CHECK 058 :: pendiente de verificacion y evidencia
CHECK 059 :: pendiente de verificacion y evidencia
CHECK 060 :: pendiente de verificacion y evidencia
CHECK 061 :: pendiente de verificacion y evidencia
CHECK 062 :: pendiente de verificacion y evidencia
CHECK 063 :: pendiente de verificacion y evidencia
CHECK 064 :: pendiente de verificacion y evidencia
CHECK 065 :: pendiente de verificacion y evidencia
CHECK 066 :: pendiente de verificacion y evidencia
CHECK 067 :: pendiente de verificacion y evidencia
CHECK 068 :: pendiente de verificacion y evidencia
CHECK 069 :: pendiente de verificacion y evidencia
CHECK 070 :: pendiente de verificacion y evidencia
CHECK 071 :: pendiente de verificacion y evidencia
CHECK 072 :: pendiente de verificacion y evidencia
CHECK 073 :: pendiente de verificacion y evidencia
CHECK 074 :: pendiente de verificacion y evidencia
CHECK 075 :: pendiente de verificacion y evidencia
CHECK 076 :: pendiente de verificacion y evidencia
CHECK 077 :: pendiente de verificacion y evidencia
CHECK 078 :: pendiente de verificacion y evidencia
CHECK 079 :: pendiente de verificacion y evidencia
CHECK 080 :: pendiente de verificacion y evidencia
CHECK 081 :: pendiente de verificacion y evidencia
CHECK 082 :: pendiente de verificacion y evidencia
CHECK 083 :: pendiente de verificacion y evidencia
CHECK 084 :: pendiente de verificacion y evidencia
CHECK 085 :: pendiente de verificacion y evidencia
CHECK 086 :: pendiente de verificacion y evidencia
CHECK 087 :: pendiente de verificacion y evidencia
CHECK 088 :: pendiente de verificacion y evidencia
CHECK 089 :: pendiente de verificacion y evidencia
CHECK 090 :: pendiente de verificacion y evidencia
CHECK 091 :: pendiente de verificacion y evidencia
CHECK 092 :: pendiente de verificacion y evidencia
CHECK 093 :: pendiente de verificacion y evidencia
CHECK 094 :: pendiente de verificacion y evidencia
CHECK 095 :: pendiente de verificacion y evidencia
CHECK 096 :: pendiente de verificacion y evidencia
CHECK 097 :: pendiente de verificacion y evidencia
CHECK 098 :: pendiente de verificacion y evidencia
CHECK 099 :: pendiente de verificacion y evidencia
CHECK 100 :: pendiente de verificacion y evidencia
CHECK 101 :: pendiente de verificacion y evidencia
CHECK 102 :: pendiente de verificacion y evidencia
CHECK 103 :: pendiente de verificacion y evidencia
CHECK 104 :: pendiente de verificacion y evidencia
CHECK 105 :: pendiente de verificacion y evidencia
CHECK 106 :: pendiente de verificacion y evidencia
CHECK 107 :: pendiente de verificacion y evidencia
CHECK 108 :: pendiente de verificacion y evidencia
CHECK 109 :: pendiente de verificacion y evidencia
CHECK 110 :: pendiente de verificacion y evidencia
CHECK 111 :: pendiente de verificacion y evidencia
CHECK 112 :: pendiente de verificacion y evidencia
CHECK 113 :: pendiente de verificacion y evidencia
CHECK 114 :: pendiente de verificacion y evidencia
CHECK 115 :: pendiente de verificacion y evidencia
CHECK 116 :: pendiente de verificacion y evidencia
CHECK 117 :: pendiente de verificacion y evidencia
CHECK 118 :: pendiente de verificacion y evidencia
CHECK 119 :: pendiente de verificacion y evidencia
CHECK 120 :: pendiente de verificacion y evidencia
CHECK 121 :: pendiente de verificacion y evidencia
CHECK 122 :: pendiente de verificacion y evidencia
CHECK 123 :: pendiente de verificacion y evidencia
CHECK 124 :: pendiente de verificacion y evidencia
CHECK 125 :: pendiente de verificacion y evidencia
CHECK 126 :: pendiente de verificacion y evidencia
CHECK 127 :: pendiente de verificacion y evidencia
CHECK 128 :: pendiente de verificacion y evidencia
CHECK 129 :: pendiente de verificacion y evidencia
CHECK 130 :: pendiente de verificacion y evidencia
CHECK 131 :: pendiente de verificacion y evidencia
CHECK 132 :: pendiente de verificacion y evidencia
CHECK 133 :: pendiente de verificacion y evidencia
CHECK 134 :: pendiente de verificacion y evidencia
CHECK 135 :: pendiente de verificacion y evidencia
CHECK 136 :: pendiente de verificacion y evidencia
CHECK 137 :: pendiente de verificacion y evidencia
CHECK 138 :: pendiente de verificacion y evidencia
CHECK 139 :: pendiente de verificacion y evidencia
CHECK 140 :: pendiente de verificacion y evidencia
CHECK 141 :: pendiente de verificacion y evidencia
CHECK 142 :: pendiente de verificacion y evidencia
CHECK 143 :: pendiente de verificacion y evidencia
CHECK 144 :: pendiente de verificacion y evidencia
CHECK 145 :: pendiente de verificacion y evidencia
CHECK 146 :: pendiente de verificacion y evidencia
CHECK 147 :: pendiente de verificacion y evidencia
CHECK 148 :: pendiente de verificacion y evidencia
CHECK 149 :: pendiente de verificacion y evidencia
CHECK 150 :: pendiente de verificacion y evidencia
CHECK 151 :: pendiente de verificacion y evidencia
CHECK 152 :: pendiente de verificacion y evidencia
CHECK 153 :: pendiente de verificacion y evidencia
CHECK 154 :: pendiente de verificacion y evidencia
CHECK 155 :: pendiente de verificacion y evidencia
CHECK 156 :: pendiente de verificacion y evidencia
CHECK 157 :: pendiente de verificacion y evidencia
CHECK 158 :: pendiente de verificacion y evidencia
CHECK 159 :: pendiente de verificacion y evidencia
CHECK 160 :: pendiente de verificacion y evidencia
CHECK 161 :: pendiente de verificacion y evidencia
CHECK 162 :: pendiente de verificacion y evidencia
CHECK 163 :: pendiente de verificacion y evidencia
CHECK 164 :: pendiente de verificacion y evidencia
CHECK 165 :: pendiente de verificacion y evidencia
CHECK 166 :: pendiente de verificacion y evidencia
CHECK 167 :: pendiente de verificacion y evidencia
CHECK 168 :: pendiente de verificacion y evidencia
CHECK 169 :: pendiente de verificacion y evidencia
CHECK 170 :: pendiente de verificacion y evidencia
CHECK 171 :: pendiente de verificacion y evidencia
CHECK 172 :: pendiente de verificacion y evidencia
CHECK 173 :: pendiente de verificacion y evidencia
CHECK 174 :: pendiente de verificacion y evidencia
CHECK 175 :: pendiente de verificacion y evidencia
CHECK 176 :: pendiente de verificacion y evidencia
CHECK 177 :: pendiente de verificacion y evidencia
CHECK 178 :: pendiente de verificacion y evidencia
CHECK 179 :: pendiente de verificacion y evidencia
CHECK 180 :: pendiente de verificacion y evidencia
CHECK 181 :: pendiente de verificacion y evidencia
CHECK 182 :: pendiente de verificacion y evidencia
CHECK 183 :: pendiente de verificacion y evidencia
CHECK 184 :: pendiente de verificacion y evidencia
CHECK 185 :: pendiente de verificacion y evidencia
CHECK 186 :: pendiente de verificacion y evidencia
CHECK 187 :: pendiente de verificacion y evidencia
CHECK 188 :: pendiente de verificacion y evidencia
CHECK 189 :: pendiente de verificacion y evidencia
CHECK 190 :: pendiente de verificacion y evidencia
CHECK 191 :: pendiente de verificacion y evidencia
CHECK 192 :: pendiente de verificacion y evidencia
CHECK 193 :: pendiente de verificacion y evidencia
CHECK 194 :: pendiente de verificacion y evidencia
CHECK 195 :: pendiente de verificacion y evidencia
CHECK 196 :: pendiente de verificacion y evidencia
CHECK 197 :: pendiente de verificacion y evidencia
CHECK 198 :: pendiente de verificacion y evidencia
CHECK 199 :: pendiente de verificacion y evidencia
CHECK 200 :: pendiente de verificacion y evidencia
CHECK 201 :: pendiente de verificacion y evidencia
CHECK 202 :: pendiente de verificacion y evidencia
CHECK 203 :: pendiente de verificacion y evidencia
CHECK 204 :: pendiente de verificacion y evidencia
CHECK 205 :: pendiente de verificacion y evidencia
CHECK 206 :: pendiente de verificacion y evidencia
CHECK 207 :: pendiente de verificacion y evidencia
CHECK 208 :: pendiente de verificacion y evidencia
CHECK 209 :: pendiente de verificacion y evidencia
CHECK 210 :: pendiente de verificacion y evidencia
CHECK 211 :: pendiente de verificacion y evidencia
CHECK 212 :: pendiente de verificacion y evidencia
CHECK 213 :: pendiente de verificacion y evidencia
CHECK 214 :: pendiente de verificacion y evidencia
CHECK 215 :: pendiente de verificacion y evidencia
CHECK 216 :: pendiente de verificacion y evidencia
CHECK 217 :: pendiente de verificacion y evidencia
CHECK 218 :: pendiente de verificacion y evidencia
CHECK 219 :: pendiente de verificacion y evidencia
CHECK 220 :: pendiente de verificacion y evidencia
CHECK 221 :: pendiente de verificacion y evidencia
CHECK 222 :: pendiente de verificacion y evidencia
CHECK 223 :: pendiente de verificacion y evidencia
CHECK 224 :: pendiente de verificacion y evidencia
CHECK 225 :: pendiente de verificacion y evidencia
CHECK 226 :: pendiente de verificacion y evidencia
CHECK 227 :: pendiente de verificacion y evidencia
CHECK 228 :: pendiente de verificacion y evidencia
CHECK 229 :: pendiente de verificacion y evidencia
CHECK 230 :: pendiente de verificacion y evidencia
CHECK 231 :: pendiente de verificacion y evidencia
CHECK 232 :: pendiente de verificacion y evidencia
CHECK 233 :: pendiente de verificacion y evidencia
CHECK 234 :: pendiente de verificacion y evidencia
CHECK 235 :: pendiente de verificacion y evidencia
CHECK 236 :: pendiente de verificacion y evidencia
CHECK 237 :: pendiente de verificacion y evidencia
CHECK 238 :: pendiente de verificacion y evidencia
CHECK 239 :: pendiente de verificacion y evidencia
CHECK 240 :: pendiente de verificacion y evidencia
CHECK 241 :: pendiente de verificacion y evidencia
CHECK 242 :: pendiente de verificacion y evidencia
CHECK 243 :: pendiente de verificacion y evidencia
CHECK 244 :: pendiente de verificacion y evidencia
CHECK 245 :: pendiente de verificacion y evidencia
CHECK 246 :: pendiente de verificacion y evidencia
CHECK 247 :: pendiente de verificacion y evidencia
CHECK 248 :: pendiente de verificacion y evidencia
CHECK 249 :: pendiente de verificacion y evidencia
CHECK 250 :: pendiente de verificacion y evidencia
CHECK 251 :: pendiente de verificacion y evidencia
CHECK 252 :: pendiente de verificacion y evidencia
CHECK 253 :: pendiente de verificacion y evidencia
CHECK 254 :: pendiente de verificacion y evidencia
CHECK 255 :: pendiente de verificacion y evidencia
CHECK 256 :: pendiente de verificacion y evidencia
CHECK 257 :: pendiente de verificacion y evidencia
CHECK 258 :: pendiente de verificacion y evidencia
CHECK 259 :: pendiente de verificacion y evidencia
CHECK 260 :: pendiente de verificacion y evidencia
CHECK 261 :: pendiente de verificacion y evidencia
CHECK 262 :: pendiente de verificacion y evidencia
CHECK 263 :: pendiente de verificacion y evidencia
CHECK 264 :: pendiente de verificacion y evidencia
CHECK 265 :: pendiente de verificacion y evidencia
CHECK 266 :: pendiente de verificacion y evidencia
CHECK 267 :: pendiente de verificacion y evidencia
CHECK 268 :: pendiente de verificacion y evidencia
CHECK 269 :: pendiente de verificacion y evidencia
CHECK 270 :: pendiente de verificacion y evidencia
CHECK 271 :: pendiente de verificacion y evidencia
CHECK 272 :: pendiente de verificacion y evidencia
CHECK 273 :: pendiente de verificacion y evidencia
CHECK 274 :: pendiente de verificacion y evidencia
CHECK 275 :: pendiente de verificacion y evidencia
CHECK 276 :: pendiente de verificacion y evidencia
CHECK 277 :: pendiente de verificacion y evidencia
CHECK 278 :: pendiente de verificacion y evidencia
CHECK 279 :: pendiente de verificacion y evidencia
CHECK 280 :: pendiente de verificacion y evidencia
CHECK 281 :: pendiente de verificacion y evidencia
CHECK 282 :: pendiente de verificacion y evidencia
CHECK 283 :: pendiente de verificacion y evidencia
CHECK 284 :: pendiente de verificacion y evidencia
CHECK 285 :: pendiente de verificacion y evidencia
CHECK 286 :: pendiente de verificacion y evidencia
CHECK 287 :: pendiente de verificacion y evidencia
CHECK 288 :: pendiente de verificacion y evidencia
CHECK 289 :: pendiente de verificacion y evidencia
CHECK 290 :: pendiente de verificacion y evidencia
CHECK 291 :: pendiente de verificacion y evidencia
CHECK 292 :: pendiente de verificacion y evidencia
CHECK 293 :: pendiente de verificacion y evidencia
CHECK 294 :: pendiente de verificacion y evidencia
CHECK 295 :: pendiente de verificacion y evidencia
CHECK 296 :: pendiente de verificacion y evidencia
CHECK 297 :: pendiente de verificacion y evidencia
CHECK 298 :: pendiente de verificacion y evidencia
CHECK 299 :: pendiente de verificacion y evidencia
CHECK 300 :: pendiente de verificacion y evidencia
CHECK 301 :: pendiente de verificacion y evidencia
CHECK 302 :: pendiente de verificacion y evidencia
CHECK 303 :: pendiente de verificacion y evidencia
CHECK 304 :: pendiente de verificacion y evidencia
CHECK 305 :: pendiente de verificacion y evidencia
CHECK 306 :: pendiente de verificacion y evidencia
CHECK 307 :: pendiente de verificacion y evidencia
CHECK 308 :: pendiente de verificacion y evidencia
CHECK 309 :: pendiente de verificacion y evidencia
CHECK 310 :: pendiente de verificacion y evidencia
CHECK 311 :: pendiente de verificacion y evidencia
CHECK 312 :: pendiente de verificacion y evidencia
CHECK 313 :: pendiente de verificacion y evidencia
CHECK 314 :: pendiente de verificacion y evidencia
CHECK 315 :: pendiente de verificacion y evidencia
CHECK 316 :: pendiente de verificacion y evidencia
CHECK 317 :: pendiente de verificacion y evidencia
CHECK 318 :: pendiente de verificacion y evidencia
CHECK 319 :: pendiente de verificacion y evidencia
CHECK 320 :: pendiente de verificacion y evidencia
CHECK 321 :: pendiente de verificacion y evidencia
CHECK 322 :: pendiente de verificacion y evidencia
CHECK 323 :: pendiente de verificacion y evidencia
CHECK 324 :: pendiente de verificacion y evidencia
CHECK 325 :: pendiente de verificacion y evidencia
CHECK 326 :: pendiente de verificacion y evidencia
CHECK 327 :: pendiente de verificacion y evidencia
CHECK 328 :: pendiente de verificacion y evidencia
CHECK 329 :: pendiente de verificacion y evidencia
CHECK 330 :: pendiente de verificacion y evidencia
CHECK 331 :: pendiente de verificacion y evidencia
CHECK 332 :: pendiente de verificacion y evidencia
CHECK 333 :: pendiente de verificacion y evidencia
CHECK 334 :: pendiente de verificacion y evidencia
CHECK 335 :: pendiente de verificacion y evidencia
CHECK 336 :: pendiente de verificacion y evidencia
CHECK 337 :: pendiente de verificacion y evidencia
CHECK 338 :: pendiente de verificacion y evidencia
CHECK 339 :: pendiente de verificacion y evidencia
CHECK 340 :: pendiente de verificacion y evidencia
CHECK 341 :: pendiente de verificacion y evidencia
CHECK 342 :: pendiente de verificacion y evidencia
CHECK 343 :: pendiente de verificacion y evidencia
CHECK 344 :: pendiente de verificacion y evidencia
CHECK 345 :: pendiente de verificacion y evidencia
CHECK 346 :: pendiente de verificacion y evidencia
CHECK 347 :: pendiente de verificacion y evidencia
CHECK 348 :: pendiente de verificacion y evidencia
CHECK 349 :: pendiente de verificacion y evidencia
CHECK 350 :: pendiente de verificacion y evidencia
CHECK 351 :: pendiente de verificacion y evidencia
CHECK 352 :: pendiente de verificacion y evidencia
CHECK 353 :: pendiente de verificacion y evidencia
CHECK 354 :: pendiente de verificacion y evidencia
CHECK 355 :: pendiente de verificacion y evidencia
CHECK 356 :: pendiente de verificacion y evidencia
CHECK 357 :: pendiente de verificacion y evidencia
CHECK 358 :: pendiente de verificacion y evidencia
CHECK 359 :: pendiente de verificacion y evidencia
CHECK 360 :: pendiente de verificacion y evidencia
CHECK 361 :: pendiente de verificacion y evidencia
CHECK 362 :: pendiente de verificacion y evidencia
CHECK 363 :: pendiente de verificacion y evidencia
CHECK 364 :: pendiente de verificacion y evidencia
CHECK 365 :: pendiente de verificacion y evidencia
CHECK 366 :: pendiente de verificacion y evidencia
CHECK 367 :: pendiente de verificacion y evidencia
CHECK 368 :: pendiente de verificacion y evidencia
CHECK 369 :: pendiente de verificacion y evidencia
CHECK 370 :: pendiente de verificacion y evidencia
CHECK 371 :: pendiente de verificacion y evidencia
CHECK 372 :: pendiente de verificacion y evidencia
CHECK 373 :: pendiente de verificacion y evidencia
CHECK 374 :: pendiente de verificacion y evidencia
CHECK 375 :: pendiente de verificacion y evidencia
CHECK 376 :: pendiente de verificacion y evidencia
CHECK 377 :: pendiente de verificacion y evidencia
CHECK 378 :: pendiente de verificacion y evidencia
CHECK 379 :: pendiente de verificacion y evidencia
CHECK 380 :: pendiente de verificacion y evidencia
CHECK 381 :: pendiente de verificacion y evidencia
CHECK 382 :: pendiente de verificacion y evidencia
CHECK 383 :: pendiente de verificacion y evidencia
CHECK 384 :: pendiente de verificacion y evidencia
CHECK 385 :: pendiente de verificacion y evidencia
CHECK 386 :: pendiente de verificacion y evidencia
CHECK 387 :: pendiente de verificacion y evidencia
CHECK 388 :: pendiente de verificacion y evidencia
CHECK 389 :: pendiente de verificacion y evidencia
CHECK 390 :: pendiente de verificacion y evidencia
CHECK 391 :: pendiente de verificacion y evidencia
CHECK 392 :: pendiente de verificacion y evidencia
CHECK 393 :: pendiente de verificacion y evidencia
CHECK 394 :: pendiente de verificacion y evidencia
CHECK 395 :: pendiente de verificacion y evidencia
CHECK 396 :: pendiente de verificacion y evidencia
CHECK 397 :: pendiente de verificacion y evidencia
CHECK 398 :: pendiente de verificacion y evidencia
CHECK 399 :: pendiente de verificacion y evidencia
CHECK 400 :: pendiente de verificacion y evidencia
CHECK 401 :: pendiente de verificacion y evidencia
CHECK 402 :: pendiente de verificacion y evidencia
CHECK 403 :: pendiente de verificacion y evidencia
CHECK 404 :: pendiente de verificacion y evidencia
CHECK 405 :: pendiente de verificacion y evidencia
CHECK 406 :: pendiente de verificacion y evidencia
CHECK 407 :: pendiente de verificacion y evidencia
CHECK 408 :: pendiente de verificacion y evidencia
CHECK 409 :: pendiente de verificacion y evidencia
CHECK 410 :: pendiente de verificacion y evidencia
CHECK 411 :: pendiente de verificacion y evidencia
CHECK 412 :: pendiente de verificacion y evidencia
CHECK 413 :: pendiente de verificacion y evidencia
CHECK 414 :: pendiente de verificacion y evidencia
CHECK 415 :: pendiente de verificacion y evidencia
CHECK 416 :: pendiente de verificacion y evidencia
CHECK 417 :: pendiente de verificacion y evidencia
CHECK 418 :: pendiente de verificacion y evidencia
CHECK 419 :: pendiente de verificacion y evidencia
CHECK 420 :: pendiente de verificacion y evidencia
CHECK 421 :: pendiente de verificacion y evidencia
CHECK 422 :: pendiente de verificacion y evidencia
CHECK 423 :: pendiente de verificacion y evidencia
CHECK 424 :: pendiente de verificacion y evidencia
CHECK 425 :: pendiente de verificacion y evidencia
CHECK 426 :: pendiente de verificacion y evidencia
CHECK 427 :: pendiente de verificacion y evidencia
CHECK 428 :: pendiente de verificacion y evidencia
CHECK 429 :: pendiente de verificacion y evidencia
CHECK 430 :: pendiente de verificacion y evidencia
CHECK 431 :: pendiente de verificacion y evidencia
CHECK 432 :: pendiente de verificacion y evidencia
CHECK 433 :: pendiente de verificacion y evidencia
CHECK 434 :: pendiente de verificacion y evidencia
CHECK 435 :: pendiente de verificacion y evidencia
CHECK 436 :: pendiente de verificacion y evidencia
CHECK 437 :: pendiente de verificacion y evidencia
CHECK 438 :: pendiente de verificacion y evidencia
CHECK 439 :: pendiente de verificacion y evidencia
CHECK 440 :: pendiente de verificacion y evidencia
CHECK 441 :: pendiente de verificacion y evidencia
CHECK 442 :: pendiente de verificacion y evidencia
CHECK 443 :: pendiente de verificacion y evidencia
CHECK 444 :: pendiente de verificacion y evidencia
CHECK 445 :: pendiente de verificacion y evidencia
CHECK 446 :: pendiente de verificacion y evidencia
CHECK 447 :: pendiente de verificacion y evidencia
CHECK 448 :: pendiente de verificacion y evidencia
CHECK 449 :: pendiente de verificacion y evidencia
CHECK 450 :: pendiente de verificacion y evidencia
CHECK 451 :: pendiente de verificacion y evidencia
CHECK 452 :: pendiente de verificacion y evidencia
CHECK 453 :: pendiente de verificacion y evidencia
CHECK 454 :: pendiente de verificacion y evidencia
CHECK 455 :: pendiente de verificacion y evidencia
CHECK 456 :: pendiente de verificacion y evidencia
CHECK 457 :: pendiente de verificacion y evidencia
CHECK 458 :: pendiente de verificacion y evidencia
CHECK 459 :: pendiente de verificacion y evidencia
CHECK 460 :: pendiente de verificacion y evidencia
CHECK 461 :: pendiente de verificacion y evidencia
CHECK 462 :: pendiente de verificacion y evidencia
CHECK 463 :: pendiente de verificacion y evidencia
CHECK 464 :: pendiente de verificacion y evidencia
CHECK 465 :: pendiente de verificacion y evidencia
CHECK 466 :: pendiente de verificacion y evidencia
CHECK 467 :: pendiente de verificacion y evidencia
CHECK 468 :: pendiente de verificacion y evidencia
CHECK 469 :: pendiente de verificacion y evidencia
CHECK 470 :: pendiente de verificacion y evidencia
CHECK 471 :: pendiente de verificacion y evidencia
CHECK 472 :: pendiente de verificacion y evidencia
CHECK 473 :: pendiente de verificacion y evidencia
CHECK 474 :: pendiente de verificacion y evidencia
CHECK 475 :: pendiente de verificacion y evidencia
CHECK 476 :: pendiente de verificacion y evidencia
CHECK 477 :: pendiente de verificacion y evidencia
CHECK 478 :: pendiente de verificacion y evidencia
CHECK 479 :: pendiente de verificacion y evidencia
CHECK 480 :: pendiente de verificacion y evidencia
CHECK 481 :: pendiente de verificacion y evidencia
CHECK 482 :: pendiente de verificacion y evidencia
CHECK 483 :: pendiente de verificacion y evidencia
CHECK 484 :: pendiente de verificacion y evidencia
CHECK 485 :: pendiente de verificacion y evidencia
CHECK 486 :: pendiente de verificacion y evidencia
CHECK 487 :: pendiente de verificacion y evidencia
CHECK 488 :: pendiente de verificacion y evidencia
CHECK 489 :: pendiente de verificacion y evidencia
CHECK 490 :: pendiente de verificacion y evidencia
CHECK 491 :: pendiente de verificacion y evidencia
CHECK 492 :: pendiente de verificacion y evidencia
CHECK 493 :: pendiente de verificacion y evidencia
CHECK 494 :: pendiente de verificacion y evidencia
CHECK 495 :: pendiente de verificacion y evidencia
CHECK 496 :: pendiente de verificacion y evidencia
CHECK 497 :: pendiente de verificacion y evidencia
CHECK 498 :: pendiente de verificacion y evidencia
CHECK 499 :: pendiente de verificacion y evidencia
CHECK 500 :: pendiente de verificacion y evidencia
CHECK 501 :: pendiente de verificacion y evidencia
CHECK 502 :: pendiente de verificacion y evidencia
CHECK 503 :: pendiente de verificacion y evidencia
CHECK 504 :: pendiente de verificacion y evidencia
CHECK 505 :: pendiente de verificacion y evidencia
CHECK 506 :: pendiente de verificacion y evidencia
CHECK 507 :: pendiente de verificacion y evidencia
CHECK 508 :: pendiente de verificacion y evidencia
CHECK 509 :: pendiente de verificacion y evidencia
CHECK 510 :: pendiente de verificacion y evidencia
CHECK 511 :: pendiente de verificacion y evidencia
CHECK 512 :: pendiente de verificacion y evidencia
CHECK 513 :: pendiente de verificacion y evidencia
CHECK 514 :: pendiente de verificacion y evidencia
CHECK 515 :: pendiente de verificacion y evidencia
CHECK 516 :: pendiente de verificacion y evidencia
CHECK 517 :: pendiente de verificacion y evidencia
CHECK 518 :: pendiente de verificacion y evidencia
CHECK 519 :: pendiente de verificacion y evidencia
CHECK 520 :: pendiente de verificacion y evidencia
CHECK 521 :: pendiente de verificacion y evidencia
CHECK 522 :: pendiente de verificacion y evidencia
CHECK 523 :: pendiente de verificacion y evidencia
CHECK 524 :: pendiente de verificacion y evidencia
CHECK 525 :: pendiente de verificacion y evidencia
CHECK 526 :: pendiente de verificacion y evidencia
CHECK 527 :: pendiente de verificacion y evidencia
CHECK 528 :: pendiente de verificacion y evidencia
CHECK 529 :: pendiente de verificacion y evidencia
CHECK 530 :: pendiente de verificacion y evidencia
CHECK 531 :: pendiente de verificacion y evidencia
CHECK 532 :: pendiente de verificacion y evidencia
CHECK 533 :: pendiente de verificacion y evidencia
CHECK 534 :: pendiente de verificacion y evidencia
CHECK 535 :: pendiente de verificacion y evidencia
CHECK 536 :: pendiente de verificacion y evidencia
CHECK 537 :: pendiente de verificacion y evidencia
CHECK 538 :: pendiente de verificacion y evidencia
CHECK 539 :: pendiente de verificacion y evidencia
CHECK 540 :: pendiente de verificacion y evidencia
CHECK 541 :: pendiente de verificacion y evidencia
CHECK 542 :: pendiente de verificacion y evidencia
CHECK 543 :: pendiente de verificacion y evidencia
CHECK 544 :: pendiente de verificacion y evidencia
CHECK 545 :: pendiente de verificacion y evidencia
CHECK 546 :: pendiente de verificacion y evidencia
CHECK 547 :: pendiente de verificacion y evidencia
CHECK 548 :: pendiente de verificacion y evidencia
CHECK 549 :: pendiente de verificacion y evidencia
CHECK 550 :: pendiente de verificacion y evidencia
CHECK 551 :: pendiente de verificacion y evidencia
CHECK 552 :: pendiente de verificacion y evidencia
CHECK 553 :: pendiente de verificacion y evidencia
CHECK 554 :: pendiente de verificacion y evidencia
CHECK 555 :: pendiente de verificacion y evidencia
CHECK 556 :: pendiente de verificacion y evidencia
CHECK 557 :: pendiente de verificacion y evidencia
CHECK 558 :: pendiente de verificacion y evidencia
CHECK 559 :: pendiente de verificacion y evidencia
CHECK 560 :: pendiente de verificacion y evidencia
CHECK 561 :: pendiente de verificacion y evidencia
CHECK 562 :: pendiente de verificacion y evidencia
CHECK 563 :: pendiente de verificacion y evidencia
CHECK 564 :: pendiente de verificacion y evidencia
CHECK 565 :: pendiente de verificacion y evidencia
CHECK 566 :: pendiente de verificacion y evidencia
CHECK 567 :: pendiente de verificacion y evidencia
CHECK 568 :: pendiente de verificacion y evidencia
CHECK 569 :: pendiente de verificacion y evidencia
CHECK 570 :: pendiente de verificacion y evidencia
CHECK 571 :: pendiente de verificacion y evidencia
CHECK 572 :: pendiente de verificacion y evidencia
CHECK 573 :: pendiente de verificacion y evidencia
CHECK 574 :: pendiente de verificacion y evidencia
CHECK 575 :: pendiente de verificacion y evidencia
CHECK 576 :: pendiente de verificacion y evidencia
CHECK 577 :: pendiente de verificacion y evidencia
CHECK 578 :: pendiente de verificacion y evidencia
CHECK 579 :: pendiente de verificacion y evidencia
CHECK 580 :: pendiente de verificacion y evidencia
CHECK 581 :: pendiente de verificacion y evidencia
CHECK 582 :: pendiente de verificacion y evidencia
CHECK 583 :: pendiente de verificacion y evidencia
CHECK 584 :: pendiente de verificacion y evidencia
CHECK 585 :: pendiente de verificacion y evidencia
CHECK 586 :: pendiente de verificacion y evidencia
CHECK 587 :: pendiente de verificacion y evidencia
CHECK 588 :: pendiente de verificacion y evidencia
CHECK 589 :: pendiente de verificacion y evidencia
CHECK 590 :: pendiente de verificacion y evidencia
CHECK 591 :: pendiente de verificacion y evidencia
CHECK 592 :: pendiente de verificacion y evidencia
CHECK 593 :: pendiente de verificacion y evidencia
CHECK 594 :: pendiente de verificacion y evidencia
CHECK 595 :: pendiente de verificacion y evidencia
CHECK 596 :: pendiente de verificacion y evidencia
CHECK 597 :: pendiente de verificacion y evidencia
CHECK 598 :: pendiente de verificacion y evidencia
CHECK 599 :: pendiente de verificacion y evidencia
CHECK 600 :: pendiente de verificacion y evidencia
CHECK 601 :: pendiente de verificacion y evidencia
CHECK 602 :: pendiente de verificacion y evidencia
CHECK 603 :: pendiente de verificacion y evidencia
CHECK 604 :: pendiente de verificacion y evidencia
CHECK 605 :: pendiente de verificacion y evidencia
CHECK 606 :: pendiente de verificacion y evidencia
CHECK 607 :: pendiente de verificacion y evidencia
CHECK 608 :: pendiente de verificacion y evidencia
CHECK 609 :: pendiente de verificacion y evidencia
CHECK 610 :: pendiente de verificacion y evidencia
CHECK 611 :: pendiente de verificacion y evidencia
CHECK 612 :: pendiente de verificacion y evidencia
CHECK 613 :: pendiente de verificacion y evidencia
CHECK 614 :: pendiente de verificacion y evidencia
CHECK 615 :: pendiente de verificacion y evidencia
CHECK 616 :: pendiente de verificacion y evidencia
CHECK 617 :: pendiente de verificacion y evidencia
CHECK 618 :: pendiente de verificacion y evidencia
CHECK 619 :: pendiente de verificacion y evidencia
CHECK 620 :: pendiente de verificacion y evidencia
CHECK 621 :: pendiente de verificacion y evidencia
CHECK 622 :: pendiente de verificacion y evidencia
CHECK 623 :: pendiente de verificacion y evidencia
CHECK 624 :: pendiente de verificacion y evidencia
CHECK 625 :: pendiente de verificacion y evidencia
CHECK 626 :: pendiente de verificacion y evidencia
CHECK 627 :: pendiente de verificacion y evidencia
CHECK 628 :: pendiente de verificacion y evidencia
CHECK 629 :: pendiente de verificacion y evidencia
CHECK 630 :: pendiente de verificacion y evidencia
CHECK 631 :: pendiente de verificacion y evidencia
CHECK 632 :: pendiente de verificacion y evidencia
CHECK 633 :: pendiente de verificacion y evidencia
CHECK 634 :: pendiente de verificacion y evidencia
CHECK 635 :: pendiente de verificacion y evidencia
CHECK 636 :: pendiente de verificacion y evidencia
CHECK 637 :: pendiente de verificacion y evidencia
CHECK 638 :: pendiente de verificacion y evidencia
CHECK 639 :: pendiente de verificacion y evidencia
CHECK 640 :: pendiente de verificacion y evidencia
CHECK 641 :: pendiente de verificacion y evidencia
CHECK 642 :: pendiente de verificacion y evidencia
CHECK 643 :: pendiente de verificacion y evidencia
CHECK 644 :: pendiente de verificacion y evidencia
CHECK 645 :: pendiente de verificacion y evidencia
CHECK 646 :: pendiente de verificacion y evidencia
CHECK 647 :: pendiente de verificacion y evidencia
CHECK 648 :: pendiente de verificacion y evidencia
CHECK 649 :: pendiente de verificacion y evidencia
CHECK 650 :: pendiente de verificacion y evidencia
CHECK 651 :: pendiente de verificacion y evidencia
CHECK 652 :: pendiente de verificacion y evidencia
CHECK 653 :: pendiente de verificacion y evidencia
CHECK 654 :: pendiente de verificacion y evidencia
CHECK 655 :: pendiente de verificacion y evidencia
CHECK 656 :: pendiente de verificacion y evidencia
CHECK 657 :: pendiente de verificacion y evidencia
CHECK 658 :: pendiente de verificacion y evidencia
CHECK 659 :: pendiente de verificacion y evidencia
CHECK 660 :: pendiente de verificacion y evidencia
CHECK 661 :: pendiente de verificacion y evidencia
CHECK 662 :: pendiente de verificacion y evidencia
CHECK 663 :: pendiente de verificacion y evidencia
CHECK 664 :: pendiente de verificacion y evidencia
CHECK 665 :: pendiente de verificacion y evidencia
CHECK 666 :: pendiente de verificacion y evidencia
CHECK 667 :: pendiente de verificacion y evidencia
CHECK 668 :: pendiente de verificacion y evidencia
CHECK 669 :: pendiente de verificacion y evidencia
CHECK 670 :: pendiente de verificacion y evidencia
CHECK 671 :: pendiente de verificacion y evidencia
CHECK 672 :: pendiente de verificacion y evidencia
CHECK 673 :: pendiente de verificacion y evidencia
CHECK 674 :: pendiente de verificacion y evidencia
CHECK 675 :: pendiente de verificacion y evidencia
CHECK 676 :: pendiente de verificacion y evidencia
CHECK 677 :: pendiente de verificacion y evidencia
CHECK 678 :: pendiente de verificacion y evidencia
CHECK 679 :: pendiente de verificacion y evidencia
CHECK 680 :: pendiente de verificacion y evidencia
CHECK 681 :: pendiente de verificacion y evidencia
CHECK 682 :: pendiente de verificacion y evidencia
CHECK 683 :: pendiente de verificacion y evidencia
CHECK 684 :: pendiente de verificacion y evidencia
CHECK 685 :: pendiente de verificacion y evidencia
CHECK 686 :: pendiente de verificacion y evidencia
CHECK 687 :: pendiente de verificacion y evidencia
CHECK 688 :: pendiente de verificacion y evidencia
CHECK 689 :: pendiente de verificacion y evidencia
CHECK 690 :: pendiente de verificacion y evidencia
CHECK 691 :: pendiente de verificacion y evidencia
CHECK 692 :: pendiente de verificacion y evidencia
CHECK 693 :: pendiente de verificacion y evidencia
CHECK 694 :: pendiente de verificacion y evidencia
CHECK 695 :: pendiente de verificacion y evidencia
CHECK 696 :: pendiente de verificacion y evidencia
CHECK 697 :: pendiente de verificacion y evidencia
CHECK 698 :: pendiente de verificacion y evidencia
CHECK 699 :: pendiente de verificacion y evidencia
CHECK 700 :: pendiente de verificacion y evidencia
CHECK 701 :: pendiente de verificacion y evidencia
CHECK 702 :: pendiente de verificacion y evidencia
CHECK 703 :: pendiente de verificacion y evidencia
CHECK 704 :: pendiente de verificacion y evidencia
CHECK 705 :: pendiente de verificacion y evidencia
CHECK 706 :: pendiente de verificacion y evidencia
CHECK 707 :: pendiente de verificacion y evidencia
CHECK 708 :: pendiente de verificacion y evidencia
CHECK 709 :: pendiente de verificacion y evidencia
CHECK 710 :: pendiente de verificacion y evidencia
CHECK 711 :: pendiente de verificacion y evidencia
CHECK 712 :: pendiente de verificacion y evidencia
CHECK 713 :: pendiente de verificacion y evidencia
CHECK 714 :: pendiente de verificacion y evidencia
CHECK 715 :: pendiente de verificacion y evidencia
CHECK 716 :: pendiente de verificacion y evidencia
CHECK 717 :: pendiente de verificacion y evidencia
CHECK 718 :: pendiente de verificacion y evidencia
CHECK 719 :: pendiente de verificacion y evidencia
CHECK 720 :: pendiente de verificacion y evidencia
CHECK 721 :: pendiente de verificacion y evidencia
CHECK 722 :: pendiente de verificacion y evidencia
CHECK 723 :: pendiente de verificacion y evidencia
CHECK 724 :: pendiente de verificacion y evidencia
CHECK 725 :: pendiente de verificacion y evidencia
CHECK 726 :: pendiente de verificacion y evidencia
CHECK 727 :: pendiente de verificacion y evidencia
CHECK 728 :: pendiente de verificacion y evidencia
CHECK 729 :: pendiente de verificacion y evidencia
CHECK 730 :: pendiente de verificacion y evidencia
CHECK 731 :: pendiente de verificacion y evidencia
CHECK 732 :: pendiente de verificacion y evidencia
CHECK 733 :: pendiente de verificacion y evidencia
CHECK 734 :: pendiente de verificacion y evidencia
CHECK 735 :: pendiente de verificacion y evidencia
CHECK 736 :: pendiente de verificacion y evidencia
CHECK 737 :: pendiente de verificacion y evidencia
CHECK 738 :: pendiente de verificacion y evidencia
CHECK 739 :: pendiente de verificacion y evidencia
CHECK 740 :: pendiente de verificacion y evidencia
CHECK 741 :: pendiente de verificacion y evidencia
CHECK 742 :: pendiente de verificacion y evidencia
CHECK 743 :: pendiente de verificacion y evidencia
CHECK 744 :: pendiente de verificacion y evidencia
CHECK 745 :: pendiente de verificacion y evidencia
CHECK 746 :: pendiente de verificacion y evidencia
CHECK 747 :: pendiente de verificacion y evidencia
CHECK 748 :: pendiente de verificacion y evidencia
CHECK 749 :: pendiente de verificacion y evidencia
CHECK 750 :: pendiente de verificacion y evidencia
CHECK 751 :: pendiente de verificacion y evidencia
CHECK 752 :: pendiente de verificacion y evidencia
CHECK 753 :: pendiente de verificacion y evidencia
CHECK 754 :: pendiente de verificacion y evidencia
CHECK 755 :: pendiente de verificacion y evidencia
CHECK 756 :: pendiente de verificacion y evidencia
CHECK 757 :: pendiente de verificacion y evidencia
CHECK 758 :: pendiente de verificacion y evidencia
CHECK 759 :: pendiente de verificacion y evidencia
CHECK 760 :: pendiente de verificacion y evidencia
CHECK 761 :: pendiente de verificacion y evidencia
CHECK 762 :: pendiente de verificacion y evidencia
CHECK 763 :: pendiente de verificacion y evidencia
CHECK 764 :: pendiente de verificacion y evidencia
CHECK 765 :: pendiente de verificacion y evidencia
CHECK 766 :: pendiente de verificacion y evidencia
CHECK 767 :: pendiente de verificacion y evidencia
CHECK 768 :: pendiente de verificacion y evidencia
CHECK 769 :: pendiente de verificacion y evidencia
CHECK 770 :: pendiente de verificacion y evidencia
CHECK 771 :: pendiente de verificacion y evidencia
CHECK 772 :: pendiente de verificacion y evidencia
CHECK 773 :: pendiente de verificacion y evidencia
CHECK 774 :: pendiente de verificacion y evidencia
CHECK 775 :: pendiente de verificacion y evidencia
CHECK 776 :: pendiente de verificacion y evidencia
CHECK 777 :: pendiente de verificacion y evidencia
CHECK 778 :: pendiente de verificacion y evidencia
CHECK 779 :: pendiente de verificacion y evidencia
CHECK 780 :: pendiente de verificacion y evidencia
CHECK 781 :: pendiente de verificacion y evidencia
CHECK 782 :: pendiente de verificacion y evidencia
CHECK 783 :: pendiente de verificacion y evidencia
CHECK 784 :: pendiente de verificacion y evidencia
CHECK 785 :: pendiente de verificacion y evidencia
CHECK 786 :: pendiente de verificacion y evidencia
CHECK 787 :: pendiente de verificacion y evidencia
CHECK 788 :: pendiente de verificacion y evidencia
CHECK 789 :: pendiente de verificacion y evidencia
CHECK 790 :: pendiente de verificacion y evidencia
CHECK 791 :: pendiente de verificacion y evidencia
CHECK 792 :: pendiente de verificacion y evidencia
CHECK 793 :: pendiente de verificacion y evidencia
CHECK 794 :: pendiente de verificacion y evidencia
CHECK 795 :: pendiente de verificacion y evidencia
CHECK 796 :: pendiente de verificacion y evidencia
CHECK 797 :: pendiente de verificacion y evidencia
CHECK 798 :: pendiente de verificacion y evidencia
CHECK 799 :: pendiente de verificacion y evidencia
CHECK 800 :: pendiente de verificacion y evidencia
CHECK 801 :: pendiente de verificacion y evidencia
CHECK 802 :: pendiente de verificacion y evidencia
CHECK 803 :: pendiente de verificacion y evidencia
CHECK 804 :: pendiente de verificacion y evidencia
CHECK 805 :: pendiente de verificacion y evidencia
CHECK 806 :: pendiente de verificacion y evidencia
CHECK 807 :: pendiente de verificacion y evidencia
CHECK 808 :: pendiente de verificacion y evidencia
CHECK 809 :: pendiente de verificacion y evidencia
CHECK 810 :: pendiente de verificacion y evidencia
CHECK 811 :: pendiente de verificacion y evidencia
CHECK 812 :: pendiente de verificacion y evidencia
CHECK 813 :: pendiente de verificacion y evidencia
CHECK 814 :: pendiente de verificacion y evidencia
CHECK 815 :: pendiente de verificacion y evidencia
CHECK 816 :: pendiente de verificacion y evidencia
CHECK 817 :: pendiente de verificacion y evidencia
CHECK 818 :: pendiente de verificacion y evidencia
CHECK 819 :: pendiente de verificacion y evidencia
CHECK 820 :: pendiente de verificacion y evidencia
CHECK 821 :: pendiente de verificacion y evidencia
CHECK 822 :: pendiente de verificacion y evidencia
CHECK 823 :: pendiente de verificacion y evidencia
CHECK 824 :: pendiente de verificacion y evidencia
CHECK 825 :: pendiente de verificacion y evidencia
CHECK 826 :: pendiente de verificacion y evidencia
CHECK 827 :: pendiente de verificacion y evidencia
CHECK 828 :: pendiente de verificacion y evidencia
CHECK 829 :: pendiente de verificacion y evidencia
CHECK 830 :: pendiente de verificacion y evidencia
CHECK 831 :: pendiente de verificacion y evidencia
CHECK 832 :: pendiente de verificacion y evidencia
CHECK 833 :: pendiente de verificacion y evidencia
CHECK 834 :: pendiente de verificacion y evidencia
CHECK 835 :: pendiente de verificacion y evidencia
CHECK 836 :: pendiente de verificacion y evidencia
CHECK 837 :: pendiente de verificacion y evidencia
CHECK 838 :: pendiente de verificacion y evidencia
CHECK 839 :: pendiente de verificacion y evidencia
CHECK 840 :: pendiente de verificacion y evidencia
CHECK 841 :: pendiente de verificacion y evidencia
CHECK 842 :: pendiente de verificacion y evidencia
CHECK 843 :: pendiente de verificacion y evidencia
CHECK 844 :: pendiente de verificacion y evidencia
CHECK 845 :: pendiente de verificacion y evidencia
CHECK 846 :: pendiente de verificacion y evidencia
CHECK 847 :: pendiente de verificacion y evidencia
CHECK 848 :: pendiente de verificacion y evidencia
CHECK 849 :: pendiente de verificacion y evidencia
CHECK 850 :: pendiente de verificacion y evidencia
CHECK 851 :: pendiente de verificacion y evidencia
CHECK 852 :: pendiente de verificacion y evidencia
CHECK 853 :: pendiente de verificacion y evidencia
CHECK 854 :: pendiente de verificacion y evidencia
CHECK 855 :: pendiente de verificacion y evidencia
CHECK 856 :: pendiente de verificacion y evidencia
CHECK 857 :: pendiente de verificacion y evidencia
CHECK 858 :: pendiente de verificacion y evidencia
CHECK 859 :: pendiente de verificacion y evidencia
CHECK 860 :: pendiente de verificacion y evidencia
CHECK 861 :: pendiente de verificacion y evidencia
CHECK 862 :: pendiente de verificacion y evidencia
CHECK 863 :: pendiente de verificacion y evidencia
CHECK 864 :: pendiente de verificacion y evidencia
CHECK 865 :: pendiente de verificacion y evidencia
CHECK 866 :: pendiente de verificacion y evidencia
CHECK 867 :: pendiente de verificacion y evidencia
CHECK 868 :: pendiente de verificacion y evidencia
CHECK 869 :: pendiente de verificacion y evidencia
CHECK 870 :: pendiente de verificacion y evidencia
CHECK 871 :: pendiente de verificacion y evidencia
CHECK 872 :: pendiente de verificacion y evidencia
CHECK 873 :: pendiente de verificacion y evidencia
CHECK 874 :: pendiente de verificacion y evidencia
CHECK 875 :: pendiente de verificacion y evidencia
CHECK 876 :: pendiente de verificacion y evidencia
CHECK 877 :: pendiente de verificacion y evidencia
CHECK 878 :: pendiente de verificacion y evidencia
CHECK 879 :: pendiente de verificacion y evidencia
CHECK 880 :: pendiente de verificacion y evidencia
CHECK 881 :: pendiente de verificacion y evidencia
CHECK 882 :: pendiente de verificacion y evidencia
CHECK 883 :: pendiente de verificacion y evidencia
CHECK 884 :: pendiente de verificacion y evidencia
CHECK 885 :: pendiente de verificacion y evidencia
CHECK 886 :: pendiente de verificacion y evidencia
CHECK 887 :: pendiente de verificacion y evidencia
CHECK 888 :: pendiente de verificacion y evidencia
CHECK 889 :: pendiente de verificacion y evidencia
CHECK 890 :: pendiente de verificacion y evidencia
CHECK 891 :: pendiente de verificacion y evidencia
CHECK 892 :: pendiente de verificacion y evidencia
CHECK 893 :: pendiente de verificacion y evidencia
CHECK 894 :: pendiente de verificacion y evidencia
CHECK 895 :: pendiente de verificacion y evidencia
CHECK 896 :: pendiente de verificacion y evidencia
CHECK 897 :: pendiente de verificacion y evidencia
CHECK 898 :: pendiente de verificacion y evidencia
CHECK 899 :: pendiente de verificacion y evidencia
CHECK 900 :: pendiente de verificacion y evidencia
CHECK 901 :: pendiente de verificacion y evidencia
CHECK 902 :: pendiente de verificacion y evidencia
CHECK 903 :: pendiente de verificacion y evidencia
CHECK 904 :: pendiente de verificacion y evidencia
CHECK 905 :: pendiente de verificacion y evidencia
CHECK 906 :: pendiente de verificacion y evidencia
CHECK 907 :: pendiente de verificacion y evidencia
CHECK 908 :: pendiente de verificacion y evidencia
CHECK 909 :: pendiente de verificacion y evidencia
CHECK 910 :: pendiente de verificacion y evidencia
CHECK 911 :: pendiente de verificacion y evidencia
CHECK 912 :: pendiente de verificacion y evidencia
CHECK 913 :: pendiente de verificacion y evidencia
CHECK 914 :: pendiente de verificacion y evidencia
CHECK 915 :: pendiente de verificacion y evidencia
CHECK 916 :: pendiente de verificacion y evidencia
CHECK 917 :: pendiente de verificacion y evidencia
CHECK 918 :: pendiente de verificacion y evidencia
CHECK 919 :: pendiente de verificacion y evidencia
CHECK 920 :: pendiente de verificacion y evidencia
CHECK 921 :: pendiente de verificacion y evidencia
CHECK 922 :: pendiente de verificacion y evidencia
CHECK 923 :: pendiente de verificacion y evidencia
CHECK 924 :: pendiente de verificacion y evidencia
CHECK 925 :: pendiente de verificacion y evidencia
CHECK 926 :: pendiente de verificacion y evidencia
CHECK 927 :: pendiente de verificacion y evidencia
CHECK 928 :: pendiente de verificacion y evidencia
CHECK 929 :: pendiente de verificacion y evidencia
CHECK 930 :: pendiente de verificacion y evidencia
CHECK 931 :: pendiente de verificacion y evidencia
CHECK 932 :: pendiente de verificacion y evidencia
CHECK 933 :: pendiente de verificacion y evidencia
CHECK 934 :: pendiente de verificacion y evidencia
CHECK 935 :: pendiente de verificacion y evidencia
CHECK 936 :: pendiente de verificacion y evidencia
CHECK 937 :: pendiente de verificacion y evidencia
CHECK 938 :: pendiente de verificacion y evidencia
CHECK 939 :: pendiente de verificacion y evidencia
CHECK 940 :: pendiente de verificacion y evidencia
CHECK 941 :: pendiente de verificacion y evidencia
CHECK 942 :: pendiente de verificacion y evidencia
CHECK 943 :: pendiente de verificacion y evidencia
CHECK 944 :: pendiente de verificacion y evidencia
CHECK 945 :: pendiente de verificacion y evidencia
CHECK 946 :: pendiente de verificacion y evidencia
CHECK 947 :: pendiente de verificacion y evidencia
CHECK 948 :: pendiente de verificacion y evidencia
CHECK 949 :: pendiente de verificacion y evidencia
CHECK 950 :: pendiente de verificacion y evidencia
CHECK 951 :: pendiente de verificacion y evidencia
CHECK 952 :: pendiente de verificacion y evidencia
CHECK 953 :: pendiente de verificacion y evidencia
CHECK 954 :: pendiente de verificacion y evidencia
CHECK 955 :: pendiente de verificacion y evidencia
CHECK 956 :: pendiente de verificacion y evidencia
CHECK 957 :: pendiente de verificacion y evidencia
CHECK 958 :: pendiente de verificacion y evidencia
CHECK 959 :: pendiente de verificacion y evidencia
CHECK 960 :: pendiente de verificacion y evidencia
CHECK 961 :: pendiente de verificacion y evidencia
CHECK 962 :: pendiente de verificacion y evidencia
CHECK 963 :: pendiente de verificacion y evidencia
CHECK 964 :: pendiente de verificacion y evidencia
CHECK 965 :: pendiente de verificacion y evidencia
CHECK 966 :: pendiente de verificacion y evidencia
CHECK 967 :: pendiente de verificacion y evidencia
CHECK 968 :: pendiente de verificacion y evidencia
CHECK 969 :: pendiente de verificacion y evidencia
CHECK 970 :: pendiente de verificacion y evidencia
CHECK 971 :: pendiente de verificacion y evidencia
CHECK 972 :: pendiente de verificacion y evidencia
CHECK 973 :: pendiente de verificacion y evidencia
CHECK 974 :: pendiente de verificacion y evidencia
CHECK 975 :: pendiente de verificacion y evidencia
CHECK 976 :: pendiente de verificacion y evidencia
CHECK 977 :: pendiente de verificacion y evidencia
CHECK 978 :: pendiente de verificacion y evidencia
CHECK 979 :: pendiente de verificacion y evidencia
CHECK 980 :: pendiente de verificacion y evidencia
CHECK 981 :: pendiente de verificacion y evidencia
CHECK 982 :: pendiente de verificacion y evidencia
CHECK 983 :: pendiente de verificacion y evidencia
CHECK 984 :: pendiente de verificacion y evidencia
CHECK 985 :: pendiente de verificacion y evidencia
CHECK 986 :: pendiente de verificacion y evidencia
CHECK 987 :: pendiente de verificacion y evidencia
CHECK 988 :: pendiente de verificacion y evidencia
CHECK 989 :: pendiente de verificacion y evidencia
CHECK 990 :: pendiente de verificacion y evidencia
CHECK 991 :: pendiente de verificacion y evidencia
CHECK 992 :: pendiente de verificacion y evidencia
CHECK 993 :: pendiente de verificacion y evidencia
CHECK 994 :: pendiente de verificacion y evidencia
CHECK 995 :: pendiente de verificacion y evidencia
CHECK 996 :: pendiente de verificacion y evidencia
CHECK 997 :: pendiente de verificacion y evidencia
CHECK 998 :: pendiente de verificacion y evidencia
CHECK 999 :: pendiente de verificacion y evidencia
CHECK 1000 :: pendiente de verificacion y evidencia
CHECK 1001 :: pendiente de verificacion y evidencia
CHECK 1002 :: pendiente de verificacion y evidencia
CHECK 1003 :: pendiente de verificacion y evidencia
CHECK 1004 :: pendiente de verificacion y evidencia
CHECK 1005 :: pendiente de verificacion y evidencia
CHECK 1006 :: pendiente de verificacion y evidencia
CHECK 1007 :: pendiente de verificacion y evidencia
CHECK 1008 :: pendiente de verificacion y evidencia
CHECK 1009 :: pendiente de verificacion y evidencia
CHECK 1010 :: pendiente de verificacion y evidencia
CHECK 1011 :: pendiente de verificacion y evidencia
CHECK 1012 :: pendiente de verificacion y evidencia
CHECK 1013 :: pendiente de verificacion y evidencia
CHECK 1014 :: pendiente de verificacion y evidencia
CHECK 1015 :: pendiente de verificacion y evidencia
CHECK 1016 :: pendiente de verificacion y evidencia
CHECK 1017 :: pendiente de verificacion y evidencia
CHECK 1018 :: pendiente de verificacion y evidencia
CHECK 1019 :: pendiente de verificacion y evidencia
CHECK 1020 :: pendiente de verificacion y evidencia
CHECK 1021 :: pendiente de verificacion y evidencia
CHECK 1022 :: pendiente de verificacion y evidencia
CHECK 1023 :: pendiente de verificacion y evidencia
CHECK 1024 :: pendiente de verificacion y evidencia
CHECK 1025 :: pendiente de verificacion y evidencia
CHECK 1026 :: pendiente de verificacion y evidencia
CHECK 1027 :: pendiente de verificacion y evidencia
CHECK 1028 :: pendiente de verificacion y evidencia
CHECK 1029 :: pendiente de verificacion y evidencia
CHECK 1030 :: pendiente de verificacion y evidencia
CHECK 1031 :: pendiente de verificacion y evidencia
CHECK 1032 :: pendiente de verificacion y evidencia
CHECK 1033 :: pendiente de verificacion y evidencia
CHECK 1034 :: pendiente de verificacion y evidencia
CHECK 1035 :: pendiente de verificacion y evidencia
CHECK 1036 :: pendiente de verificacion y evidencia
CHECK 1037 :: pendiente de verificacion y evidencia
CHECK 1038 :: pendiente de verificacion y evidencia
CHECK 1039 :: pendiente de verificacion y evidencia
CHECK 1040 :: pendiente de verificacion y evidencia
CHECK 1041 :: pendiente de verificacion y evidencia
CHECK 1042 :: pendiente de verificacion y evidencia
CHECK 1043 :: pendiente de verificacion y evidencia
CHECK 1044 :: pendiente de verificacion y evidencia
CHECK 1045 :: pendiente de verificacion y evidencia
CHECK 1046 :: pendiente de verificacion y evidencia
CHECK 1047 :: pendiente de verificacion y evidencia
CHECK 1048 :: pendiente de verificacion y evidencia
CHECK 1049 :: pendiente de verificacion y evidencia
CHECK 1050 :: pendiente de verificacion y evidencia
CHECK 1051 :: pendiente de verificacion y evidencia
CHECK 1052 :: pendiente de verificacion y evidencia
CHECK 1053 :: pendiente de verificacion y evidencia
CHECK 1054 :: pendiente de verificacion y evidencia
CHECK 1055 :: pendiente de verificacion y evidencia
CHECK 1056 :: pendiente de verificacion y evidencia
CHECK 1057 :: pendiente de verificacion y evidencia
CHECK 1058 :: pendiente de verificacion y evidencia
CHECK 1059 :: pendiente de verificacion y evidencia
CHECK 1060 :: pendiente de verificacion y evidencia
CHECK 1061 :: pendiente de verificacion y evidencia
CHECK 1062 :: pendiente de verificacion y evidencia
CHECK 1063 :: pendiente de verificacion y evidencia
CHECK 1064 :: pendiente de verificacion y evidencia
CHECK 1065 :: pendiente de verificacion y evidencia
CHECK 1066 :: pendiente de verificacion y evidencia
CHECK 1067 :: pendiente de verificacion y evidencia
CHECK 1068 :: pendiente de verificacion y evidencia
CHECK 1069 :: pendiente de verificacion y evidencia
CHECK 1070 :: pendiente de verificacion y evidencia
CHECK 1071 :: pendiente de verificacion y evidencia
CHECK 1072 :: pendiente de verificacion y evidencia
CHECK 1073 :: pendiente de verificacion y evidencia
CHECK 1074 :: pendiente de verificacion y evidencia
CHECK 1075 :: pendiente de verificacion y evidencia
CHECK 1076 :: pendiente de verificacion y evidencia
CHECK 1077 :: pendiente de verificacion y evidencia
CHECK 1078 :: pendiente de verificacion y evidencia
CHECK 1079 :: pendiente de verificacion y evidencia
CHECK 1080 :: pendiente de verificacion y evidencia
CHECK 1081 :: pendiente de verificacion y evidencia
CHECK 1082 :: pendiente de verificacion y evidencia
CHECK 1083 :: pendiente de verificacion y evidencia
CHECK 1084 :: pendiente de verificacion y evidencia
CHECK 1085 :: pendiente de verificacion y evidencia
CHECK 1086 :: pendiente de verificacion y evidencia
CHECK 1087 :: pendiente de verificacion y evidencia
CHECK 1088 :: pendiente de verificacion y evidencia
CHECK 1089 :: pendiente de verificacion y evidencia
CHECK 1090 :: pendiente de verificacion y evidencia
CHECK 1091 :: pendiente de verificacion y evidencia
CHECK 1092 :: pendiente de verificacion y evidencia
CHECK 1093 :: pendiente de verificacion y evidencia
CHECK 1094 :: pendiente de verificacion y evidencia
CHECK 1095 :: pendiente de verificacion y evidencia
CHECK 1096 :: pendiente de verificacion y evidencia
CHECK 1097 :: pendiente de verificacion y evidencia
CHECK 1098 :: pendiente de verificacion y evidencia
CHECK 1099 :: pendiente de verificacion y evidencia
CHECK 1100 :: pendiente de verificacion y evidencia
CHECK 1101 :: pendiente de verificacion y evidencia
CHECK 1102 :: pendiente de verificacion y evidencia
CHECK 1103 :: pendiente de verificacion y evidencia
CHECK 1104 :: pendiente de verificacion y evidencia
CHECK 1105 :: pendiente de verificacion y evidencia
CHECK 1106 :: pendiente de verificacion y evidencia
CHECK 1107 :: pendiente de verificacion y evidencia
CHECK 1108 :: pendiente de verificacion y evidencia
CHECK 1109 :: pendiente de verificacion y evidencia
CHECK 1110 :: pendiente de verificacion y evidencia
CHECK 1111 :: pendiente de verificacion y evidencia
CHECK 1112 :: pendiente de verificacion y evidencia
CHECK 1113 :: pendiente de verificacion y evidencia
CHECK 1114 :: pendiente de verificacion y evidencia
CHECK 1115 :: pendiente de verificacion y evidencia
CHECK 1116 :: pendiente de verificacion y evidencia
CHECK 1117 :: pendiente de verificacion y evidencia
CHECK 1118 :: pendiente de verificacion y evidencia
CHECK 1119 :: pendiente de verificacion y evidencia
CHECK 1120 :: pendiente de verificacion y evidencia
CHECK 1121 :: pendiente de verificacion y evidencia
CHECK 1122 :: pendiente de verificacion y evidencia
CHECK 1123 :: pendiente de verificacion y evidencia
CHECK 1124 :: pendiente de verificacion y evidencia
CHECK 1125 :: pendiente de verificacion y evidencia
CHECK 1126 :: pendiente de verificacion y evidencia
CHECK 1127 :: pendiente de verificacion y evidencia
CHECK 1128 :: pendiente de verificacion y evidencia
CHECK 1129 :: pendiente de verificacion y evidencia
CHECK 1130 :: pendiente de verificacion y evidencia
CHECK 1131 :: pendiente de verificacion y evidencia
CHECK 1132 :: pendiente de verificacion y evidencia
CHECK 1133 :: pendiente de verificacion y evidencia
CHECK 1134 :: pendiente de verificacion y evidencia
CHECK 1135 :: pendiente de verificacion y evidencia
CHECK 1136 :: pendiente de verificacion y evidencia
CHECK 1137 :: pendiente de verificacion y evidencia
CHECK 1138 :: pendiente de verificacion y evidencia
CHECK 1139 :: pendiente de verificacion y evidencia
CHECK 1140 :: pendiente de verificacion y evidencia
CHECK 1141 :: pendiente de verificacion y evidencia
CHECK 1142 :: pendiente de verificacion y evidencia
CHECK 1143 :: pendiente de verificacion y evidencia
CHECK 1144 :: pendiente de verificacion y evidencia
CHECK 1145 :: pendiente de verificacion y evidencia
CHECK 1146 :: pendiente de verificacion y evidencia
CHECK 1147 :: pendiente de verificacion y evidencia
CHECK 1148 :: pendiente de verificacion y evidencia
CHECK 1149 :: pendiente de verificacion y evidencia
CHECK 1150 :: pendiente de verificacion y evidencia
CHECK 1151 :: pendiente de verificacion y evidencia
CHECK 1152 :: pendiente de verificacion y evidencia
CHECK 1153 :: pendiente de verificacion y evidencia
CHECK 1154 :: pendiente de verificacion y evidencia
CHECK 1155 :: pendiente de verificacion y evidencia
CHECK 1156 :: pendiente de verificacion y evidencia
CHECK 1157 :: pendiente de verificacion y evidencia
CHECK 1158 :: pendiente de verificacion y evidencia
CHECK 1159 :: pendiente de verificacion y evidencia
CHECK 1160 :: pendiente de verificacion y evidencia
CHECK 1161 :: pendiente de verificacion y evidencia
CHECK 1162 :: pendiente de verificacion y evidencia
CHECK 1163 :: pendiente de verificacion y evidencia
CHECK 1164 :: pendiente de verificacion y evidencia
CHECK 1165 :: pendiente de verificacion y evidencia
CHECK 1166 :: pendiente de verificacion y evidencia
CHECK 1167 :: pendiente de verificacion y evidencia
CHECK 1168 :: pendiente de verificacion y evidencia
CHECK 1169 :: pendiente de verificacion y evidencia
CHECK 1170 :: pendiente de verificacion y evidencia
CHECK 1171 :: pendiente de verificacion y evidencia
CHECK 1172 :: pendiente de verificacion y evidencia
CHECK 1173 :: pendiente de verificacion y evidencia
CHECK 1174 :: pendiente de verificacion y evidencia
CHECK 1175 :: pendiente de verificacion y evidencia
CHECK 1176 :: pendiente de verificacion y evidencia
CHECK 1177 :: pendiente de verificacion y evidencia
CHECK 1178 :: pendiente de verificacion y evidencia
CHECK 1179 :: pendiente de verificacion y evidencia
CHECK 1180 :: pendiente de verificacion y evidencia
CHECK 1181 :: pendiente de verificacion y evidencia
CHECK 1182 :: pendiente de verificacion y evidencia
CHECK 1183 :: pendiente de verificacion y evidencia
CHECK 1184 :: pendiente de verificacion y evidencia
CHECK 1185 :: pendiente de verificacion y evidencia
CHECK 1186 :: pendiente de verificacion y evidencia
CHECK 1187 :: pendiente de verificacion y evidencia
CHECK 1188 :: pendiente de verificacion y evidencia
CHECK 1189 :: pendiente de verificacion y evidencia
CHECK 1190 :: pendiente de verificacion y evidencia
CHECK 1191 :: pendiente de verificacion y evidencia
CHECK 1192 :: pendiente de verificacion y evidencia
CHECK 1193 :: pendiente de verificacion y evidencia
CHECK 1194 :: pendiente de verificacion y evidencia
CHECK 1195 :: pendiente de verificacion y evidencia
CHECK 1196 :: pendiente de verificacion y evidencia
CHECK 1197 :: pendiente de verificacion y evidencia
CHECK 1198 :: pendiente de verificacion y evidencia
CHECK 1199 :: pendiente de verificacion y evidencia
CHECK 1200 :: pendiente de verificacion y evidencia
