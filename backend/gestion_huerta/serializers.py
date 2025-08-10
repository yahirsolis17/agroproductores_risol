from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from num2words import num2words   
import re
from datetime import date
from decimal import Decimal

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
# -------------------- Huerta --------------------
class HuertaSerializer(serializers.ModelSerializer):
    propietario_detalle   = PropietarioSerializer(source='propietario', read_only=True)
    propietario_archivado = serializers.SerializerMethodField()
    is_active             = serializers.BooleanField(read_only=True)
    archivado_en          = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = Huerta
        fields = [
            'id', 'nombre', 'ubicacion', 'variedades', 'historial',
            'hectareas', 'propietario', 'propietario_detalle',
            'propietario_archivado', 'is_active', 'archivado_en'
        ]

    def get_propietario_archivado(self, obj):
        return not getattr(obj.propietario, 'is_active', True)

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
        # Solo bloquea si explícitamente se está cambiando el propietario
        if 'propietario' in data:
            propietario = data['propietario']
            if propietario and not getattr(propietario, 'is_active', True):
                raise serializers.ValidationError("No puedes asignar huertas a un propietario archivado.")
        return data


# -------------------- Huerta Rentada --------------------
class HuertaRentadaSerializer(serializers.ModelSerializer):
    propietario_detalle   = PropietarioSerializer(source='propietario', read_only=True)
    propietario_archivado = serializers.SerializerMethodField()
    monto_renta_palabras  = serializers.SerializerMethodField()
    is_active             = serializers.BooleanField(read_only=True)
    archivado_en          = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = HuertaRentada
        fields = [
            'id', 'nombre', 'ubicacion', 'variedades', 'historial', 'hectareas',
            'propietario', 'propietario_detalle', 'propietario_archivado',
            'monto_renta', 'monto_renta_palabras',
            'is_active', 'archivado_en'
        ]

    def get_propietario_archivado(self, obj):
        return not getattr(obj.propietario, 'is_active', True)

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
                "Ubicación inválida. Solo caracteres permitidos."
            )
        return txt

    def validate_variedades(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("Debes indicar al menos una variedad de mango.")
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
        if 'propietario' in data:
            propietario = data['propietario']
            if propietario and not getattr(propietario, 'is_active', True):
                raise serializers.ValidationError("No puedes asignar huertas rentadas a un propietario archivado.")
        return data

class TemporadaSerializer(serializers.ModelSerializer):
    is_rentada    = serializers.SerializerMethodField()
    huerta_nombre = serializers.SerializerMethodField()
    huerta_id     = serializers.SerializerMethodField()

    # Nunca requeridos (permite una u otra)
    huerta = serializers.PrimaryKeyRelatedField(
        queryset=Huerta.objects.all(), required=False, allow_null=True, default=None
    )
    huerta_rentada = serializers.PrimaryKeyRelatedField(
        queryset=HuertaRentada.objects.all(), required=False, allow_null=True, default=None
    )

    # Protegidos contra escritura directa desde el cliente
    is_active    = serializers.BooleanField(read_only=True)
    archivado_en = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Temporada
        fields = [
            'id', 'año', 'fecha_inicio', 'fecha_fin', 'finalizada',
            'is_active', 'archivado_en',
            'huerta', 'huerta_rentada',
            'is_rentada', 'huerta_nombre', 'huerta_id',
        ]

    def get_is_rentada(self, obj):    return obj.huerta_rentada is not None
    def get_huerta_nombre(self, obj): return str(obj.huerta or obj.huerta_rentada) if (obj.huerta or obj.huerta_rentada) else None
    def get_huerta_id(self, obj):
        origen = obj.huerta or obj.huerta_rentada
        return origen.id if origen else None

    def validate_año(self, value):
        actual = timezone.now().year
        if value < 2000 or value > actual + 1:
            raise serializers.ValidationError("El año debe estar entre 2000 y el año siguiente al actual.")
        return value

    def validate(self, data):
        huerta         = data.get('huerta', getattr(self.instance, 'huerta', None))
        huerta_rentada = data.get('huerta_rentada', getattr(self.instance, 'huerta_rentada', None))
        año            = data.get('año', getattr(self.instance, 'año', None))

        if not huerta and not huerta_rentada:
            raise serializers.ValidationError("Debe asignar una huerta o una huerta rentada.")
        if huerta and huerta_rentada:
            raise serializers.ValidationError("No puede asignar ambas huertas al mismo tiempo.")

        if huerta and not huerta.is_active:
            raise serializers.ValidationError("No se puede crear/editar temporada en una huerta archivada.")
        if huerta_rentada and not huerta_rentada.is_active:
            raise serializers.ValidationError("No se puede crear/editar temporada en una huerta rentada archivada.")

        # Unicidad en create y update
        qs = Temporada.objects.all()
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if huerta and qs.filter(huerta=huerta, año=año).exists():
            raise serializers.ValidationError("Ya existe una temporada para esta huerta en ese año.")
        if huerta_rentada and qs.filter(huerta_rentada=huerta_rentada, año=año).exists():
            raise serializers.ValidationError("Ya existe una temporada para esta huerta rentada en ese año.")

        return data

class CosechaSerializer(serializers.ModelSerializer):
    temporada        = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), required=True)
    ventas_totales   = serializers.FloatField(source='total_ventas',   read_only=True)
    gastos_totales   = serializers.FloatField(source='total_gastos',   read_only=True)
    margen_ganancia  = serializers.FloatField(source='ganancia_neta',  read_only=True)
    is_rentada       = serializers.SerializerMethodField()
    # Permitimos nombre vacío, pero lo normalizamos a uno único en validate()
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

    def _nombre_unico(self, temporada: Temporada, propuesto: str | None) -> str:
        base = (propuesto or "").strip() or "Cosecha"
        existentes = set(temporada.cosechas.values_list("nombre", flat=True))
        if base not in existentes:
            return base
        i = 2
        while True:
            cand = f"{base} {i}"
            if cand not in existentes:
                return cand
            i += 1

    def validate(self, data):
        instance   = getattr(self, 'instance', None)
        temporada  = data.get('temporada') or (instance.temporada if instance else None)
        fi         = data.get('fecha_inicio') or (instance.fecha_inicio if instance else None)
        ff         = data.get('fecha_fin')    or (instance.fecha_fin    if instance else None)
        nombre_in  = data.get('nombre', None)

        if not temporada:
            raise ValidationError("La cosecha debe pertenecer a una temporada.")

        if fi and ff and ff < fi:
            raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

        # Reglas de creación
        if instance is None:
            if not temporada.is_active:
                raise ValidationError("No se pueden crear cosechas en una temporada archivada.")
            if temporada.finalizada:
                raise ValidationError("No se pueden crear cosechas en una temporada finalizada.")
            if temporada.cosechas.count() >= 6:
                raise ValidationError("Esta temporada ya tiene el máximo de 6 cosechas permitidas.")

            # ⚙️ Normalizar nombre a uno único ANTES de ejecutar UniqueTogetherValidator
            data['nombre'] = self._nombre_unico(temporada, nombre_in)

        # Reglas de actualización
        else:
            # No permitir cambiar de temporada
            if 'temporada' in data and data['temporada'] != instance.temporada:
                raise ValidationError("No puedes cambiar la temporada de una cosecha existente.")

            # Si mandan nombre vacío en update, lo normalizamos a uno único
            if nombre_in is not None and not (nombre_in or "").strip():
                data['nombre'] = self._nombre_unico(instance.temporada, nombre_in)

        return data
