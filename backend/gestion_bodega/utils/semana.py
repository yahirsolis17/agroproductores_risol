# backend/gestion_bodega/utils/semana.py
from datetime import date
from gestion_bodega.models import CierreSemanal

def semana_cerrada_ids(bodega_id: int, temporada_id: int, f: date) -> bool:
    """
    True si existe un CierreSemanal activo (bodega+temporada) que cubre la fecha f.
    """
    if not (bodega_id and temporada_id and f):
        return False
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha_desde__lte=f,
        fecha_hasta__gte=f,
        is_active=True,
    ).exists()

def semana_cerrada(bodega, temporada, f: date) -> bool:
    """
    Variante que acepta instancias (o None). Hace el mismo check que semana_cerrada_ids.
    """
    if not (bodega and temporada and f):
        return False
    return semana_cerrada_ids(getattr(bodega, "id", None), getattr(temporada, "id", None), f)
