# gestion_huerta/urls.py
# ---------------------------------------------------------------------------
#  Enrutado único y automático con DefaultRouter (DRF)
#  Sustituye todo tu archivo antiguo —no dejes ninguna de las rutas
#  “manuales” para evitar el AssertionError de nombres duplicados.
# ---------------------------------------------------------------------------

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from gestion_huerta.views.huerta_views import (
    PropietarioViewSet,
    HuertaViewSet,
    HuertaRentadaViewSet,
    CosechaViewSet,
    CategoriaInversionViewSet,
    InversionViewSet,
    VentaViewSet,
)

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

# ---- urlpatterns ----
urlpatterns = [
    path("", include(router.urls)),
]
