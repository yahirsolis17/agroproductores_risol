# backend/gestion_bodega/serializers.py
from datetime import timedelta, datetime
from decimal import Decimal

from django.db.models import Sum, Q
from django.utils import timezone

from rest_framework import serializers

from .models import (
    # Catálogos / enums
    Material, CalidadMadera, CalidadPlastico,
    # Núcleo
    Bodega, TemporadaBodega, Cliente,
    # Operación
    Recepcion, ClasificacionEmpaque,
    # Inventario plástico
    InventarioPlastico, MovimientoPlastico,
    # Madera
    CompraMadera, AbonoMadera,
    # Pedidos / Surtidos
    Pedido, PedidoRenglon, SurtidoRenglon,
    # Camiones
    CamionSalida, CamionItem,
    # Gastos / cierres
    Consumible, CierreSemanal,
)

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
    """True si la fecha cae dentro de un CierreSemanal ACTIVO para esa bodega+temporada."""
    return CierreSemanal.objects.filter(
        bodega=bodega,
        temporada=temporada,
        fecha_desde__lte=fecha,
        fecha_hasta__gte=fecha,
        is_active=True,
    ).exists()

def _temporada_activa(temporada: TemporadaBodega) -> bool:
    return getattr(temporada, "is_active", True) and not getattr(temporada, "finalizada", False)

# ───────────────────────────────────────────────────────────────────────────
# Bodega / Temporada / Cliente
# ───────────────────────────────────────────────────────────────────────────

class BodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = ["id", "nombre", "ubicacion", "is_active", "archivado_en", "creado_en", "actualizado_en"]
        read_only_fields = ["is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate_nombre(self, val):
        v = (val or "").strip()
        if len(v) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return v


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

class RecepcionSerializer(serializers.ModelSerializer):
    # Acepta IDs directamente en 'bodega' y 'temporada' (consistente con el FE)
    bodega    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all())
    temporada = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all())
    # Alias amigable para FE: 'cantidad_cajas' -> source 'cajas_campo'
    cantidad_cajas = serializers.IntegerField(source="cajas_campo", required=False)

    class Meta:
        model = Recepcion
        fields = [
            "id", "bodega", "temporada",
            "fecha", "huertero_nombre", "tipo_mango",
            "cajas_campo", "cantidad_cajas", "observaciones",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["is_active", "archivado_en", "creado_en", "actualizado_en", "cajas_campo"]

    def validate_cajas_campo(self, v):
        if v is None or v <= 0:
            raise serializers.ValidationError("La cantidad de cajas debe ser mayor a 0.")
        return v

    # Validación equivalente para el alias de entrada
    def validate_cantidad_cajas(self, v):
        return self.validate_cajas_campo(v)

    def validate(self, data):
        bodega    = data.get("bodega")    or getattr(self.instance, "bodega", None)
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        fecha     = data.get("fecha")     or getattr(self.instance, "fecha", None)

        if not (bodega and temporada and fecha):
            return data

        if not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden registrar recepciones en una temporada archivada o finalizada.")

        if fecha > timezone.localdate():
            raise serializers.ValidationError("La fecha no puede ser futura.")
        if not _is_today_or_yesterday(fecha):
            raise serializers.ValidationError("La fecha de recepción solo puede ser HOY o AYER (máx. 24 h).")

        if _semana_bloqueada(bodega, temporada, fecha):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")
        return data


class ClasificacionEmpaqueSerializer(serializers.ModelSerializer):
    recepcion_id  = serializers.PrimaryKeyRelatedField(queryset=Recepcion.objects.all(),        source="recepcion",  write_only=True)
    bodega_id     = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",     write_only=True)
    temporada_id  = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(),  source="temporada",  write_only=True)

    class Meta:
        model = ClasificacionEmpaque
        fields = [
            "id", "recepcion", "bodega", "temporada",
            "recepcion_id", "bodega_id", "temporada_id",
            "fecha", "material", "calidad", "tipo_mango", "cantidad_cajas",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["recepcion", "bodega", "temporada", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate_material(self, v):
        if v not in Material.values:
            raise serializers.ValidationError("Material inválido.")
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

        if not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden clasificar empaques en temporada archivada o finalizada.")

        if cantidad <= 0:
            raise serializers.ValidationError({"cantidad_cajas": "Debe ser mayor a 0."})

        # Normalización Plástico: "segunda/extra -> primera"
        if material == Material.PLASTICO:
            if calidad in {"SEGUNDA", "EXTRA"}:
                data["calidad"] = CalidadPlastico.PRIMERA
            if data.get("calidad", calidad) not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if calidad not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})

        if fecha > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(fecha):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})

        if _semana_bloqueada(bodega, temporada, fecha):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")
        return data


class ClasificacionEmpaqueBulkItemSerializer(serializers.Serializer):
    material = serializers.ChoiceField(choices=Material.choices)
    calidad = serializers.CharField(max_length=12)
    tipo_mango = serializers.CharField(max_length=80, allow_blank=True, required=False)
    cantidad_cajas = serializers.IntegerField(min_value=1)

    def validate(self, data):
        mat = data.get("material")
        cal = data.get("calidad")
        if mat == Material.PLASTICO:
            if cal in {"SEGUNDA", "EXTRA"}:
                data["calidad"] = CalidadPlastico.PRIMERA
            if data.get("calidad", cal) not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if cal not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})
        return data


