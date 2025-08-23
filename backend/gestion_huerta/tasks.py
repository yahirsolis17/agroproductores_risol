# -*- coding: utf-8 -*-
from __future__ import annotations
import os
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from celery import shared_task
from celery.utils.log import get_task_logger

from django.conf import settings
from django.contrib.auth import get_user_model

from gestion_huerta.services.reportes_produccion_service import ReportesProduccionService
from gestion_huerta.services.exportacion_service import ExportacionService

log = get_task_logger(__name__)
User = get_user_model()

# ------------------------
# helpers
# ------------------------
def _get_user(user_id: Optional[int]):
    if not user_id:
        return None
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

def _persist_bytes(kind: str, ext: str, content: bytes, meta: Dict[str, Any]) -> Dict[str, Any]:
    """
    Guarda el archivo en MEDIA_ROOT/exports/<kind>/... y devuelve url + path.
    Sin dependencias externas (S3). Windows friendly.
    """
    exports_dir = os.path.join(settings.MEDIA_ROOT, getattr(settings, "EXPORTS_SUBDIR", "exports"), kind)
    os.makedirs(exports_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = f"{kind}_{meta.get('id','x')}_{ts}_{uuid.uuid4().hex[:8]}"
    filename = f"{base}.{ext}"
    full_path = os.path.join(exports_dir, filename)

    with open(full_path, "wb") as f:
        f.write(content)

    rel = os.path.join(getattr(settings, "EXPORTS_SUBDIR", "exports"), kind, filename).replace("\\", "/")
    url = f"{settings.MEDIA_URL.rstrip('/')}/{rel}"
    return {"url": url, "path": full_path, "filename": filename, "size": len(content)}

# ------------------------
# tasks (cosecha / temporada / perfil)
# en Windows ejecuta celery con:  celery -A agroproductores_risol worker -l info -P solo -Q exports_light,exports_heavy
# ------------------------

@shared_task(bind=True, name="exports.export_cosecha", queue="exports_light", max_retries=3)
def export_cosecha_task(self, cosecha_id: int, formato: str = "pdf", user_id: Optional[int] = None) -> Dict[str, Any]:
    try:
        self.update_state(state="PROGRESS", meta={"stage": "build", "cosecha_id": cosecha_id})
        user = _get_user(user_id)

        rep = ReportesProduccionService.generar_reporte_cosecha(cosecha_id, user or "system", "json", force_refresh=True)

        self.update_state(state="PROGRESS", meta={"stage": "render", "formato": formato})
        formato_l = (formato or "pdf").lower()
        if formato_l == "pdf":
            blob = ExportacionService.generar_pdf_cosecha(rep)
            ext = "pdf"
        elif formato_l in ("excel", "xlsx"):
            blob = ExportacionService.generar_excel_cosecha(rep)
            ext = "xlsx"
        else:
            raise ValueError("Formato no soportado")

        self.update_state(state="PROGRESS", meta={"stage": "persist"})
        meta = {"id": cosecha_id}
        out = _persist_bytes("cosecha", ext, blob, meta)

        return {"status": "success", "kind": "cosecha", "formato": ext, **out}
    except Exception as e:
        log.exception("export_cosecha_task failed")
        raise self.retry(exc=e, countdown=30)


@shared_task(bind=True, name="exports.export_temporada", queue="exports_light", max_retries=3)
def export_temporada_task(self, temporada_id: int, formato: str = "pdf", user_id: Optional[int] = None) -> Dict[str, Any]:
    try:
        self.update_state(state="PROGRESS", meta={"stage": "build", "temporada_id": temporada_id})
        user = _get_user(user_id)

        rep = ReportesProduccionService.generar_reporte_temporada(temporada_id, user or "system", "json", force_refresh=True)

        self.update_state(state="PROGRESS", meta={"stage": "render", "formato": formato})
        formato_l = (formato or "pdf").lower()
        if formato_l == "pdf":
            blob = ExportacionService.generar_pdf_temporada(rep)
            ext = "pdf"
        elif formato_l in ("excel", "xlsx"):
            blob = ExportacionService.generar_excel_temporada(rep)
            ext = "xlsx"
        else:
            raise ValueError("Formato no soportado")

        self.update_state(state="PROGRESS", meta={"stage": "persist"})
        meta = {"id": temporada_id}
        out = _persist_bytes("temporada", ext, blob, meta)

        return {"status": "success", "kind": "temporada", "formato": ext, **out}
    except Exception as e:
        log.exception("export_temporada_task failed")
        raise self.retry(exc=e, countdown=30)


@shared_task(bind=True, name="exports.export_perfil_huerta", queue="exports_light", max_retries=3)
def export_perfil_huerta_task(
    self,
    *,
    huerta_id: Optional[int] = None,
    huerta_rentada_id: Optional[int] = None,
    años: int = 5,
    formato: str = "pdf",
    user_id: Optional[int] = None,
) -> Dict[str, Any]:
    try:
        if not huerta_id and not huerta_rentada_id:
            raise ValueError("Debe especificar huerta_id o huerta_rentada_id")

        self.update_state(state="PROGRESS", meta={"stage": "build", "huerta_id": huerta_id, "huerta_rentada_id": huerta_rentada_id})
        user = _get_user(user_id)

        rep = ReportesProduccionService.generar_perfil_huerta(
            huerta_id, huerta_rentada_id, user or "system", años=años, formato="json", force_refresh=True
        )

        self.update_state(state="PROGRESS", meta={"stage": "render", "formato": formato})
        formato_l = (formato or "pdf").lower()
        if formato_l == "pdf":
            blob = ExportacionService.generar_pdf_perfil_huerta(rep)
            ext = "pdf"
        elif formato_l in ("excel", "xlsx"):
            blob = ExportacionService.generar_excel_perfil_huerta(rep)
            ext = "xlsx"
        else:
            raise ValueError("Formato no soportado")

        self.update_state(state="PROGRESS", meta={"stage": "persist"})
        meta = {"id": huerta_id or huerta_rentada_id or "x"}
        out = _persist_bytes("perfil_huerta", ext, blob, meta)

        return {"status": "success", "kind": "perfil_huerta", "formato": ext, **out}
    except Exception as e:
        log.exception("export_perfil_huerta_task failed")
        raise self.retry(exc=e, countdown=30)


# Alias para compatibilidad con nombres antiguos
exportar_cosecha_task = export_cosecha_task
exportar_temporada_task = export_temporada_task
exportar_perfil_huerta_task = export_perfil_huerta_task
