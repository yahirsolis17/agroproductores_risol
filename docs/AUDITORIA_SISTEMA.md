# Informe de Auditoría Integral del Sistema

- Fecha de generación: 2025-12-22T01:01:24.085591
- Alcance: Backend (Django), Frontend (React + Redux Toolkit), utilitarios y documentación.
- Solicitud: análisis exhaustivo con inventario detallado de artefactos y puntos de control.

## Resumen Ejecutivo (síntesis manual)
1. El backend emplea un envelope con `notification` y `data`, gestionado por utilidades como `NotificationHandler` y `GenericPagination`.
2. El frontend centraliza notificaciones en `NotificationEngine`, usa Redux Toolkit como store principal y adopta `TableLayout` como patrón de tablas.
3. Persisten riesgos de heterogeneidad contractual (meta de paginación/alias de resultados) y usos mixtos de hooks/selectores que deben ser gobernados.
4. Este documento complementa hallazgos previos con un inventario línea por línea de archivos y verificaciones sugeridas para uniformar el canon.

## Inventario Técnico Detallado
### 1. audit_full_system.zip
- Área: Raíz/Docs
- Tipo: Archivo .zip; tamaño aproximado 1156774 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 2. audit_gestion_bodega.zip
- Área: Raíz/Docs
- Tipo: Archivo .zip; tamaño aproximado 465201 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 3. audit_scan.csv
- Área: Raíz/Docs
- Tipo: Archivo .csv; tamaño aproximado 48382 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 4. backend/agroproductores_risol/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 5. backend/agroproductores_risol/asgi.py
- Área: Backend
- Tipo: Python; tamaño aproximado 419 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 6. backend/agroproductores_risol/estructura_limpia.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 523 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 7. backend/agroproductores_risol/settings.py
- Área: Backend
- Tipo: Python; tamaño aproximado 6177 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 8. backend/agroproductores_risol/urls.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1595 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 9. backend/agroproductores_risol/utils/pagination.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1445 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 10. backend/agroproductores_risol/wsgi.py
- Área: Backend
- Tipo: Python; tamaño aproximado 419 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 11. backend/estructura_limpia.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 27356 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 12. backend/gestion_bodega/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 13. backend/gestion_bodega/admin.py
- Área: Backend
- Tipo: Python; tamaño aproximado 63 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 14. backend/gestion_bodega/apps.py
- Área: Backend
- Tipo: Python; tamaño aproximado 159 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 15. backend/gestion_bodega/estructura_limpia.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 3930 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 16. backend/gestion_bodega/migrations/0001_initial.py
- Área: Backend
- Tipo: Python; tamaño aproximado 17883 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 17. backend/gestion_bodega/migrations/0002_initial.py
- Área: Backend
- Tipo: Python; tamaño aproximado 12428 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 18. backend/gestion_bodega/migrations/0003_alter_temporadabodega_unique_together_and_more.py
- Área: Backend
- Tipo: Python; tamaño aproximado 592 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 19. backend/gestion_bodega/migrations/0004_alter_cierresemanal_options_and_more.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1936 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 20. backend/gestion_bodega/migrations/0005_clasificacionempaque_semana_recepcion_semana.py
- Área: Backend
- Tipo: Python; tamaño aproximado 848 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 21. backend/gestion_bodega/migrations/0006_clasificacionempaque_idx_emp_ctx_semana_fecha_and_more.py
- Área: Backend
- Tipo: Python; tamaño aproximado 661 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 22. backend/gestion_bodega/migrations/0007_remove_cierresemanal_uniq_cierre_semana_abierta_bod_temp_and_more.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1377 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 23. backend/gestion_bodega/migrations/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 24. backend/gestion_bodega/models.py
- Área: Backend
- Tipo: Python; tamaño aproximado 52540 bytes.
- Rol inferido: Modelo de datos o entidad.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 25. backend/gestion_bodega/permissions.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3647 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 26. backend/gestion_bodega/serializers.py
- Área: Backend
- Tipo: Python; tamaño aproximado 53927 bytes.
- Rol inferido: Serializer / validación de payload.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 27. backend/gestion_bodega/services/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 28. backend/gestion_bodega/services/exportacion/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 29. backend/gestion_bodega/services/exportacion/excel_exporter.py
- Área: Backend
- Tipo: Python; tamaño aproximado 155 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 30. backend/gestion_bodega/services/exportacion/pdf_exporter.py
- Área: Backend
- Tipo: Python; tamaño aproximado 151 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 31. backend/gestion_bodega/services/reportes/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 32. backend/gestion_bodega/services/reportes/semanal_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1668 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 33. backend/gestion_bodega/services/reportes/temporada_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1325 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 34. backend/gestion_bodega/tests.py
- Área: Backend
- Tipo: Python; tamaño aproximado 12896 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos. Ejecutar suites y validar cobertura.

