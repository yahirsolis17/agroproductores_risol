from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from num2words import num2words   
import re
from datetime import date, timedelta, datetime
from decimal import Decimal

from gestion_huerta.models import (
    Propietario, Huerta, HuertaRentada,
    Cosecha, InversionesHuerta, CategoriaInversion, Venta, Temporada,
    CategoriaPreCosecha, PreCosecha,
)

# -----------------------------
# VALIDACIONES REUTILIZABLES
# -----------------------------
def validate_nombre_persona(value):
    """
    Valida que el nombre contenga entre 3 y 100 caracteres, letras, números y espacios.
    """
    if not re.match(r'^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ\s]', value.strip()):
        raise serializers.ValidationError("Nombre inválido. Solo letras, números y mínimo 3 caracteres.", code="nombre_invalido")
    return value

def _as_local_date(dt_or_date):
    if isinstance(dt_or_date, datetime):
        return timezone.localtime(dt_or_date).date()
    return dt_or_date 

def validate_direccion(value):
    """
    Valida que la dirección tenga entre 5 y 255 caracteres,
    admitiendo letras, números, comas, guiones y puntos.
    """
    if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]{5,255}$', value.strip()):
        raise serializers.ValidationError("Dirección inválida. Debe tener entre 5 y 255 caracteres y solo caracteres permitidos.", code="direccion_invalida")
    return value

