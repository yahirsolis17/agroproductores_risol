# backend/gestion_bodega/serializers.py
from datetime import timedelta, datetime, time
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum, Q
from django.utils import timezone
from typing import Any, Dict, Iterable, Optional
from django.utils.translation import gettext_lazy as _

from rest_framework import serializers

from .models import (
    Material, CalidadMadera, CalidadPlastico,
    Bodega, TemporadaBodega, Cliente,
    LoteBodega, Recepcion, ClasificacionEmpaque,
    InventarioPlastico, MovimientoPlastico,
    CompraMadera, AbonoMadera,
    Pedido, PedidoRenglon, SurtidoRenglon,
    CamionSalida, CamionItem, CamionConsumoEmpaque,
    Consumible, CierreSemanal,
)
from gestion_bodega.utils.semana import semana_cerrada_ids

def normalize_calidad(material: str, calidad_raw: str) -> str:
    """
    Normaliza 'calidad' según reglas de negocio.

    - Siempre retorna un CÓDIGO (upper, sin acentos, sin espacios).
    - Permite MADURO y MERMA tanto en MADERA como en PLASTICO.
    - Solo PLASTICO: SEGUNDA/EXTRA -> PRIMERA.
    """
    if calidad_raw is None:
        return ""

    # Normalización básica (labels -> código)
    cal = str(calidad_raw).strip().upper()

    # Normalizar variantes con acento / escritura humana (por si llegan)
    # (si tu frontend ya manda códigos, esto solo es guardrail)
    aliases = {
        "NIÑO": "NINIO",
        "NINO": "NINIO",
        "ROÑA": "RONIA",
        "RONA": "RONIA",
        "PRIMERA (≥ 2DA)": "PRIMERA",
        "PRIMERA (>= 2DA)": "PRIMERA",
        "PRIMERA (≥ 2DA.)": "PRIMERA",
    }
    cal = aliases.get(cal, cal)

    # MADURO/MERMA válidos para ambos materiales
    if cal in {"MADURO", "MERMA"}:
        return cal

    # Regla especial solo para PLASTICO
    if material == Material.PLASTICO:
        if cal in {"SEGUNDA", "EXTRA"}:
            return "PRIMERA"

        allowed_plastico = set(CalidadPlastico.values) | {"MADURO", "MERMA"}
        if cal not in allowed_plastico:
            raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        return cal

    # MADERA
    allowed_madera = set(CalidadMadera.values) | {"MADURO", "MERMA"}
    if cal not in allowed_madera:
        raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})
    return cal

# ───────────────────────────────────────────────────────────────────────────
# Helpers (alineados con gestion_huerta)
# ───────────────────────────────────────────────────────────────────────────

def _as_local_date(dt_or_date):
    if isinstance(dt_or_date, datetime):
        return timezone.localtime(dt_or_date).date()
    return dt_or_date

def _is_today_or_yesterday(d):
    hoy = timezone.localdate()
    return d in {hoy, hoy - timedelta(days=1)}

def _semana_bloqueada(bodega: Bodega, temporada: TemporadaBodega, fecha) -> bool:
    """
    True si la fecha cae dentro de una semana CERRADA para esa bodega+temporada.
    """
    return semana_cerrada_ids(
        getattr(bodega, "id", None),
        getattr(temporada, "id", None),
        fecha,
    )

def _temporada_activa(temporada: TemporadaBodega) -> bool:
    return getattr(temporada, "is_active", True) and not getattr(temporada, "finalizada", False)

def _assert_bodega_temporada_operables(bodega: Bodega, temporada: TemporadaBodega):
    """
    Falla rápido con errores explícitos:
      - bodega archivada → no se opera
      - temporada archivada/finalizada → no se opera
      - temporada no corresponde a bodega → no se opera
    """
    if bodega and not getattr(bodega, "is_active", True):
        raise serializers.ValidationError("La bodega está archivada; no se pueden realizar operaciones.")

    if temporada and not _temporada_activa(temporada):
        raise serializers.ValidationError("No se puede operar en una temporada archivada o finalizada.")

    if bodega and temporada and getattr(temporada, "bodega_id", None) and temporada.bodega_id != bodega.id:
        raise serializers.ValidationError("La temporada no corresponde a la bodega indicada.")

def _resolver_semana(bodega: Bodega, temporada: TemporadaBodega, f):
    """
    Devuelve el CierreSemanal cuyo rango cubre la fecha f.
    Para semanas abiertas, fin teórico = fecha_desde + 6 días.
    """
    if not (bodega and temporada and f):
        return None

    qs = CierreSemanal.objects.filter(bodega=bodega, temporada=temporada, is_active=True)

    chosen = None
    for s in qs:
        start = s.fecha_desde
        end = s.fecha_hasta or (s.fecha_desde + timedelta(days=6))
        if start <= f <= end:
            if chosen is None or s.fecha_desde > chosen.fecha_desde:
                chosen = s
    return chosen

def _require_semana(bodega: Bodega, temporada: TemporadaBodega, fecha):
    """
    Si no existe semana que cubra la fecha, rechazamos: evita registros sin semana.
    """
    semana = _resolver_semana(bodega, temporada, fecha)
    if semana is None:
        raise serializers.ValidationError(
            {"fecha": "No existe una semana que cubra esta fecha. Inicia una semana desde el tablero."}
        )
    return semana

class DateOrDateTimeField(serializers.Field):
    """
    Serializa:
      - datetime → ISO-8601 completo (con hora)
      - date → 'YYYY-MM-DD' (sin 'T00:00:00')
      - string ISO → se respeta tal cual
    """
    def to_representation(self, value):
        from datetime import datetime as _dt
        # datetime → ISO completo
        if isinstance(value, _dt):
            return value.isoformat()
        # date → 'YYYY-MM-DD'
        if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
            return value.isoformat()  # date.isoformat() -> 'YYYY-MM-DD'
        # string ya formateado (best-effort)
        if isinstance(value, str):
            return value
        return None
# ───────────────────────────────────────────────────────────────────────────
# Bodega / Temporada / Cliente
# ───────────────────────────────────────────────────────────────────────────

