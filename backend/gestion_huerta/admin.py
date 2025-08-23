# backend/gestion_huerta/admin.py

from django.contrib import admin
from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada, Cosecha,
    CategoriaInversion, InversionesHuerta, Venta
)

admin.site.register(Propietario)
admin.site.register(Huerta)
admin.site.register(HuertaRentada)
admin.site.register(Cosecha)
admin.site.register(CategoriaInversion)
admin.site.register(InversionesHuerta)
admin.site.register(Venta)
