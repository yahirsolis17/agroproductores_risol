# -*- coding: utf-8 -*-
"""
Cache Keys para Reportes
------------------------
Responsabilidad:
- Centralizar la política de cache (timeout, versión) y la generación de claves
  estables para todos los reportes.

Uso:
- REPORTES_CACHE_TIMEOUT: segundos de vida del cache (configurable por env).
- REPORTES_CACHE_VERSION: "rompe cache" cuando cambian shape de datos/reglas.

generate_cache_key(tipo, parametros):
- `tipo` agrupa la entidad/uso (p.ej. "cosecha", "temporada", "perfil_huerta").
- `parametros` debe incluir los discriminantes relevantes (IDs, formato, uid, etc.).
- Se serializa con orden y `default=str` para soportar tipos no JSON (datetime/Decimal).
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Dict, Any

# Config centralizada de cache para reportes (parametrizable por variables de entorno)
# Defaults más realistas para reportes (ajusta en producción vía envs).
REPORTES_CACHE_TIMEOUT: int = int(os.getenv("REPORTES_CACHE_TIMEOUT", "300"))  # segundos
REPORTES_CACHE_VERSION: str = os.getenv("REPORTES_CACHE_VERSION", "1.3.3")

def generate_cache_key(tipo: str, parametros: Dict[str, Any], version: str = REPORTES_CACHE_VERSION) -> str:
    """
    Genera una clave de caché estable y corta (md5) a partir de:
      - tipo: nombre lógico del reporte
      - parametros: discriminantes (IDs/uid/formato/etc.)
      - version: string de versión de esquema/reglas para invalidación global
    """
    data = {"tipo": tipo, "params": parametros, "version": version}
    s = json.dumps(data, sort_keys=True, default=str)  # tolera datetime/Decimal
    digest = hashlib.md5(s.encode()).hexdigest()
    return f"reporte_{digest}"
