from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from num2words import num2words   
import re

from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada,
    Cosecha, InversionesHuerta, CategoriaInversion, Venta, Temporada
)

# -----------------------------
# VALIDACIONES REUTILIZABLES
# -----------------------------
def validate_nombre_persona(value):
    """
    Valida que el nombre contenga entre 3 y 100 caracteres, letras, números y espacios.
    """
    if not re.match(r'^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ\s]', value.strip()):
        raise serializers.ValidationError("Nombre inválido. Solo letras, números y mínimo 3 caracteres.")
    return value

def validate_direccion(value):
    """
    Valida que la dirección tenga entre 5 y 255 caracteres,
    admitiendo letras, números, comas, guiones y puntos.
    """
    if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]{5,255}$', value.strip()):
        raise serializers.ValidationError("Dirección inválida. Debe tener entre 5 y 255 caracteres y solo caracteres permitidos.")
    return value

def validate_telefono(self, value):
    value = validate_telefono(value)

    if self.instance is None and Propietario.objects.filter(telefono=value).exists():
        raise serializers.ValidationError("Ya existe un propietario con este número de teléfono.")
    
    if self.instance is not None:
        # Si se actualiza y el número ya pertenece a otro
        if Propietario.objects.exclude(pk=self.instance.pk).filter(telefono=value).exists():
            raise serializers.ValidationError("Este número ya está registrado por otro propietario.")
    
    return value

# -----------------------------
# PROPIETARIO
# -----------------------------
# --------------------------- PROPIETARIO -----------------------------------
class PropietarioSerializer(serializers.ModelSerializer):
    archivado_en = serializers.DateTimeField(read_only=True)
    is_active    = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Propietario
        fields = [
            'id', 'nombre', 'apellidos', 'telefono', 'direccion',
            'archivado_en', 'is_active'
        ]

    # … (validadores tal cual los tenías) …
    def validate_nombre(self, value):      return validate_nombre_persona(value)
    def validate_apellidos(self, value):   return validate_nombre_persona(value)

    def validate_telefono(self, value):
        value = value.strip()
        if self.instance is None:
            if Propietario.objects.filter(telefono=value).exists():
                raise serializers.ValidationError("Este teléfono ya está registrado.")
        else:
            if Propietario.objects.exclude(pk=self.instance.pk).filter(telefono=value).exists():
                raise serializers.ValidationError("Este teléfono ya está registrado con otro propietario.")
        return value

    def validate_direccion(self, value):   return validate_direccion(value)


