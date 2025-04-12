from django import template
from django.utils.translation import gettext as _
register = template.Library()
from django.utils.deprecation import MiddlewareMixin

class NoCacheMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response

TRANSLATIONS = {
    'Can': 'Puede',
    'add': 'agregar',
    'change': 'cambiar',
    'delete': 'eliminar',
    'view': 'ver',
    'log entry': 'entrada de registro',
    'group': 'grupo',
    'permission': 'permiso',
    'content type': 'tipo de contenido',
    'cosecha': 'cosecha',
    'costos cosecha': 'costos de cosecha',
    'huerta': 'huerta',
    'huerta rentada': 'huerta rentada',
    'informe produccion': 'informe de producción',
    'inventario transporte': 'inventario de transporte',
    'inversiones huerta': 'inversiones en huerta',
    'inversion huerta tipo inversion': 'tipo de inversión en huerta',
    'inversion tipo': 'tipo de inversión',
    'peón': 'peón',
    'propietario': 'propietario',
    'registro cosecha': 'registro de cosecha',
    'usuarios': 'usuarios',
    'período de sesiones': 'período de sesiones'
}

@register.filter(name='translate_permission')
def translate_permission(name):
    words = name.split()
    translated_words = [TRANSLATIONS.get(word, word) for word in words]
    return ' '.join(translated_words)


@register.filter(name='add_class')
def add_class(value, css_class):
    return value.as_widget(attrs={'class': css_class})
