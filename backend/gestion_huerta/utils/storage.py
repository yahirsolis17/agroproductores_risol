# -*- coding: utf-8 -*-
import os
from pathlib import Path
from django.conf import settings

def save_bytes(relative_path: str, data: bytes) -> str:
    """
    Guarda bytes en media/<relative_path> y devuelve la ruta absoluta.
    """
    base = Path(settings.MEDIA_ROOT) / relative_path
    base.parent.mkdir(parents=True, exist_ok=True)
    with open(base, "wb") as f:
        f.write(data)
    return str(base)

def build_relative_path(subdir: str, filename: str) -> str:
    return os.path.join(settings.EXPORTS_DIR, subdir, filename)

def build_public_url(relative_path: str) -> str:
    """
    Para local: MEDIA_URL + relative_path. (Detrás del reverso, sirve para el FE).
    """
    return settings.MEDIA_URL.rstrip("/") + "/" + relative_path.replace("\\", "/")
