from django.db.models import Sum
from ..models import ClasificacionEmpaque, SurtidoRenglon, CamionConsumoEmpaque

def get_disponible_for_clasificacion(clasificacion_id: int, lock: bool = False) -> int:
    """
    Retorna la cantidad disponible de una clasificación.
    Disponible = Cantidad Total - (Surtidos + ConsumosCamion)
    """
    try:
        qs = ClasificacionEmpaque.objects.filter(pk=clasificacion_id)
        if lock:
            qs = qs.select_for_update()
        obj = qs.get()
    except ClasificacionEmpaque.DoesNotExist:
        return 0
    
    total = obj.cantidad_cajas or 0
    
    # Consumo por Pedidos (Surtidos)
    surtido = SurtidoRenglon.objects.filter(
        origen_clasificacion_id=clasificacion_id,
        is_active=True
    ).aggregate(t=Sum("cantidad"))["t"] or 0
    
    # Consumo por Camiones
    camiones = CamionConsumoEmpaque.objects.filter(
        clasificacion_empaque_id=clasificacion_id,
        is_active=True
    ).aggregate(t=Sum("cantidad"))["t"] or 0
    
    return max(0, total - (surtido + camiones))

def validate_consumo_camion(clasificacion_id: int, cantidad: int, exclude_id: int = None, lock: bool = False):
    """
    Valida si hay stock suficiente para un consumo.
    Lanza ValueError si no hay suficiente.
    """
    available = get_disponible_for_clasificacion(clasificacion_id, lock=lock)
    
    if exclude_id:
        # Si estamos editando un consumo existente, debemos sumar su propia cantidad actual al disponible
        try:
            current = CamionConsumoEmpaque.objects.get(pk=exclude_id)
            if current.clasificacion_empaque_id == clasificacion_id:
                available += current.cantidad
        except CamionConsumoEmpaque.DoesNotExist:
            pass
            
    if cantidad > available:
        raise ValueError(f"Stock insuficiente. Disponible: {available}")
    
    return True
