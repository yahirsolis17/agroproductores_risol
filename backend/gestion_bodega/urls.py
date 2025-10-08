# backend/gestion_bodega/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# --- Tus otros viewsets ya existentes ---
from .views.recepciones_views import RecepcionViewSet
from .views.empaques_views import ClasificacionEmpaqueViewSet
from .views.inventarios_views import InventarioPlasticoViewSet
from .views.compras_madera_views import CompraMaderaViewSet
from .views.pedidos_views import PedidoViewSet
from .views.camiones_views import CamionSalidaViewSet
from .views.consumibles_views import ConsumibleViewSet
from .views.cierres_views import CierresViewSet

# --- NUEVOS: Bodega, Cliente, TemporadaBodega ---
from .views.bodegas_views import (
    BodegaViewSet,
    ClienteViewSet,
    TemporadaBodegaViewSet,
)

app_name = "gestion_bodega"

router = DefaultRouter()
# Catálogo núcleo de bodega
router.register(r"bodegas", BodegaViewSet, basename="bodegas")
router.register(r"clientes", ClienteViewSet, basename="clientes")
router.register(r"temporadas", TemporadaBodegaViewSet, basename="temporadas")

# Resto de endpoints que ya tenías
router.register(r"recepciones", RecepcionViewSet, basename="recepciones")
router.register(r"empaques", ClasificacionEmpaqueViewSet, basename="empaques")
router.register(r"inventario-plastico", InventarioPlasticoViewSet, basename="inventario-plastico")
router.register(r"compras-madera", CompraMaderaViewSet, basename="compras-madera")
router.register(r"pedidos", PedidoViewSet, basename="pedidos")
router.register(r"camiones", CamionSalidaViewSet, basename="camiones")
router.register(r"consumibles", ConsumibleViewSet, basename="consumibles")
router.register(r"cierres", CierresViewSet, basename="cierres")

urlpatterns = [
    path("", include(router.urls)),
]
