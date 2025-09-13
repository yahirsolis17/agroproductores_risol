"""
Claves de caché estables para listas/detalles.
Mantén el mismo naming que en el resto del repo.
"""

def k_bodega_list(bodega_id: int, temporada_id: int) -> str:
    return f"bodega:list:{bodega_id}:{temporada_id}"

def k_mov_plastico_list(bodega_id: int, temporada_id: int) -> str:
    return f"bodega:invplast:movs:{bodega_id}:{temporada_id}"

def k_pedidos_list(bodega_id: int, temporada_id: int, estado: str | None = None) -> str:
    if estado:
        return f"bodega:pedidos:{bodega_id}:{temporada_id}:{estado}"
    return f"bodega:pedidos:{bodega_id}:{temporada_id}"

def k_cierres_semana(bodega_id: int, temporada_id: int) -> str:
    return f"bodega:cierres:{bodega_id}:{temporada_id}"

def k_camiones_list(bodega_id: int, temporada_id: int) -> str:
    return f"bodega:camiones:{bodega_id}:{temporada_id}"
