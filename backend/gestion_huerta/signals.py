from __future__ import annotations

from django.db import transaction
from django.db.models.signals import post_delete, post_save

from gestion_huerta.models import (
    CategoriaPreCosecha,
    Cosecha,
    Huerta,
    HuertaRentada,
    InversionesHuerta,
    PreCosecha,
    Propietario,
    Temporada,
    Venta,
)
from gestion_huerta.utils.cache_keys import bump_reportes_cache_generation


REPORTES_INVALIDATION_MODELS = (
    Propietario,
    Huerta,
    HuertaRentada,
    Temporada,
    CategoriaPreCosecha,
    Cosecha,
    InversionesHuerta,
    Venta,
    PreCosecha,
)


def _schedule_report_cache_invalidation(**kwargs) -> None:
    if kwargs.get("raw"):
        return
    transaction.on_commit(bump_reportes_cache_generation)


for model in REPORTES_INVALIDATION_MODELS:
    post_save.connect(
        _schedule_report_cache_invalidation,
        sender=model,
        weak=False,
        dispatch_uid=f"gestion_huerta.reportes.invalidate.save.{model._meta.label_lower}",
    )
    post_delete.connect(
        _schedule_report_cache_invalidation,
        sender=model,
        weak=False,
        dispatch_uid=f"gestion_huerta.reportes.invalidate.delete.{model._meta.label_lower}",
    )