### 35. backend/gestion_bodega/urls.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3009 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 36. backend/gestion_bodega/utils/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 37. backend/gestion_bodega/utils/activity.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2166 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 38. backend/gestion_bodega/utils/audit.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2242 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 39. backend/gestion_bodega/utils/cache_keys.py
- Área: Backend
- Tipo: Python; tamaño aproximado 823 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 40. backend/gestion_bodega/utils/constants.py
- Área: Backend
- Tipo: Python; tamaño aproximado 18433 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 41. backend/gestion_bodega/utils/kpis.py
- Área: Backend
- Tipo: Python; tamaño aproximado 13727 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 42. backend/gestion_bodega/utils/notification_handler.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1120 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 43. backend/gestion_bodega/utils/reporting.py
- Área: Backend
- Tipo: Python; tamaño aproximado 7594 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 44. backend/gestion_bodega/utils/semana.py
- Área: Backend
- Tipo: Python; tamaño aproximado 6487 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 45. backend/gestion_bodega/utils/throttles.py
- Área: Backend
- Tipo: Python; tamaño aproximado 577 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 46. backend/gestion_bodega/views/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 47. backend/gestion_bodega/views/bodegas_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 32476 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 48. backend/gestion_bodega/views/camiones_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 9114 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 49. backend/gestion_bodega/views/cierres_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 11026 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 50. backend/gestion_bodega/views/compras_madera_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 6597 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 51. backend/gestion_bodega/views/consumibles_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 5586 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 52. backend/gestion_bodega/views/empaques_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 18636 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 53. backend/gestion_bodega/views/inventarios_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 7132 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 54. backend/gestion_bodega/views/pedidos_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 10063 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 55. backend/gestion_bodega/views/recepciones_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 20317 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 56. backend/gestion_bodega/views/reportes/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 57. backend/gestion_bodega/views/reportes/reporte_semanal_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3134 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 58. backend/gestion_bodega/views/reportes/reporte_temporada_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3040 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 59. backend/gestion_bodega/views/tablero_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 38574 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 60. backend/gestion_huerta/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 61. backend/gestion_huerta/admin.py
- Área: Backend
- Tipo: Python; tamaño aproximado 436 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 62. backend/gestion_huerta/apps.py
- Área: Backend
- Tipo: Python; tamaño aproximado 159 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 63. backend/gestion_huerta/estructura_limpia.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 10920 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 64. backend/gestion_huerta/migrations/0001_initial.py
- Área: Backend
- Tipo: Python; tamaño aproximado 14749 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 65. backend/gestion_huerta/migrations/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 66. backend/gestion_huerta/models.py
- Área: Backend
- Tipo: Python; tamaño aproximado 27573 bytes.
- Rol inferido: Modelo de datos o entidad.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 67. backend/gestion_huerta/permissions.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1371 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 68. backend/gestion_huerta/serializers.py
- Área: Backend
- Tipo: Python; tamaño aproximado 33895 bytes.
- Rol inferido: Serializer / validación de payload.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 69. backend/gestion_huerta/services/exportacion/excel_exporter.py
- Área: Backend
- Tipo: Python; tamaño aproximado 25757 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 70. backend/gestion_huerta/services/exportacion/pdf_exporter.py
- Área: Backend
- Tipo: Python; tamaño aproximado 36186 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 71. backend/gestion_huerta/services/exportacion_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1549 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 72. backend/gestion_huerta/services/reportes/cosecha_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 18981 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 73. backend/gestion_huerta/services/reportes/perfil_huerta_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 15638 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 74. backend/gestion_huerta/services/reportes/temporada_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 17668 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 75. backend/gestion_huerta/services/reportes_produccion_service.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2872 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 76. backend/gestion_huerta/templatetags/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 77. backend/gestion_huerta/templatetags/custom_filters.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1620 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 78. backend/gestion_huerta/templatetags/custom_tags.py
- Área: Backend
- Tipo: Python; tamaño aproximado 267 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 79. backend/gestion_huerta/templatetags/form_tags.py
- Área: Backend
- Tipo: Python; tamaño aproximado 548 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 80. backend/gestion_huerta/templatetags/formatting_tags.py
- Área: Backend
- Tipo: Python; tamaño aproximado 450 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 81. backend/gestion_huerta/templatetags/number_filters.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1092 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 82. backend/gestion_huerta/test/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 83. backend/gestion_huerta/test/test_bloqueos_estado.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3958 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 84. backend/gestion_huerta/test/test_huerta_delete.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1424 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 85. backend/gestion_huerta/test/test_model_validations.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3390 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 86. backend/gestion_huerta/test/test_permissions_archive_restore.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2978 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 87. backend/gestion_huerta/test/test_temporada_delete_rules.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2013 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 88. backend/gestion_huerta/tests.py
- Área: Backend
- Tipo: Python; tamaño aproximado 7725 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos. Ejecutar suites y validar cobertura.