class BodegaSerializer(serializers.ModelSerializer):
    activa = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Bodega
        fields = ["id", "nombre", "ubicacion", "is_active", "archivado_en", "creado_en", "actualizado_en", "activa"]
        read_only_fields = ["is_active", "archivado_en", "creado_en", "actualizado_en", "activa"]
        validators = []

    def validate_nombre(self, val):
        v = (val or "").strip()
        if len(v) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return v

    def validate_ubicacion(self, val):
        if isinstance(val, str):
            v = (val or "").strip()
            if len(v) < 3:
                raise serializers.ValidationError("La ubicación debe tener al menos 3 caracteres.")
            return v
        return val

    def validate(self, attrs):
        """
        No puede existir otra bodega con el mismo NOMBRE y la misma UBICACIÓN (case-insensitive).
        Se permite repetir nombre en distinta ubicación.
        """
        nombre = (attrs.get("nombre") or getattr(self.instance, "nombre", "") or "").strip()
        ubicacion = attrs.get("ubicacion") if "ubicacion" in attrs else getattr(self.instance, "ubicacion", "")
        ubicacion_str = (ubicacion or "").strip() if isinstance(ubicacion, str) else ubicacion

        qs = Bodega.objects.all()
        if isinstance(ubicacion_str, str):
            qs = qs.filter(nombre__iexact=nombre, ubicacion__iexact=ubicacion_str)
        else:
            qs = qs.filter(nombre__iexact=nombre, ubicacion=ubicacion_str)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            msg = "Ya existe una bodega registrada con este nombre en esta ubicación."
            raise serializers.ValidationError({
                "nombre": [msg],
                "ubicacion": [msg],
            })

        return attrs

    def get_activa(self, obj) -> bool:
        # Alias legible para consistencia con FE: activa == is_active
        return bool(getattr(obj, "is_active", False))


