# backend/gestion_bodega/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.recepciones_views import RecepcionViewSet
from .views.empaques_views import ClasificacionEmpaqueViewSet
from .views.inventarios_views import InventarioPlasticoViewSet
from .views.compras_madera_views import CompraMaderaViewSet
from .views.pedidos_views import PedidoViewSet
from .views.camiones_views import CamionSalidaViewSet
from .views.consumibles_views import ConsumibleViewSet
from .views.cierres_views import CierresViewSet
from .views.lotes_views import LoteBodegaViewSet
from .views.reportes.reporte_semanal_views import ReporteSemanalView
from .views.reportes.reporte_temporada_views import ReporteTemporadaView
from .views.bodegas_views import (
    BodegaViewSet,
    ClienteViewSet,
    TemporadaBodegaViewSet,
)

from .views.tablero_views import (
    TableroBodegaSummaryView,
    TableroBodegaQueuesView,
    TableroBodegaAlertsView,
    TableroBodegaWeekCurrentView,
    TableroBodegaWeekStartView,
    TableroBodegaWeekFinishView,
    TableroBodegaWeeksNavView,
)

app_name = "gestion_bodega"

router = DefaultRouter()
router.register(r"bodegas", BodegaViewSet, basename="bodegas")
router.register(r"clientes", ClienteViewSet, basename="clientes")
router.register(r"temporadas", TemporadaBodegaViewSet, basename="temporadas")
router.register(r"lotes", LoteBodegaViewSet, basename="lotes") # Nuevo endpoint
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

    # Reportes
    path("reportes/semanal/",   ReporteSemanalView.as_view(),   name="reporte-semanal"),
    path("reportes/temporada/", ReporteTemporadaView.as_view(), name="reporte-temporada"),

    # Tablero: KPIs, colas y alertas
    path("tablero/summary/", TableroBodegaSummaryView.as_view(), name="bodega-tablero-summary"),
    path("tablero/queues/",  TableroBodegaQueuesView.as_view(),  name="bodega-tablero-queues"),
    path("tablero/alerts/",  TableroBodegaAlertsView.as_view(),  name="bodega-tablero-alerts"),

    # Tablero: gestión/navegación de semanas (manual)
    path("tablero/week/current/", TableroBodegaWeekCurrentView.as_view(), name="bodega-tablero-week-current"),
    path("tablero/week/start/",   TableroBodegaWeekStartView.as_view(),   name="bodega-tablero-week-start"),
    path("tablero/week/finish/",  TableroBodegaWeekFinishView.as_view(),  name="bodega-tablero-week-finish"),
    path("tablero/semanas/",      TableroBodegaWeeksNavView.as_view(),    name="bodega-tablero-weeks-nav"),
]
