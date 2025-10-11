Permisos y Nomenclatura

- Prefijos válidos por acción:
  - add_, change_, delete_, view_
  - archive_, restore_
  - finalize_, reactivate_
  - exportpdf_, exportexcel_

- Entidades (sufijos) en singular, usando `model_name` de Django (minúsculas):
  - gestion_huerta: huerta, huertarentada, temporada, cosecha, propietario, categoriainversion, inversioneshuerta, venta
  - gestion_bodega: bodega, temporadabodega, cliente, recepcion, clasificacionempaque, pedido, camionsalida, consumible
  - gestion_usuarios: users, registroactividad

  Nota: mantener “huertarentada” sin guiones y en minúsculas (no usar huerta_rentada ni huerta-rentada).

- Ejemplos:
  - archive_huerta, restore_huerta
  - finalize_temporada, reactivate_temporada
  - exportpdf_cosecha, exportexcel_cosecha
  - exportpdf_temporada, exportexcel_temporada
  - exportpdf_huerta, exportexcel_huerta
  - exportpdf_huertarentada, exportexcel_huertarentada

- Generación automática:
  - Tras `migrate`, se crean permisos personalizados vía señal `post_migrate` (ver `gestion_usuarios/signals.py`).
  - Comando manual: `python manage.py rebuild_permissions`.

- API y UI:
  - La API de permisos filtra por estas apps y prefijos (ver `gestion_usuarios/views/user_views.py`).
  - El frontend muestra etiquetas amigables basadas en el prefijo y el módulo.

- Política de exportación (AND):
  - Exportar requiere Ver: para exportar PDF/Excel de una entidad, el usuario debe tener tanto `view_<entidad>` como `exportpdf_`/`exportexcel_` correspondientes.
  - Message keys sugeridos cuando falte alguno: `export_requires_view`, `export_denied_no_view`, `export_denied_no_export`.

- Policy por entidad (capabilities):
  - Cada modelo declara `capabilities` en `gestion_usuarios/permissions_policy.py`:
    - `crud` → add_, change_, delete_, view_
    - `archive` → archive_, restore_
    - `lifecycle` → finalize_, reactivate_
    - `export` → exportpdf_, exportexcel_
  - La señal `post_migrate` + comando `rebuild_permissions` generan sólo los permisos definidos por la policy (no plantilla).
  - La API filtra por la misma policy; si un permiso no aplica a un modelo, no se expone.
  - Comando opcional para limpieza: `python manage.py prune_permissions` (elimina permisos fuera de la policy; conserva CRUD si el modelo no está declarado).

- UX de acciones restringidas:
  - Regla global: deshabilitar controles sin permiso (no ocultar). Incluir tooltip “No tienes permiso”.
  - Componentes: `PermissionButton`, `ActionsMenu`, toolbar de reportes.

- Auditoría:
  - Exportaciones registran `RegistroActividad` con acción (“Exportación PDF/Excel – <Reporte>”) y los filtros/IDs usados.
  - Ver implementaciones en los viewsets de reportes.
