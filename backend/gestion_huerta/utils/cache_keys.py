# -*- coding: utf-8 -*-
from __future__ import annotations

import hashlib
import json
import os

# Config centralizada de cache para reportes (parametrizable por variables de entorno)
# Si no hay variables, se usan defaults actuales para no romper comportamientos
REPORTES_CACHE_TIMEOUT = int(os.getenv("REPORTES_CACHE_TIMEOUT", "10"))  # segundos
REPORTES_CACHE_VERSION = os.getenv("REPORTES_CACHE_VERSION", "1.3.2")

def generate_cache_key(tipo: str, parametros: dict, version: str = REPORTES_CACHE_VERSION) -> str:
    data = {"tipo": tipo, "params": parametros, "version": version}
    s = json.dumps(data, sort_keys=True, default=str)
    return f"reporte_{hashlib.md5(s.encode()).hexdigest()}"