class TemporadaBodegaSerializer(serializers.ModelSerializer):
    bodega_id       = serializers.PrimaryKeyRelatedField(source="bodega", queryset=Bodega.objects.all(), write_only=True)
    bodega_nombre   = serializers.SerializerMethodField()
    bodega_ubicacion= serializers.SerializerMethodField()
    bodega_is_active= serializers.SerializerMethodField()

    is_active    = serializers.BooleanField(read_only=True)
    archivado_en = serializers.DateTimeField(read_only=True)

    class Meta:
        model = TemporadaBodega
        fields = [
            "id", "año",
            "bodega", "bodega_id", "bodega_nombre", "bodega_ubicacion", "bodega_is_active",
            "fecha_inicio", "fecha_fin", "finalizada",
            "is_active", "archivado_en",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = [
            "bodega", "bodega_nombre", "bodega_ubicacion", "bodega_is_active",
            "is_active", "archivado_en",
            "creado_en", "actualizado_en",
        ]

    def get_bodega_nombre(self, obj):
        b = getattr(obj, "bodega", None)
        nombre = getattr(b, "nombre", None) if b else None
        return (nombre.strip() if isinstance(nombre, str) else None)

    def get_bodega_ubicacion(self, obj):
        b = getattr(obj, "bodega", None)
        ubicacion = getattr(b, "ubicacion", None) if b else None
        return (ubicacion.strip() if isinstance(ubicacion, str) else None)

    def get_bodega_is_active(self, obj):
        b = getattr(obj, "bodega", None)
        return getattr(b, "is_active", None) if b else None

    def validate_año(self, value):
        actual = timezone.now().year
        if value < 2000 or value > actual + 1:
            raise serializers.ValidationError("El año debe estar entre 2000 y el año siguiente al actual.")
        return value

    def validate(self, attrs):
        bodega = attrs.get("bodega") or getattr(self.instance, "bodega", None)
        año    = attrs.get("año")    or getattr(self.instance, "año", None)

        # Normalizar fechas si vienen como datetime
        for f in ("fecha_inicio", "fecha_fin"):
            val = attrs.get(f)
            if isinstance(val, datetime):
                attrs[f] = _as_local_date(val)

        instance = getattr(self, "instance", None)
        if instance is not None:
            if not getattr(instance, "is_active", True):
                raise serializers.ValidationError({"non_field_errors": ["Registro archivado no editable."]})
            if getattr(instance, "finalizada", False):
                raise serializers.ValidationError({"non_field_errors": ["La temporada finalizada no se puede editar."]})
            parent = getattr(instance, "bodega", None)
            if parent is not None and not getattr(parent, "is_active", True):
                raise serializers.ValidationError({"non_field_errors": ["La bodega está archivada; no se pueden gestionar temporadas."]})

        if bodega and not getattr(bodega, "is_active", True):
            raise serializers.ValidationError({"non_field_errors": ["La bodega está archivada; no se pueden gestionar temporadas."]})

        # Unicidad SOLO entre temporadas no finalizadas (consistente con constraint del modelo)
        if bodega and año:
            qs = TemporadaBodega.objects.filter(bodega=bodega, año=año, finalizada=False)
            if instance is not None:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"non_field_errors": ["Ya existe una temporada activa para este año en esta bodega."]})
        return attrs


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = [
            "id", "nombre", "alias", "rfc", "telefono", "email", "direccion", "notas",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate_nombre(self, val):
        v = (val or "").strip()
        if len(v) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return v

    def validate_rfc(self, v):
        v = (v or "").strip().upper()
        if v and len(v) < 12:
            raise serializers.ValidationError("RFC demasiado corto.")
        return v

    def validate(self, data):
        nombre = (data.get("nombre") or getattr(self.instance, "nombre", "") or "").strip()
        rfc    = (data.get("rfc") or getattr(self.instance, "rfc", "") or "").strip().upper()
        qs = Cliente.objects.filter(nombre__iexact=nombre, rfc__iexact=rfc)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un cliente con ese nombre y RFC.")
        return data

# ───────────────────────────────────────────────────────────────────────────
# Recepciones y Clasificaciones (empaque)
# ───────────────────────────────────────────────────────────────────────────

# ───────────────────────────────────────────────────────────────────────────
# Recepciones y Clasificaciones (empaque)
# ───────────────────────────────────────────────────────────────────────────

class RecepcionSerializer(serializers.ModelSerializer):
    bodega_nombre = serializers.ReadOnlyField(source="bodega.nombre")
    temporada_nombre = serializers.ReadOnlyField(source="temporada.__str__")
    semana_str = serializers.SerializerMethodField()
    # Input manual para resolver/crear LoteBodega (se autogenera si viene vacío)
    codigo_lote = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Display: código del lote asociado
    lote_codigo = serializers.CharField(source="lote.codigo_lote", read_only=True)
    
    # ALIAS: Frontend usa cantidad_cajas; se mapea a cajas_campo
    cantidad_cajas = serializers.IntegerField(source="cajas_campo", write_only=True)
    cajas_campo = serializers.IntegerField(read_only=True)
    
    # Calculated fields (annotated in queryset via recepcion_aggregates.py)
    cajas_empaquetadas = serializers.IntegerField(read_only=True)
    cajas_disponibles = serializers.IntegerField(read_only=True)
    cajas_merma = serializers.IntegerField(read_only=True)
    empaque_status = serializers.CharField(read_only=True)
    
    # F1: Folio Operativo
    folio = serializers.SerializerMethodField()

    class Meta:
        model = Recepcion
        fields = [
            "id", "folio", "bodega", "bodega_nombre",
            "temporada", "temporada_nombre",
            "semana", "semana_str",
            "fecha", "huertero_nombre", "tipo_mango",
            "cajas_campo",  # read-only
            "cantidad_cajas",  # input alias
            "lote", "lote_codigo", "codigo_lote",  # Lote fields
            "observaciones",
            "creado_en", "actualizado_en",
            "is_active",
            "cajas_empaquetadas", "cajas_disponibles", "cajas_merma", "empaque_status",
        ]
        read_only_fields = [
            "folio",
            "creado_en", "actualizado_en", "is_active", "lote",
            "cajas_campo",
            "cajas_empaquetadas", "cajas_disponibles", "cajas_merma", "empaque_status",
        ]

    def get_folio(self, obj) -> str:
        return f"REC-{obj.id}"

    def get_semana_str(self, obj):
        return str(obj.semana) if obj.semana else None

    def validate_codigo_lote(self, value):
        return value.strip().upper() if value else ""

    def _build_codigo_lote(self, data: Dict[str, Any]) -> str:
        """
        Genera un código legible y determinístico usando el contexto:
        B{bodega}-T{temporada}-S{semana}-H{huertero}-M{mango}-C{cajas}
        """
        def _slug(val: Any, length: int) -> str:
            txt = str(val or "").strip().upper().replace(" ", "")
            return (txt[:length] or "X" * min(length, 3))

        bodega = getattr(data.get("bodega"), "id", data.get("bodega")) or "B"
        temporada = getattr(data.get("temporada"), "id", data.get("temporada")) or "T"
        semana_obj = data.get("semana")
        semana = getattr(semana_obj, "id", semana_obj) or "S"

        huertero = _slug(data.get("huertero_nombre"), 3)
        mango = _slug(data.get("tipo_mango"), 4)
        cajas_val = data.get("cajas_campo") or data.get("cantidad_cajas") or 0
        try:
            cajas = int(cajas_val)
        except Exception:
            cajas = 0

        code = f"B{bodega}-T{temporada}-S{semana}-H{huertero}-M{mango}-C{cajas:03d}"
        return code[:50]  # Límite del modelo

    def _resolve_lote(self, validated_data):
        """
        Busca o crea LoteBodega según codigo_lote.
        """
        codigo = str(validated_data.pop("codigo_lote", "") or "").strip()
        if not codigo:
            bodega = validated_data.get("bodega") or getattr(self.instance, "bodega", None)
            temporada = validated_data.get("temporada") or getattr(self.instance, "temporada", None)
            fecha = validated_data.get("fecha") or getattr(self.instance, "fecha", None)
            if not validated_data.get("semana") and bodega and temporada and fecha:
                validated_data["semana"] = _require_semana(bodega, temporada, fecha)
            codigo = self._build_codigo_lote(validated_data)
        if not codigo:
            return None

        bodega = validated_data.get("bodega")
        temporada = validated_data.get("temporada")
        
        # En update, si no vienen en data, usarlos de la instancia (self.instance)
        if self.instance:
            bodega = bodega or self.instance.bodega
            temporada = temporada or self.instance.temporada

        # Si aún no tenemos contexto (ej. create parcial fallido?), retornamos None o error
        if not bodega or not temporada:
            return None
        
        # Buscar existente
        lote = LoteBodega.objects.filter(
            bodega=bodega, 
            temporada=temporada, 
            codigo_lote=codigo
        ).first()

        if lote:
            return lote

        # Crear nuevo (necesitamos semana para el contexto de creación)
        # Intentamos usar la semana de la recepción (si viene o ya existe)
        semana = validated_data.get("semana")
        if not semana and self.instance:
            semana = self.instance.semana
        
        # Si no viene explicita, el modelo Recepcion intentará resolverla en clean(),
        # pero necesitamos crear el Lote ANTES de guardar Recepcion si queremos asignarlo.
        # Así que usamos el helper de modelo si hace falta.
        if not semana and "fecha" in validated_data:
             from gestion_bodega.models import _resolver_semana_por_fecha
             semana = _resolver_semana_por_fecha(bodega.id, temporada.id, validated_data["fecha"])
        
        if not semana:
            # Si no podemos determinar semana, no podemos crear el lote con integridad
            raise serializers.ValidationError({"codigo_lote": "No se puede crear un nuevo lote sin una semana válida establecida."})

        lote = LoteBodega.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            codigo_lote=codigo,
            origen_nombre=validated_data.get("huertero_nombre", "")
        )
        return lote

    def create(self, validated_data):
        lote = self._resolve_lote(validated_data)
        if lote:
            validated_data["lote"] = lote
        return super().create(validated_data)

    def update(self, instance, validated_data):
        lote = self._resolve_lote(validated_data)
        if lote:
            validated_data["lote"] = lote
        # Si venía vacío el input, ¿borramos el lote? 
        # Decisión UX: Si el usuario borra el texto, ¿quiere desvincular? 
        # Por seguridad, solo cambiamos si viene un código explicito. 
        # Si quiere quitarlo, debería ser otra acción o keyword explícita.
        # Por ahora: solo update si hay nuevo código.
        
        return super().update(instance, validated_data)



