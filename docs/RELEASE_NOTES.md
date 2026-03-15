# Release Notes

Fecha de cierre: 2026-03-14
Estado: Release-ready

## Resumen

El sistema `agroproductores_risol` queda en estado `release-ready` sobre el stack actual `MariaDB + Django + React`.

Este cierre cubre:

- endurecimiento de configuracion y seguridad por defecto,
- eliminacion de fallbacks inseguros en permisos,
- enforcement de invariantes criticos de negocio en modelos,
- migraciones deterministas en MariaDB,
- suite de pruebas y smoke pack operativos,
- restauracion del pipeline de CI.

## Gates validados

Backend:

- `python manage.py makemigrations --check --dry-run` -> OK
- `python manage.py check --database default` -> OK
- `python manage.py migrate --noinput` -> OK
- `python manage.py test --noinput` -> OK (`73` tests)

Guardrails:

- `python check_response_canon.py` -> OK
- `python check_message_keys_canon.py` -> OK
- `python check_no_react_query.py` -> OK
- `python check_ts_core_guard.py` -> OK

Frontend:

- `npm ci` -> OK
- `npm run typecheck` -> OK
- `npm run lint` -> OK con warnings no bloqueantes
- `npm run build` -> OK con warnings no bloqueantes

Smoke pack:

- `python backend/seed_testing_bodega.py` -> OK
- `python backend/verify_queues.py` -> OK
- `python test_all_endpoints.py` -> OK
- `python test_reportes_bodega.py` -> OK

## Cambios de release

Configuracion y seguridad:

- `backend/agroproductores_risol/settings.py`
  - carga de `.env` mediante `python-dotenv`,
  - variables criticas obligatorias en startup,
  - contrato explicito de base de datos incluyendo `DB_TEST_NAME`,
  - endurecimiento de `DEBUG`, `SECRET_KEY` y `ALLOWED_HOSTS`,
  - configuracion estricta de MySQL,
  - silenciamiento controlado de `models.W036` solo despues de mover enforcement al modelo.
- `backend/gestion_bodega/permissions.py`
  - eliminacion de fallback inseguro,
  - import directo desde `gestion_usuarios.permissions`.

Integridad de negocio:

- `backend/gestion_bodega/models.py`
  - `clean()` y `full_clean()` integrados para:
    - `TemporadaBodega`
    - `Recepcion`
    - `ClasificacionEmpaque`
    - `CamionSalida`
    - `CierreSemanal`
  - validacion de semanas, temporadas, duplicados activos, overpacking y coherencia de fechas.

Migraciones:

- `backend/gestion_bodega/migrations/0015_remove_pedido_cliente_and_more.py`
  - endurecida para ejecucion idempotente en bases frescas o con drift.
- `backend/gestion_bodega/migrations/0016_alter_abonomadera_fecha_alter_consumible_fecha_and_more.py`
  - versionada para alinear el estado real del modelo con migraciones.

Permisos, auditoria y compatibilidad:

- endurecimiento de `required_permissions` en viewsets de `gestion_bodega`,
- uso de `ViewSetAuditMixin` y `registrar_actividad` en operaciones clave,
- compatibilidad mantenida en listados de recepciones con salida `results` y `recepciones`.

Smoke y CI:

- `backend/smoke_utils.py` normaliza contexto y seed dinamico,
- scripts de smoke sin rutas absolutas ni IDs hardcodeados,
- `.github/workflows/ci.yml` restaurado sobre `mariadb:11.4`.

## Contrato de entorno

Variables backend obligatorias:

- `DJANGO_DEBUG`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `DB_TEST_NAME`
- `DATABASE_URL` o el set completo:
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_HOST`
  - `DB_PORT`

Referencia:

- `backend/agroproductores_risol/.env.example`

## Riesgos conocidos no bloqueantes

- `npm run lint` sigue reportando warnings heredados de tipado y hooks, pero no errores.
- `npm run build` emite warnings no bloqueantes de chunk size y de `lottie-web`.
- Existen oportunidades de optimizacion futuras en indices, profiling y caching, pero no bloquean este release.

## Backlog recomendado para siguiente sprint

1. Profiling real de endpoints y consultas antes de nuevas optimizaciones de performance.
2. Reduccion gradual de warnings de frontend.
3. Governance avanzada solo si hay requerimiento operativo:
   - expiracion de contrasenas,
   - object-level permissions,
   - observabilidad adicional.

## Conclusión

El repo queda apto para liberar sobre el alcance actual. Los puntos pendientes identificados corresponden a backlog de mejora, no a bloqueadores de release.
