# gestion_huerta/urls.py
# ---------------------------------------------------------------------------
#  Enrutado único y automático con DefaultRouter (DRF)
#  Sustituye todo tu archivo antiguo —no dejes ninguna de las rutas
#  “manuales” para evitar el AssertionError de nombres duplicados.
# ---------------------------------------------------------------------------

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from gestion_huerta.views.huerta_views import (
    HuertaViewSet,
    HuertaRentadaViewSet,
    PropietarioViewSet,
)

from gestion_huerta.views.inversiones_views import (
    CategoriaInversionViewSet,
    InversionViewSet,
)

from gestion_huerta.views.cosechas_views import CosechaViewSet
from gestion_huerta.views.ventas_views import VentaViewSet
from gestion_huerta.views.temporadas_views import TemporadaViewSet
app_name = "gestion_huerta"

# ---- router ----
router = DefaultRouter()
router.register(r"propietarios", PropietarioViewSet, basename="propietario")
router.register(r"huertas", HuertaViewSet, basename="huerta")
router.register(r"huertas-rentadas", HuertaRentadaViewSet, basename="huerta-rentada")
router.register(r"cosechas", CosechaViewSet, basename="cosecha")
router.register(r"categorias", CategoriaInversionViewSet, basename="categoria")
router.register(r"inversiones", InversionViewSet, basename="inversion")
router.register(r"ventas", VentaViewSet, basename="venta")
router.register(r"temporadas", TemporadaViewSet, basename="temporada")

# ---- urlpatterns ----
urlpatterns = [
    path("", include(router.urls)),
]
