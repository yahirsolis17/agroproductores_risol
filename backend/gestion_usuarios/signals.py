from __future__ import annotations

from typing import Iterable

from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.apps import apps as django_apps
from .permissions_policy import allowed_prefixes_for


# Apps del dominio a las que se les generarán permisos extra
ALLOWED_APPS: set[str] = {
    "gestion_usuarios",
    "gestion_huerta",
    "gestion_bodega",
}

# Conjunto de acciones personalizadas a crear por modelo
EXTRA_ACTION_PREFIXES: tuple[str, ...] = (
    "archive_",
    "restore_",
    "finalize_",
    "reactivate_",
    "exportpdf_",
    "exportexcel_",
)


def _ensure_permissions_for_model(model) -> list[str]:
    """
    Crea (get_or_create) permisos personalizados para un modelo dado.
    Devuelve la lista de codenames creados/existentes.
    """
    created_or_existing: list[str] = []
    ct = ContentType.objects.get_for_model(model)
    model_name = model._meta.model_name  # ej: 'huerta', 'bodega'
    verbose = (getattr(model._meta, "verbose_name", None) or model_name).capitalize()

    # Capabilities-policy driven: sólo los prefijos permitidos para este modelo
    app_label = model._meta.app_label
    allowed = allowed_prefixes_for((app_label, model_name))
    # Ya no generamos CRUD; Django los crea con create_permissions().
    for prefix in allowed:
        if prefix in {"add_", "change_", "delete_", "view_"}:
            continue
        codename = f"{prefix}{model_name}"
        name = _permission_name_from_prefix(prefix, verbose)
        Permission.objects.get_or_create(
            content_type=ct,
            codename=codename,
            defaults={"name": name},
        )
        created_or_existing.append(codename)
    return created_or_existing


def _permission_name_from_prefix(prefix: str, verbose_model: str) -> str:
    mapping = {
        "archive_": f"Puede archivar {verbose_model}",
        "restore_": f"Puede restaurar {verbose_model}",
        "finalize_": f"Puede finalizar {verbose_model}",
        "reactivate_": f"Puede reactivar {verbose_model}",
        "exportpdf_": f"Puede exportar {verbose_model} a PDF",
        "exportexcel_": f"Puede exportar {verbose_model} a Excel",
    }
    return mapping.get(prefix, f"Permiso personalizado para {verbose_model}")


_HAS_RUN = False  # evita ejecuciones repetidas en el mismo proceso


@receiver(post_migrate)
def ensure_custom_permissions(sender, app_config, **kwargs):
    """
    Tras cada migrate, garantiza los permisos extra para modelos
    de las apps del dominio. Corre una vez por proceso y es idempotente.
    """
    global _HAS_RUN
    if _HAS_RUN:
        return

    # Ejecuta sólo si la app que dispara es parte del dominio o gestion_usuarios,
    # pero crea permisos para TODAS las apps objetivo presentes.
    if not app_config or app_config.label not in ALLOWED_APPS:
        # Aun si otra app disparó la señal, no bloqueamos si ya corrió antes.
        return

    try:
        for label in ALLOWED_APPS:
            cfg = django_apps.get_app_config(label)
            # Omite apps sin módulo de modelos cargado
            if not getattr(cfg, 'models_module', None):
                continue
            for model in cfg.get_models():
                _ensure_permissions_for_model(model)
        _HAS_RUN = True
    except Exception:
        # Evita romper migrate si algo falla; el comando rebuild_permissions
        # actúa como red de seguridad.
        pass