class ClasificacionEmpaqueSerializer(serializers.ModelSerializer):
    recepcion_id  = serializers.PrimaryKeyRelatedField(queryset=Recepcion.objects.all(),        source="recepcion",  write_only=True)
    bodega_id     = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",     write_only=True)
    temporada_id  = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(),  source="temporada",  write_only=True)
    semana = serializers.PrimaryKeyRelatedField(read_only=True)
    lote_codigo = serializers.ReadOnlyField(source="lote.codigo_lote")

    class Meta:
        model = ClasificacionEmpaque
        fields = [
            "id", "recepcion", "bodega", "temporada", "semana",
            "recepcion_id", "bodega_id", "temporada_id",
            "fecha", "material", "calidad", "tipo_mango", "cantidad_cajas",
            "lote", "lote_codigo",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["recepcion", "bodega", "temporada", "semana", "tipo_mango", "is_active", "archivado_en", "creado_en", "actualizado_en", "lote"]

    def validate_material(self, v):
        if v not in Material.values:
            raise serializers.ValidationError("Material inv?lido.")
        return v

    def validate(self, data):
        recepcion  = data.get("recepcion")  or getattr(self.instance, "recepcion", None)
        bodega     = data.get("bodega")     or getattr(self.instance, "bodega", None)
        temporada  = data.get("temporada")  or getattr(self.instance, "temporada", None)
        fecha      = data.get("fecha")      or getattr(self.instance, "fecha", None)
        material   = data.get("material")   or getattr(self.instance, "material", None)
        calidad    = data.get("calidad")    or getattr(self.instance, "calidad", None)
        cantidad   = data.get("cantidad_cajas") or getattr(self.instance, "cantidad_cajas", None)


        if not all([recepcion, bodega, temporada, fecha, material, calidad, cantidad]):
            return data

        _assert_bodega_temporada_operables(bodega, temporada)

        # Recepcion debe pertenecer a la misma bodega/temporada
        if getattr(recepcion, "bodega_id", None) != bodega.id:
            raise serializers.ValidationError({"recepcion_id": "La recepci?n no pertenece a esta bodega."})
        if getattr(recepcion, "temporada_id", None) != temporada.id:
            raise serializers.ValidationError({"recepcion_id": "La recepci?n no pertenece a esta temporada."})
        if getattr(recepcion, "is_active", True) is False:
            raise serializers.ValidationError({"recepcion_id": "La recepci?n est? archivada; no se permiten clasificaciones."})

        if cantidad <= 0:
            raise serializers.ValidationError({"cantidad_cajas": "Debe ser mayor a 0."})

        # Canonizar calidad según material (incluye MADURO/MERMA + regla SEGUNDA/EXTRA en PLASTICO)
        data["calidad"] = normalize_calidad(material, data.get("calidad", calidad))

        if fecha > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})

        # Debe existir semana que cubra la fecha
        semana = _require_semana(bodega, temporada, fecha)

        # Prioridad: semana cerrada
        if _semana_bloqueada(bodega, temporada, fecha):
            raise serializers.ValidationError("Esta semana est? cerrada; no se permiten m?s cambios en ese rango.")

        # Regla operativa: hoy/ayer
        if not _is_today_or_yesterday(fecha):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (m?x. 24 h)."})

        # Consistencia contra la recepcion:
        if recepcion.fecha and fecha < recepcion.fecha:
            raise serializers.ValidationError({"fecha": "La fecha de clasificaci?n no puede ser anterior a la recepci?n."})

        # La semana resuelta debe coincidir con la semana de la recepci?n (si existe)
        if getattr(recepcion, "semana_id", None) and recepcion.semana_id != semana.id:
            raise serializers.ValidationError({"fecha": "La fecha cae en una semana distinta a la de la recepci?n."})

        # No exceder cajas disponibles de la recepci?n (considerando otras clasificaciones activas)
        with transaction.atomic():
            qs = (
                ClasificacionEmpaque.objects.select_for_update()
                .filter(recepcion=recepcion, is_active=True)
            )
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            ya_clasificado = qs.aggregate(total=Sum("cantidad_cajas"))["total"] or 0

        cajas_recepcion = getattr(recepcion, "cajas_campo", 0) or 0
        if (ya_clasificado + cantidad) > cajas_recepcion:
            raise serializers.ValidationError(
                {"cantidad_cajas": "La clasificaci?n excede las cajas disponibles de la recepci?n."}
            )

        return data

    def create(self, validated_data):
        bodega = validated_data["bodega"]
        temporada = validated_data["temporada"]
        fecha = validated_data["fecha"]
        validated_data["semana"] = _require_semana(bodega, temporada, fecha)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        bodega = validated_data.get("bodega", instance.bodega)
        temporada = validated_data.get("temporada", instance.temporada)
        fecha = validated_data.get("fecha", instance.fecha)
        validated_data["semana"] = _require_semana(bodega, temporada, fecha)
        return super().update(instance, validated_data)

class ClasificacionEmpaqueBulkItemSerializer(serializers.Serializer):
    material = serializers.ChoiceField(choices=Material.choices)
    calidad = serializers.CharField(max_length=12)
    tipo_mango = serializers.CharField(max_length=80, allow_blank=True, required=False)
    cantidad_cajas = serializers.IntegerField(min_value=0)

    def validate(self, data):
        mat = data.get("material")
        cal = data.get("calidad")
        # Normalize + validate
        data["calidad"] = normalize_calidad(mat, cal)
        return data


