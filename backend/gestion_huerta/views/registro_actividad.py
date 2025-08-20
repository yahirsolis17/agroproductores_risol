# gestion_usuarios/views/registro_actividad.py

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from gestion_usuarios.permissions import IsAdmin
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import OrderingFilter

from gestion_usuarios.models import RegistroActividad
from gestion_usuarios.serializers import RegistroActividadSerializer

class ActivityPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

class RegistroActividadViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lectura de historial de actividad, paginado con el formato DRF estándar:
      { count, next, previous, results: [ ... ] }
    """
    queryset = RegistroActividad.objects.select_related('usuario') \
                .order_by('-fecha_hora')
    serializer_class = RegistroActividadSerializer
    pagination_class = ActivityPagination
    permission_classes = [IsAuthenticated, IsAdmin]  # Sólo admins

    filter_backends = [OrderingFilter]
    ordering_fields = ['fecha_hora']
    ordering = ['-fecha_hora']
