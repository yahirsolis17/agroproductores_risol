from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from num2words import num2words   
import re
from datetime import date

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
# src/gestion_huerta/serializers/cosecha_serializers.py
class CosechaSerializer(serializers.ModelSerializer):
    temporada        = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), required=True)
    ventas_totales   = serializers.FloatField(source='total_ventas',   read_only=True)
    gastos_totales   = serializers.FloatField(source='total_gastos',   read_only=True)
    margen_ganancia  = serializers.FloatField(source='ganancia_neta',  read_only=True)
    is_rentada       = serializers.SerializerMethodField()
    nombre           = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Cosecha
        fields = [
            'id', 'nombre',
            'fecha_creacion', 'fecha_inicio', 'fecha_fin', 'finalizada',
            'temporada', 'huerta', 'huerta_rentada',
            'is_active', 'archivado_en',
            'ventas_totales', 'gastos_totales', 'margen_ganancia',
            'is_rentada',
        ]
        read_only_fields = (
            'id', 'fecha_creacion',
            'huerta', 'huerta_rentada',
            'is_active', 'archivado_en',
            'ventas_totales', 'gastos_totales', 'margen_ganancia', 'is_rentada'
        )
        validators = [
            UniqueTogetherValidator(
                queryset=Cosecha.objects.all(),
                fields=['temporada', 'nombre'],
                message="Ya existe una cosecha con ese nombre en esta temporada."
            )
        ]

    def get_is_rentada(self, obj):
        return obj.huerta_rentada_id is not None

    def validate_nombre(self, value):
        if value is None:
            return value
        v = value.strip()
        if v and len(v) < 3:
            raise serializers.ValidationError("El nombre de la cosecha debe tener al menos 3 caracteres.")
        return v

    def validate(self, data):
        instance     = getattr(self, 'instance', None)
        temporada    = data.get('temporada') or (instance.temporada if instance else None)
        fi           = data.get('fecha_inicio') or (instance.fecha_inicio if instance else None)
        ff           = data.get('fecha_fin')    or (instance.fecha_fin    if instance else None)

        if fi and ff and ff < fi:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

        if instance is None:
            if not temporada.is_active:
                raise ValidationError("No se pueden crear cosechas en una temporada archivada.")
            if temporada.finalizada:
                raise ValidationError("No se pueden crear cosechas en una temporada finalizada.")
            if temporada.cosechas.count() >= 6:
                raise ValidationError("Esta temporada ya tiene el máximo de 6 cosechas permitidas.")
        else:
            if 'temporada' in data and data['temporada'] != instance.temporada:
                raise ValidationError("No puedes cambiar la temporada de una cosecha existente.")

        return data
# -----------------------------
# CATEGORÍA + INVERSIONES
# -----------------------------
class CategoriaInversionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaInversion
        fields = ['id', 'nombre']

    def validate_nombre(self, value):
        val = value.strip()
        if len(val) < 3:
            raise serializers.ValidationError("El nombre de la categoría debe tener al menos 3 caracteres.")
        # Unicidad case-insensitive
        if CategoriaInversion.objects.filter(nombre__iexact=val).exists() and not (
            self.instance and self.instance.nombre.lower() == val.lower()
        ):
            raise serializers.ValidationError("Ya existe una categoría con este nombre.")
        return val
class InversionesHuertaSerializer(serializers.ModelSerializer):
    categoria = serializers.PrimaryKeyRelatedField(queryset=CategoriaInversion.objects.all())
    cosecha = serializers.PrimaryKeyRelatedField(queryset=Cosecha.objects.all())
    huerta = serializers.PrimaryKeyRelatedField(queryset=Huerta.objects.all())
    gastos_totales = serializers.DecimalField(
        source='gastos_totales', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model  = InversionesHuerta
        fields = [
            'id', 'nombre', 'fecha', 'descripcion',
            'gastos_insumos', 'gastos_mano_obra',
            'categoria', 'cosecha', 'huerta',
            'gastos_totales',
        ]

    def validate_nombre(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return txt

    def validate_fecha(self, value):
        # No futura
        if value > date.today():
            raise serializers.ValidationError("La fecha de inversión no puede ser futura.")
        # No anterior al inicio de la cosecha
        cosecha = Cosecha.objects.get(pk=self.initial_data.get('cosecha'))
        if value < cosecha.fecha_inicio.date():
            raise serializers.ValidationError(
                f"La fecha debe ser >= {cosecha.fecha_inicio.date().isoformat()} (fecha inicio de la cosecha)."
            )
        return value

    def validate_gastos_insumos(self, value):
        if value < 0:
            raise serializers.ValidationError("Los gastos en insumos no pueden ser negativos.")
        return value

    def validate_gastos_mano_obra(self, value):
        if value < 0:
            raise serializers.ValidationError("Los gastos de mano de obra no pueden ser negativos.")
        return value

    def validate(self, data):
        total = (data['gastos_insumos'] or 0) + (data['gastos_mano_obra'] or 0)
        if total <= 0:
            raise serializers.ValidationError("Los gastos totales deben ser mayores a 0.")
        # No permitir inversiones en temporada finalizada o archivada
        temporada = data['cosecha'].temporada
        if temporada.finalizada or not temporada.is_active:
            raise serializers.ValidationError("No se pueden registrar inversiones en una temporada finalizada o archivada.")
        return data

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['categoria'] = CategoriaInversionSerializer(instance.categoria).data
        return rep

# -----------------------------
# VENTA
# -----------------------------
class VentaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Venta
        fields = [
            'id', 'cosecha', 'fecha_venta',
            'num_cajas', 'precio_por_caja',
            'tipo_mango', 'descripcion', 'gasto',
            'total_venta', 'ganancia_neta'
        ]

    def validate_fecha_venta(self, value):
        # No futura
        if value > date.today():
            raise serializers.ValidationError("La fecha de venta no puede ser futura.")
        # No anterior al inicio de la cosecha
        cosecha = Cosecha.objects.get(pk=self.initial_data.get('cosecha'))
        if value < cosecha.fecha_inicio.date():
            raise serializers.ValidationError(
                f"La fecha de venta debe ser >= {cosecha.fecha_inicio.date().isoformat()}."
            )
        return value

    def validate_num_cajas(self, value):
        if value < 1:
            raise serializers.ValidationError("Debe venderse al menos una caja.")
        return value

    def validate_precio_por_caja(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio por caja debe ser mayor a 0.")
        return value

    def validate_gasto(self, value):
        if value < 0:
            raise serializers.ValidationError("El gasto no puede ser negativo.")
        return value

    def validate(self, data):
        total_venta = data['num_cajas'] * data['precio_por_caja']
        if (total_venta - data['gasto']) < 0:
            raise serializers.ValidationError("La ganancia neta no puede ser negativa.")
        # Bloquear ventas en temporada finalizada o archivada
        temporada = data['cosecha'].temporada
        if temporada.finalizada or not temporada.is_active:
            raise serializers.ValidationError("No se pueden registrar ventas en una temporada finalizada o archivada.")
        return data