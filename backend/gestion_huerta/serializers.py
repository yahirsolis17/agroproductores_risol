# agroproductores_risol/backend/gestion_huerta/serializers.py

import re
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from gestion_huerta.models import Huerta, HuertaRentada, Propietario

def validate_nombre(value, field_name="nombre", min_length=3, max_length=100):
    if len(value.strip()) < min_length or len(value.strip()) > max_length:
        raise ValidationError(f"El {field_name} debe tener entre {min_length} y {max_length} caracteres.")
    if not re.match(r"^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ ]*$", value):
        raise ValidationError(f"El {field_name} solo debe contener letras, números y espacios.")
    return value

def validate_telefono_10(value):
    if len(value) != 10 or not re.match(r"^\d{10}$", value):
        raise ValidationError("El teléfono debe contener exactamente 10 dígitos y solo números.")
    return value

class PropietarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Propietario
        fields = ['id', 'nombre', 'telefono', 'direccion']

    def validate_nombre(self, value):
        return validate_nombre(value, field_name="nombre")

    def validate_telefono(self, value):
        if not re.match(r'^\d{10}$', value):
            raise ValidationError("El teléfono debe contener exactamente 10 dígitos.")
        if Propietario.objects.filter(telefono=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise ValidationError("Ya existe un propietario registrado con este número.")
        return value

    def validate_direccion(self, value):
        if len(value.strip()) < 5 or len(value.strip()) > 255:
            raise ValidationError("La dirección debe tener entre 5 y 255 caracteres.")
        if not re.match(r'^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ\s,.\-]+$', value):
            raise ValidationError("La dirección contiene caracteres inválidos.")
        return value

class HuertaSerializer(serializers.ModelSerializer):
    propietario = serializers.PrimaryKeyRelatedField(queryset=Propietario.objects.all())
    propietario_detalle = PropietarioSerializer(source='propietario', read_only=True)

    class Meta:
        model = Huerta
        fields = ['id', 'nombre', 'ubicacion', 'variedades', 'historial', 'hectareas', 'propietario', 'propietario_detalle']

    def validate_nombre(self, value):
        return validate_nombre(value, field_name="nombre")

    def validate_ubicacion(self, value):
        if len(value.strip()) < 3 or len(value.strip()) > 255:
            raise ValidationError("La ubicación debe tener entre 3 y 255 caracteres.")
        if not re.match(r'^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ\s,.\-]+$', value):
            raise ValidationError("La ubicación solo puede contener letras, números, espacios, comas y puntos.")
        return value

    def validate_variedades(self, value):
        if len(value.strip()) < 3 or len(value.strip()) > 255:
            raise ValidationError("Las variedades deben tener entre 3 y 255 caracteres.")
        if not re.match(r'^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ\s,]+$', value):
            raise ValidationError("Las variedades solo pueden contener letras, números, espacios y comas.")
        return value

    def validate_historial(self, value):
        if value and (len(value.strip()) < 3 or len(value.strip()) > 255):
            raise ValidationError("El historial debe tener entre 3 y 255 caracteres.")
        return value

    def validate_hectareas(self, value):
        if value <= 0:
            raise ValidationError("El número de hectáreas debe ser mayor a 0.")
        return value

    def validate(self, data):
        nombre = data.get('nombre')
        propietario = data.get('propietario')
        ubicacion = data.get('ubicacion')
        if Huerta.objects.filter(nombre=nombre, propietario=propietario, ubicacion=ubicacion).exclude(id=self.instance.id if self.instance else None).exists():
            raise ValidationError("Ya existe una huerta con este nombre, propietario y ubicación.")
        return data

class HuertaRentadaSerializer(serializers.ModelSerializer):
    propietario = serializers.PrimaryKeyRelatedField(queryset=Propietario.objects.all())
    propietario_detalle = PropietarioSerializer(source='propietario', read_only=True)
    monto_renta_palabras = serializers.SerializerMethodField()

    class Meta:
        model = HuertaRentada
        fields = ['id', 'nombre', 'ubicacion', 'variedades', 'historial', 'hectareas', 'propietario', 'propietario_detalle', 'monto_renta', 'monto_renta_palabras']

    def get_monto_renta_palabras(self, obj):
        from num2words import num2words
        if obj.monto_renta:
            return f"{num2words(obj.monto_renta, lang='es').capitalize()} pesos"
        return None

    def validate(self, data):
        nombre = data.get('nombre')
        propietario = data.get('propietario')
        ubicacion = data.get('ubicacion')
        if HuertaRentada.objects.filter(nombre=nombre, propietario=propietario, ubicacion=ubicacion).exclude(id=self.instance.id if self.instance else None).exists():
            raise ValidationError("Ya existe una huerta rentada con este nombre, propietario y ubicación.")
        return data