class ClasificacionEmpaqueBulkUpsertSerializer(serializers.Serializer):
    recepcion = serializers.PrimaryKeyRelatedField(queryset=Recepcion.objects.all(), required=False, allow_null=True)
    bodega = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all())
    temporada = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all())
    fecha = serializers.DateField()
    items = ClasificacionEmpaqueBulkItemSerializer(many=True)

    def validate(self, data):
        recepcion = data.get("recepcion")
        bodega = data["bodega"]
        temporada = data["temporada"]
        f = data.get("fecha")

        _assert_bodega_temporada_operables(bodega, temporada)

        if recepcion:
            # Recepcion consistente
            if getattr(recepcion, "bodega_id", None) != bodega.id:
                raise serializers.ValidationError({"recepcion": "La recepción no pertenece a esta bodega."})
            if getattr(recepcion, "temporada_id", None) != temporada.id:
                raise serializers.ValidationError({"recepcion": "La recepción no pertenece a esta temporada."})
            if getattr(recepcion, "is_active", True) is False:
                raise serializers.ValidationError({"recepcion": "La recepción está archivada; no se permiten clasificaciones."})
            
            # Fecha y semana consistency
            if recepcion.fecha and f < recepcion.fecha:
                raise serializers.ValidationError({"fecha": "La fecha de clasificación no puede ser anterior a la recepción."})
            
            semana = _require_semana(bodega, temporada, f)
            if getattr(recepcion, "semana_id", None) and semana and recepcion.semana_id != semana.id:
                raise serializers.ValidationError({"fecha": "La fecha cae en una semana distinta a la de la recepción."})


        if f > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})

        semana = _require_semana(bodega, temporada, f)

        if _semana_bloqueada(bodega, temporada, f):
            raise serializers.ValidationError("Esta semana est? cerrada; no se permiten m?s cambios en ese rango.")

        if not _is_today_or_yesterday(f):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (m?x. 24 h)."})

        # Fecha de clasificación no puede ser anterior a la recepción
        if recepcion.fecha and f < recepcion.fecha:
            raise serializers.ValidationError({"fecha": "La fecha de clasificaci?n no puede ser anterior a la recepci?n."})

        # Semana resuelta debe coincidir con la de la recepción (si existe)
        if getattr(recepcion, "semana_id", None) and semana and recepcion.semana_id != semana.id:
            raise serializers.ValidationError({"fecha": "La fecha cae en una semana distinta a la de la recepci?n."})

        if not data.get("items"):
            raise serializers.ValidationError({"items": "Debe incluir al menos un ?tem."})

        # suma de ?tems no excede disponible
        total_items = sum(int(i.get("cantidad_cajas") or 0) for i in data["items"])

        # VALIDACIÓN ELIMINADA: Causaba doble conteo al actualizar (ya_clasificado + nuevo).
        # La validación correcta de capacidad (Snapshot) se realiza en la Vista (bulk_upsert).
        # with transaction.atomic():
        #     qs = (
        #         ClasificacionEmpaque.objects.select_for_update()
        #         .filter(recepcion=recepcion, is_active=True)
        #     )
        #     ya_clasificado = qs.aggregate(total=Sum("cantidad_cajas"))["total"] or 0
        #     cajas_recepcion = getattr(recepcion, "cajas_campo", 0) or 0
        #
        # if (ya_clasificado + total_items) > cajas_recepcion:
        #     raise serializers.ValidationError(
        #         {"items": "La suma de clasificaciones excede las cajas disponibles de la recepci?n."}
        #     )

        return data

# ───────────────────────────────────────────────────────────────────────────
# Inventario Plástico y Movimientos
# ───────────────────────────────────────────────────────────────────────────

class InventarioPlasticoSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)
    cliente_id   = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(),          source="cliente",   write_only=True, required=False, allow_null=True)

    class Meta:
        model = InventarioPlastico
        fields = [
            "id", "bodega", "temporada", "cliente",
            "bodega_id", "temporada_id", "cliente_id",
            "calidad", "tipo_mango", "stock",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["bodega", "temporada", "cliente", "stock", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate_calidad(self, v):
        if v not in set(CalidadPlastico.values):
            raise serializers.ValidationError("Calidad inválida para inventario de plástico.")
        return v


class MovimientoPlasticoSerializer(serializers.ModelSerializer):
    inventario_id = serializers.PrimaryKeyRelatedField(queryset=InventarioPlastico.objects.all(), source="inventario", write_only=True)

    class Meta:
        model = MovimientoPlastico
        fields = [
            "id", "inventario", "inventario_id", "tipo", "cantidad", "motivo",
            "referencia_tipo", "referencia_id", "fecha",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = ["inventario", "creado_en", "actualizado_en"]

    def validate(self, data):
        inv      = data.get("inventario") or getattr(self.instance, "inventario", None)
        tipo     = data.get("tipo")       or getattr(self.instance, "tipo", None)
        cantidad = data.get("cantidad")   or getattr(self.instance, "cantidad", None)
        fecha    = data.get("fecha")      or getattr(self.instance, "fecha", None)

        if not all([inv, tipo, cantidad, fecha]):
            return data

        if cantidad <= 0:
            raise serializers.ValidationError({"cantidad": "Debe ser mayor a 0."})

        d = _as_local_date(fecha)
        if d > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(d):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})

        if _semana_bloqueada(inv.bodega, inv.temporada, d):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")

        if tipo == MovimientoPlastico.SALIDA and cantidad > inv.stock:
            raise serializers.ValidationError("No hay stock suficiente para registrar la salida.")
        return data


class AjusteInventarioPlasticoSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=[MovimientoPlastico.ENTRADA, MovimientoPlastico.SALIDA])
    cantidad = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField(max_length=200)
    fecha = serializers.DateField(required=False)

    def validate(self, data):
        f = data.get("fecha")
        if f:
            if f > timezone.localdate():
                raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
            if not _is_today_or_yesterday(f):
                raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER."})
        return data

# ───────────────────────────────────────────────────────────────────────────
# Compras de Madera y Abonos (dinero real)
# ──────────────────────────────────────────────────────────────────────────

class CompraMaderaSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = CompraMadera
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "proveedor_nombre", "cantidad_cajas", "precio_unitario",
            "monto_total", "saldo", "observaciones",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["bodega", "temporada", "monto_total", "saldo", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        if temporada and not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden registrar compras en una temporada archivada o finalizada.")
        if (data.get("cantidad_cajas") or 0) <= 0:
            raise serializers.ValidationError({"cantidad_cajas": "Debe ser mayor a 0."})
        if (data.get("precio_unitario") or Decimal("0.00")) <= 0:
            raise serializers.ValidationError({"precio_unitario": "Debe ser mayor a 0."})
        return data


class AbonoMaderaSerializer(serializers.ModelSerializer):
    compra_id = serializers.PrimaryKeyRelatedField(queryset=CompraMadera.objects.all(), source="compra", write_only=True)

    class Meta:
        model = AbonoMadera
        fields = [
            "id", "compra", "compra_id", "fecha", "monto", "metodo", "saldo_resultante",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = ["compra", "saldo_resultante", "creado_en", "actualizado_en"]

    def validate_monto(self, v):
        if v is None or v <= 0:
            raise serializers.ValidationError("El abono debe ser mayor a 0.")
        return v

    def validate(self, data):
        compra = data.get("compra") or getattr(self.instance, "compra", None)
        monto  = data.get("monto")  or getattr(self.instance, "monto", None)
        fecha  = data.get("fecha")  or getattr(self.instance, "fecha", None)

        if not all([compra, monto, fecha]):
            return data

        d = _as_local_date(fecha)
        if d > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(d):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})

        if monto > compra.saldo:
            raise serializers.ValidationError("El abono no puede exceder el saldo.")
        return data