class ClasificacionEmpaqueBulkUpsertSerializer(serializers.Serializer):
    recepcion = serializers.PrimaryKeyRelatedField(queryset=Recepcion.objects.all())
    bodega = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all())
    temporada = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all())
    fecha = serializers.DateField()
    items = ClasificacionEmpaqueBulkItemSerializer(many=True)

    def validate(self, data):
        f = data.get("fecha")
        if f > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(f):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})
        if _semana_bloqueada(data["bodega"], data["temporada"], f):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")
        if not data.get("items"):
            raise serializers.ValidationError({"items": "Debe incluir al menos un ítem."})
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
    """Payload para ajustar inventario plástico (entrada/salida) con motivo y fecha opcional."""
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
                raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})
        return data

# ───────────────────────────────────────────────────────────────────────────
# Compras de Madera y Abonos (dinero real)
# ───────────────────────────────────────────────────────────────────────────

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
            # Normalizar "SEGUNDA/EXTRA" → PRIMERA para mantener consistencia con empaque
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
    """Detalle de pedido; reutiliza campos de PedidoSerializer con renglones anidados."""
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

        # Material y calidad compatibles
        if renglon.material != origen.material:
            raise serializers.ValidationError("El material del renglón no coincide con el de la clasificación de origen.")
        if renglon.calidad != origen.calidad:
            raise serializers.ValidationError("La calidad del renglón no coincide con la clasificación de origen.")

        # Disponible en origen (sin overpicking)
        consumido   = origen.surtidos.aggregate(total=Sum("cantidad"))["total"] or 0
        disponible  = (origen.cantidad_cajas or 0) - consumido
        if cantidad > disponible:
            raise serializers.ValidationError("No hay suficiente disponible en la clasificación seleccionada.")

        # Pendiente del renglón
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


class CamionSalidaSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)
    items        = CamionItemSerializer(many=True, read_only=True)

    class Meta:
        model = CamionSalida
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "numero", "estado", "fecha_salida", "placas", "chofer",
            "destino", "receptor", "observaciones",
            "items",
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
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),           source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = CierreSemanal
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "iso_semana", "fecha_desde", "fecha_hasta", "locked_by",
            "is_active", "archivado_en", "creado_en", "actualizado_en",
        ]
        read_only_fields = ["bodega", "temporada", "locked_by", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada  = data.get("temporada") or getattr(self.instance, "temporada", None)
        bodega     = data.get("bodega")    or getattr(self.instance, "bodega", None)
        desde      = data.get("fecha_desde") or getattr(self.instance, "fecha_desde", None)
        hasta      = data.get("fecha_hasta") or getattr(self.instance, "fecha_hasta", None)

        if not temporada or not (desde and hasta):
            return data

        if hasta < desde:
            raise serializers.ValidationError("El rango de cierre es inválido (hasta < desde).")

        if not _temporada_activa(temporada):
            raise serializers.ValidationError("No puedes cerrar semanas en temporadas finalizadas o archivadas.")

        # Evitar traslapes con cierres existentes
        qs = CierreSemanal.objects.filter(bodega=bodega, temporada=temporada, is_active=True)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.filter(Q(fecha_desde__lte=hasta) & Q(fecha_hasta__gte=desde)).exists():
            raise serializers.ValidationError("Ya existe un cierre solapado en ese rango de fechas.")
        return data


class CierreTemporadaSerializer(serializers.Serializer):
    temporada = serializers.PrimaryKeyRelatedField(queryset=TemporadaBodega.objects.all())

    def validate_temporada(self, t):
        if not getattr(t, "is_active", True):
            raise serializers.ValidationError("La temporada no está activa.")
        if getattr(t, "finalizada", False):
            raise serializers.ValidationError("La temporada ya está finalizada.")
        return t


# ───────────────────────────────────────────────────────────────────────────
# serializador de Tablero de Bodega
class KpiOcupacionCamaraSerializer(serializers.Serializer):
    camara = serializers.CharField()
    capacidad_kg = serializers.FloatField()
    ocupado_kg = serializers.FloatField()
    pct = serializers.FloatField()


class KpiSummarySerializer(serializers.Serializer):
    recepcion = serializers.DictField(child=serializers.FloatField(), required=False)
    stock = serializers.DictField(required=False)
    ocupacion = serializers.DictField(required=False)
    rotacion = serializers.DictField(required=False)
    fefo = serializers.DictField(required=False, allow_null=True)
    rechazos_qc = serializers.DictField(required=False)
    lead_times = serializers.DictField(required=False)


class QueueItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    ref = serializers.CharField()
    fecha = serializers.DateTimeField()
    huerta = serializers.CharField(allow_null=True)
    kg = serializers.FloatField()
    estado = serializers.CharField()
    meta = serializers.DictField(required=False)


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