def validate_telefono(self, value):
    value = validate_telefono(value)

    if self.instance is None and Propietario.objects.filter(telefono=value).exists():
        raise serializers.ValidationError("Ya existe un propietario con este número de teléfono.", code="telefono_duplicado")
    
    if self.instance is not None:
        # Si se actualiza y el número ya pertenece a otro
        if Propietario.objects.exclude(pk=self.instance.pk).filter(telefono=value).exists():
            raise serializers.ValidationError("Este número ya está registrado por otro propietario.", code="telefono_duplicado")
    
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
                raise serializers.ValidationError("Este teléfono ya está registrado con otro propietario.", code="telefono_duplicado")
        else:
            if Propietario.objects.exclude(pk=self.instance.pk).filter(telefono=value).exists():
                raise serializers.ValidationError("Este teléfono ya está registrado con otro propietario.", code="telefono_duplicado")
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
        # Desactivar UniqueTogetherValidator auto-generado para que validate() maneje duplicados
        validators = []

    def get_propietario_archivado(self, obj):
        return not getattr(obj.propietario, 'is_active', True)

    def validate_nombre(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.", code="nombre_muy_corto")
        if not re.match(r'^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚ\s]+$', txt):
            raise serializers.ValidationError("Nombre inválido. Solo letras, números y espacios.", code="nombre_invalido")
        return txt

    def validate_ubicacion(self, value):
        txt = value.strip()
        if len(txt) < 5:
            raise serializers.ValidationError("La ubicación debe tener al menos 5 caracteres.", code="ubicacion_muy_corta")
        if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]+$', txt):
            raise serializers.ValidationError(
                "Ubicación inválida. Solo caracteres permitidos (letras, números, espacios, ,- .#).",
                code="ubicacion_invalida"
            )
        return txt

    def validate_variedades(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("Debes indicar al menos una variedad de mango (mínimo 3 caracteres).", code="variedad_muy_corta")
        return txt

    def validate_hectareas(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("El número de hectáreas debe ser mayor a 0.", code="hectareas_invalidas")
        return value

    def validate(self, data):
        # Solo bloquea si explícitamente se está cambiando el propietario
        if 'propietario' in data:
            propietario = data['propietario']
            if propietario and not getattr(propietario, 'is_active', True):
                raise serializers.ValidationError({"propietario": "No puedes asignar huertas a un propietario archivado."}, code="propietario_archivado")
        
        # Detectar duplicado (nombre + ubicación + propietario) y mapear a campos específicos
        nombre = data.get('nombre') or (getattr(self.instance, 'nombre', None) if self.instance else None)
        ubicacion = data.get('ubicacion') or (getattr(self.instance, 'ubicacion', None) if self.instance else None)
        propietario = data.get('propietario') or (getattr(self.instance, 'propietario', None) if self.instance else None)
        
        if nombre and ubicacion and propietario:
            qs = Huerta.objects.filter(
                nombre__iexact=nombre,
                ubicacion__iexact=ubicacion,
                propietario=propietario
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                msg = "Ya existe una huerta con esta combinación de Nombre, Ubicación y Propietario."
                raise serializers.ValidationError({
                    "nombre": msg,
                    "ubicacion": msg,
                    "propietario": msg,
                }, code="huerta_duplicada")
        
        return data


# -------------------- Huerta Rentada --------------------
class HuertaRentadaSerializer(serializers.ModelSerializer):
    propietario_detalle   = PropietarioSerializer(source='propietario', read_only=True)
    propietario_archivado = serializers.SerializerMethodField()
    monto_renta_palabras  = serializers.SerializerMethodField()
    monto_renta           = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
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
        # Desactivar UniqueTogetherValidator auto-generado para que validate() maneje duplicados
        validators = []

    def get_propietario_archivado(self, obj):
        return not getattr(obj.propietario, 'is_active', True)

    def get_monto_renta_palabras(self, obj):
        return num2words(obj.monto_renta, lang='es').capitalize() + " pesos"

    def validate_nombre(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.", code="nombre_muy_corto")
        if not re.match(r'^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚ\s]+$', txt):
            raise serializers.ValidationError("Nombre inválido. Solo letras, números y espacios.", code="nombre_invalido")
        return txt

    def validate_ubicacion(self, value):
        txt = value.strip()
        if len(txt) < 5:
            raise serializers.ValidationError("La ubicación debe tener al menos 5 caracteres.", code="ubicacion_muy_corta")
        if not re.match(r'^[\w\s\-,.#áéíóúÁÉÍÓÚñÑ]+$', txt):
            raise serializers.ValidationError(
                "Ubicación inválida. Solo caracteres permitidos.",
                code="ubicacion_invalida"
            )
        return txt

    def validate_variedades(self, value):
        txt = value.strip()
        if len(txt) < 3:
            raise serializers.ValidationError("Debes indicar al menos una variedad de mango.", code="variedad_muy_corta")
        return txt

    def validate_hectareas(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("El número de hectáreas debe ser mayor a 0.", code="hectareas_invalidas")
        return value

    def validate_monto_renta(self, value):
        if value <= 0:
            raise serializers.ValidationError("El monto de la renta debe ser mayor a 0.", code="monto_renta_invalido")
        return value

    def validate(self, data):
        if 'propietario' in data:
            propietario = data['propietario']
            if propietario and not getattr(propietario, 'is_active', True):
                raise serializers.ValidationError({"propietario": "No puedes asignar huertas rentadas a un propietario archivado."}, code="propietario_archivado")
        
        # Detectar duplicado (nombre + ubicación + propietario) y mapear a campos específicos
        nombre = data.get('nombre') or (getattr(self.instance, 'nombre', None) if self.instance else None)
        ubicacion = data.get('ubicacion') or (getattr(self.instance, 'ubicacion', None) if self.instance else None)
        propietario = data.get('propietario') or (getattr(self.instance, 'propietario', None) if self.instance else None)
        
        if nombre and ubicacion and propietario:
            qs = HuertaRentada.objects.filter(
                nombre__iexact=nombre,
                ubicacion__iexact=ubicacion,
                propietario=propietario
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                msg = "Ya existe una huerta rentada con esta combinación de Nombre, Ubicación y Propietario."
                raise serializers.ValidationError({
                    "nombre": msg,
                    "ubicacion": msg,
                    "propietario": msg,
                }, code="huerta_rentada_duplicada")
        
        return data

class TemporadaSerializer(serializers.ModelSerializer):
    is_rentada    = serializers.SerializerMethodField()
    huerta_nombre = serializers.SerializerMethodField()
    huerta_id     = serializers.SerializerMethodField()
    estado_operativo = serializers.ChoiceField(
        choices=Temporada.EstadoOperativo.choices,
        required=False,
    )

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
            'id', 'año', 'fecha_inicio', 'fecha_fin', 'finalizada', 'estado_operativo',
            'is_active', 'archivado_en',
            'huerta', 'huerta_rentada',
            'is_rentada', 'huerta_nombre', 'huerta_id',
        ]

    def get_is_rentada(self, obj):    return obj.huerta_rentada is not None
    def get_huerta_nombre(self, obj):
        if obj.huerta:
            return obj.huerta.nombre
        if obj.huerta_rentada:
            return obj.huerta_rentada.nombre
        return None
    def get_huerta_id(self, obj):
        origen = obj.huerta or obj.huerta_rentada
        return origen.id if origen else None

    def validate_año(self, value):
        actual = timezone.now().year
        if value < 2000 or value > actual + 1:
            raise serializers.ValidationError("El año debe estar entre 2000 y el año siguiente al actual.", code="anio_invalido")
        return value

    def validate(self, data):
        huerta         = data.get('huerta', getattr(self.instance, 'huerta', None))
        huerta_rentada = data.get('huerta_rentada', getattr(self.instance, 'huerta_rentada', None))
        año            = data.get('año', getattr(self.instance, 'año', None))
        fecha_inicio   = data.get('fecha_inicio', getattr(self.instance, 'fecha_inicio', None))
        actual         = timezone.now().year
        estado_operativo = data.get('estado_operativo', getattr(self.instance, 'estado_operativo', None))

        if self.instance is None and estado_operativo is None:
            data['estado_operativo'] = (
                Temporada.EstadoOperativo.PLANIFICADA
                if año and año > actual
                else Temporada.EstadoOperativo.OPERATIVA
            )
            estado_operativo = data['estado_operativo']

        if not huerta and not huerta_rentada:
            raise serializers.ValidationError("Debe asignar una huerta o una huerta rentada.", code="falta_origen")
        if huerta and huerta_rentada:
            raise serializers.ValidationError("No puede asignar ambas huertas al mismo tiempo.", code="origen_ambiguo")

        if huerta and not huerta.is_active:
            raise serializers.ValidationError("No se puede crear/editar temporada en una huerta archivada.", code="huerta_archivada")
        if huerta_rentada and not huerta_rentada.is_active:
            raise serializers.ValidationError("No se puede crear/editar temporada en una huerta rentada archivada.", code="huerta_rentada_archivada")

        # Unicidad en create y update
        qs = Temporada.objects.all()
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if huerta and qs.filter(huerta=huerta, año=año).exists():
            raise serializers.ValidationError("Ya existe una temporada para esta huerta en ese año.", code="temporada_duplicada")
        if huerta_rentada and qs.filter(huerta_rentada=huerta_rentada, año=año).exists():
            raise serializers.ValidationError("Ya existe una temporada para esta huerta rentada en ese año.", code="temporada_duplicada")

        if self.instance is not None and 'estado_operativo' in data and data['estado_operativo'] != self.instance.estado_operativo:
            raise serializers.ValidationError(
                {"estado_operativo": "Usa la acción de activar operación para cambiar el estado operativo."},
                code="temporada_estado_operativo_no_editable",
            )

        if estado_operativo == Temporada.EstadoOperativo.OPERATIVA and año and año > actual:
            raise serializers.ValidationError(
                {"estado_operativo": "Una temporada futura solo puede crearse como planificada."},
                code="temporada_operativa_futura",
            )

        if (
            estado_operativo == Temporada.EstadoOperativo.OPERATIVA
            and fecha_inicio
            and fecha_inicio > timezone.localdate()
        ):
            raise serializers.ValidationError(
                {"fecha_inicio": "Una temporada operativa no puede tener una fecha de inicio futura."},
                code="temporada_operativa_fecha_futura",
            )

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
            raise serializers.ValidationError("El nombre de la cosecha debe tener al menos 3 caracteres.", code="nombre_muy_corto")
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
        finalizada = data.get('finalizada') if 'finalizada' in data else (
            instance.finalizada if instance else False
        )

        if not temporada:
            raise serializers.ValidationError("La cosecha debe pertenecer a una temporada.", code="falta_temporada")

        if fi and ff and ff < fi:
            raise serializers.ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.", code="fechas_inconsistentes")

        # Impedir múltiples cosechas activas en la misma temporada
        if not finalizada and temporada:
            qs = Cosecha.objects.filter(
                temporada=temporada,
                finalizada=False,
                is_active=True,
            )
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Ya existe una cosecha activa en esta temporada.", code="cosecha_activa_existente")

        # Reglas de creación
        if instance is None:
            if not temporada.is_active:
                raise serializers.ValidationError("No se pueden crear cosechas en una temporada archivada.", code="temporada_archivada")
            if temporada.finalizada:
                raise serializers.ValidationError("No se pueden crear cosechas en una temporada finalizada.", code="temporada_finalizada")
            if temporada.estado_operativo != Temporada.EstadoOperativo.OPERATIVA:
                raise serializers.ValidationError("No se pueden crear cosechas en una temporada planificada.", code="temporada_planificada")
            if temporada.cosechas.count() >= 6:
                raise serializers.ValidationError("Esta temporada ya tiene el máximo de 6 cosechas permitidas.", code="max_cosechas_alcanzado")

            # ⚙️ Normalizar nombre a uno único ANTES de ejecutar UniqueTogetherValidator
            data['nombre'] = self._nombre_unico(temporada, nombre_in)

        # Reglas de actualización
        else:
            # No permitir cambiar de temporada
            if 'temporada' in data and data['temporada'] != instance.temporada:
                raise serializers.ValidationError("No puedes cambiar la temporada de una cosecha existente.", code="cambio_temporada_prohibido")

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
            raise serializers.ValidationError("El nombre de la categoría debe tener al menos 3 caracteres.", code="nombre_muy_corto")
        qs = CategoriaInversion.objects.filter(nombre__iexact=val)
        if qs.exists() and not (self.instance and self.instance.nombre.lower() == val.lower()):
            raise serializers.ValidationError("Ya existe una categoría con este nombre.", code="categoria_duplicada")
        return val

class CategoriaPreCosechaSerializer(serializers.ModelSerializer):
    archivado_en = serializers.DateTimeField(read_only=True)
    is_active    = serializers.BooleanField(read_only=True)
    uso_count    = serializers.IntegerField(read_only=True)

    class Meta:
        model  = CategoriaPreCosecha
        fields = ['id', 'nombre', 'is_active', 'archivado_en', 'uso_count']

    def validate_nombre(self, value: str) -> str:
        val = (value or '').strip()
        if len(val) < 3:
            raise serializers.ValidationError("El nombre de la categoría debe tener al menos 3 caracteres.", code="nombre_muy_corto")
        qs = CategoriaPreCosecha.objects.filter(nombre__iexact=val)
        if qs.exists() and not (self.instance and self.instance.nombre.lower() == val.lower()):
            raise serializers.ValidationError("Ya existe una categoría con este nombre.", code="categoria_duplicada")
        return val


class PreCosechaSerializer(serializers.ModelSerializer):
    gastos_totales = serializers.DecimalField(read_only=True, max_digits=14, decimal_places=2)
    gastos_insumos = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=True,
        allow_null=False,
        min_value=Decimal("0.00"),
    )
    gastos_mano_obra = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=True,
        allow_null=False,
        min_value=Decimal("0.00"),
    )

    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=CategoriaPreCosecha.objects.all(),
        source='categoria',
        write_only=True,
    )
    temporada_id = serializers.PrimaryKeyRelatedField(
        queryset=Temporada.objects.all(),
        source='temporada',
        write_only=True,
    )
    huerta_id = serializers.PrimaryKeyRelatedField(
        queryset=Huerta.objects.all(),
        source='huerta',
        write_only=True,
        required=False,
        allow_null=True,
    )
    huerta_rentada_id = serializers.PrimaryKeyRelatedField(
        queryset=HuertaRentada.objects.all(),
        source='huerta_rentada',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model  = PreCosecha
        fields = [
            'id',
            'fecha', 'descripcion',
            'gastos_insumos', 'gastos_mano_obra', 'gastos_totales',
            'categoria', 'temporada', 'huerta', 'huerta_rentada',
            'categoria_id', 'temporada_id', 'huerta_id', 'huerta_rentada_id',
            'is_active', 'archivado_en',
        ]
        read_only_fields = [
            'gastos_totales', 'categoria', 'temporada', 'huerta', 'huerta_rentada',
            'is_active', 'archivado_en',
        ]

    def validate_fecha(self, value):
        temporada = None
        temporada_id = self.initial_data.get('temporada_id') if isinstance(self.initial_data, dict) else None
        if temporada_id:
            temporada = Temporada.objects.filter(pk=temporada_id).only('fecha_inicio').first()
        elif self.instance and self.instance.temporada_id:
            temporada = self.instance.temporada

        if temporada and temporada.fecha_inicio and value >= temporada.fecha_inicio:
            raise serializers.ValidationError(
                'La fecha de precosecha debe ser anterior al inicio operativo de la temporada.',
                code='fecha_posterior_inicio_temporada',
            )
        return value

    def validate_gastos_insumos(self, v):
        if v is None:
            raise serializers.ValidationError("El gasto en insumos es obligatorio.", code="campo_requerido")
        if v < 0:
            raise serializers.ValidationError("No puede ser negativo.", code="valor_negativo")
        return v

    def validate_gastos_mano_obra(self, v):
        if v is None:
            raise serializers.ValidationError("El gasto en mano de obra es obligatorio.", code="campo_requerido")
        if v < 0:
            raise serializers.ValidationError("No puede ser negativo.", code="valor_negativo")
        return v

    def validate(self, data):
        categoria = data.get('categoria') or getattr(self.instance, 'categoria', None)
        temporada = data.get('temporada') or getattr(self.instance, 'temporada', None)
        huerta = data.get('huerta') if 'huerta' in data else getattr(self.instance, 'huerta', None)
        huerta_rentada = data.get('huerta_rentada') if 'huerta_rentada' in data else getattr(self.instance, 'huerta_rentada', None)
        fecha = data.get('fecha') or getattr(self.instance, 'fecha', None)
        gi = data.get('gastos_insumos', getattr(self.instance, 'gastos_insumos', None))
        gm = data.get('gastos_mano_obra', getattr(self.instance, 'gastos_mano_obra', None))

        if gi is not None and gm is not None and (gi + gm) <= 0:
            raise serializers.ValidationError({"gastos_insumos": "Los gastos totales deben ser mayores a 0."}, code="gastos_totales_cero")

        if categoria and not categoria.is_active:
            raise serializers.ValidationError({"categoria_id": "No puedes usar una categoría archivada."}, code="categoria_archivada")

        if not temporada:
            return data

        if self.instance is not None and 'temporada' in data and data['temporada'] != self.instance.temporada:
            raise serializers.ValidationError(
                {"temporada_id": "No puedes reasignar una precosecha a otra temporada."},
                code="temporada_no_reasignable",
            )

        if not temporada.is_active:
            raise serializers.ValidationError({"temporada_id": "La temporada debe estar activa."}, code="temporada_archivada")
        if temporada.finalizada:
            raise serializers.ValidationError({"temporada_id": "La temporada no puede estar finalizada."}, code="temporada_finalizada")
        if temporada.estado_operativo != Temporada.EstadoOperativo.PLANIFICADA:
            raise serializers.ValidationError({"temporada_id": "Solo puedes registrar precosecha en una temporada planificada."}, code="temporada_no_planificada")

        if fecha and temporada.fecha_inicio and fecha >= temporada.fecha_inicio:
            raise serializers.ValidationError(
                {"fecha": "La fecha de precosecha debe ser anterior al inicio operativo de la temporada."},
                code="fecha_posterior_inicio_temporada",
            )

        if temporada.huerta_id:
            if huerta_rentada is not None:
                raise serializers.ValidationError({"huerta_rentada_id": "Esta temporada es de huerta propia."}, code="origen_rentada_en_propia")
            huerta = temporada.huerta
            huerta_rentada = None
        else:
            if huerta is not None:
                raise serializers.ValidationError({"huerta_id": "Esta temporada es de huerta rentada."}, code="origen_propia_en_rentada")
            huerta = None
            huerta_rentada = temporada.huerta_rentada

        if huerta and not getattr(huerta, 'is_active', True):
            raise serializers.ValidationError({"huerta_id": "No se pueden registrar precosechas en una huerta archivada."}, code="huerta_archivada")
        if huerta_rentada and not getattr(huerta_rentada, 'is_active', True):
            raise serializers.ValidationError({"huerta_rentada_id": "No se pueden registrar precosechas en una huerta rentada archivada."}, code="huerta_rentada_archivada")

        data['temporada'] = temporada
        data['huerta'] = huerta
        data['huerta_rentada'] = huerta_rentada
        return data

class InversionesHuertaSerializer(serializers.ModelSerializer):
    # Calculado
    gastos_totales = serializers.DecimalField(read_only=True, max_digits=14, decimal_places=2)

    # Campos numéricos → obligatorios a nivel API
    gastos_insumos   = serializers.DecimalField(max_digits=14, decimal_places=2, required=True, allow_null=False)
    gastos_mano_obra = serializers.DecimalField(max_digits=14, decimal_places=2, required=True, allow_null=False)

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
        """
        Reglas:
        - No futura.
        - Ventana simplificada a día: solo HOY o AYER.
        - Debe ser >= inicio de la cosecha.
        - En edición: no mover más atrás que lo ya registrado.
        """
        hoy  = timezone.localdate()
        ayer = hoy - timedelta(days=1)

        if value > hoy:
            raise serializers.ValidationError("La fecha no puede ser futura.", code="fecha_futura")
        if value not in {hoy, ayer}:
            raise serializers.ValidationError("La fecha sólo puede ser de hoy o de ayer (máx. 24 h).", code="fecha_fuera_rango")

        cosecha = None
        cosecha_id = self.initial_data.get('cosecha_id') if isinstance(self.initial_data, dict) else None
        if cosecha_id:
            cosecha = Cosecha.objects.filter(pk=cosecha_id).only('fecha_inicio').first()
        elif self.instance and self.instance.cosecha_id:
            cosecha = self.instance.cosecha

        if cosecha and getattr(cosecha, 'fecha_inicio', None):
            inicio = _as_local_date(cosecha.fecha_inicio)
            if value < inicio:
                raise serializers.ValidationError(
                    f'La fecha debe ser igual o posterior al inicio de la cosecha ({inicio.isoformat()}).',
                    code="fecha_anterior_cosecha"
                )

        if self.instance and getattr(self.instance, 'fecha', None):
            if value < self.instance.fecha:
                raise serializers.ValidationError("No puedes mover la fecha más atrás que la registrada.", code="fecha_retroactiva_invalida")
        return value

    def validate_gastos_insumos(self, v):
        if v is None:
            raise serializers.ValidationError("El gasto en insumos es obligatorio.", code="campo_requerido")
        if v < 0:
            raise serializers.ValidationError("No puede ser negativo.", code="valor_negativo")
        return v

    def validate_gastos_mano_obra(self, v):
        if v is None:
            raise serializers.ValidationError("El gasto en mano de obra es obligatorio.", code="campo_requerido")
        if v < 0:
            raise serializers.ValidationError("No puede ser negativo.", code="valor_negativo")
        return v

    # ——— Validación de objeto (reglas de negocio) ———
    def validate(self, data):
        categoria       = data.get('categoria')
        cosecha         = data.get('cosecha')
        temporada       = data.get('temporada')
        huerta          = data.get('huerta')
        huerta_rentada  = data.get('huerta_rentada')
        gi              = data.get('gastos_insumos')
        gm              = data.get('gastos_mano_obra')

        # Totales > 0
        if gi is not None and gm is not None:
            if (gi + gm) <= 0:
                raise serializers.ValidationError({"gastos_insumos": "Los gastos totales deben ser mayores a 0."}, code="gastos_totales_cero")

        # Si faltan, DRF marcará por campo
        if not all([categoria, cosecha, temporada]):
            return data

        # Temporada debe coincidir con la de la cosecha
        if temporada != cosecha.temporada:
            raise serializers.ValidationError({"temporada_id": "La temporada no coincide con la temporada de la cosecha."}, code="temporada_inconsistente")

        # 🚫 Bloqueos por estado
        if getattr(cosecha, 'finalizada', False):
            raise serializers.ValidationError({"cosecha_id": "No se pueden registrar inversiones en una cosecha finalizada."}, code="cosecha_finalizada")
        if not getattr(cosecha, 'is_active', True):
            raise serializers.ValidationError({"cosecha_id": "No se pueden registrar inversiones en una cosecha archivada."}, code="cosecha_archivada")

        if getattr(temporada, 'finalizada', False) or not getattr(temporada, 'is_active', True):
            raise serializers.ValidationError({"temporada_id": "No se pueden registrar inversiones en una temporada finalizada o archivada."}, code="temporada_no_permitida")

        # Coherencia de origen con la cosecha
        if cosecha.huerta_id:
            if not huerta or huerta.id != cosecha.huerta_id:
                raise serializers.ValidationError({"huerta_id": "La huerta no coincide con la huerta de la cosecha."}, code="huerta_inconsistente")
            if huerta_rentada is not None:
                raise serializers.ValidationError({"huerta_rentada_id": "No asignes huerta rentada en una cosecha de huerta propia."}, code="origen_rentada_en_propia")
        elif cosecha.huerta_rentada_id:
            if not huerta_rentada or huerta_rentada.id != cosecha.huerta_rentada_id:
                raise serializers.ValidationError({"huerta_rentada_id": "La huerta rentada no coincide con la de la cosecha."}, code="huerta_rentada_inconsistente")
            if huerta is not None:
                raise serializers.ValidationError({"huerta_id": "No asignes huerta propia en una cosecha de huerta rentada."}, code="origen_propia_en_rentada")
        else:
            raise serializers.ValidationError({"cosecha_id": "La cosecha no tiene origen (huerta/huerta_rentada) definido."}, code="cosecha_sin_origen")

        # 🚫 Origen archivado
        if huerta and not getattr(huerta, 'is_active', True):
            raise serializers.ValidationError({"huerta_id": "No se pueden registrar inversiones en una huerta archivada."}, code="huerta_archivada")
        if huerta_rentada and not getattr(huerta_rentada, 'is_active', True):
            raise serializers.ValidationError({"huerta_rentada_id": "No se pueden registrar inversiones en una huerta rentada archivada."}, code="huerta_rentada_archivada")

        return data

# -----------------------------
# VENTA
# -----------------------------
class VentaSerializer(serializers.ModelSerializer):
    # Aliases write_only que el FE manda
    temporada_id      = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(),      source='temporada',      write_only=True, required=False)
    cosecha_id        = serializers.PrimaryKeyRelatedField(queryset=Cosecha.objects.all(),        source='cosecha',        write_only=True, required=False)
    huerta_id         = serializers.PrimaryKeyRelatedField(queryset=Huerta.objects.all(),         source='huerta',         write_only=True, required=False, allow_null=True)
    huerta_rentada_id = serializers.PrimaryKeyRelatedField(queryset=HuertaRentada.objects.all(),  source='huerta_rentada', write_only=True, required=False, allow_null=True)

    # Forzamos “gasto” obligatorio a nivel API (>= 0)
    gasto = serializers.IntegerField(min_value=0, required=True, allow_null=False)

    class Meta:
        model  = Venta
        fields = (
            'id',
            'fecha_venta', 'tipo_mango', 'num_cajas', 'precio_por_caja', 'gasto',
            'descripcion',
            'total_venta', 'ganancia_neta',
            'cosecha', 'temporada', 'huerta', 'huerta_rentada',
            'temporada_id', 'cosecha_id', 'huerta_id', 'huerta_rentada_id',
            'is_active', 'archivado_en',
        )
        read_only_fields = (
            'total_venta', 'ganancia_neta', 'is_active', 'archivado_en',
            'cosecha', 'temporada', 'huerta', 'huerta_rentada',
        )

    # --- Igual que Inversiones: resolver contexto coherente ---
    def _resolve_context_fields(self, data):
        instance = getattr(self, 'instance', None)

        # Cosecha (del payload ya mapeado o de la instancia)
        cosecha = data.get('cosecha')
        if cosecha is None and instance is not None:
            cosecha = instance.cosecha
        if cosecha is None:
            raise serializers.ValidationError({'cosecha_id': 'Cosecha requerida.'}, code="campo_requerido")

        # Temporada (si no viene, inferir desde la cosecha)
        temporada = data.get('temporada')
        if temporada is None and instance is not None:
            temporada = instance.temporada
        if temporada is None:
            temporada = cosecha.temporada

        # Origen (huerta/huerta_rentada)
        huerta         = data.get('huerta') if 'huerta' in data else None
        huerta_rentada = data.get('huerta_rentada') if 'huerta_rentada' in data else None

        if instance is not None:
            if 'huerta' not in data:
                huerta = instance.huerta
            if 'huerta_rentada' not in data:
                huerta_rentada = instance.huerta_rentada

        if huerta is None and huerta_rentada is None:
            huerta         = getattr(cosecha, 'huerta', None)
            huerta_rentada = getattr(cosecha, 'huerta_rentada', None)

        if huerta and huerta_rentada:
            raise serializers.ValidationError({'huerta_id': 'Define solo huerta o huerta_rentada, no ambos.'}, code="origen_ambiguo")
        if not huerta and not huerta_rentada:
            raise serializers.ValidationError({'huerta_id': 'Debe definirse huerta u huerta_rentada (según la cosecha).'}, code="falta_origen")

        return cosecha, temporada, huerta, huerta_rentada

    # Validación de fecha: HOY o AYER, no futura, no antes de inicio de cosecha
    def validate_fecha_venta(self, value):
        hoy  = timezone.localdate()
        ayer = hoy - timedelta(days=1)
        if value not in {hoy, ayer}:
            raise serializers.ValidationError('La fecha solo puede ser HOY o AYER (máx. 24 h).', code="fecha_fuera_rango")
        # verificar contra inicio de cosecha si está disponible en initial_data/instance
        cosecha = None
        if isinstance(self.initial_data, dict) and self.initial_data.get('cosecha_id'):
            try:
                cosecha = Cosecha.objects.filter(pk=self.initial_data['cosecha_id']).only('fecha_inicio').first()
            except Exception:
                pass
        if not cosecha and self.instance:
            cosecha = getattr(self.instance, 'cosecha', None)
        if cosecha and getattr(cosecha, 'fecha_inicio', None):
            inicio = _as_local_date(cosecha.fecha_inicio)
            if value < inicio:
                raise serializers.ValidationError(
                    f'La fecha debe ser igual o posterior al inicio de la cosecha ({inicio.isoformat()}).',
                    code="fecha_anterior_cosecha"
                )

        return value
    def validate(self, data):
        cosecha, temporada, huerta, huerta_rentada = self._resolve_context_fields(data)

        # Coherencia temporada/cosecha
        if temporada != cosecha.temporada:
            raise serializers.ValidationError({'temporada_id': 'La temporada no coincide con la de la cosecha.'}, code="temporada_inconsistente")

        # 🚫 Bloqueos por estado
        if getattr(cosecha, 'finalizada', False):
            raise serializers.ValidationError({'cosecha_id': 'No se pueden registrar/editar ventas en una cosecha finalizada.'}, code="cosecha_finalizada")
        if not getattr(cosecha, 'is_active', True):
            raise serializers.ValidationError({'cosecha_id': 'No se pueden registrar/editar ventas en una cosecha archivada.'}, code="cosecha_archivada")

        if getattr(temporada, 'finalizada', False) or not getattr(temporada, 'is_active', True):
            raise serializers.ValidationError({'temporada_id': 'No se pueden registrar/editar ventas en una temporada finalizada o archivada.'}, code="temporada_invalida")

        # Coherencia de origen con la cosecha
        if huerta and getattr(cosecha, 'huerta', None) != huerta:
            raise serializers.ValidationError({'huerta_id': 'La huerta no coincide con la de la cosecha.'}, code="huerta_inconsistente")
        if huerta_rentada and getattr(cosecha, 'huerta_rentada', None) != huerta_rentada:
            raise serializers.ValidationError({'huerta_rentada_id': 'La huerta rentada no coincide con la de la cosecha.'}, code="huerta_rentada_inconsistente")

        # 🚫 Origen archivado
        if huerta and not getattr(huerta, 'is_active', True):
            raise serializers.ValidationError({'huerta_id': 'No se pueden registrar/editar ventas en una huerta archivada.'}, code="huerta_archivada")
        if huerta_rentada and not getattr(huerta_rentada, 'is_active', True):
            raise serializers.ValidationError({'huerta_rentada_id': 'No se pueden registrar/editar ventas en una huerta rentada archivada.'}, code="huerta_rentada_archivada")

        # Números
        num_cajas       = data.get('num_cajas',       getattr(self.instance, 'num_cajas',       None))
        precio_por_caja = data.get('precio_por_caja', getattr(self.instance, 'precio_por_caja', None))
        gasto           = data.get('gasto',           getattr(self.instance, 'gasto',           None))

        if num_cajas is None or num_cajas <= 0:
            raise serializers.ValidationError({'num_cajas': 'Debe ser mayor que 0.'}, code="cantidad_invalida")
        # Modelo exige > 0
        if precio_por_caja is None or precio_por_caja <= 0:
            raise serializers.ValidationError({'precio_por_caja': 'Debe ser > 0.'}, code="precio_invalido")
        if gasto is None or gasto < 0:
            raise serializers.ValidationError({'gasto': 'Debe ser ≥ 0.'}, code="gasto_invalido")



        # Inyectar contexto resuelto
        data['cosecha']        = cosecha
        data['temporada']      = temporada
        data['huerta']         = huerta
        data['huerta_rentada'] = huerta_rentada
        return data
