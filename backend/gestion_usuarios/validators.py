
import re
from rest_framework.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

def validate_telefono(telefono):
    if not re.match(r'^\d{10}$', telefono):
        raise ValidationError(_("El teléfono debe tener 10 dígitos y solo números."))
    return telefono

def validate_nombre(value, field_name='nombre'):
    if not re.match(r'^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$', value):
        raise ValidationError(_(f"El {field_name} solo puede contener letras y espacios."))
    return value