### 89. backend/gestion_huerta/urls.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2293 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 90. backend/gestion_huerta/utils/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 91. backend/gestion_huerta/utils/activity.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2166 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 92. backend/gestion_huerta/utils/audit.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2242 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 93. backend/gestion_huerta/utils/cache_keys.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1702 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 94. backend/gestion_huerta/utils/constants.py
- Área: Backend
- Tipo: Python; tamaño aproximado 25998 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 95. backend/gestion_huerta/utils/notification_handler.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1082 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 96. backend/gestion_huerta/utils/reporting.py
- Área: Backend
- Tipo: Python; tamaño aproximado 56426 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 97. backend/gestion_huerta/utils/search_mixin.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2779 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 98. backend/gestion_huerta/utils/throttles.py
- Área: Backend
- Tipo: Python; tamaño aproximado 454 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 99. backend/gestion_huerta/views/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 100. backend/gestion_huerta/views/categoria_inversion_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 10503 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 101. backend/gestion_huerta/views/cosechas_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 21982 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 102. backend/gestion_huerta/views/huerta_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 37169 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 103. backend/gestion_huerta/views/inversiones_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 16691 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 104. backend/gestion_huerta/views/reportes/cosecha_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 6051 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 105. backend/gestion_huerta/views/reportes/perfil_huerta_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 7690 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 106. backend/gestion_huerta/views/reportes/temporada_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 6020 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 107. backend/gestion_huerta/views/temporadas_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 19135 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 108. backend/gestion_huerta/views/ventas_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 15419 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 109. backend/gestion_usuarios/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 110. backend/gestion_usuarios/admin.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1452 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 111. backend/gestion_usuarios/apps.py
- Área: Backend
- Tipo: Python; tamaño aproximado 472 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 112. backend/gestion_usuarios/estructura_limpia.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 2056 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 113. backend/gestion_usuarios/management/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 24 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 114. backend/gestion_usuarios/management/commands/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 24 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 115. backend/gestion_usuarios/management/commands/prune_permissions.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1593 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 116. backend/gestion_usuarios/management/commands/rebuild_permissions.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1545 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 117. backend/gestion_usuarios/migrations/0001_initial.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2983 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 118. backend/gestion_usuarios/migrations/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Migración de base de datos.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 119. backend/gestion_usuarios/models.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3215 bytes.
- Rol inferido: Modelo de datos o entidad.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 120. backend/gestion_usuarios/permissions.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2592 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 121. backend/gestion_usuarios/permissions_policy.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3048 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 122. backend/gestion_usuarios/serializers.py
- Área: Backend
- Tipo: Python; tamaño aproximado 4757 bytes.
- Rol inferido: Serializer / validación de payload.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 123. backend/gestion_usuarios/signals.py
- Área: Backend
- Tipo: Python; tamaño aproximado 3567 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 124. backend/gestion_usuarios/test/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 125. backend/gestion_usuarios/test/test_activity_validators.py
- Área: Backend
- Tipo: Python; tamaño aproximado 646 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 126. backend/gestion_usuarios/test/test_change_password.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1873 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 127. backend/gestion_usuarios/test/test_login.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1287 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 128. backend/gestion_usuarios/test/test_models.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1559 bytes.
- Rol inferido: Modelo de datos o entidad.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 129. backend/gestion_usuarios/test/test_permissions.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1463 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 130. backend/gestion_usuarios/test/test_serializers.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1379 bytes.
- Rol inferido: Serializer / validación de payload.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 131. backend/gestion_usuarios/test/test_user_crud.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1869 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 132. backend/gestion_usuarios/test/test_utils_extra.py
- Área: Backend
- Tipo: Python; tamaño aproximado 976 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 133. backend/gestion_usuarios/test/test_validators_utils.py
- Área: Backend
- Tipo: Python; tamaño aproximado 562 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 134. backend/gestion_usuarios/urls.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1181 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 135. backend/gestion_usuarios/utils/__init__.py
- Área: Backend
- Tipo: Python; tamaño aproximado 42 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 136. backend/gestion_usuarios/utils/activity.py
- Área: Backend
- Tipo: Python; tamaño aproximado 500 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 137. backend/gestion_usuarios/utils/audit.py
- Área: Backend
- Tipo: Python; tamaño aproximado 562 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 138. backend/gestion_usuarios/utils/constants.py
- Área: Backend
- Tipo: Python; tamaño aproximado 2630 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 139. backend/gestion_usuarios/utils/notification_handler.py
- Área: Backend
- Tipo: Python; tamaño aproximado 1082 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 140. backend/gestion_usuarios/utils/perm_utils.py
- Área: Backend
- Tipo: Python; tamaño aproximado 0 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 141. backend/gestion_usuarios/utils/throttles.py
- Área: Backend
- Tipo: Python; tamaño aproximado 524 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 142. backend/gestion_usuarios/validators.py
- Área: Backend
- Tipo: Python; tamaño aproximado 535 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 143. backend/gestion_usuarios/views/token_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 158 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 144. backend/gestion_usuarios/views/user_views.py
- Área: Backend
- Tipo: Python; tamaño aproximado 26255 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 145. backend/gestion_usuarios/views/user_views.py.segment.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 2426 bytes.
- Rol inferido: Vista/endpoint/API probable.
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 146. backend/huerta_registration.log
- Área: Backend
- Tipo: Archivo .log; tamaño aproximado 497 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 147. backend/manage.py
- Área: Backend
- Tipo: Python; tamaño aproximado 677 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 148. backend/requirements.txt
- Área: Backend
- Tipo: Texto plano; tamaño aproximado 498 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Verificar contrato `notification` y meta de paginación consistente. Confirmar permisos declarados vs permisos efectivos.

