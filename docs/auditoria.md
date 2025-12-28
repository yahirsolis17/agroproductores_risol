diff --git a/docs/fuente_de_la_verdad.md b/docs/fuente_de_la_verdad.md
new file mode 100644
index 0000000000000000000000000000000000000000..d8b47f899085e541a83eaa3ea0afc71c88a7eafb
--- /dev/null
+++ b/docs/fuente_de_la_verdad.md
@@ -0,0 +1,722 @@
+# Fuente de la Verdad — Auditoría y Plan Maestro
+
+> Documento canónico y definitivo para la auditoría total del sistema.
+> **Todo el trabajo futuro debe derivar de este archivo.**
+
+---
+
+# 0) Canon Global (contratos únicos)
+
+## 0.1 Canon API (Backend → Frontend)
+* `response.success`
+* `response.notification`
+* `response.data.results: T[]`
+* `response.data.meta: PaginationMeta`
+* Errores: `response.data.errors` (único canal)
+
+## 0.2 Canon State (Redux)
+* Listas: `items`, `meta`, `loading`, `error`, `page`, `filters`, `estado`
+* Detalle: `current` o `byId` (solo uno)
+
+## 0.3 Canon Hooks
+* `items, meta, loading, error`
+* `page, setPage`
+* `filters, setFilters`
+* `estado, setEstado` (si aplica)
+* `refetch()`
+
+## 0.4 Canon UI
+* Alias permitidos solo en UI: `const huertas = items;`
+* Prohibido exponer `huertas`/`ventas`/`cosechas` en hooks o slices
+
+---
+
+# 1) Plan de Acción Definitivo (macro)
+
+## 1.1 Fase Global (obligatoria)
+* Unificar `PaginationMeta` en un único módulo global de tipos.
+* Unificar `FilterType` (solo `autocomplete-async`).
+* Normalizar respuestas backend a `NotificationHandler` + `data.results/meta`.
+* Erradicar bifurcaciones de errores: UI solo lee `data.errors`.
+
+## 1.2 Fase por Módulo (orden fijo)
+* `gestion_usuarios` → `gestion_huerta` → `gestion_bodega`
+
+## 1.3 Fase por Entidad (dentro de cada módulo)
+* Services → Hooks → Slice/State → Pages → Components → Tests
+
+---
+
+# 2) Auditoría completa por archivo (fuente única)
+
+> Para cada archivo: anotar estado, hallazgo y acción exacta.
+
+## 2.1 Backend (todos los archivos)
+
+* `backend/agroproductores_risol/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/asgi.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/settings.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/utils/pagination.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/wsgi.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0002_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/excel_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/pdf_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/semanal_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/temporada_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/tests.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/cache_keys.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/kpis.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/reporting.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/semana.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/bodegas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/camiones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/cierres_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/compras_madera_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/consumibles_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/empaques_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/inventarios_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/pedidos_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/recepciones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/reporte_semanal_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/reporte_temporada_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/tablero_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion/excel_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion/pdf_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/cosecha_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/perfil_huerta_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/temporada_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes_produccion_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/custom_filters.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/custom_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/form_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/formatting_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/number_filters.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_bloqueos_estado.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_huerta_delete.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_model_validations.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_permissions_archive_restore.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_temporada_delete_rules.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/tests.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/cache_keys.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/reporting.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/search_mixin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/categoria_inversion_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/cosechas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/huerta_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/inversiones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/cosecha_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/perfil_huerta_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/temporada_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/temporadas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/ventas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/commands/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/commands/prune_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/commands/rebuild_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/permissions_policy.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/signals.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_activity_validators.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_change_password.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_login.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_user_crud.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_utils_extra.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_validators_utils.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/perm_utils.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/validators.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/token_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/user_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/user_views.py.segment.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/huerta_registration.log` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/manage.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/requirements.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+
+## 2.2 Frontend (todos los archivos en src)
+
+* `frontend/src/App.css` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/App.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/assets/react.svg` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/AppDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/ErrorBoundary.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/IfRole.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/LazyRoutes.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/PermissionButton.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/PrivateRoute.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/RoleGuard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/TableLayout.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/common/Unauthorized.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/layout/Footer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/layout/MainLayout.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/components/layout/Navbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/api/apiClient.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/constants/breadcrumbRoutes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/constants/navItems.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/routes/AppRouter.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/routes/moduleRoutes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/authSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/bodegasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/breadcrumbsSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/capturasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/categoriaInversionSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/cierresSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/cosechasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/empaquesSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/huertaRentadaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/huertaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/huertasCombinadasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/inversionesSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/propietariosSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/store.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/tableroBodegaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/temporadaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/temporadabodegaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/userSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/store/ventasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/utils/NotificationEngine.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/utils/date.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/global/utils/formatters.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/index.css` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/main.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useBodegas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useCamiones.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useCapturas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useCierres.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useGastos.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useInventarios.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/usePedidos.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Bodegas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Capturas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Empaque.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Gastos.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Inventarios.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Logistica.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Reportes.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/pages/Temporadas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/bodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/camionesService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/capturasService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/cierresService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/empaquesService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/gastosService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/inventarioService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/pedidosService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/camionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/shared.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/utils/format.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_bodega/utils/hotkeys.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useCosechas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useHuertas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useInversiones.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/hooks/useVentas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/Cosechas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/Huertas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/Inversion.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/Propietarios.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/Temporadas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/pages/Venta.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/cosechaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/huertaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/inversionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/propietarioService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/temporadaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/services/ventaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/shared.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/hooks/useUsers.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/Login.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/Profile.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/Register.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/services/authService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/services/permisoService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/services/userService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/modules/gestion_usuarios/types/userTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/theme.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+* `frontend/src/vite-env.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Acción: validar items/meta, hooks, servicios, errores y filtros.
+
+# 3) Matriz por módulo y entidad (backend)
+
+## 3.1 gestion_usuarios
+### Role
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CustomUserManager
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Users
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### RegistroActividad
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+## 3.2 gestion_huerta
+### Propietario
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Huerta
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### HuertaRentada
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Temporada
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CategoriaInversion
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Cosecha
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### InversionesHuerta
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Venta
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+## 3.3 gestion_bodega
+### Material
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CalidadMadera
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CalidadPlastico
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### EstadoPedido
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### EstadoCamion
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### TimeStampedModel
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Bodega
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### TemporadaBodega
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Cliente
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Recepcion
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### ClasificacionEmpaque
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### InventarioPlastico
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### MovimientoPlastico
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CompraMadera
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### AbonoMadera
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Pedido
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### PedidoRenglon
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### SurtidoRenglon
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CamionSalida
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CamionItem
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### Consumible
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+### CierreSemanal
+* Contrato list (`results/meta`): [ ]
+* Contrato detail (`data` único): [ ]
+* Errores `data.errors`: [ ]
+* Permisos canónicos: [ ]
+* Soft-delete: [ ]
+
+# 4) Matriz por módulo y entidad (frontend)
+
+## 4.1 gestion_usuarios
+* Services: [ ] Hook: [ ] Slice: [ ] Pages: [ ] Components: [ ]
+
+## 4.2 gestion_huerta
+* Services: [ ] Hook: [ ] Slice: [ ] Pages: [ ] Components: [ ]
+
+## 4.3 gestion_bodega
+* Services: [ ] Hook: [ ] Slice: [ ] Pages: [ ] Components: [ ]
+
+# 5) Evidencia mínima por hallazgo
+* Archivo exacto
+* Hallazgo
+* Evidencia (comando + línea)
+* Acción propuesta
+* Estado final
+
+# 6) Comandos de verificación (gates)
+```bash
+python backend/manage.py check
+cd frontend
+npm run build
+npm run lint
+cd ..
+rg -n "data\.(huertas|cosechas|ventas|inversiones|propietarios|temporadas|categorias)" frontend/src
+rg -n "backend\.errors|(^|\W)errors\s*:|data\?\.(errors)|e\.response\.data\.errors" frontend/src
+rg -n "async-select|autocomplete-async" frontend/src
+rg -n "meta\.(page_size|total_pages|next|previous)|total_registradas" frontend/src/modules
+rg -n "get_paginated_response\(" backend/gestion_huerta
+rg -n "return Response\(|HttpResponse\(" backend/gestion_huerta
+```
+

diff --git a/docs/mega_hiper_informe_sistema.md b/docs/mega_hiper_informe_sistema.md
new file mode 100644
index 0000000000000000000000000000000000000000..c7c22f6e69807856138ace071b5f2e9eb9c798ab
--- /dev/null
+++ b/docs/mega_hiper_informe_sistema.md
@@ -0,0 +1,2802 @@
+# Mega Hiper Informe del Sistema Agroproductores Risol
+
+> Documento maestro de arquitectura, contratos y auditoría del sistema.
+> Elaborado para servir como fuente única de referencia y seguimiento de avances.
+
+---
+
+# 0) Canon del Sistema (la ley única)
+
+## 0.1 Canon API (Backend → Frontend)
+
+### Listados (paginados/filtrados)
+
+**Siempre:**
+
+* `response.success`
+* `response.notification`
+* `response.data.results: T[]`
+* `response.data.meta: PaginationMeta`
+
+**PaginationMeta (base):**
+
+* `count, next, previous, page, page_size, total_pages`
+
+### Detalle / acciones (create/update/archive/restore/delete)
+
+**Siempre:**
+
+* `response.success`
+* `response.notification`
+* `response.data` (shape consistente; ideal: `data: { item: T }` o `data: T`, pero uno solo)
+
+### Errores de validación (formularios)
+
+**Siempre:**
+
+* `response.data.errors` (y nada de `backend.errors` o `errors` plano en UI)
+
+### Extras
+
+* Si alguna entidad requiere un extra (ej. `total_registradas` de Cosechas):
+* **No se mete “ad-hoc” en `meta`** salvo que lo oficialices como excepción documentada.
+* Mejor estándar: `response.data.extra = { ... }` (no contamina paginación).
+
+---
+
+## 0.2 Canon State (Redux)
+
+### Para cualquier LISTA:
+
+* `items: T[]`
+* `meta: PaginationMeta`
+* `loading / error`
+* `page`
+* `filters`
+* `estado` (si aplica: activos/archivados/todos)
+
+**Prohibido** guardar en el estado cosas tipo:
+
+* `huertas`, `ventas`, `cosechas` como array principal, porque crea alias/bifurcación.
+* La UI puede llamarlo “Huertas”, pero el estado canónico de listas es `items`.
+
+### Para DETALLE:
+
+* `current: T | null` o `byId: Record<number, T>` (lo que elijas, pero uno solo)
+
+---
+
+## 0.3 Canon Hooks
+
+Un hook de lista expone siempre:
+
+* `items, meta, loading, error`
+* `page, setPage`
+* `filters, setFilters`
+* `estado, setEstado` (si aplica)
+* `refetch()`
+
+---
+
+## 0.4 Canon UI
+
+* La UI (pages/components) puede crear alias “humanos”:
+  * `const huertas = items;`
+* Eso **NO** es bifurcación, es legibilidad.
+* La bifurcación es cuando unas pantallas consumen `items` y otras consumen `huertas` desde el hook/slice.
+
+---
+
+# 1) Contexto de `items` vs `huertas`
+
+Desde el momento en que definiste:
+
+* **Contrato canónico** `data.results/meta` (listados)
+* **Estado canónico** “lista genérica” = `items/meta`
+
+Regla correcta:
+
+* En el **slice/hook**: `items`
+* En la **page**: `const huertas = items;` si quieres legibilidad
+
+---
+
+# 2) Inventario Global del Sistema
+
+## 2.1 Raíz del repositorio
+
+* `AUDITORIA_SISTEMA.md`
+
+## 2.2 Backend (Django)
+
+### 2.2.1 Apps principales
+
+* `gestion_huerta`
+* `gestion_bodega`
+* `gestion_usuarios`
+
+### 2.2.2 Modelos clave por app
+
+#### gestion_huerta/models.py
+* `Propietario`
+* `Huerta`
+* `HuertaRentada`
+* `Temporada`
+* `CategoriaInversion`
+* `Cosecha`
+* `InversionesHuerta`
+* `Venta`
+
+#### gestion_bodega/models.py
+* `Material`
+* `CalidadMadera`
+* `CalidadPlastico`
+* `EstadoPedido`
+* `EstadoCamion`
+* `TimeStampedModel`
+* `Bodega`
+* `TemporadaBodega`
+* `Cliente`
+* `Recepcion`
+* `ClasificacionEmpaque`
+* `InventarioPlastico`
+* `MovimientoPlastico`
+* `CompraMadera`
+* `AbonoMadera`
+* `Pedido`
+* `PedidoRenglon`
+* `SurtidoRenglon`
+* `CamionSalida`
+* `CamionItem`
+* `Consumible`
+* `CierreSemanal`
+
+#### gestion_usuarios/models.py
+* `Role`
+* `CustomUserManager`
+* `Users`
+* `RegistroActividad`
+
+### 2.2.3 Capas Backend por app
+
+Cada app sigue el patrón:
+
+* `models.py` → Entidades y reglas de negocio de bajo nivel
+* `serializers.py` → Contratos de API / validación de datos
+* `views/` → Endpoints por entidad y acciones
+* `services/` → Lógica de aplicación y casos de uso
+* `permissions.py` → Mapa de permisos
+* `urls.py` → Router principal
+* `utils/` → Helpers reutilizables
+* `tests/` → Unit tests / integración
+
+### 2.2.4 Inventario exhaustivo de archivos Backend
+
+* `backend/.coverage`
+* `backend/agroproductores_risol/__init__.py`
+* `backend/agroproductores_risol/__pycache__/__init__.cpython-312.pyc`
+* `backend/agroproductores_risol/__pycache__/celery.cpython-312.pyc`
+* `backend/agroproductores_risol/__pycache__/settings.cpython-312.pyc`
+* `backend/agroproductores_risol/__pycache__/urls.cpython-312.pyc`
+* `backend/agroproductores_risol/__pycache__/wsgi.cpython-312.pyc`
+* `backend/agroproductores_risol/asgi.py`
+* `backend/agroproductores_risol/estructura_limpia.txt`
+* `backend/agroproductores_risol/settings.py`
+* `backend/agroproductores_risol/urls.py` | tipo: core
+* `backend/agroproductores_risol/utils/__pycache__/paginated_notify.cpython-312.pyc`
+* `backend/agroproductores_risol/utils/__pycache__/pagination.cpython-312.pyc`
+* `backend/agroproductores_risol/utils/pagination.py`
+* `backend/agroproductores_risol/wsgi.py`
+* `backend/estructura_limpia.txt`
+* `backend/gestion_bodega/__init__.py`
+* `backend/gestion_bodega/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/admin.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/apps.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/models.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/permissions.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/serializers.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/tests.cpython-312.pyc` | tipo: tests
+* `backend/gestion_bodega/__pycache__/urls.cpython-312.pyc`
+* `backend/gestion_bodega/__pycache__/views.cpython-312.pyc`
+* `backend/gestion_bodega/admin.py` | tipo: core
+* `backend/gestion_bodega/apps.py`
+* `backend/gestion_bodega/estructura_limpia.txt`
+* `backend/gestion_bodega/migrations/0001_initial.py` | tipo: migration
+* `backend/gestion_bodega/migrations/0002_initial.py` | tipo: migration
+* `backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py` | tipo: migration
+* `backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py` | tipo: migration
+* `backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py` | tipo: migration
+* `backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py` | tipo: migration
+* `backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py` | tipo: migration
+* `backend/gestion_bodega/migrations/__init__.py` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0001_initial.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0002_camionitem_camionsalida_clasificacionempaque_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0002_initial.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0003_alter_temporadabodega_unique_together_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0003_cliente_temporadabodega_alter_abonomadera_options_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0004_alter_cierresemanal_options_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0005_clasificacionempaque_semana_recepcion_semana.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/migrations/__pycache__/__init__.cpython-312.pyc` | tipo: migration
+* `backend/gestion_bodega/models.py` | tipo: core
+* `backend/gestion_bodega/permissions.py` | tipo: core
+* `backend/gestion_bodega/serializers.py` | tipo: core
+* `backend/gestion_bodega/services/__init__.py`
+* `backend/gestion_bodega/services/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/services/exportacion/__init__.py`
+* `backend/gestion_bodega/services/exportacion/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/services/exportacion/excel_exporter.py`
+* `backend/gestion_bodega/services/exportacion/pdf_exporter.py`
+* `backend/gestion_bodega/services/reportes/__init__.py`
+* `backend/gestion_bodega/services/reportes/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/services/reportes/__pycache__/semanal_service.cpython-312.pyc`
+* `backend/gestion_bodega/services/reportes/__pycache__/temporada_service.cpython-312.pyc`
+* `backend/gestion_bodega/services/reportes/semanal_service.py`
+* `backend/gestion_bodega/services/reportes/temporada_service.py`
+* `backend/gestion_bodega/tests.py` | tipo: tests
+* `backend/gestion_bodega/urls.py` | tipo: core
+* `backend/gestion_bodega/utils/__init__.py`
+* `backend/gestion_bodega/utils/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/activity.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/audit.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/constants.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/kpis.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/notification_handler.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/reporting.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/semana.cpython-312.pyc`
+* `backend/gestion_bodega/utils/__pycache__/validators.cpython-312.pyc`
+* `backend/gestion_bodega/utils/activity.py`
+* `backend/gestion_bodega/utils/audit.py`
+* `backend/gestion_bodega/utils/cache_keys.py`
+* `backend/gestion_bodega/utils/constants.py`
+* `backend/gestion_bodega/utils/kpis.py`
+* `backend/gestion_bodega/utils/notification_handler.py`
+* `backend/gestion_bodega/utils/reporting.py`
+* `backend/gestion_bodega/utils/semana.py`
+* `backend/gestion_bodega/utils/throttles.py`
+* `backend/gestion_bodega/views/__init__.py`
+* `backend/gestion_bodega/views/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/bodegas_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/camiones_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/cierres_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/compras_madera_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/consumibles_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/empaques_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/inventarios_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/pedidos_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/recepciones_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/__pycache__/tablero_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/bodegas_views.py`
+* `backend/gestion_bodega/views/camiones_views.py`
+* `backend/gestion_bodega/views/cierres_views.py`
+* `backend/gestion_bodega/views/compras_madera_views.py`
+* `backend/gestion_bodega/views/consumibles_views.py`
+* `backend/gestion_bodega/views/empaques_views.py`
+* `backend/gestion_bodega/views/inventarios_views.py`
+* `backend/gestion_bodega/views/pedidos_views.py`
+* `backend/gestion_bodega/views/recepciones_views.py`
+* `backend/gestion_bodega/views/reportes/__init__.py`
+* `backend/gestion_bodega/views/reportes/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_bodega/views/reportes/__pycache__/reporte_semanal_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/reportes/__pycache__/reporte_temporada_views.cpython-312.pyc`
+* `backend/gestion_bodega/views/reportes/reporte_semanal_views.py`
+* `backend/gestion_bodega/views/reportes/reporte_temporada_views.py`
+* `backend/gestion_bodega/views/tablero_views.py`
+* `backend/gestion_huerta/__init__.py`
+* `backend/gestion_huerta/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/admin.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/apps.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/models.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/permissions.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/serializers.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/tasks.cpython-312.pyc`
+* `backend/gestion_huerta/__pycache__/tests.cpython-312.pyc` | tipo: tests
+* `backend/gestion_huerta/__pycache__/urls.cpython-312.pyc`
+* `backend/gestion_huerta/admin.py` | tipo: core
+* `backend/gestion_huerta/apps.py`
+* `backend/gestion_huerta/estructura_limpia.txt`
+* `backend/gestion_huerta/migrations/0001_initial.py` | tipo: migration
+* `backend/gestion_huerta/migrations/__init__.py` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0001_initial.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0002_alter_cosecha_options_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0003_inversioneshuerta_archivado_en_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0004_categoriainversion_archivado_en_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0005_alter_categoriainversion_options_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0006_alter_huerta_unique_together_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0007_alter_propietario_options_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0008_cosecha_gestion_hue_tempora_23249d_idx_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0009_venta_huerta_rentada_alter_venta_huerta.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0010_cosecha_archivado_por_cascada_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0011_alter_categoriainversion_nombre.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0012_alter_propietario_telefono.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0013_seed_extra_permissions.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/0014_alter_huerta_options_alter_huertarentada_options_and_more.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/migrations/__pycache__/__init__.cpython-312.pyc` | tipo: migration
+* `backend/gestion_huerta/models.py` | tipo: core
+* `backend/gestion_huerta/permissions.py` | tipo: core
+* `backend/gestion_huerta/serializers.py` | tipo: core
+* `backend/gestion_huerta/services/__pycache__/exportacion_service.cpython-312.pyc`
+* `backend/gestion_huerta/services/__pycache__/reportes_produccion_service.cpython-312.pyc`
+* `backend/gestion_huerta/services/exportacion/__pycache__/excel_exporter.cpython-312.pyc`
+* `backend/gestion_huerta/services/exportacion/__pycache__/pdf_exporter.cpython-312.pyc`
+* `backend/gestion_huerta/services/exportacion/excel_exporter.py`
+* `backend/gestion_huerta/services/exportacion/pdf_exporter.py`
+* `backend/gestion_huerta/services/exportacion_service.py`
+* `backend/gestion_huerta/services/reportes/__pycache__/cosecha_service.cpython-312.pyc`
+* `backend/gestion_huerta/services/reportes/__pycache__/perfil_huerta_service.cpython-312.pyc`
+* `backend/gestion_huerta/services/reportes/__pycache__/temporada_service.cpython-312.pyc`
+* `backend/gestion_huerta/services/reportes/cosecha_service.py`
+* `backend/gestion_huerta/services/reportes/perfil_huerta_service.py`
+* `backend/gestion_huerta/services/reportes/temporada_service.py`
+* `backend/gestion_huerta/services/reportes_produccion_service.py`
+* `backend/gestion_huerta/templatetags/__init__.py`
+* `backend/gestion_huerta/templatetags/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_huerta/templatetags/__pycache__/custom_filters.cpython-312.pyc`
+* `backend/gestion_huerta/templatetags/__pycache__/custom_tags.cpython-312.pyc`
+* `backend/gestion_huerta/templatetags/__pycache__/form_tags.cpython-312.pyc`
+* `backend/gestion_huerta/templatetags/__pycache__/formatting_tags.cpython-312.pyc`
+* `backend/gestion_huerta/templatetags/__pycache__/number_filters.cpython-312.pyc`
+* `backend/gestion_huerta/templatetags/custom_filters.py`
+* `backend/gestion_huerta/templatetags/custom_tags.py`
+* `backend/gestion_huerta/templatetags/form_tags.py`
+* `backend/gestion_huerta/templatetags/formatting_tags.py`
+* `backend/gestion_huerta/templatetags/number_filters.py`
+* `backend/gestion_huerta/test/__init__.py`
+* `backend/gestion_huerta/test/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_huerta/test/__pycache__/test_bloqueos_estado.cpython-312.pyc` | tipo: tests
+* `backend/gestion_huerta/test/__pycache__/test_huerta_delete.cpython-312.pyc` | tipo: tests
+* `backend/gestion_huerta/test/__pycache__/test_model_validations.cpython-312.pyc` | tipo: tests
+* `backend/gestion_huerta/test/__pycache__/test_permissions_archive_restore.cpython-312.pyc` | tipo: tests
+* `backend/gestion_huerta/test/__pycache__/test_temporada_delete_rules.cpython-312.pyc` | tipo: tests
+* `backend/gestion_huerta/test/test_bloqueos_estado.py` | tipo: tests
+* `backend/gestion_huerta/test/test_huerta_delete.py` | tipo: tests
+* `backend/gestion_huerta/test/test_model_validations.py` | tipo: tests
+* `backend/gestion_huerta/test/test_permissions_archive_restore.py` | tipo: tests
+* `backend/gestion_huerta/test/test_temporada_delete_rules.py` | tipo: tests
+* `backend/gestion_huerta/tests.py` | tipo: tests
+* `backend/gestion_huerta/urls.py` | tipo: core
+* `backend/gestion_huerta/utils/__init__.py`
+* `backend/gestion_huerta/utils/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/activity.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/audit.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/cache_keys.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/constants.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/notification_handler.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/reporting.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/search_mixin.cpython-312.pyc`
+* `backend/gestion_huerta/utils/__pycache__/storage.cpython-312.pyc`
+* `backend/gestion_huerta/utils/activity.py`
+* `backend/gestion_huerta/utils/audit.py`
+* `backend/gestion_huerta/utils/cache_keys.py`
+* `backend/gestion_huerta/utils/constants.py`
+* `backend/gestion_huerta/utils/notification_handler.py`
+* `backend/gestion_huerta/utils/reporting.py`
+* `backend/gestion_huerta/utils/search_mixin.py`
+* `backend/gestion_huerta/utils/throttles.py`
+* `backend/gestion_huerta/views/__init__.py`
+* `backend/gestion_huerta/views/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/categoria_inversion_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/cosechas_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/huerta_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/informes_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/inversiones_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/registro_actividad.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/reportes_produccion_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/temporadas_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/__pycache__/ventas_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/categoria_inversion_views.py`
+* `backend/gestion_huerta/views/cosechas_views.py`
+* `backend/gestion_huerta/views/huerta_views.py`
+* `backend/gestion_huerta/views/inversiones_views.py`
+* `backend/gestion_huerta/views/reportes/__pycache__/cosecha_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/reportes/__pycache__/perfil_huerta_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/reportes/__pycache__/reportes_utils_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/reportes/__pycache__/temporada_views.cpython-312.pyc`
+* `backend/gestion_huerta/views/reportes/cosecha_views.py`
+* `backend/gestion_huerta/views/reportes/perfil_huerta_views.py`
+* `backend/gestion_huerta/views/reportes/temporada_views.py`
+* `backend/gestion_huerta/views/temporadas_views.py`
+* `backend/gestion_huerta/views/ventas_views.py`
+* `backend/gestion_usuarios/__init__.py`
+* `backend/gestion_usuarios/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/admin.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/apps.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/models.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/permissions.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/permissions_policy.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/serializers.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/signals.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/urls.cpython-312.pyc`
+* `backend/gestion_usuarios/__pycache__/validators.cpython-312.pyc`
+* `backend/gestion_usuarios/admin.py` | tipo: core
+* `backend/gestion_usuarios/apps.py`
+* `backend/gestion_usuarios/estructura_limpia.txt`
+* `backend/gestion_usuarios/management/__init__.py`
+* `backend/gestion_usuarios/management/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_usuarios/management/commands/__init__.py`
+* `backend/gestion_usuarios/management/commands/prune_permissions.py`
+* `backend/gestion_usuarios/management/commands/rebuild_permissions.py`
+* `backend/gestion_usuarios/migrations/0001_initial.py` | tipo: migration
+* `backend/gestion_usuarios/migrations/__init__.py` | tipo: migration
+* `backend/gestion_usuarios/migrations/__pycache__/0001_initial.cpython-312.pyc` | tipo: migration
+* `backend/gestion_usuarios/migrations/__pycache__/__init__.cpython-312.pyc` | tipo: migration
+* `backend/gestion_usuarios/models.py` | tipo: core
+* `backend/gestion_usuarios/permissions.py` | tipo: core
+* `backend/gestion_usuarios/permissions_policy.py`
+* `backend/gestion_usuarios/serializers.py` | tipo: core
+* `backend/gestion_usuarios/signals.py`
+* `backend/gestion_usuarios/test/__init__.py`
+* `backend/gestion_usuarios/test/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_usuarios/test/__pycache__/test_activity_validators.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_change_password.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_login.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_models.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_permissions.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_serializers.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_user_crud.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_utils_extra.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/__pycache__/test_validators_utils.cpython-312.pyc` | tipo: tests
+* `backend/gestion_usuarios/test/test_activity_validators.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_change_password.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_login.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_models.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_permissions.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_serializers.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_user_crud.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_utils_extra.py` | tipo: tests
+* `backend/gestion_usuarios/test/test_validators_utils.py` | tipo: tests
+* `backend/gestion_usuarios/urls.py` | tipo: core
+* `backend/gestion_usuarios/utils/__init__.py`
+* `backend/gestion_usuarios/utils/__pycache__/__init__.cpython-312.pyc`
+* `backend/gestion_usuarios/utils/__pycache__/activity.cpython-312.pyc`
+* `backend/gestion_usuarios/utils/__pycache__/audit.cpython-312.pyc`
+* `backend/gestion_usuarios/utils/__pycache__/constants.cpython-312.pyc`
+* `backend/gestion_usuarios/utils/__pycache__/notification_handler.cpython-312.pyc`
+* `backend/gestion_usuarios/utils/__pycache__/throttles.cpython-312.pyc`
+* `backend/gestion_usuarios/utils/activity.py`
+* `backend/gestion_usuarios/utils/audit.py`
+* `backend/gestion_usuarios/utils/constants.py`
+* `backend/gestion_usuarios/utils/notification_handler.py`
+* `backend/gestion_usuarios/utils/perm_utils.py`
+* `backend/gestion_usuarios/utils/throttles.py`
+* `backend/gestion_usuarios/validators.py`
+* `backend/gestion_usuarios/views/__pycache__/user_views.cpython-312.pyc`
+* `backend/gestion_usuarios/views/token_views.py`
+* `backend/gestion_usuarios/views/user_views.py`
+* `backend/gestion_usuarios/views/user_views.py.segment.txt`
+* `backend/huerta_registration.log`
+* `backend/manage.py`
+* `backend/requirements.txt`
+
+## 2.3 Frontend (React + Vite)
+
+### 2.3.1 Estructura principal
+
+* `src/App.tsx` → Enrutamiento/estructura base
+* `src/main.tsx` → Entrada de la app
+* `src/components/` → Componentes reutilizables globales
+* `src/global/` → Tipos/constantes comunes
+* `src/modules/` → Módulos de negocio por dominio
+
+### 2.3.2 Inventario de módulos frontend
+
+* `gestion_huerta`
+* `gestion_bodega`
+* `gestion_usuarios`
+
+### 2.3.3 Inventario exhaustivo de archivos Frontend (src)
+
+* `frontend/src/App.css` | tipo: styles
+* `frontend/src/App.tsx` | tipo: component/page
+* `frontend/src/assets/react.svg`
+* `frontend/src/components/common/AppDrawer.tsx` | tipo: component/page
+* `frontend/src/components/common/ErrorBoundary.tsx` | tipo: component/page
+* `frontend/src/components/common/IfRole.tsx` | tipo: component/page
+* `frontend/src/components/common/LazyRoutes.tsx` | tipo: component/page
+* `frontend/src/components/common/PermissionButton.tsx` | tipo: component/page
+* `frontend/src/components/common/PrivateRoute.tsx` | tipo: component/page
+* `frontend/src/components/common/RoleGuard.tsx` | tipo: component/page
+* `frontend/src/components/common/TableLayout.tsx` | tipo: component/page
+* `frontend/src/components/common/Unauthorized.tsx` | tipo: component/page
+* `frontend/src/components/layout/Footer.tsx` | tipo: component/page
+* `frontend/src/components/layout/MainLayout.tsx` | tipo: component/page
+* `frontend/src/components/layout/Navbar.tsx` | tipo: component/page
+* `frontend/src/estructura_limpia.txt`
+* `frontend/src/global/api/apiClient.ts` | tipo: util/types
+* `frontend/src/global/constants/breadcrumbRoutes.ts` | tipo: util/types
+* `frontend/src/global/constants/navItems.ts` | tipo: util/types
+* `frontend/src/global/routes/AppRouter.tsx` | tipo: component/page
+* `frontend/src/global/routes/moduleRoutes.ts` | tipo: util/types
+* `frontend/src/global/store/authSlice.ts` | tipo: util/types
+* `frontend/src/global/store/bodegasSlice.ts` | tipo: util/types
+* `frontend/src/global/store/breadcrumbsSlice.ts` | tipo: util/types
+* `frontend/src/global/store/capturasSlice.ts` | tipo: util/types
+* `frontend/src/global/store/categoriaInversionSlice.ts` | tipo: util/types
+* `frontend/src/global/store/cierresSlice.ts` | tipo: util/types
+* `frontend/src/global/store/cosechasSlice.ts` | tipo: util/types
+* `frontend/src/global/store/empaquesSlice.ts` | tipo: util/types
+* `frontend/src/global/store/huertaRentadaSlice.ts` | tipo: util/types
+* `frontend/src/global/store/huertaSlice.ts` | tipo: util/types
+* `frontend/src/global/store/huertasCombinadasSlice.ts` | tipo: util/types
+* `frontend/src/global/store/inversionesSlice.ts` | tipo: util/types
+* `frontend/src/global/store/propietariosSlice.ts` | tipo: util/types
+* `frontend/src/global/store/store.ts` | tipo: util/types
+* `frontend/src/global/store/tableroBodegaSlice.ts` | tipo: util/types
+* `frontend/src/global/store/temporadaSlice.ts` | tipo: util/types
+* `frontend/src/global/store/temporadabodegaSlice.ts` | tipo: util/types
+* `frontend/src/global/store/userSlice.ts` | tipo: util/types
+* `frontend/src/global/store/ventasSlice.ts` | tipo: util/types
+* `frontend/src/global/utils/NotificationEngine.ts` | tipo: util/types
+* `frontend/src/global/utils/date.ts` | tipo: util/types
+* `frontend/src/global/utils/formatters.ts` | tipo: util/types
+* `frontend/src/index.css` | tipo: styles
+* `frontend/src/main.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/estructura_limpia.txt`
+* `frontend/src/modules/gestion_bodega/hooks/useBodegas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useCamiones.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useCapturas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useCierres.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useGastos.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useInventarios.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/usePedidos.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/pages/Bodegas.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Capturas.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Empaque.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Gastos.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Inventarios.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Logistica.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Reportes.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/pages/Temporadas.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_bodega/services/bodegaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/camionesService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/capturasService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/cierresService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/empaquesService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/gastosService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/inventarioService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/pedidosService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/camionTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/shared.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/utils/format.ts` | tipo: util/types
+* `frontend/src/modules/gestion_bodega/utils/hotkeys.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/estructura_limpia.txt`
+* `frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useCosechas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useHuertas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useInversiones.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/hooks/useVentas.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/pages/Cosechas.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/Huertas.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/Inversion.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/Propietarios.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/Temporadas.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/pages/Venta.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/cosechaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/huertaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/inversionService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/propietarioService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/temporadaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/services/ventaService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/shared.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts` | tipo: util/types
+* `frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/estructura_limpia.txt`
+* `frontend/src/modules/gestion_usuarios/hooks/useUsers.ts` | tipo: util/types
+* `frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/Login.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/Profile.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/Register.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx` | tipo: component/page
+* `frontend/src/modules/gestion_usuarios/services/authService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_usuarios/services/permisoService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_usuarios/services/userService.ts` | tipo: util/types
+* `frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts` | tipo: util/types
+* `frontend/src/modules/gestion_usuarios/types/userTypes.d.ts` | tipo: util/types
+* `frontend/src/theme.ts` | tipo: util/types
+* `frontend/src/vite-env.d.ts` | tipo: util/types
+
+# 3) Módulos Backend en detalle
+
+## 3.1 gestion_huerta
+
+### 3.1.1 Entidades
+* `Propietario`
+* `Huerta`
+* `HuertaRentada`
+* `Temporada`
+* `CategoriaInversion`
+* `Cosecha`
+* `InversionesHuerta`
+* `Venta`
+
+### 3.1.2 Checklist por entidad (backend)
+#### Propietario
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Huerta
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### HuertaRentada
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Temporada
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CategoriaInversion
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Cosecha
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### InversionesHuerta
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Venta
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+## 3.2 gestion_bodega
+
+### 3.2.1 Entidades
+* `Material`
+* `CalidadMadera`
+* `CalidadPlastico`
+* `EstadoPedido`
+* `EstadoCamion`
+* `TimeStampedModel`
+* `Bodega`
+* `TemporadaBodega`
+* `Cliente`
+* `Recepcion`
+* `ClasificacionEmpaque`
+* `InventarioPlastico`
+* `MovimientoPlastico`
+* `CompraMadera`
+* `AbonoMadera`
+* `Pedido`
+* `PedidoRenglon`
+* `SurtidoRenglon`
+* `CamionSalida`
+* `CamionItem`
+* `Consumible`
+* `CierreSemanal`
+
+### 3.2.2 Checklist por entidad (backend)
+#### Material
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CalidadMadera
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CalidadPlastico
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### EstadoPedido
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### EstadoCamion
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### TimeStampedModel
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Bodega
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### TemporadaBodega
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Cliente
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Recepcion
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### ClasificacionEmpaque
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### InventarioPlastico
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### MovimientoPlastico
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CompraMadera
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### AbonoMadera
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Pedido
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### PedidoRenglon
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### SurtidoRenglon
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CamionSalida
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CamionItem
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Consumible
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CierreSemanal
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en`
+* Cascadas (si aplica): reglas explícitas
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+## 3.3 gestion_usuarios
+
+### 3.3.1 Entidades
+* `Role`
+* `CustomUserManager`
+* `Users`
+* `RegistroActividad`
+
+### 3.3.2 Checklist por entidad (backend)
+#### Role
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en` (si aplica)
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### CustomUserManager
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en` (si aplica)
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### Users
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en` (si aplica)
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+#### RegistroActividad
+* Respuesta list: `data.results` / `data.meta`
+* Respuesta detail: `data` o `data.item` (estándar único)
+* Errores: `data.errors`
+* Permisos: `_perm_map` + `get_permissions`
+* Soft-delete: `is_active` + `archivado_en` (si aplica)
+* Observaciones específicas: pendiente de auditoría de endpoints
+
+# 4) Módulos Frontend en detalle
+
+## 4.1 gestion_huerta (frontend)
+
+### 4.1.1 Capas
+* `services/` → llamadas API
+* `hooks/` → estado/listas/detalle
+* `pages/` → páginas y vistas principales
+* `components/` → UI modular por entidad
+* `types/` → contratos locales de TS
+* `utils/` → helpers del módulo
+
+### 4.1.2 Checklist de lista canónica (frontend)
+* Service devuelve `data.results/meta`
+* Hook expone `items/meta/refetch`
+* Slice guarda `items/meta`
+* Page usa `items` (o alias local)
+* Errores de validación usan `data.errors`
+
+## 4.2 gestion_bodega (frontend)
+
+### 4.2.1 Capas
+* `services/` → llamadas API
+* `hooks/` → estado/listas/detalle
+* `pages/` → páginas y vistas principales
+* `components/` → UI modular por entidad
+* `types/` → contratos locales de TS
+* `utils/` → helpers del módulo
+
+### 4.2.2 Checklist de lista canónica (frontend)
+* Service devuelve `data.results/meta`
+* Hook expone `items/meta/refetch`
+* Slice guarda `items/meta`
+* Page usa `items` (o alias local)
+* Errores de validación usan `data.errors`
+
+## 4.3 gestion_usuarios (frontend)
+
+### 4.3.1 Capas
+* `services/` → llamadas API
+* `hooks/` → estado/listas/detalle
+* `pages/` → páginas y vistas principales
+* `components/` → UI modular por entidad
+* `types/` → contratos locales de TS
+* `utils/` → helpers del módulo
+
+### 4.3.2 Checklist de lista canónica (frontend)
+* Service devuelve `data.results/meta`
+* Hook expone `items/meta/refetch`
+* Slice guarda `items/meta`
+* Page usa `items` (o alias local)
+* Errores de validación usan `data.errors`
+
+# 5) Plan de Acción Masivo (sin revertir, solo hacia adelante)
+
+## Fase 0 — Bloqueadores
+* Backend: `python manage.py check`
+* Frontend: `npm run build` / `npm run lint`
+
+## Fase 1 — Normalización del Canon
+* Unificar `PaginationMeta` global
+* Unificar `FilterType` (usar `autocomplete-async`)
+* Unificar estado de listas: `items/meta`
+
+## Fase 2 — Erradicación de bifurcaciones de errores
+* Formularios leen solo `data.errors`
+* Ajustar backend o adapter en services
+
+## Fase 3 — Certificación final con evidencia
+* `python manage.py check`
+* `npm run build`
+* `npm run lint`
+* Smoke checks por entidad
+
+# 6) Matrices de Certificación (plantillas por entidad)
+
+## 6.gestion_huerta
+
+### Propietario
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Huerta
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### HuertaRentada
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Temporada
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CategoriaInversion
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Cosecha
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### InversionesHuerta
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Venta
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+## 6.gestion_bodega
+
+### Material
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CalidadMadera
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CalidadPlastico
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### EstadoPedido
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### EstadoCamion
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### TimeStampedModel
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Bodega
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### TemporadaBodega
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Cliente
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Recepcion
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### ClasificacionEmpaque
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### InventarioPlastico
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### MovimientoPlastico
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CompraMadera
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### AbonoMadera
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Pedido
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### PedidoRenglon
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### SurtidoRenglon
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CamionSalida
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CamionItem
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Consumible
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CierreSemanal
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+## 6.gestion_usuarios
+
+### Role
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### CustomUserManager
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### Users
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+### RegistroActividad
+* Service: OK / FAIL
+* Slice: OK / FAIL
+* Hook: OK / FAIL
+* Page: OK / FAIL
+* Build: OK / FAIL
+* Errores canónicos: OK / FAIL
+* Evidencia: (comando + línea)
+
+# 7) Evidencia y comandos sugeridos
+
+```bash
+# Gates
+python backend/manage.py check
+cd frontend
+npm run build
+npm run lint
+cd ..
+
+# Búsquedas de bifurcaciones
+rg -n "data\.(huertas|cosechas|ventas|inversiones|propietarios|temporadas|categorias)" frontend/src
+rg -n "backend\.errors|(^|\W)errors\s*:|data\?\.(errors)|e\.response\.data\.errors" frontend/src
+rg -n "async-select|autocomplete-async" frontend/src
+rg -n "meta\.(page_size|total_pages|next|previous)|total_registradas" frontend/src/modules
+rg -n "get_paginated_response\(" backend/gestion_huerta
+rg -n "return Response\(|HttpResponse\(" backend/gestion_huerta
+```
+
+# 8) Anexos: Observaciones por archivo (anotaciones rápidas)
+
+> Nota: esta sección es una bitácora abierta; cada línea puede ser reemplazada por observaciones reales tras auditoría.
+
+* `backend/.coverage` — Pendiente de auditoría.
+* `backend/agroproductores_risol/__init__.py` — Pendiente de auditoría.
+* `backend/agroproductores_risol/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/__pycache__/celery.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/__pycache__/settings.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/__pycache__/urls.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/__pycache__/wsgi.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/asgi.py` — Pendiente de auditoría.
+* `backend/agroproductores_risol/estructura_limpia.txt` — Pendiente de auditoría.
+* `backend/agroproductores_risol/settings.py` — Pendiente de auditoría.
+* `backend/agroproductores_risol/urls.py` — Pendiente de auditoría.
+* `backend/agroproductores_risol/utils/__pycache__/paginated_notify.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/utils/__pycache__/pagination.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/agroproductores_risol/utils/pagination.py` — Pendiente de auditoría.
+* `backend/agroproductores_risol/wsgi.py` — Pendiente de auditoría.
+* `backend/estructura_limpia.txt` — Pendiente de auditoría.
+* `backend/gestion_bodega/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/admin.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/apps.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/models.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/permissions.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/serializers.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/tests.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/urls.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/__pycache__/views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/admin.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/apps.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/estructura_limpia.txt` — Pendiente de auditoría.
+* `backend/gestion_bodega/migrations/0001_initial.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/0002_initial.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__init__.py` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0001_initial.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0002_camionitem_camionsalida_clasificacionempaque_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0002_initial.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0003_alter_temporadabodega_unique_together_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0003_cliente_temporadabodega_alter_abonomadera_options_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0004_alter_cierresemanal_options_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0005_clasificacionempaque_semana_recepcion_semana.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/migrations/__pycache__/__init__.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_bodega/models.py` — Backend core: verificar contratos API y validaciones.
+* `backend/gestion_bodega/permissions.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/serializers.py` — Backend core: verificar contratos API y validaciones.
+* `backend/gestion_bodega/services/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/exportacion/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/exportacion/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/exportacion/excel_exporter.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/exportacion/pdf_exporter.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/reportes/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/reportes/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/reportes/__pycache__/semanal_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/reportes/__pycache__/temporada_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/reportes/semanal_service.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/services/reportes/temporada_service.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/tests.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/urls.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/activity.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/audit.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/constants.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/kpis.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/notification_handler.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/reporting.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/semana.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/__pycache__/validators.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/activity.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/audit.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/cache_keys.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/constants.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/kpis.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/notification_handler.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/reporting.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/semana.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/utils/throttles.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/bodegas_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/camiones_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/cierres_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/compras_madera_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/consumibles_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/empaques_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/inventarios_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/pedidos_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/recepciones_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/__pycache__/tablero_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/bodegas_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/camiones_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/cierres_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/compras_madera_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/consumibles_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/empaques_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/inventarios_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/pedidos_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/recepciones_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/reportes/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/reportes/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/reportes/__pycache__/reporte_semanal_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/reportes/__pycache__/reporte_temporada_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/reportes/reporte_semanal_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/reportes/reporte_temporada_views.py` — Pendiente de auditoría.
+* `backend/gestion_bodega/views/tablero_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/admin.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/apps.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/models.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/permissions.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/serializers.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/tasks.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/tests.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/__pycache__/urls.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/admin.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/apps.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/estructura_limpia.txt` — Pendiente de auditoría.
+* `backend/gestion_huerta/migrations/0001_initial.py` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__init__.py` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0001_initial.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0002_alter_cosecha_options_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0003_inversioneshuerta_archivado_en_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0004_categoriainversion_archivado_en_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0005_alter_categoriainversion_options_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0006_alter_huerta_unique_together_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0007_alter_propietario_options_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0008_cosecha_gestion_hue_tempora_23249d_idx_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0009_venta_huerta_rentada_alter_venta_huerta.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0010_cosecha_archivado_por_cascada_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0011_alter_categoriainversion_nombre.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0012_alter_propietario_telefono.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0013_seed_extra_permissions.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/0014_alter_huerta_options_alter_huertarentada_options_and_more.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/migrations/__pycache__/__init__.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_huerta/models.py` — Backend core: verificar contratos API y validaciones.
+* `backend/gestion_huerta/permissions.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/serializers.py` — Backend core: verificar contratos API y validaciones.
+* `backend/gestion_huerta/services/__pycache__/exportacion_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/__pycache__/reportes_produccion_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/exportacion/__pycache__/excel_exporter.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/exportacion/__pycache__/pdf_exporter.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/exportacion/excel_exporter.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/exportacion/pdf_exporter.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/exportacion_service.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes/__pycache__/cosecha_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes/__pycache__/perfil_huerta_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes/__pycache__/temporada_service.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes/cosecha_service.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes/perfil_huerta_service.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes/temporada_service.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/services/reportes_produccion_service.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__pycache__/custom_filters.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__pycache__/custom_tags.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__pycache__/form_tags.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__pycache__/formatting_tags.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/__pycache__/number_filters.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/custom_filters.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/custom_tags.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/form_tags.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/formatting_tags.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/templatetags/number_filters.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__pycache__/test_bloqueos_estado.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__pycache__/test_huerta_delete.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__pycache__/test_model_validations.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__pycache__/test_permissions_archive_restore.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/__pycache__/test_temporada_delete_rules.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/test_bloqueos_estado.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/test_huerta_delete.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/test_model_validations.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/test_permissions_archive_restore.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/test/test_temporada_delete_rules.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/tests.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/urls.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/activity.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/audit.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/cache_keys.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/constants.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/notification_handler.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/reporting.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/search_mixin.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/__pycache__/storage.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/activity.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/audit.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/cache_keys.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/constants.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/notification_handler.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/reporting.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/search_mixin.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/utils/throttles.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/categoria_inversion_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/cosechas_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/huerta_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/informes_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/inversiones_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/registro_actividad.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/reportes_produccion_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/temporadas_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/__pycache__/ventas_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/categoria_inversion_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/cosechas_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/huerta_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/inversiones_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/__pycache__/cosecha_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/__pycache__/perfil_huerta_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/__pycache__/reportes_utils_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/__pycache__/temporada_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/cosecha_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/perfil_huerta_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/reportes/temporada_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/temporadas_views.py` — Pendiente de auditoría.
+* `backend/gestion_huerta/views/ventas_views.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/admin.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/apps.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/models.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/permissions.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/permissions_policy.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/serializers.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/signals.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/urls.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/__pycache__/validators.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/admin.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/apps.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/estructura_limpia.txt` — Pendiente de auditoría.
+* `backend/gestion_usuarios/management/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/management/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/management/commands/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/management/commands/prune_permissions.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/management/commands/rebuild_permissions.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/migrations/0001_initial.py` — Migration: valida estructura del esquema.
+* `backend/gestion_usuarios/migrations/__init__.py` — Migration: valida estructura del esquema.
+* `backend/gestion_usuarios/migrations/__pycache__/0001_initial.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_usuarios/migrations/__pycache__/__init__.cpython-312.pyc` — Migration: valida estructura del esquema.
+* `backend/gestion_usuarios/models.py` — Backend core: verificar contratos API y validaciones.
+* `backend/gestion_usuarios/permissions.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/permissions_policy.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/serializers.py` — Backend core: verificar contratos API y validaciones.
+* `backend/gestion_usuarios/signals.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_activity_validators.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_change_password.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_login.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_models.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_permissions.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_serializers.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_user_crud.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_utils_extra.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/__pycache__/test_validators_utils.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_activity_validators.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_change_password.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_login.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_models.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_permissions.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_serializers.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_user_crud.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_utils_extra.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/test/test_validators_utils.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/urls.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__init__.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__pycache__/__init__.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__pycache__/activity.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__pycache__/audit.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__pycache__/constants.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__pycache__/notification_handler.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/__pycache__/throttles.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/activity.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/audit.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/constants.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/notification_handler.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/perm_utils.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/utils/throttles.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/validators.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/views/__pycache__/user_views.cpython-312.pyc` — Pendiente de auditoría.
+* `backend/gestion_usuarios/views/token_views.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/views/user_views.py` — Pendiente de auditoría.
+* `backend/gestion_usuarios/views/user_views.py.segment.txt` — Pendiente de auditoría.
+* `backend/huerta_registration.log` — Pendiente de auditoría.
+* `backend/manage.py` — Pendiente de auditoría.
+* `backend/requirements.txt` — Pendiente de auditoría.
+* `frontend/src/App.css` — Pendiente de auditoría.
+* `frontend/src/App.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/assets/react.svg` — Pendiente de auditoría.
+* `frontend/src/components/common/AppDrawer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/ErrorBoundary.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/IfRole.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/LazyRoutes.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/PermissionButton.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/PrivateRoute.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/RoleGuard.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/TableLayout.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/common/Unauthorized.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/layout/Footer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/layout/MainLayout.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/components/layout/Navbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/estructura_limpia.txt` — Pendiente de auditoría.
+* `frontend/src/global/api/apiClient.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/constants/breadcrumbRoutes.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/constants/navItems.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/routes/AppRouter.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/global/routes/moduleRoutes.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/authSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/bodegasSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/breadcrumbsSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/capturasSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/categoriaInversionSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/cierresSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/cosechasSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/empaquesSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/huertaRentadaSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/huertaSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/huertasCombinadasSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/inversionesSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/propietariosSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/store.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/tableroBodegaSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/temporadaSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/temporadabodegaSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/userSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/store/ventasSlice.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/utils/NotificationEngine.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/utils/date.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/global/utils/formatters.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/index.css` — Pendiente de auditoría.
+* `frontend/src/main.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/estructura_limpia.txt` — Pendiente de auditoría.
+* `frontend/src/modules/gestion_bodega/hooks/useBodegas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useCamiones.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useCapturas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useCierres.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useGastos.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useInventarios.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/usePedidos.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/pages/Bodegas.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Capturas.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Empaque.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Gastos.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Inventarios.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Logistica.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Reportes.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/pages/Temporadas.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_bodega/services/bodegaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/camionesService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/capturasService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/cierresService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/empaquesService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/gastosService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/inventarioService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/pedidosService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/camionTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/shared.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/utils/format.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_bodega/utils/hotkeys.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/estructura_limpia.txt` — Pendiente de auditoría.
+* `frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useCosechas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useHuertas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useInversiones.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/hooks/useVentas.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/pages/Cosechas.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/Huertas.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/Inversion.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/Propietarios.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/Temporadas.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/pages/Venta.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/cosechaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/huertaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/inversionService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/propietarioService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/temporadaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/services/ventaService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/shared.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/estructura_limpia.txt` — Pendiente de auditoría.
+* `frontend/src/modules/gestion_usuarios/hooks/useUsers.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/Login.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/Profile.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/Register.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx` — UI/React: confirmar uso de canon de estado/listas.
+* `frontend/src/modules/gestion_usuarios/services/authService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_usuarios/services/permisoService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_usuarios/services/userService.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/modules/gestion_usuarios/types/userTypes.d.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/theme.ts` — TS: confirmar contratos de tipos y servicios.
+* `frontend/src/vite-env.d.ts` — TS: confirmar contratos de tipos y servicios.
+
+# 9) Registro de seguimiento diario
+
+* Día 001: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 002: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 003: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 004: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 005: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 006: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 007: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 008: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 009: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 010: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 011: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 012: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 013: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 014: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 015: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 016: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 017: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 018: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 019: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 020: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 021: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 022: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 023: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 024: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 025: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 026: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 027: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 028: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 029: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 030: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 031: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 032: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 033: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 034: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 035: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 036: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 037: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 038: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 039: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 040: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 041: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 042: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 043: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 044: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 045: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 046: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 047: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 048: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 049: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 050: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 051: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 052: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 053: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 054: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 055: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 056: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 057: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 058: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 059: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 060: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 061: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 062: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 063: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 064: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 065: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 066: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 067: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 068: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 069: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 070: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 071: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 072: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 073: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 074: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 075: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 076: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 077: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 078: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 079: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 080: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 081: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 082: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 083: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 084: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 085: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 086: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 087: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 088: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 089: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 090: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 091: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 092: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 093: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 094: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 095: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 096: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 097: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 098: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 099: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 100: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 101: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 102: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 103: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 104: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 105: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 106: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 107: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 108: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 109: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 110: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 111: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 112: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 113: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 114: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 115: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 116: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 117: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 118: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 119: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 120: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 121: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 122: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 123: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 124: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 125: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 126: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 127: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 128: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 129: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 130: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 131: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 132: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 133: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 134: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 135: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 136: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 137: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 138: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 139: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 140: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 141: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 142: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 143: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 144: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 145: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 146: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 147: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 148: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 149: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 150: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 151: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 152: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 153: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 154: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 155: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 156: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 157: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 158: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 159: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 160: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 161: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 162: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 163: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 164: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 165: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 166: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 167: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 168: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 169: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 170: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 171: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 172: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 173: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 174: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 175: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 176: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 177: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 178: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 179: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 180: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 181: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 182: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 183: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 184: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 185: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 186: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 187: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 188: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 189: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 190: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 191: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 192: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 193: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 194: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 195: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 196: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 197: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 198: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 199: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+* Día 200: [ ] Check-in de avance | [ ] Evidencia adjunta | [ ] Bloqueadores registrados
+
+# 10) Plan cerrado por archivo (backlog detallado)
+
+> Este backlog queda “cerrado por archivo” y sirve como plantilla para ejecutar refactors y validaciones sin suposiciones.
+> Cada archivo debe revisarse y marcarse como: OK, CAMBIO, BLOQUEADO (con evidencia).
+
+## 10.1 Backend (por archivo)
+
+* `backend/.coverage` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/__pycache__/celery.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/__pycache__/settings.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/__pycache__/urls.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/__pycache__/wsgi.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/asgi.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/settings.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/utils/__pycache__/paginated_notify.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/utils/__pycache__/pagination.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/utils/pagination.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/agroproductores_risol/wsgi.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/admin.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/apps.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/models.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/permissions.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/serializers.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/tests.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/urls.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/__pycache__/views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0002_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0001_initial.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0002_camionitem_camionsalida_clasificacionempaque_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0002_initial.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0003_alter_temporadabodega_unique_together_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0003_cliente_temporadabodega_alter_abonomadera_options_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0004_alter_cierresemanal_options_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0005_clasificacionempaque_semana_recepcion_semana.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/migrations/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/excel_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/exportacion/pdf_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/__pycache__/semanal_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/__pycache__/temporada_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/semanal_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/services/reportes/temporada_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/tests.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/activity.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/audit.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/constants.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/kpis.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/notification_handler.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/reporting.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/semana.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/__pycache__/validators.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/cache_keys.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/kpis.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/reporting.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/semana.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/bodegas_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/camiones_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/cierres_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/compras_madera_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/consumibles_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/empaques_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/inventarios_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/pedidos_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/recepciones_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/__pycache__/tablero_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/bodegas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/camiones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/cierres_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/compras_madera_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/consumibles_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/empaques_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/inventarios_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/pedidos_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/recepciones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/__pycache__/reporte_semanal_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/__pycache__/reporte_temporada_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/reporte_semanal_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/reportes/reporte_temporada_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_bodega/views/tablero_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/admin.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/apps.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/models.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/permissions.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/serializers.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/tasks.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/tests.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/__pycache__/urls.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0001_initial.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0002_alter_cosecha_options_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0003_inversioneshuerta_archivado_en_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0004_categoriainversion_archivado_en_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0005_alter_categoriainversion_options_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0006_alter_huerta_unique_together_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0007_alter_propietario_options_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0008_cosecha_gestion_hue_tempora_23249d_idx_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0009_venta_huerta_rentada_alter_venta_huerta.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0010_cosecha_archivado_por_cascada_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0011_alter_categoriainversion_nombre.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0012_alter_propietario_telefono.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0013_seed_extra_permissions.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/0014_alter_huerta_options_alter_huertarentada_options_and_more.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/migrations/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/__pycache__/exportacion_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/__pycache__/reportes_produccion_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion/__pycache__/excel_exporter.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion/__pycache__/pdf_exporter.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion/excel_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion/pdf_exporter.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/exportacion_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/__pycache__/cosecha_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/__pycache__/perfil_huerta_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/__pycache__/temporada_service.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/cosecha_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/perfil_huerta_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes/temporada_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/services/reportes_produccion_service.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__pycache__/custom_filters.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__pycache__/custom_tags.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__pycache__/form_tags.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__pycache__/formatting_tags.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/__pycache__/number_filters.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/custom_filters.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/custom_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/form_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/formatting_tags.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/templatetags/number_filters.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__pycache__/test_bloqueos_estado.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__pycache__/test_huerta_delete.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__pycache__/test_model_validations.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__pycache__/test_permissions_archive_restore.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/__pycache__/test_temporada_delete_rules.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_bloqueos_estado.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_huerta_delete.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_model_validations.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_permissions_archive_restore.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/test/test_temporada_delete_rules.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/tests.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/activity.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/audit.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/cache_keys.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/constants.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/notification_handler.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/reporting.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/search_mixin.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/__pycache__/storage.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/cache_keys.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/reporting.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/search_mixin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/categoria_inversion_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/cosechas_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/huerta_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/informes_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/inversiones_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/registro_actividad.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/reportes_produccion_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/temporadas_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/__pycache__/ventas_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/categoria_inversion_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/cosechas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/huerta_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/inversiones_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/__pycache__/cosecha_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/__pycache__/perfil_huerta_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/__pycache__/reportes_utils_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/__pycache__/temporada_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/cosecha_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/perfil_huerta_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/reportes/temporada_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/temporadas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_huerta/views/ventas_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/admin.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/apps.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/models.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/permissions.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/permissions_policy.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/serializers.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/signals.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/urls.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/__pycache__/validators.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/admin.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/apps.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/commands/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/commands/prune_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/management/commands/rebuild_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/migrations/0001_initial.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/migrations/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/migrations/__pycache__/0001_initial.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/migrations/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/permissions_policy.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/signals.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_activity_validators.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_change_password.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_login.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_models.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_permissions.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_serializers.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_user_crud.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_utils_extra.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/__pycache__/test_validators_utils.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_activity_validators.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_change_password.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_login.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_models.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_permissions.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_serializers.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_user_crud.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_utils_extra.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/test/test_validators_utils.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/urls.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__init__.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__pycache__/__init__.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__pycache__/activity.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__pycache__/audit.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__pycache__/constants.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__pycache__/notification_handler.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/__pycache__/throttles.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/activity.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/audit.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/constants.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/notification_handler.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/perm_utils.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/utils/throttles.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/validators.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/__pycache__/user_views.cpython-312.pyc` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/token_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/user_views.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/gestion_usuarios/views/user_views.py.segment.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/huerta_registration.log` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/manage.py` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+* `backend/requirements.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon API/errores/permisos/soft-delete y registrar evidencia.
+
+## 10.2 Frontend (por archivo)
+
+* `frontend/src/App.css` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/App.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/assets/react.svg` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/AppDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/ErrorBoundary.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/IfRole.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/LazyRoutes.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/PermissionButton.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/PrivateRoute.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/RoleGuard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/TableLayout.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/common/Unauthorized.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/layout/Footer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/layout/MainLayout.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/components/layout/Navbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/api/apiClient.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/constants/breadcrumbRoutes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/constants/navItems.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/routes/AppRouter.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/routes/moduleRoutes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/authSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/bodegasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/breadcrumbsSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/capturasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/categoriaInversionSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/cierresSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/cosechasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/empaquesSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/huertaRentadaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/huertaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/huertasCombinadasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/inversionesSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/propietariosSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/store.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/tableroBodegaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/temporadaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/temporadabodegaSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/userSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/store/ventasSlice.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/utils/NotificationEngine.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/utils/date.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/global/utils/formatters.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/index.css` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/main.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useBodegas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useCamiones.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useCapturas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useCierres.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useGastos.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useInventarios.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/usePedidos.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Bodegas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Capturas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Empaque.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Gastos.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Inventarios.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Logistica.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Reportes.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/pages/Temporadas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/bodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/camionesService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/capturasService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/cierresService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/empaquesService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/gastosService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/inventarioService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/pedidosService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/camionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/shared.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/utils/format.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_bodega/utils/hotkeys.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useCosechas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useHuertas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useInversiones.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/hooks/useVentas.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/Cosechas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/Huertas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/Inversion.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/Propietarios.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/Temporadas.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/pages/Venta.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/cosechaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/huertaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/inversionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/propietarioService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/temporadaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/services/ventaService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/shared.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/context/AuthContext.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/estructura_limpia.txt` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/hooks/useUsers.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/Login.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/Profile.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/Register.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/services/authService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/services/permisoService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/services/userService.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/modules/gestion_usuarios/types/userTypes.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/theme.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+* `frontend/src/vite-env.d.ts` → [ ] OK [ ] CAMBIO [ ] BLOQUEADO | Tarea: validar canon items/meta, hooks, servicios, errores y filtros (FilterType).
+
+## 10.3 Evidencia mínima requerida por archivo
+
+* Ruta exacta del archivo
+* Hallazgo (descripción corta)
+* Evidencia (comando + línea o captura)
+* Acción (qué se cambia)
+* Estado final (OK/CAMBIO/BLOQUEADO)
+
+## 10.4 Prioridad sugerida (macro)
+
+* Primero: `services/` y `hooks/` (contratos y estado)
+* Luego: `slices`/estado si aplica
+* Después: `pages/` y `components/` (consumo y UI)
+* Finalmente: `tests/` y `docs/`
+