# -----------------------------
# CATEGORÍA + INVERSIONES
# -----------------------------
class CategoriaInversionSerializer(serializers.ModelSerializer):
    archivado_en = serializers.DateTimeField(read_only=True)
    is_active    = serializers.BooleanField(read_only=True)
    uso_count    = serializers.IntegerField(read_only=True)  # ← EXPUESTO AL FRONT

    class Meta:
        model  = CategoriaInversion
        fields = ['id', 'nombre', 'is_active', 'archivado_en', 'uso_count']

    def validate_nombre(self, value: str) -> str:
        val = (value or '').strip()
        if len(val) < 3:
            raise serializers.ValidationError("El nombre de la categoría debe tener al menos 3 caracteres.")
        qs = CategoriaInversion.objects.filter(nombre__iexact=val)
        if qs.exists() and not (self.instance and self.instance.nombre.lower() == val.lower()):
            raise serializers.ValidationError("Ya existe una categoría con este nombre.")
        return val

class InversionesHuertaSerializer(serializers.ModelSerializer):
    # Calculado
    gastos_totales = serializers.DecimalField(read_only=True, max_digits=14, decimal_places=2)

    # Aliases *_id que escribe el front
    categoria_id      = serializers.PrimaryKeyRelatedField(queryset=CategoriaInversion.objects.all(), source='categoria', write_only=True)
    cosecha_id        = serializers.PrimaryKeyRelatedField(queryset=Cosecha.objects.all(),               source='cosecha',   write_only=True)
    temporada_id      = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(),             source='temporada', write_only=True)
    huerta_id         = serializers.PrimaryKeyRelatedField(queryset=Huerta.objects.all(),                source='huerta',         write_only=True, required=False, allow_null=True)
    huerta_rentada_id = serializers.PrimaryKeyRelatedField(queryset=HuertaRentada.objects.all(),         source='huerta_rentada', write_only=True, required=False, allow_null=True)

    class Meta:
        model  = InversionesHuerta
        fields = [
            'id',
            'fecha', 'descripcion',
            'gastos_insumos', 'gastos_mano_obra', 'gastos_totales',
            'categoria', 'cosecha', 'temporada', 'huerta', 'huerta_rentada',
            'categoria_id', 'cosecha_id', 'temporada_id', 'huerta_id', 'huerta_rentada_id',
            'is_active', 'archivado_en',
        ]
        read_only_fields = [
            'gastos_totales', 'categoria', 'cosecha', 'temporada', 'huerta', 'huerta_rentada',
            'is_active', 'archivado_en',
        ]

    # ——— Validaciones de campo ———
    def validate_fecha(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha no puede ser futura.")
        # Validación contra inicio de cosecha usando initial_data (para alta)
        cosecha_id = self.initial_data.get('cosecha_id')
        if cosecha_id:
            c = Cosecha.objects.filter(pk=cosecha_id).only('fecha_inicio').first()
            if c and c.fecha_inicio and value < c.fecha_inicio.date():
                raise serializers.ValidationError(
                    f"La fecha debe ser ≥ {c.fecha_inicio.date().isoformat()} (inicio de la cosecha)."
                )
        return value

    # ——— Validación de objeto (reglas de negocio) ———
    def validate(self, data):
        categoria       = data.get('categoria')
        cosecha         = data.get('cosecha')
        temporada       = data.get('temporada')
        huerta          = data.get('huerta')
        huerta_rentada  = data.get('huerta_rentada')
        gi              = data.get('gastos_insumos') or Decimal('0')
        gm              = data.get('gastos_mano_obra') or Decimal('0')

        # total > 0
        if (gi + gm) <= 0:
            raise serializers.ValidationError("Los gastos totales deben ser mayores a 0.")

        if not all([categoria, cosecha, temporada]):
            return data  # DRF ya marcará los faltantes; evitamos ruido

        # temporada vs cosecha
        if temporada != cosecha.temporada:
            raise serializers.ValidationError("La temporada no coincide con la temporada de la cosecha.")

        # estado temporada
        if temporada.finalizada or not temporada.is_active:
            raise serializers.ValidationError("No se pueden registrar inversiones en una temporada finalizada o archivada.")

        # coherencia con origen (mutuamente excluyente)
        if cosecha.huerta_id:
            # Debe venir huerta y coincidir; NO debe venir huerta_rentada
            if not huerta or huerta.id != cosecha.huerta_id:
                raise serializers.ValidationError("La huerta no coincide con la huerta de la cosecha.")
            if huerta_rentada is not None:
                raise serializers.ValidationError("No asignes huerta rentada en una cosecha de huerta propia.")
        elif cosecha.huerta_rentada_id:
            # Debe venir huerta_rentada y coincidir; NO debe venir huerta
            if not huerta_rentada or huerta_rentada.id != cosecha.huerta_rentada_id:
                raise serializers.ValidationError("La huerta rentada no coincide con la de la cosecha.")
            if huerta is not None:
                raise serializers.ValidationError("No asignes huerta propia en una cosecha de huerta rentada.")
        else:
            raise serializers.ValidationError("La cosecha no tiene origen (huerta/huerta_rentada) definido.")

        return data

# -----------------------------
# VENTA
# -----------------------------
class VentaSerializer(serializers.ModelSerializer):
    total_venta = serializers.IntegerField(read_only=True)
    ganancia_neta = serializers.IntegerField(read_only=True)

    cosecha_id = serializers.PrimaryKeyRelatedField(
        queryset=Cosecha.objects.all(),
        source='cosecha',
        write_only=True
    )
    temporada_id = serializers.PrimaryKeyRelatedField(
        queryset=Temporada.objects.all(),
        source='temporada',
        write_only=True
    )
    huerta_id = serializers.PrimaryKeyRelatedField(
        queryset=Huerta.objects.all(),
        source='huerta',
        write_only=True
    )

    class Meta:
        model = Venta
        fields = [
            'id', 'fecha_venta', 'num_cajas', 'precio_por_caja',
            'tipo_mango', 'descripcion', 'gasto',
            'cosecha', 'temporada', 'huerta',
            'cosecha_id', 'temporada_id', 'huerta_id',
            'total_venta', 'ganancia_neta'
        ]
        read_only_fields = ['total_venta', 'ganancia_neta', 'cosecha', 'temporada', 'huerta']

    def validate_fecha_venta(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de venta no puede ser futura.")
        cosecha_id = self.initial_data.get('cosecha_id')
        if cosecha_id:
            cosecha_obj = Cosecha.objects.filter(pk=cosecha_id).first()
            if cosecha_obj and cosecha_obj.fecha_inicio and value < cosecha_obj.fecha_inicio.date():
                raise serializers.ValidationError(
                    f"La fecha debe ser ≥ {cosecha_obj.fecha_inicio.date().isoformat()} (inicio de la cosecha)."
                )
        return value

    def validate(self, data):
        total_venta = data['num_cajas'] * data['precio_por_caja']
        if (total_venta - data['gasto']) < 0:
            raise serializers.ValidationError("La ganancia neta no puede ser negativa.")

        cosecha = data['cosecha']
        temporada = data['temporada']
        huerta = data['huerta']

        if temporada != cosecha.temporada:
            raise serializers.ValidationError("La temporada no coincide con la de la cosecha.")
        if huerta != cosecha.huerta:
            raise serializers.ValidationError("La huerta no coincide con la de la cosecha.")
        if not temporada.is_active or temporada.finalizada:
            raise serializers.ValidationError("No se pueden registrar ventas en una temporada finalizada o archivada.")

        return data