### 149. docs/API_DOCUMENTATION.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 9553 bytes.
- Rol inferido: Capa de API o cliente HTTP.
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 150. docs/DEPLOYMENT_GUIDE.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 15990 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 151. docs/DEVELOPMENT_GUIDE.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 27100 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 152. docs/README.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 9822 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 153. docs/REPORTES_PRODUCCION_IMPLEMENTACION.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 117326 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 154. docs/agroproductores_risol_v25.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 17708 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 155. docs/audit_evidence_report.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 13101 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 156. docs/auditoria_tecnica_y_gobernanza.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 9366 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 157. docs/gestion_bodega_audit.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 7852 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 158. docs/permissions_conventions.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 2740 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 159. docs/system_analysis.md
- Área: Raíz/Docs
- Tipo: Markdown de documentación; tamaño aproximado 5357 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Revisar coherencia con arquitectura declarada.

### 160. frontend/README.md
- Área: Frontend
- Tipo: Markdown de documentación; tamaño aproximado 1920 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 161. frontend/eslint.config.js
- Área: Frontend
- Tipo: JavaScript; tamaño aproximado 734 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 162. frontend/index.html
- Área: Frontend
- Tipo: HTML; tamaño aproximado 476 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 163. frontend/package-lock.json
- Área: Frontend
- Tipo: JSON de configuración; tamaño aproximado 192346 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 164. frontend/package.json
- Área: Frontend
- Tipo: JSON de configuración; tamaño aproximado 1448 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 165. frontend/postcss.config.js
- Área: Frontend
- Tipo: JavaScript; tamaño aproximado 172 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 166. frontend/public/robots.txt
- Área: Frontend
- Tipo: Texto plano; tamaño aproximado 24 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 167. frontend/public/vite.svg
- Área: Frontend
- Tipo: Archivo .svg; tamaño aproximado 1497 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 168. frontend/scripts/audit-gestion-bodega.mjs
- Área: Frontend
- Tipo: Archivo .mjs; tamaño aproximado 4315 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 169. frontend/src/App.css
- Área: Frontend
- Tipo: Hoja de estilos; tamaño aproximado 76 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 170. frontend/src/App.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 207 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 171. frontend/src/assets/react.svg
- Área: Frontend
- Tipo: Archivo .svg; tamaño aproximado 4126 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 172. frontend/src/components/common/AppDrawer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3161 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 173. frontend/src/components/common/ErrorBoundary.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1566 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 174. frontend/src/components/common/IfRole.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 419 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 175. frontend/src/components/common/LazyRoutes.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5413 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 176. frontend/src/components/common/PermissionButton.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1699 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 177. frontend/src/components/common/PrivateRoute.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 977 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 178. frontend/src/components/common/RoleGuard.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 581 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 179. frontend/src/components/common/TableLayout.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 14700 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 180. frontend/src/components/common/Unauthorized.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 801 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 181. frontend/src/components/layout/Footer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 418 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 182. frontend/src/components/layout/MainLayout.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 631 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 183. frontend/src/components/layout/Navbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 14039 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 184. frontend/src/estructura_limpia.txt
- Área: Frontend
- Tipo: Texto plano; tamaño aproximado 21766 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 185. frontend/src/global/api/apiClient.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1588 bytes.
- Rol inferido: Capa de API o cliente HTTP.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 186. frontend/src/global/constants/breadcrumbRoutes.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7428 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 187. frontend/src/global/constants/navItems.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1016 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 188. frontend/src/global/routes/AppRouter.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1917 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 189. frontend/src/global/routes/moduleRoutes.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 5201 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 190. frontend/src/global/store/authSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2533 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 191. frontend/src/global/store/bodegasSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7297 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 192. frontend/src/global/store/breadcrumbsSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 641 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 193. frontend/src/global/store/capturasSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 11269 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 194. frontend/src/global/store/categoriaInversionSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6128 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 195. frontend/src/global/store/cierresSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7498 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 196. frontend/src/global/store/cosechasSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7789 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 197. frontend/src/global/store/empaquesSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 9068 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 198. frontend/src/global/store/huertaRentadaSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6541 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 199. frontend/src/global/store/huertaSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6319 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 200. frontend/src/global/store/huertasCombinadasSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2491 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 201. frontend/src/global/store/inversionesSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 10148 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 202. frontend/src/global/store/propietariosSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7090 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 203. frontend/src/global/store/store.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1990 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 204. frontend/src/global/store/tableroBodegaSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 10200 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 205. frontend/src/global/store/temporadaSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 8325 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 206. frontend/src/global/store/temporadabodegaSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 17173 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 207. frontend/src/global/store/userSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 4393 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 208. frontend/src/global/store/ventasSlice.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 10264 bytes.
- Rol inferido: Estado global / slice Redux.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 209. frontend/src/global/utils/NotificationEngine.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2642 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 210. frontend/src/global/utils/date.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2703 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 211. frontend/src/global/utils/formatters.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1319 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 212. frontend/src/index.css
- Área: Frontend
- Tipo: Hoja de estilos; tamaño aproximado 60 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 213. frontend/src/main.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1424 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 214. frontend/src/modules/gestion_bodega/components/bodegas/BodegaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4873 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 215. frontend/src/modules/gestion_bodega/components/bodegas/BodegaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3076 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 216. frontend/src/modules/gestion_bodega/components/bodegas/BodegaToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 720 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 217. frontend/src/modules/gestion_bodega/components/capturas/CapturasTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 6322 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 218. frontend/src/modules/gestion_bodega/components/capturas/CapturasToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1375 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 219. frontend/src/modules/gestion_bodega/components/capturas/FastCaptureModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4326 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 220. frontend/src/modules/gestion_bodega/components/capturas/RecepcionFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 8880 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 221. frontend/src/modules/gestion_bodega/components/capturas/RulesBanner.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2006 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 222. frontend/src/modules/gestion_bodega/components/common/ActionsMenu.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 9676 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 223. frontend/src/modules/gestion_bodega/components/common/Breadcrumbs.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2620 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 224. frontend/src/modules/gestion_bodega/components/empaque/EmpaqueDrawer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 18324 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 225. frontend/src/modules/gestion_bodega/components/empaque/EmpaqueFooterActions.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3393 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 226. frontend/src/modules/gestion_bodega/components/empaque/EmpaqueHeaderSummary.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 8750 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 227. frontend/src/modules/gestion_bodega/components/empaque/EmpaqueLinesEditor.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 9233 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 228. frontend/src/modules/gestion_bodega/components/empaque/EmpaqueMiniKpis.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 7025 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 229. frontend/src/modules/gestion_bodega/components/gastos/AbonoMaderaModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 147 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 230. frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 162 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 231. frontend/src/modules/gestion_bodega/components/gastos/CompraMaderaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 150 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 232. frontend/src/modules/gestion_bodega/components/gastos/ConsumibleFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 156 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 233. frontend/src/modules/gestion_bodega/components/gastos/ConsumibleTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 144 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 234. frontend/src/modules/gestion_bodega/components/gastos/GastosToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 138 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 235. frontend/src/modules/gestion_bodega/components/inventarios/AjusteInventarioModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 162 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 236. frontend/src/modules/gestion_bodega/components/inventarios/InventarioMaderaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 162 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 237. frontend/src/modules/gestion_bodega/components/inventarios/InventarioPlasticoTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 168 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 238. frontend/src/modules/gestion_bodega/components/inventarios/InventariosTabs.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 144 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 239. frontend/src/modules/gestion_bodega/components/inventarios/MovimientosPlasticoDrawer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 174 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 240. frontend/src/modules/gestion_bodega/components/logistica/CamionFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 144 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 241. frontend/src/modules/gestion_bodega/components/logistica/CamionItemsEditor.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 150 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 242. frontend/src/modules/gestion_bodega/components/logistica/CamionTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 132 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 243. frontend/src/modules/gestion_bodega/components/logistica/CamionToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 138 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 244. frontend/src/modules/gestion_bodega/components/logistica/PedidoFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 144 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 245. frontend/src/modules/gestion_bodega/components/logistica/PedidoTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 132 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 246. frontend/src/modules/gestion_bodega/components/logistica/PedidoToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 138 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 247. frontend/src/modules/gestion_bodega/components/logistica/SurtidoDrawer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 138 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 248. frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalCharts.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 159 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 249. frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalTables.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 159 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 250. frontend/src/modules/gestion_bodega/components/reportes/ReporteSemanalViewer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 159 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 251. frontend/src/modules/gestion_bodega/components/reportes/ReporteTemporadaViewer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 165 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 252. frontend/src/modules/gestion_bodega/components/reportes/ReportesTabs.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 135 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 253. frontend/src/modules/gestion_bodega/components/reportes/ReportesToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 144 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 254. frontend/src/modules/gestion_bodega/components/tablero/AvisosPanel.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2872 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 255. frontend/src/modules/gestion_bodega/components/tablero/IsoWeekPicker.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5191 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 256. frontend/src/modules/gestion_bodega/components/tablero/KpiCards.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2727 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 257. frontend/src/modules/gestion_bodega/components/tablero/QuickActions.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3558 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 258. frontend/src/modules/gestion_bodega/components/tablero/WeekSwitcher.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 8249 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 259. frontend/src/modules/gestion_bodega/components/tablero/sections/EmpaqueSection.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4998 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 260. frontend/src/modules/gestion_bodega/components/tablero/sections/LogisticaSection.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4919 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 261. frontend/src/modules/gestion_bodega/components/tablero/sections/RecepcionesSection.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 9071 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 262. frontend/src/modules/gestion_bodega/components/tablero/sections/ResumenSection.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1233 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 263. frontend/src/modules/gestion_bodega/components/tablero/sections/SectionHeader.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1426 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 264. frontend/src/modules/gestion_bodega/components/tablero/sections/TableroSectionsAccordion.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 6197 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 265. frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4471 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 266. frontend/src/modules/gestion_bodega/components/temporadas/TemporadaBodegaToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4277 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 267. frontend/src/modules/gestion_bodega/estructura_limpia.txt
- Área: Frontend
- Tipo: Texto plano; tamaño aproximado 2430 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 268. frontend/src/modules/gestion_bodega/hooks/useBodegas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3244 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 269. frontend/src/modules/gestion_bodega/hooks/useCamiones.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 105 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 270. frontend/src/modules/gestion_bodega/hooks/useCapturas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 4011 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 271. frontend/src/modules/gestion_bodega/hooks/useCierres.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6263 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 272. frontend/src/modules/gestion_bodega/hooks/useEmpaques.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3253 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 273. frontend/src/modules/gestion_bodega/hooks/useGastos.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 103 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 274. frontend/src/modules/gestion_bodega/hooks/useInventarios.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 108 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 275. frontend/src/modules/gestion_bodega/hooks/useIsoWeek.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 5848 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 276. frontend/src/modules/gestion_bodega/hooks/usePedidos.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 104 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 277. frontend/src/modules/gestion_bodega/hooks/useReportesBodega.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 111 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 278. frontend/src/modules/gestion_bodega/hooks/useTableroBodega.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 16329 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 279. frontend/src/modules/gestion_bodega/hooks/useTemporadasBodega.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 4588 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 280. frontend/src/modules/gestion_bodega/hooks/useTiposMango.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 110 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 281. frontend/src/modules/gestion_bodega/pages/Bodegas.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 7700 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 282. frontend/src/modules/gestion_bodega/pages/Capturas.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 13575 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 283. frontend/src/modules/gestion_bodega/pages/Empaque.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2549 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 284. frontend/src/modules/gestion_bodega/pages/Gastos.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 117 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 285. frontend/src/modules/gestion_bodega/pages/Inventarios.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 132 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 286. frontend/src/modules/gestion_bodega/pages/Logistica.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 126 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 287. frontend/src/modules/gestion_bodega/pages/Reportes.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 123 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 288. frontend/src/modules/gestion_bodega/pages/TableroBodegaPage.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 33940 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 289. frontend/src/modules/gestion_bodega/pages/Temporadas.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 21801 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 290. frontend/src/modules/gestion_bodega/services/bodegaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6963 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 291. frontend/src/modules/gestion_bodega/services/camionesService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 834 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 292. frontend/src/modules/gestion_bodega/services/capturasService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7773 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 293. frontend/src/modules/gestion_bodega/services/cierresService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2433 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 294. frontend/src/modules/gestion_bodega/services/empaquesService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3658 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 295. frontend/src/modules/gestion_bodega/services/gastosService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1155 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 296. frontend/src/modules/gestion_bodega/services/inventarioService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 456 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 297. frontend/src/modules/gestion_bodega/services/pedidosService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 779 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 298. frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2116 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 299. frontend/src/modules/gestion_bodega/services/tableroBodegaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 7042 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 300. frontend/src/modules/gestion_bodega/services/temporadaBodegaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 11175 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 301. frontend/src/modules/gestion_bodega/types/bodegaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2338 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 302. frontend/src/modules/gestion_bodega/types/camionTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 431 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 303. frontend/src/modules/gestion_bodega/types/capturasTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2338 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 304. frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1963 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 305. frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2676 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 306. frontend/src/modules/gestion_bodega/types/gastosTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 568 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 307. frontend/src/modules/gestion_bodega/types/inventarioTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 354 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 308. frontend/src/modules/gestion_bodega/types/pedidoTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 382 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 309. frontend/src/modules/gestion_bodega/types/reportesBodegaTypes.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 185 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 310. frontend/src/modules/gestion_bodega/types/shared.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2269 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 311. frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 5837 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 312. frontend/src/modules/gestion_bodega/types/temporadaBodegaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1675 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 313. frontend/src/modules/gestion_bodega/utils/bodegaTypeGuards.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 176 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 314. frontend/src/modules/gestion_bodega/utils/format.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 326 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 315. frontend/src/modules/gestion_bodega/utils/hotkeys.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 85 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 316. frontend/src/modules/gestion_huerta/components/common/ActionsMenu.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 12949 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 317. frontend/src/modules/gestion_huerta/components/common/Breadcrumbs.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1683 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 318. frontend/src/modules/gestion_huerta/components/cosecha/CosechaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2630 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 319. frontend/src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3802 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 320. frontend/src/modules/gestion_huerta/components/cosecha/CosechaToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3041 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 321. frontend/src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 15868 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 322. frontend/src/modules/gestion_huerta/components/finanzas/CategoriaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4020 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 323. frontend/src/modules/gestion_huerta/components/finanzas/CategoriaInversionEditModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3799 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 324. frontend/src/modules/gestion_huerta/components/finanzas/CategoriaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2233 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 325. frontend/src/modules/gestion_huerta/components/finanzas/InversionFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 12824 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 326. frontend/src/modules/gestion_huerta/components/finanzas/InversionTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3940 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 327. frontend/src/modules/gestion_huerta/components/finanzas/InversionToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 10606 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 328. frontend/src/modules/gestion_huerta/components/finanzas/VentaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 13847 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 329. frontend/src/modules/gestion_huerta/components/finanzas/VentaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4456 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 330. frontend/src/modules/gestion_huerta/components/finanzas/VentaToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5672 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 331. frontend/src/modules/gestion_huerta/components/huerta/HuertaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 10883 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 332. frontend/src/modules/gestion_huerta/components/huerta/HuertaModalTabs.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3063 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 333. frontend/src/modules/gestion_huerta/components/huerta/HuertaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5026 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 334. frontend/src/modules/gestion_huerta/components/huerta/HuertaToolBar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 717 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 335. frontend/src/modules/gestion_huerta/components/huerta_rentada/HuertaRentadaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 11380 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 336. frontend/src/modules/gestion_huerta/components/propietario/PropietarioFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4774 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 337. frontend/src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3356 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 338. frontend/src/modules/gestion_huerta/components/propietario/PropietarioToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 1352 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 339. frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewer.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 20013 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 340. frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerCharts.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 26727 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 341. frontend/src/modules/gestion_huerta/components/reportes/ReporteProduccionViewerTables.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 41104 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 342. frontend/src/modules/gestion_huerta/components/reportes/ReportesProduccionToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5034 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 343. frontend/src/modules/gestion_huerta/components/reportes/common/DesgloseGananciaCard.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 12138 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 344. frontend/src/modules/gestion_huerta/components/reportes/common/GlosarioFinanzasModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5162 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 345. frontend/src/modules/gestion_huerta/components/temporada/TemporadaFormModal.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 6498 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 346. frontend/src/modules/gestion_huerta/components/temporada/TemporadaTable.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4299 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 347. frontend/src/modules/gestion_huerta/components/temporada/TemporadaToolbar.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5731 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 348. frontend/src/modules/gestion_huerta/estructura_limpia.txt
- Área: Frontend
- Tipo: Texto plano; tamaño aproximado 3938 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 349. frontend/src/modules/gestion_huerta/hooks/useCategoriasInversion.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1558 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 350. frontend/src/modules/gestion_huerta/hooks/useCosechas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2234 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 351. frontend/src/modules/gestion_huerta/hooks/useHuertaRentada.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2020 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 352. frontend/src/modules/gestion_huerta/hooks/useHuertas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1826 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 353. frontend/src/modules/gestion_huerta/hooks/useHuertasCombinadas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1179 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 354. frontend/src/modules/gestion_huerta/hooks/useInversiones.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2287 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 355. frontend/src/modules/gestion_huerta/hooks/usePropietarios.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2648 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 356. frontend/src/modules/gestion_huerta/hooks/useReporteCosecha.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 10274 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 357. frontend/src/modules/gestion_huerta/hooks/useReportePerfilHuerta.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 8825 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 358. frontend/src/modules/gestion_huerta/hooks/useReporteTemporada.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 12748 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 359. frontend/src/modules/gestion_huerta/hooks/useTemporadas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3795 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 360. frontend/src/modules/gestion_huerta/hooks/useVentas.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2158 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 361. frontend/src/modules/gestion_huerta/pages/Cosechas.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 11691 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 362. frontend/src/modules/gestion_huerta/pages/FinanzasPorCosecha.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 7167 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 363. frontend/src/modules/gestion_huerta/pages/Huertas.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 11983 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 364. frontend/src/modules/gestion_huerta/pages/Inversion.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 8641 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 365. frontend/src/modules/gestion_huerta/pages/PerfilHuerta.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3176 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 366. frontend/src/modules/gestion_huerta/pages/Propietarios.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 11858 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 367. frontend/src/modules/gestion_huerta/pages/ReporteCosecha.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3602 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 368. frontend/src/modules/gestion_huerta/pages/ReporteTemporada.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3167 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 369. frontend/src/modules/gestion_huerta/pages/Temporadas.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 17780 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 370. frontend/src/modules/gestion_huerta/pages/Venta.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5405 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 371. frontend/src/modules/gestion_huerta/services/categoriaInversionService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3400 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 372. frontend/src/modules/gestion_huerta/services/cosechaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 4451 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 373. frontend/src/modules/gestion_huerta/services/huertaRentadaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3138 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 374. frontend/src/modules/gestion_huerta/services/huertaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2963 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 375. frontend/src/modules/gestion_huerta/services/huertasCombinadasService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2314 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 376. frontend/src/modules/gestion_huerta/services/inversionService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 4087 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 377. frontend/src/modules/gestion_huerta/services/propietarioService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6157 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 378. frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 8937 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 379. frontend/src/modules/gestion_huerta/services/temporadaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3388 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 380. frontend/src/modules/gestion_huerta/services/ventaService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3432 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 381. frontend/src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 376 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 382. frontend/src/modules/gestion_huerta/types/cosechaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 828 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 383. frontend/src/modules/gestion_huerta/types/huertaRentadaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 791 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 384. frontend/src/modules/gestion_huerta/types/huertaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 725 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 385. frontend/src/modules/gestion_huerta/types/inversionTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1419 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 386. frontend/src/modules/gestion_huerta/types/propietarioTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 515 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 387. frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 3842 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 388. frontend/src/modules/gestion_huerta/types/shared.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 365 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 389. frontend/src/modules/gestion_huerta/types/temporadaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1003 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 390. frontend/src/modules/gestion_huerta/types/ventaTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1307 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 391. frontend/src/modules/gestion_huerta/utils/huertaTypeGuards.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 273 bytes.
- Rol inferido: Utilidad compartida.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 392. frontend/src/modules/gestion_usuarios/components/UserActionsMenu.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 2699 bytes.
- Rol inferido: Componente de UI reutilizable.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 393. frontend/src/modules/gestion_usuarios/context/AuthContext.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 6000 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 394. frontend/src/modules/gestion_usuarios/estructura_limpia.txt
- Área: Frontend
- Tipo: Texto plano; tamaño aproximado 1114 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 395. frontend/src/modules/gestion_usuarios/hooks/useUsers.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1596 bytes.
- Rol inferido: Hook de React o lógica de UI.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 396. frontend/src/modules/gestion_usuarios/pages/ActivityLog.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 4343 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 397. frontend/src/modules/gestion_usuarios/pages/ChangePassword.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 5375 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 398. frontend/src/modules/gestion_usuarios/pages/Dashboard.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 3087 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 399. frontend/src/modules/gestion_usuarios/pages/Login.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 12373 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 400. frontend/src/modules/gestion_usuarios/pages/PermissionsDialog.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 8744 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 401. frontend/src/modules/gestion_usuarios/pages/Profile.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 10275 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 402. frontend/src/modules/gestion_usuarios/pages/Register.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 6712 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 403. frontend/src/modules/gestion_usuarios/pages/UsersAdmin.tsx
- Área: Frontend
- Tipo: React/TSX; tamaño aproximado 6234 bytes.
- Rol inferido: Página o vista de aplicación.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 404. frontend/src/modules/gestion_usuarios/services/authService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 2627 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 405. frontend/src/modules/gestion_usuarios/services/permisoService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 969 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 406. frontend/src/modules/gestion_usuarios/services/userService.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 1030 bytes.
- Rol inferido: Servicio o capa de integración.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 407. frontend/src/modules/gestion_usuarios/types/permissionTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 177 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 408. frontend/src/modules/gestion_usuarios/types/userTypes.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 324 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 409. frontend/src/theme.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 6515 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 410. frontend/src/types/pagination.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 175 bytes.
- Rol inferido: Definiciones de tipos/contratos.
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 411. frontend/src/vite-env.d.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 38 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 412. frontend/tailwind.config.js
- Área: Frontend
- Tipo: JavaScript; tamaño aproximado 4019 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 413. frontend/tsconfig.app.json
- Área: Frontend
- Tipo: JSON de configuración; tamaño aproximado 701 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 414. frontend/tsconfig.json
- Área: Frontend
- Tipo: JSON de configuración; tamaño aproximado 119 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 415. frontend/tsconfig.node.json
- Área: Frontend
- Tipo: JSON de configuración; tamaño aproximado 593 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.

### 416. frontend/vite.config.ts
- Área: Frontend
- Tipo: TypeScript; tamaño aproximado 164 bytes.
- Rol inferido: Otro (requiere revisión manual).
- Validaciones sugeridas: Alinear uso de estado con Redux/hook del módulo; evitar caches paralelas. Revisar que los contratos de API estén alineados con `notification` y `meta` unificados.