class RegistrarAbonoSerializer(serializers.Serializer):
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    fecha = serializers.DateField(required=False)
    metodo = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_monto(self, v):
        if v is None or v <= 0:
            raise serializers.ValidationError("El abono debe ser mayor a 0.")
        return v

    def validate_fecha(self, f):
        if f and f > timezone.localdate():
            raise serializers.ValidationError("La fecha no puede ser futura.")
        if f and not _is_today_or_yesterday(f):
            raise serializers.ValidationError("La fecha solo puede ser HOY o AYER (máx. 24 h).")
        return f

# ───────────────────────────────────────────────────────────────────────────
# Pedidos (con renglones) y Surtidos
# ───────────────────────────────────────────────────────────────────────────

class PedidoRenglonSerializer(serializers.ModelSerializer):
    pendiente = serializers.IntegerField(read_only=True)

    class Meta:
        model = PedidoRenglon
        fields = [
            "id", "pedido", "material", "calidad", "tipo_mango",
            "cantidad_solicitada", "cantidad_surtida", "pendiente",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = ["pedido", "cantidad_surtida", "pendiente", "creado_en", "actualizado_en"]

    def validate(self, data):
        material = data.get("material") or getattr(self.instance, "material", None)
        calidad  = data.get("calidad")  or getattr(self.instance, "calidad", None)
        cant     = data.get("cantidad_solicitada") or getattr(self.instance, "cantidad_solicitada", None)

        if material not in Material.values:
            raise serializers.ValidationError({"material": "Material inválido."})

        if material == Material.PLASTICO:
            if calidad in {"SEGUNDA", "EXTRA"}:
                data["calidad"] = CalidadPlastico.PRIMERA
            if data.get("calidad", calidad) not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if calidad not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})

        if cant is None or cant <= 0:
            raise serializers.ValidationError({"cantidad_solicitada": "Debe ser mayor a 0."})
        return data


class PedidoSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)
    cliente_id   = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(),          source="cliente",   write_only=True)

    renglones = PedidoRenglonSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = [
            "id", "bodega", "temporada", "cliente",
            "bodega_id", "temporada_id", "cliente_id",
            "fecha", "estado", "observaciones",
            "renglones",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["bodega", "temporada", "cliente", "estado", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        if temporada and not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden crear/editar pedidos en temporadas archivadas o finalizadas.")

        fecha  = data.get("fecha")  or getattr(self.instance, "fecha", None)
        bodega = data.get("bodega") or getattr(self.instance, "bodega", None)

        if fecha:
            if fecha > timezone.localdate():
                raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
            if not _is_today_or_yesterday(fecha):
                raise serializers.ValidationError({"fecha": "La fecha del pedido solo puede ser HOY o AYER (máx. 24 h)."})
            if bodega and temporada and _semana_bloqueada(bodega, temporada, fecha):
                raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")
        return data


class PedidoDetailSerializer(PedidoSerializer):
    renglones = PedidoRenglonSerializer(many=True, read_only=True)


class SurtirConsumoSerializer(serializers.Serializer):
    renglon_id = serializers.IntegerField()
    clasificacion_id = serializers.IntegerField()
    cantidad = serializers.IntegerField(min_value=1)


class SurtirPedidoSerializer(serializers.Serializer):
    consumos = SurtirConsumoSerializer(many=True)


class SurtidoRenglonSerializer(serializers.ModelSerializer):
    renglon_id              = serializers.PrimaryKeyRelatedField(queryset=PedidoRenglon.objects.all(),        source="renglon", write_only=True)
    origen_clasificacion_id = serializers.PrimaryKeyRelatedField(queryset=ClasificacionEmpaque.objects.all(), source="origen_clasificacion", write_only=True)

    class Meta:
        model = SurtidoRenglon
        fields = [
            "id", "renglon", "renglon_id", "origen_clasificacion", "origen_clasificacion_id",
            "cantidad",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = ["renglon", "origen_clasificacion", "creado_en", "actualizado_en"]

    def validate(self, data):
        renglon  = data.get("renglon") or getattr(self.instance, "renglon", None)
        origen   = data.get("origen_clasificacion") or getattr(self.instance, "origen_clasificacion", None)
        cantidad = data.get("cantidad") or getattr(self.instance, "cantidad", None)

        if not all([renglon, origen, cantidad]):
            return data

        if cantidad <= 0:
            raise serializers.ValidationError({"cantidad": "Debe ser mayor a 0."})

        if renglon.material != origen.material:
            raise serializers.ValidationError("El material del renglón no coincide con el de la clasificación de origen.")
        if renglon.calidad != origen.calidad:
            raise serializers.ValidationError("La calidad del renglón no coincide con la clasificación de origen.")

        consumido   = origen.surtidos.aggregate(total=Sum("cantidad"))["total"] or 0
        disponible  = (origen.cantidad_cajas or 0) - consumido
        if cantidad > disponible:
            raise serializers.ValidationError("No hay suficiente disponible en la clasificación seleccionada.")

        if cantidad > renglon.pendiente:
            raise serializers.ValidationError("La cantidad excede lo pendiente del renglón.")
        return data

# ───────────────────────────────────────────────────────────────────────────
# Camiones (salida) e Items declarativos de embarque
# ───────────────────────────────────────────────────────────────────────────

class CamionItemSerializer(serializers.ModelSerializer):
    camion_id = serializers.PrimaryKeyRelatedField(queryset=CamionSalida.objects.all(), source="camion", write_only=True)

    class Meta:
        model = CamionItem
        fields = [
            "id", "camion", "camion_id",
            "material", "calidad", "tipo_mango", "cantidad_cajas",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = ["camion", "creado_en", "actualizado_en"]

    def validate(self, data):
        mat   = data.get("material") or getattr(self.instance, "material", None)
        cal   = data.get("calidad")  or getattr(self.instance, "calidad", None)
        cant  = data.get("cantidad_cajas") or getattr(self.instance, "cantidad_cajas", None)

        if mat not in Material.values:
            raise serializers.ValidationError({"material": "Material inválido."})
        if mat == Material.PLASTICO:
            if cal in {"SEGUNDA", "EXTRA"}:
                data["calidad"] = CalidadPlastico.PRIMERA
            if data.get("calidad", cal) not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if cal not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})

        if cant is None or cant <= 0:
            raise serializers.ValidationError({"cantidad_cajas": "Debe ser mayor a 0."})
        return data


class CamionConsumoEmpaqueSerializer(serializers.ModelSerializer):
    camion_id = serializers.PrimaryKeyRelatedField(queryset=CamionSalida.objects.all(), source="camion", write_only=True)
    clasificacion_id = serializers.PrimaryKeyRelatedField(queryset=ClasificacionEmpaque.objects.all(), source="clasificacion_empaque", write_only=True)
    clasificacion_desc = serializers.StringRelatedField(source="clasificacion_empaque", read_only=True)

    class Meta:
        model = CamionConsumoEmpaque
        fields = [
            "id", "camion", "camion_id",
            "clasificacion_empaque", "clasificacion_id", "clasificacion_desc",
            "cantidad",
            "creado_en", "actualizado_en",
        ]
        read_only_fields = ["camion", "clasificacion_empaque", "creado_en", "actualizado_en"]

    def validate(self, data):
        cantidad = data.get("cantidad") or getattr(self.instance, "cantidad", None)
        clasif = data.get("clasificacion_empaque") or getattr(self.instance, "clasificacion_empaque", None)
        camion = data.get("camion") or getattr(self.instance, "camion", None)

        if cantidad is None or cantidad <= 0:
            raise serializers.ValidationError({"cantidad": "Debe ser mayor a 0."})

        # Validacion integridad bodega/temporada
        if camion and clasif:
            # Si el clasificacion tiene recepcion, usamos esa bodega. Si no, usamos su bodega_id directo si existiera (modelo actual linkea a recepcion o directo?)
            # ClasificacionEmpaque tiene bodega/temporada directas.
            if camion.bodega_id != clasif.bodega_id:
                raise serializers.ValidationError({"clasificacion_empaque": "La clasificación no pertenece a la misma bodega del camión."})
            if camion.temporada_id != clasif.temporada_id:
                raise serializers.ValidationError({"clasificacion_empaque": "La clasificación no pertenece a la misma temporada del camión."})

        # Validar disponibilidad real (import lazy para evitar ciclos si fuera necesario, aunque utils es seguro)
        from gestion_bodega.utils.inventario_empaque import validate_consumo_camion
        try:
            exclude = self.instance.pk if self.instance else None
            validate_consumo_camion(clasif.pk, cantidad, exclude_id=exclude)
        except ValueError as e:
            raise serializers.ValidationError({"cantidad": str(e)})
            
        return data


class CamionSalidaSerializer(serializers.ModelSerializer):

    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)
    items        = CamionItemSerializer(many=True, read_only=True)
    cargas       = CamionConsumoEmpaqueSerializer(many=True, read_only=True)

    class Meta:
        model = CamionSalida
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "numero", "estado", "fecha_salida", "placas", "chofer",
            "destino", "receptor", "observaciones",
            "items", "cargas",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["bodega", "temporada", "numero", "estado", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada = data.get("temporada")    or getattr(self.instance, "temporada", None)
        fecha     = data.get("fecha_salida") or getattr(self.instance, "fecha_salida", None)
        bodega    = data.get("bodega")       or getattr(self.instance, "bodega", None)

        if temporada and not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden registrar camiones en temporadas archivadas o finalizadas.")

        if fecha:
            if fecha > timezone.localdate():
                raise serializers.ValidationError({"fecha_salida": "La fecha no puede ser futura."})
            if not _is_today_or_yesterday(fecha):
                raise serializers.ValidationError({"fecha_salida": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})
            if bodega and _semana_bloqueada(bodega, temporada, fecha):
                raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")
        return data

# ───────────────────────────────────────────────────────────────────────────
# Consumibles y Cierres
# ───────────────────────────────────────────────────────────────────────────

class ConsumibleSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = Consumible
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "concepto", "cantidad", "costo_unitario", "total", "fecha", "observaciones",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["bodega", "temporada", "total", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        bodega    = data.get("bodega")    or getattr(self.instance, "bodega", None)
        fecha     = data.get("fecha")     or getattr(self.instance, "fecha", None)

        if temporada and not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden registrar consumibles en temporadas archivadas o finalizadas.")

        if fecha:
            if fecha > timezone.localdate():
                raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
            if not _is_today_or_yesterday(fecha):
                raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})
            if bodega and _semana_bloqueada(bodega, temporada, fecha):
                raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")

        cantidad = data.get("cantidad") or getattr(self.instance, "cantidad", None)
        costo    = data.get("costo_unitario") or getattr(self.instance, "costo_unitario", None)

        if cantidad is None or cantidad <= 0:
            raise serializers.ValidationError({"cantidad": "Debe ser mayor a 0."})
        if costo is None or costo < 0:
            raise serializers.ValidationError({"costo_unitario": "Debe ser mayor o igual a 0."})
        return data


class CierreSemanalSerializer(serializers.ModelSerializer):
    """
    Semanas MANUALES:
      - M?ximo 7 d?as (inclusive).
      - UNA abierta por bodega+temporada.
      - Sin solapes con semanas activas.
      - Temporada/bodega deben estar operables.
      - No se puede reabrir ni editar una semana ya cerrada.
    """
    activa = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CierreSemanal
        fields = [
            "id",
            "bodega",
            "temporada",
            "iso_semana",
            "fecha_desde",
            "fecha_hasta",
            "activa",
            "locked_by",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["locked_by", "creado_en", "actualizado_en"]

    def get_activa(self, obj: CierreSemanal) -> bool:
        return obj.fecha_hasta is None

    def validate(self, attrs: Dict[str, Any]) -> Dict[str, Any]:
        bodega = attrs.get("bodega") or getattr(self.instance, "bodega", None)
        temporada = attrs.get("temporada") or getattr(self.instance, "temporada", None)
        fdesde = attrs.get("fecha_desde") or getattr(self.instance, "fecha_desde", None)
        fhasta = attrs.get("fecha_hasta", getattr(self.instance, "fecha_hasta", None))

        # Requeridos al crear
        if self.instance is None:
            if not bodega:
                raise serializers.ValidationError({"bodega": _("Este campo es obligatorio.")})
            if not temporada:
                raise serializers.ValidationError({"temporada": _("Este campo es obligatorio.")})
            if not fdesde:
                raise serializers.ValidationError({"fecha_desde": _("Este campo es obligatorio.")})

        # Temporada/bodega operables + coherencia bodega-temporada
        _assert_bodega_temporada_operables(bodega, temporada)

        # No permitir editar/reabrir semana ya cerrada
        if self.instance is not None and getattr(self.instance, "fecha_hasta", None) is not None:
            if "fecha_desde" in attrs or "fecha_hasta" in attrs:
                raise serializers.ValidationError({"non_field_errors": ["Una semana cerrada no se puede editar ni reabrir."]})
            return attrs

        # Evitar semanas en futuro
        hoy = timezone.localdate()
        if fdesde and fdesde > hoy:
            raise serializers.ValidationError({"fecha_desde": _("No se puede crear una semana en fecha futura.")})
        if fhasta is not None and fhasta > hoy:
            raise serializers.ValidationError({"fecha_hasta": _("No se puede cerrar una semana con fecha futura.")})

        # Orden de fechas y m?ximo 7 d?as
        if fhasta is not None:
            if fhasta < fdesde:
                raise serializers.ValidationError({"fecha_hasta": _("No puede ser menor que fecha_desde.")})
            if (fhasta - fdesde).days > 6:
                raise serializers.ValidationError({"fecha_hasta": _("La semana no puede exceder 7 d?as.")})

        # Solo una abierta a la vez (fecha_hasta = NULL) en semanas activas
        target_open = fhasta is None
        if target_open:
            qs_open = CierreSemanal.objects.filter(
                bodega=bodega,
                temporada=temporada,
                is_active=True,
                fecha_hasta__isnull=True,
            )
            if self.instance is not None:
                qs_open = qs_open.exclude(pk=self.instance.pk)
            if qs_open.exists():
                raise serializers.ValidationError({"fecha_hasta": _("Ya existe una semana abierta para esta bodega y temporada.")})

        def _end_or_theoretical(c: CierreSemanal):
            return c.fecha_hasta or (c.fecha_desde + timedelta(days=6))

        def _overlaps(a0, a1, b0, b1) -> bool:
            return not (a1 < b0 or b1 < a0)

        qs_all = CierreSemanal.objects.filter(
            bodega=bodega,
            temporada=temporada,
            is_active=True,
        )
        if self.instance is not None:
            qs_all = qs_all.exclude(pk=self.instance.pk)

        if fdesde:
            new_end = (fhasta or (fdesde + timedelta(days=6)))
            for c in qs_all:
                if _overlaps(fdesde, new_end, c.fecha_desde, _end_or_theoretical(c)):
                    raise serializers.ValidationError({"fecha_desde": _("El rango propuesto se solapa con otra semana existente.")})

        return attrs

    def create(self, validated_data: Dict[str, Any]) -> CierreSemanal:
        iso_semana = validated_data.get("iso_semana")
        fdesde = validated_data.get("fecha_desde")
        if not iso_semana and fdesde:
            try:
                iso_semana = f"{fdesde.isocalendar().year}-W{str(fdesde.isocalendar().week).zfill(2)}"
                validated_data["iso_semana"] = iso_semana
            except Exception:
                pass
        return super().create(validated_data)


class CierreTemporadaSerializer(serializers.Serializer):
    """
    Recibe una TemporadaBodega activa y no finalizada para marcarla como finalizada.
    """
    temporada = serializers.PrimaryKeyRelatedField(
        queryset=TemporadaBodega.objects.filter(is_active=True, finalizada=False)
    )

    def validate_temporada(self, obj: TemporadaBodega) -> TemporadaBodega:
        if obj.finalizada:
            raise serializers.ValidationError(_("La temporada ya está finalizada."))
        return obj

# ───────────────────────────────────────────────────────────────────────────
# serializador de Tablero de Bodega
class KpiOcupacionCamaraSerializer(serializers.Serializer):
    camara = serializers.CharField()
    capacidad_kg = serializers.FloatField()
    ocupado_kg = serializers.FloatField()
    pct = serializers.FloatField()


class KpiSummarySerializer(serializers.Serializer):
    recepcion = serializers.DictField(child=serializers.FloatField(), required=False)
    empaque = serializers.DictField(required=False)
    stock = serializers.DictField(required=False)
    ocupacion = serializers.DictField(required=False)
    rotacion = serializers.DictField(required=False)
    fefo = serializers.DictField(required=False, allow_null=True)
    rechazos_qc = serializers.DictField(required=False)
    lead_times = serializers.DictField(required=False)


class QueueItemSerializer(serializers.Serializer):
    """
    Ítems de las colas del Tablero (recepciones/inventarios/despachos).
    Campos compatibles con el FE actual.
    """
    id = serializers.IntegerField()
    ref = serializers.CharField()
    fecha = serializers.DateField()  # DRF formatea YYYY-MM-DD por defecto
    huerta = serializers.CharField(allow_null=True, required=False)
    kg = serializers.FloatField()
    estado = serializers.CharField()

    # Opcionales usados para badges o metadata libre
    chips = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    meta = serializers.DictField(
        required=False,
        default=dict,
    )

class AlertItemSerializer(serializers.Serializer):
    code = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()
    severity = serializers.ChoiceField(choices=["info", "warning", "critical"])
    link = serializers.DictField()  # { path, query }


class DashboardSummaryResponseSerializer(serializers.Serializer):
    kpis = KpiSummarySerializer()


class DashboardQueueResponseSerializer(serializers.Serializer):
    meta = serializers.DictField()
    results = QueueItemSerializer(many=True)


class DashboardAlertResponseSerializer(serializers.Serializer):
    alerts = AlertItemSerializer(many=True)
