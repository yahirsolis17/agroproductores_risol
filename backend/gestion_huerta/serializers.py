from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone
from num2words import num2words
import re

from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada,
    Cosecha, InversionesHuerta, CategoriaInversion, Venta
)

# -----------------------------
# VALIDACIONES REUTILIZABLES
# -----------------------------
def validate_nombre_persona(value):
    """
    Valida que el nombre contenga entre 3 y 100 caracteres, solo letras y espacios.
    """
    if not re.match(r'^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]{3,100}$', value.strip()):
        raise serializers.ValidationError("Nombre inválido. Solo letras y mínimo 3 caracteres.")
    return value

def validate_direccion(value):
    """
    Valida que la dirección tenga entre 5 y 255 caracteres,
    admitiendo letras, números, comas, guiones y puntos.
    """
    if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]{5,255}$', value.strip()):
        raise serializers.ValidationError("Dirección inválida. Debe tener entre 5 y 255 caracteres y solo caracteres permitidos.")
    return value

def validate_telefono(value):
    """
    Valida teléfono de 10 dígitos estrictamente.
    """
    if not re.match(r'^\d{10}$', value):
        raise serializers.ValidationError("El teléfono debe contener exactamente 10 dígitos.")
    return value

# -----------------------------
# PROPIETARIO
# -----------------------------
class PropietarioSerializer(serializers.ModelSerializer):
    """
    Serializa y valida los datos de un propietario.
    """
    class Meta:
        model = Propietario
        fields = ['id', 'nombre', 'apellidos', 'telefono', 'direccion']

    def validate_nombre(self, value):
        return validate_nombre_persona(value)

    def validate_apellidos(self, value):
        return validate_nombre_persona(value)

    def validate_telefono(self, value):
        return validate_telefono(value)

    def validate_direccion(self, value):
        return validate_direccion(value)

# -----------------------------
# HUERTA Y HUERTA RENTADA
# -----------------------------
class HuertaSerializer(serializers.ModelSerializer):
    """
    Serializa la huerta propia, con detalle opcional del propietario.
    """
    propietario_detalle = PropietarioSerializer(source='propietario', read_only=True)
    # Unificamos 'variedades' (que en el modelo se llama 'variedades')
    variedades = serializers.CharField()  

    class Meta:
        model = Huerta
        fields = [
            'id', 'nombre', 'ubicacion', 'variedades', 'historial',
            'hectareas', 'propietario', 'propietario_detalle'
        ]

    def validate_nombre(self, value):
        return validate_nombre_persona(value)

    def validate_ubicacion(self, value):
        return validate_direccion(value)

    def validate_variedades(self, value):
        """
        Valida que la variedad tenga al menos 3 caracteres y no sea solo espacios.
        """
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("Debes indicar al menos una variedad de mango.")
        return value

    def validate_hectareas(self, value):
        if value <= 0:
            raise serializers.ValidationError("El número de hectáreas debe ser mayor a 0.")
        return value


class HuertaRentadaSerializer(HuertaSerializer):
    """
    Hereda la mayoría de validaciones de 'HuertaSerializer',
    pero añade el campo 'monto_renta' y su conversión a palabras.
    """
    monto_renta_palabras = serializers.SerializerMethodField()

    class Meta(HuertaSerializer.Meta):
        model = HuertaRentada
        fields = HuertaSerializer.Meta.fields + ['monto_renta', 'monto_renta_palabras']

    def get_monto_renta_palabras(self, obj):
        if obj.monto_renta:
            return f"{num2words(obj.monto_renta, lang='es').capitalize()} pesos"
        return None

# -----------------------------
# COSECHA
# -----------------------------
class CosechaSerializer(serializers.ModelSerializer):
    """
    Serializa y valida los datos de una cosecha.
    Incluye campos calculados (ventas_totales, gastos_totales, margen_ganancia)
    y un flag (is_rentada) para saber si la cosecha pertenece a una huerta rentada.
    """
    ventas_totales = serializers.FloatField(read_only=True)
    gastos_totales = serializers.FloatField(read_only=True)
    margen_ganancia = serializers.FloatField(read_only=True)
    is_rentada = serializers.SerializerMethodField()

    class Meta:
        model = Cosecha
        fields = [
            'id',
            'nombre',
            'fecha_creacion',
            'fecha_inicio',
            'fecha_fin',
            'finalizada',
            'huerta',
            'huerta_rentada',
            'ventas_totales',
            'gastos_totales',
            'margen_ganancia',
            'is_rentada'
        ]

    def get_is_rentada(self, obj):
        return obj.huerta_rentada is not None

    def validate_nombre(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("El nombre de la cosecha debe tener al menos 3 caracteres.")
        return value

    def validate(self, data):
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")
        return data

# -----------------------------
# CATEGORÍA + INVERSIONES
# -----------------------------
class CategoriaInversionSerializer(serializers.ModelSerializer):
    """
    Serializa la categoría de inversión.
    """
    class Meta:
        model = CategoriaInversion
        fields = ['id', 'nombre']

class InversionesHuertaSerializer(serializers.ModelSerializer):
    """
    Serializa los datos de una inversión relacionada con una cosecha y huerta.
    """
    huerta_id = serializers.PrimaryKeyRelatedField(
        queryset=Huerta.objects.all(),
        source='huerta',
        write_only=True
    )
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=CategoriaInversion.objects.all(),
        source='categoria',
        write_only=True
    )
    cosecha_id = serializers.PrimaryKeyRelatedField(
        queryset=Cosecha.objects.all(),
        source='cosecha',
        write_only=True
    )
    categoria = CategoriaInversionSerializer(read_only=True)
    monto_total = serializers.SerializerMethodField()

    class Meta:
        model = InversionesHuerta
        fields = [
            'id',
            'nombre',
            'fecha',
            'descripcion',
            'gastos_insumos',
            'gastos_mano_obra',
            'categoria_id',
            'categoria',
            'cosecha_id',
            'huerta_id',
            'monto_total'
        ]

    def get_monto_total(self, obj):
        return (obj.gastos_insumos or 0) + (obj.gastos_mano_obra or 0)

    def validate(self, data):
        if (data['gastos_insumos'] + data['gastos_mano_obra']) <= 0:
            raise serializers.ValidationError("Los gastos totales deben ser mayores a 0.")
        return data

# -----------------------------
# VENTA
# -----------------------------
class VentaSerializer(serializers.ModelSerializer):
    """
    Serializa la información de una venta, calculando la venta total
    y la ganancia neta en propiedades de solo lectura.
    """
    total_venta = serializers.SerializerMethodField()
    ganancia_neta = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            'id', 'cosecha', 'fecha_venta', 'num_cajas',
            'precio_por_caja', 'tipo_mango', 'gasto',
            'descripcion', 'total_venta', 'ganancia_neta'
        ]

    def get_total_venta(self, obj):
        return obj.num_cajas * obj.precio_por_caja

    def get_ganancia_neta(self, obj):
        return (obj.num_cajas * obj.precio_por_caja) - obj.gasto
