# backend/gestion_huerta/urls.py

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from gestion_huerta.views.huerta_views import (
    HuertaViewSet,
    HuertaRentadaViewSet,
    PropietarioViewSet,
    HuertasCombinadasViewSet,
)
from gestion_huerta.views.inversiones_views import InversionHuertaViewSet
from gestion_huerta.views.categoria_inversion_views import CategoriaInversionViewSet
from gestion_huerta.views.cosechas_views import CosechaViewSet
from gestion_huerta.views.ventas_views import VentaViewSet
from gestion_huerta.views.temporadas_views import TemporadaViewSet

# === IMPORTS de NUEVAS VISTAS DE REPORTES ===
from gestion_huerta.views.reportes.cosecha_views import CosechaReportViewSet
from gestion_huerta.views.reportes.temporada_views import TemporadaReportViewSet
from gestion_huerta.views.reportes.perfil_huerta_views import PerfilHuertaReportViewSet

app_name = "gestion_huerta"

# Router principal (resto de módulos)
router = DefaultRouter()
router.register(r"propietarios", PropietarioViewSet, basename="propietario")
router.register(r"huertas", HuertaViewSet, basename="huerta")
router.register(r"huertas-rentadas", HuertaRentadaViewSet, basename="huerta-rentada")
router.register(r"cosechas", CosechaViewSet, basename="cosecha")
router.register(r"categorias-inversion", CategoriaInversionViewSet, basename="categorias-inversion")
router.register(r"inversiones", InversionHuertaViewSet, basename="inversion")
router.register(r"ventas", VentaViewSet, basename="venta")
router.register(r"temporadas", TemporadaViewSet, basename="temporada")
router.register(r"huertas-combinadas", HuertasCombinadasViewSet, basename="huertas-combinadas")

# Router de reportes (mismo prefijo '/reportes' con vistas separadas)
reportes_router = DefaultRouter()
reportes_router.register(r"reportes", CosechaReportViewSet, basename="reportes-cosecha")
reportes_router.register(r"reportes", TemporadaReportViewSet, basename="reportes-temporada")
reportes_router.register(r"reportes", PerfilHuertaReportViewSet, basename="reportes-perfil-huerta")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(reportes_router.urls)),  # expone /reportes/cosecha, /reportes/temporada, /reportes/perfil-huerta, /reportes/estadisticas, etc.
]