# ---------------------------- HUERTA ---------------------------------------
class HuertaSerializer(serializers.ModelSerializer):
    propietario_detalle    = PropietarioSerializer(source='propietario', read_only=True)
    propietario_archivado  = serializers.SerializerMethodField()   # ← NUEVO
    is_active             = serializers.BooleanField(read_only=True)
    archivado_en          = serializers.DateTimeField(read_only=True)
    class Meta:
        model  = Huerta
        fields = [
            'id', 'nombre', 'ubicacion', 'variedades', 'historial',
            'hectareas', 'propietario', 'propietario_detalle',
            'propietario_archivado', 'is_active', 'archivado_en'
        ]
        validators = [
            UniqueTogetherValidator(
                queryset=Huerta.objects.all(),
                fields=['nombre', 'ubicacion', 'propietario'],
                message="back Los campos nombre, ubicacion, propietario deben formar un conjunto único."
            )
        ]

    # ----- getters -----
    def get_propietario_archivado(self, obj):
        return not obj.propietario.is_active

    # ----- validaciones -----
    def validate_nombre(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        if not re.match(r'^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚ\s]+$', txt):
            raise serializers.ValidationError("Nombre inválido. Solo letras, números y espacios.")
        return txt

    def validate_ubicacion(self, value):
        txt = value.strip()
        if len(txt) < 5:
            raise serializers.ValidationError("La ubicación debe tener al menos 5 caracteres.")
        if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]+$', txt):
            raise serializers.ValidationError(
                "Ubicación inválida. Solo caracteres permitidos (letras, números, espacios, ,- .#)."
            )
        return txt

    def validate_variedades(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("Debes indicar al menos una variedad de mango (mínimo 3 caracteres).")
        return txt

    def validate_hectareas(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("El número de hectáreas debe ser mayor a 0.")
        return value

    def validate(self, data):
        """
        Evita registrar / mover una huerta a un propietario archivado.
        """
        propietario = data.get('propietario') or getattr(self.instance, 'propietario', None)
        if propietario and not propietario.is_active:
            raise serializers.ValidationError(
                "No puedes asignar huertas a un propietario archivado."
            )
        return data


# gestion_huerta/serializers/huerta.py
class HuertaRentadaSerializer(serializers.ModelSerializer):
    propietario_detalle = PropietarioSerializer(source='propietario', read_only=True)
    propietario_archivado = serializers.SerializerMethodField()
    monto_renta_palabras = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    archivado_en = serializers.DateTimeField(read_only=True)

    class Meta:
        model = HuertaRentada
        fields = [
            'id', 'nombre', 'ubicacion', 'variedades', 'historial', 'hectareas',
            'propietario', 'propietario_detalle', 'propietario_archivado',
            'monto_renta', 'monto_renta_palabras',
            'is_active', 'archivado_en'
        ]
        validators = [
            UniqueTogetherValidator(
                queryset=HuertaRentada.objects.all(),
                fields=['nombre', 'ubicacion', 'propietario'],
                message="Ya existe una huerta rentada con ese nombre, ubicación y propietario."
            )
        ]

    def get_propietario_archivado(self, obj):
        return not obj.propietario.is_active

    def get_monto_renta_palabras(self, obj):
        return num2words(obj.monto_renta, lang='es').capitalize() + " pesos"

    def validate_nombre(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        if not re.match(r'^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚ\s]+$', txt):
            raise serializers.ValidationError("Nombre inválido. Solo letras, números y espacios.")
        return txt

    def validate_ubicacion(self, value):
        txt = value.strip()
        if len(txt) < 5:
            raise serializers.ValidationError("La ubicación debe tener al menos 5 caracteres.")
        if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]+$', txt):
            raise serializers.ValidationError(
                "Ubicación inválida. Solo caracteres permitidos (letras, números, espacios, ,- .#)."
            )
        return txt

    def validate_variedades(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("Debes indicar al menos una variedad de mango (mínimo 3 caracteres).")
        return txt

    def validate_hectareas(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("El número de hectáreas debe ser mayor a 0.")
        return value

    def validate_monto_renta(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto de la renta debe ser mayor a 0.")
        return value

    def validate(self, data):
        propietario = data.get('propietario') or getattr(self.instance, 'propietario', None)
        if propietario and not propietario.is_active:
            raise serializers.ValidationError(
                "No puedes asignar huertas rentadas a un propietario archivado."
            )
        return data

class TemporadaSerializer(serializers.ModelSerializer):
    is_rentada    = serializers.SerializerMethodField()
    huerta_nombre = serializers.SerializerMethodField()
    huerta_id     = serializers.SerializerMethodField()
    
    # ← ESTOS DOS CAMPOS SON OPCIONALES, NUNCA REQUIRED
    huerta = serializers.PrimaryKeyRelatedField(
        queryset=Huerta.objects.all(),
        required=False,
        allow_null=True,
        default=None
    )
    huerta_rentada = serializers.PrimaryKeyRelatedField(
        queryset=HuertaRentada.objects.all(),
        required=False,
        allow_null=True,
        default=None
    )

    class Meta:
        model = Temporada
        fields = [
            'id',
            'año',
            'fecha_inicio',
            'fecha_fin',
            'finalizada',
            'is_active',
            'archivado_en',
            'huerta',
            'huerta_rentada',
            'is_rentada',
            'huerta_nombre',
            'huerta_id',
        ]

    def get_is_rentada(self, obj):
        return obj.huerta_rentada is not None

    def get_huerta_nombre(self, obj):
        origen = obj.huerta or obj.huerta_rentada
        return str(origen) if origen else None

    def get_huerta_id(self, obj):
        origen = obj.huerta or obj.huerta_rentada
        return origen.id if origen else None

    def validate_año(self, value):
        actual = timezone.now().year
        if value < 2000 or value > actual + 1:
            raise serializers.ValidationError("El año debe estar entre 2000 y el año siguiente al actual.")
        return value

    def validate(self, data):
        huerta = data.get('huerta')
        huerta_rentada = data.get('huerta_rentada')
        año = data.get('año')

        print("🔬 Validando temporada:")
        print("  - Huerta:", huerta)
        print("  - Rentada:", huerta_rentada)
        print("  - Año:", año)

        if not huerta and not huerta_rentada:
            raise serializers.ValidationError("Debe asignar una huerta o una huerta rentada.")

        if huerta and huerta_rentada:
            raise serializers.ValidationError("No puede asignar ambas huertas al mismo tiempo.")

        if huerta and not huerta.is_active:
            raise serializers.ValidationError("No se puede crear temporada en una huerta archivada.")

        if huerta_rentada and not huerta_rentada.is_active:
            raise serializers.ValidationError("No se puede crear temporada en una huerta rentada archivada.")

        if self.instance is None:
            if huerta and Temporada.objects.filter(huerta=huerta, año=año).exists():
                raise serializers.ValidationError("Ya existe una temporada para esta huerta en ese año.")
            if huerta_rentada and Temporada.objects.filter(huerta_rentada=huerta_rentada, año=año).exists():
                raise serializers.ValidationError("Ya existe una temporada para esta huerta rentada en ese año.")

        return data




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
        temporada = data.get('temporada')

        if temporada:
            if temporada.finalizada:
                raise serializers.ValidationError("No se pueden registrar cosechas en una temporada finalizada.")

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")
        if temporada and temporada.cosechas.count() >= 6:
            raise serializers.ValidationError("Esta temporada ya tiene el máximo de 6 cosechas permitidas.")

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
        cosecha = data['cosecha']
        temporada = getattr(cosecha, 'temporada', None)

        if cosecha.finalizada:
            raise serializers.ValidationError("No se pueden registrar inversiones en una cosecha finalizada.")

        if temporada and temporada.finalizada:
            raise serializers.ValidationError("No se pueden registrar inversiones en una temporada finalizada.")

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

    def validate(self, data):
        cosecha = data['cosecha']
        temporada = getattr(cosecha, 'temporada', None)

        if cosecha.finalizada:
            raise serializers.ValidationError("No se pueden registrar ventas en una cosecha finalizada.")

        if temporada and temporada.finalizada:
            raise serializers.ValidationError("No se pueden registrar ventas en una temporada finalizada.")
        return data
