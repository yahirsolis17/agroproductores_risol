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
    HuertasCombinadasViewSet
)

from gestion_huerta.views.inversiones_views import (
    InversionHuertaViewSet,
)

from gestion_huerta.views.categoria_inversion_views import CategoriaInversionViewSet
from gestion_huerta.views.cosechas_views import CosechaViewSet
from gestion_huerta.views.ventas_views import VentaViewSet
from gestion_huerta.views.temporadas_views import TemporadaViewSet
from gestion_huerta.views.registro_actividad import RegistroActividadViewSet
from gestion_huerta.views.informes_views import InformesViewSet
app_name = "gestion_huerta"

# ---- router ----
router = DefaultRouter()
router.register(r"propietarios", PropietarioViewSet, basename="propietario")
router.register(r"huertas", HuertaViewSet, basename="huerta")
router.register(r"huertas-rentadas", HuertaRentadaViewSet, basename="huerta-rentada")
router.register(r"cosechas", CosechaViewSet, basename="cosecha")
router.register(r'categorias-inversion', CategoriaInversionViewSet, basename='categorias-inversion')
router.register(r"inversiones", InversionHuertaViewSet, basename="inversion")
router.register(r"ventas", VentaViewSet, basename="venta")
router.register(r"temporadas", TemporadaViewSet, basename="temporada")
router.register(r'actividad', RegistroActividadViewSet, basename='actividad')
router.register(r"huertas-combinadas", HuertasCombinadasViewSet, basename="huertas-combinadas")
router.register(r"informes", InformesViewSet, basename="informes")

# ---- urlpatterns ----
urlpatterns = [
    path("", include(router.urls)),
    
]
