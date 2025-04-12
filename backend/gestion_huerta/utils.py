# agroproductores_risol/backend/agroproductores_risol/utils.py

import logging
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Sum, Q, Value
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

def registrar_actividad(usuario, accion, detalles=None):
    """
    Registra la actividad de un usuario.
    """
    try:
        from gestion_huerta.models import RegistroActividad
        RegistroActividad.objects.create(usuario=usuario, accion=accion, detalles=detalles)
        logger.info(f"Actividad registrada: {accion} por usuario {usuario}")
    except Exception as e:
        logger.error(f"Error al registrar actividad: {e}")

def paginar_queryset(queryset, page_number, items_per_page=10):
    """
    Paginación de querysets.
    """
    paginator = Paginator(queryset, items_per_page)
    try:
        page_obj = paginator.page(page_number)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)
    except Exception as e:
        logger.error(f"Error al paginar queryset: {e}")
        page_obj = paginator.page(1)
    return page_obj, paginator.num_pages

def aplicar_filtros(queryset, filtros, operadores=None):
    """
    Aplica filtros dinámicos a un queryset.
    """
    operadores = operadores or {}
    try:
        for campo, valor in filtros.items():
            if valor:
                operador = operadores.get(campo, 'icontains')
                filtro = {f"{campo}__{operador}": valor}
                queryset = queryset.filter(**filtro)
        return queryset
    except Exception as e:
        logger.error(f"Error al aplicar filtros: {e}")
        raise ValidationError("Error al aplicar los filtros.")

def validate_telefono(telefono):
    """
    Valida que el teléfono tenga 10 dígitos y solo números.
    """
    if not telefono.isdigit():
        raise ValidationError("El teléfono debe contener solo números.")
    if len(telefono) != 10:
        raise ValidationError("El teléfono debe tener 10 dígitos.")
    return telefono

def get_tokens_for_user(user):
    """
    Genera tokens JWT para el usuario.
    """
    try:
        refresh = RefreshToken.for_user(user)
        tokens = {'refresh': str(refresh), 'access': str(refresh.access_token)}
        logger.info(f"Tokens generados para el usuario {user}")
        return tokens
    except Exception as e:
        logger.error(f"Error al generar tokens para el usuario {user}: {e}")
        raise ValidationError("Error al generar tokens para el usuario.")

def standard_response(success, message, data=None, errors=None):
    """
    Estandariza las respuestas JSON de la API.
    """
    response = {"success": success, "message": message, "data": data or {}, "errors": errors or {}}
    if not success:
        logger.warning(f"Error en la respuesta: {response}")
    return response
