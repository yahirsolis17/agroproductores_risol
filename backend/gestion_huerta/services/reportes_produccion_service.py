# -*- coding: utf-8 -*-
"""
ReportesProduccionService (Fachada Legacy)
------------------------------------------
Responsabilidad:
- Exponer una interfaz estable para generar/exportar reportes de:
  * Cosecha
  * Temporada
  * Perfil de Huerta

Esta clase delega en los servicios específicos por entidad sin alterar
la forma de los datos: actúa como capa de compatibilidad (legacy).

Notas:
- Mantiene la firma y orden de parámetros (incl. `años` y `force_refresh`).
- Ideal para usar desde vistas/DRF sin acoplarse a implementaciones internas.
"""
from __future__ import annotations
from typing import Optional, Dict, Any

from gestion_huerta.services.reportes.cosecha_service import (
    generar_reporte_cosecha as _gen_cosecha,
    exportar_cosecha as _exp_cosecha,
)
from gestion_huerta.services.reportes.temporada_service import (
    generar_reporte_temporada as _gen_temporada,
    exportar_temporada as _exp_temporada,
)
from gestion_huerta.services.reportes.perfil_huerta_service import (
    generar_perfil_huerta as _gen_perfil,
    exportar_perfil_huerta as _exp_perfil,
)

class ReportesProduccionService:
    """Fachada legacy que delega a los servicios por entidad."""

    # --------- GENERACIÓN (JSON) ---------
    @staticmethod
    def generar_reporte_cosecha(
        cosecha_id: int,
        usuario,
        formato: str = "json",
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        return _gen_cosecha(cosecha_id, usuario, formato, force_refresh)

    @staticmethod
    def generar_reporte_temporada(
        temporada_id: int,
        usuario,
        formato: str = "json",
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        return _gen_temporada(temporada_id, usuario, formato, force_refresh)

    @staticmethod
    def generar_perfil_huerta(
        huerta_id: Optional[int],
        huerta_rentada_id: Optional[int],
        usuario,
        años: int = 5,
        formato: str = "json",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        return _gen_perfil(huerta_id, huerta_rentada_id, usuario, años, formato, force_refresh)

    # --------- EXPORTACIÓN (bytes) ---------
    @staticmethod
    def exportar_cosecha(cosecha_id: int, usuario, formato: str) -> bytes:
        return _exp_cosecha(cosecha_id, usuario, formato)

    @staticmethod
    def exportar_temporada(temporada_id: int, usuario, formato: str) -> bytes:
        return _exp_temporada(temporada_id, usuario, formato)

    @staticmethod
    def exportar_perfil_huerta(
        huerta_id: Optional[int],
        huerta_rentada_id: Optional[int],
        usuario,
        formato: str,
        años: int = 5,
    ) -> bytes:
        # Mantiene el orden esperado por _exp_perfil(huerta_id, huerta_rentada_id, usuario, formato, años)
        return _exp_perfil(huerta_id, huerta_rentada_id, usuario, formato, años)
