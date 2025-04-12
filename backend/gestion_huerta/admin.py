# agroproductores_risol/backend/gestion_huerta/admin.py

from django.contrib import admin
from gestion_huerta.models import Huerta, HuertaRentada, InversionesHuerta, InformeProduccion, Propietario

@admin.register(Huerta)
class HuertaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'ubicacion', 'propietario', 'variedades', 'historial', 'hectareas')
    search_fields = ('ubicacion', 'propietario__nombre', 'variedades', 'historial')

@admin.register(HuertaRentada)
class HuertaRentadaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'ubicacion', 'propietario', 'variedades', 'historial', 'hectareas', 'monto_renta')
    search_fields = ('ubicacion', 'propietario__nombre', 'variedades', 'historial')

@admin.register(InversionesHuerta)
class InversionesHuertaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'huerta', 'fecha', 'monto_total')
    search_fields = ('nombre', 'huerta__nombre')
    list_filter = ('huerta', 'fecha')

    def monto_total(self, obj):
        return obj.gastos_insumos + obj.gastos_mano_obra
    monto_total.short_description = 'Monto Total'

@admin.register(InformeProduccion)
class InformeProduccionAdmin(admin.ModelAdmin):
    list_display = ('huerta', 'fecha', 'variedad_mango', 'gastos')
    search_fields = ('huerta__ubicacion',)
    list_filter = ('fecha',)

@admin.register(Propietario)
class PropietarioAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'telefono', 'direccion')
    search_fields = ('nombre', 'telefono', 'direccion')
