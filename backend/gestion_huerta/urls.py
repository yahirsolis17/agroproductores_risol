# backend/gestion_huerta/urls.py

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from gestion_huerta.views.huerta_views import (
    HuertaViewSet,
    HuertaRentadaViewSet,
    PropietarioViewSet,
    HuertasCombinadasViewSet
)
from gestion_huerta.views.inversiones_views import InversionHuertaViewSet
from gestion_huerta.views.categoria_inversion_views import CategoriaInversionViewSet
from gestion_huerta.views.cosechas_views import CosechaViewSet
from gestion_huerta.views.ventas_views import VentaViewSet
from gestion_huerta.views.temporadas_views import TemporadaViewSet
from gestion_huerta.views.registro_actividad import RegistroActividadViewSet

# ⬇️ IMPORTA el ViewSet de reportes
from gestion_huerta.views.informes_views import ReportesViewSet
from gestion_huerta.views.reportes_produccion_views import ReportesProduccionViewSet

app_name = "gestion_huerta"

router = DefaultRouter()
router.register(r"propietarios", PropietarioViewSet, basename="propietario")
router.register(r"huertas", HuertaViewSet, basename="huerta")
router.register(r"huertas-rentadas", HuertaRentadaViewSet, basename="huerta-rentada")
router.register(r"cosechas", CosechaViewSet, basename="cosecha")
router.register(r"categorias-inversion", CategoriaInversionViewSet, basename="categorias-inversion")
router.register(r"inversiones", InversionHuertaViewSet, basename="inversion")
router.register(r"ventas", VentaViewSet, basename="venta")
router.register(r"temporadas", TemporadaViewSet, basename="temporada")
router.register(r"actividad", RegistroActividadViewSet, basename="actividad")
router.register(r"huertas-combinadas", HuertasCombinadasViewSet, basename="huertas-combinadas")

# ⬇️ REGISTRA el módulo de reportes
router.register(r"informes", ReportesViewSet, basename="informes")
router.register(r"reportes-produccion", ReportesProduccionViewSet, basename="reportes-produccion")

urlpatterns = [
    path("", include(router.urls)),
]
