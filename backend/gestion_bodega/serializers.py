from datetime import timedelta, datetime
from decimal import Decimal, InvalidOperation

from django.db.models import Sum, Q
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from .models import (
    # Catálogos / enums
    Material, CalidadMadera, CalidadPlastico,
    EstadoPedido, EstadoCamion,
    # Núcleo
    Bodega, Temporada, Cliente,
    Recepcion, ClasificacionEmpaque,
    InventarioPlastico, MovimientoPlastico,
    CompraMadera, AbonoMadera,
    Pedido, PedidoRenglon, SurtidoRenglon,
    CamionSalida, CamionItem,
    Consumible, CierreSemanal,
)

# =======================================================================================
# Helpers locales (alineados al estilo de gestion_huerta.serializers)
# =======================================================================================

def _as_local_date(dt_or_date):
    if isinstance(dt_or_date, datetime):
        return timezone.localtime(dt_or_date).date()
    return dt_or_date

def _is_today_or_yesterday(d):
    hoy = timezone.localdate()
    return d in {hoy, hoy - timedelta(days=1)}

def _semana_bloqueada(bodega: Bodega, temporada: Temporada, fecha) -> bool:
    """True si la fecha cae dentro de un CierreSemanal para esa bodega+temporada."""
    return CierreSemanal.objects.filter(
        bodega=bodega, temporada=temporada,
        fecha_desde__lte=fecha, fecha_hasta__gte=fecha
    ).exists()

def _temporada_activa(temporada: Temporada):
    return getattr(temporada, "is_active", True) and not getattr(temporada, "finalizada", False)

# =======================================================================================
# Bodega / Temporada / Cliente
# =======================================================================================

class BodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bodega
        fields = ["id", "nombre", "ubicacion", "is_active", "archivado_en"]
        read_only_fields = ["is_active", "archivado_en"]

    def validate_nombre(self, val):
        v = (val or "").strip()
        if len(v) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return v


class TemporadaSerializer(serializers.ModelSerializer):
    is_active    = serializers.BooleanField(read_only=True)
    archivado_en = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Temporada
        fields = [
            "id", "año", "fecha_inicio", "fecha_fin", "finalizada",
            "is_active", "archivado_en"
        ]

    def validate_año(self, value):
        actual = timezone.now().year
        if value < 2000 or value > actual + 1:
            raise serializers.ValidationError("El año debe estar entre 2000 y el siguiente al actual.")
        return value


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "nombre", "telefono", "empresa", "is_active", "archivado_en"]
        read_only_fields = ["is_active", "archivado_en"]

    def validate_nombre(self, val):
        v = (val or "").strip()
        if len(v) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        return v

# =======================================================================================
# Recepciones y Clasificaciones (empaque)
# =======================================================================================

class RecepcionSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(), source="bodega", write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = Recepcion
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "fecha", "huertero_nombre", "tipo_mango", "cajas_campo", "observaciones",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
        ]
        read_only_fields = ["bodega", "temporada", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate_cajas_campo(self, v):
        if v is None or v <= 0:
            raise serializers.ValidationError("La cantidad de cajas debe ser mayor a 0.")
        return v

    def validate(self, data):
        bodega    = data.get("bodega")    or getattr(self.instance, "bodega", None)
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        fecha     = data.get("fecha")     or getattr(self.instance, "fecha", None)

        if not (bodega and temporada and fecha):
            return data

        # Temporada activa
        if not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden registrar recepciones en una temporada archivada o finalizada.")

        # Fecha no futura y solo HOY/AYER (operación “en caliente”)
        if fecha > timezone.localdate():
            raise serializers.ValidationError("La fecha no puede ser futura.")
        if not _is_today_or_yesterday(fecha):
            raise serializers.ValidationError("La fecha de recepción solo puede ser HOY o AYER (máx. 24 h).")

        # Semana cerrada
        if _semana_bloqueada(bodega, temporada, fecha):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")
        return data


class ClasificacionEmpaqueSerializer(serializers.ModelSerializer):
    recepcion_id  = serializers.PrimaryKeyRelatedField(queryset=Recepcion.objects.all(), source="recepcion", write_only=True)
    bodega_id     = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),  source="bodega",  write_only=True)
    temporada_id  = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = ClasificacionEmpaque
        fields = [
            "id", "recepcion", "bodega", "temporada",
            "recepcion_id", "bodega_id", "temporada_id",
            "fecha", "material", "calidad", "tipo_mango", "cantidad_cajas",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
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

        # Normalización Plástico: “segunda/extra → primera”
        if material == Material.PLASTICO:
            if calidad in {"SEGUNDA", "EXTRA"}:
                data["calidad"] = CalidadPlastico.PRIMERA
            if data.get("calidad", calidad) not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if calidad not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})

        # Fecha no futura y HOY/AYER
        if fecha > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(fecha):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})

        # Semana cerrada
        if _semana_bloqueada(bodega, temporada, fecha):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")

        return data

# =======================================================================================
# Inventario Plástico y Movimientos
# =======================================================================================

class InventarioPlasticoSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),    source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)
    cliente_id   = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(),   source="cliente",   write_only=True, required=False, allow_null=True)

    class Meta:
        model = InventarioPlastico
        fields = [
            "id", "bodega", "temporada", "cliente",
            "bodega_id", "temporada_id", "cliente_id",
            "calidad", "tipo_mango", "stock",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
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
            "creado_en", "actualizado_en"
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

        # Solo HOY/AYER y no futura
        d = _as_local_date(fecha)
        if d > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(d):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})

        # Semana cerrada
        if _semana_bloqueada(inv.bodega, inv.temporada, d):
            raise serializers.ValidationError("Esta semana está cerrada; no se permiten más cambios en ese rango.")

        # No negativos
        if tipo == MovimientoPlastico.SALIDA:
            if cantidad > inv.stock:
                raise serializers.ValidationError("No hay stock suficiente para registrar la salida.")
        return data

# =======================================================================================
# Compras de Madera y Abonos (dinero real)
# =======================================================================================

class CompraMaderaSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),    source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = CompraMadera
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "proveedor_nombre", "cantidad_cajas", "precio_unitario",
            "monto_total", "saldo", "observaciones",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
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
            "creado_en", "actualizado_en"
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

        # Solo HOY/AYER y no futura
        d = _as_local_date(fecha)
        if d > timezone.localdate():
            raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
        if not _is_today_or_yesterday(d):
            raise serializers.ValidationError({"fecha": "La fecha solo puede ser HOY o AYER (máx. 24 h)."})

        if monto > compra.saldo:
            raise serializers.ValidationError("El abono no puede exceder el saldo.")
        return data

# =======================================================================================
# Pedidos (con renglones) y Surtidos
# =======================================================================================

class PedidoRenglonSerializer(serializers.ModelSerializer):
    class Meta:
        model = PedidoRenglon
        fields = [
            "id", "pedido", "material", "calidad", "tipo_mango",
            "cantidad_solicitada", "cantidad_surtida", "pendiente",
            "creado_en", "actualizado_en"
        ]
        read_only_fields = ["pedido", "cantidad_surtida", "pendiente", "creado_en", "actualizado_en"]

    def validate(self, data):
        material = data.get("material") or getattr(self.instance, "material", None)
        calidad  = data.get("calidad")  or getattr(self.instance, "calidad", None)
        cant     = data.get("cantidad_solicitada") or getattr(self.instance, "cantidad_solicitada", None)

        if material not in Material.values:
            raise serializers.ValidationError({"material": "Material inválido."})
        if material == Material.PLASTICO:
            if calidad not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if calidad not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})

        if cant is None or cant <= 0:
            raise serializers.ValidationError({"cantidad_solicitada": "Debe ser mayor a 0."})
        return data


class PedidoSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),    source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)
    cliente_id   = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all(),   source="cliente",   write_only=True)

    renglones = PedidoRenglonSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = [
            "id", "bodega", "temporada", "cliente",
            "bodega_id", "temporada_id", "cliente_id",
            "fecha", "estado", "observaciones",
            "renglones",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
        ]
        read_only_fields = ["bodega", "temporada", "cliente", "estado", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        if temporada and not _temporada_activa(temporada):
            raise serializers.ValidationError("No se pueden crear/editar pedidos en temporadas archivadas o finalizadas.")
        fecha = data.get("fecha") or getattr(self.instance, "fecha", None)
        if fecha:
            if fecha > timezone.localdate():
                raise serializers.ValidationError({"fecha": "La fecha no puede ser futura."})
            if not _is_today_or_yesterday(fecha):
                raise serializers.ValidationError({"fecha": "La fecha del pedido solo puede ser HOY o AYER (máx. 24 h)."})
        return data


class SurtidoRenglonSerializer(serializers.ModelSerializer):
    renglon_id            = serializers.PrimaryKeyRelatedField(queryset=PedidoRenglon.objects.all(),     source="renglon", write_only=True)
    origen_clasificacion_id = serializers.PrimaryKeyRelatedField(queryset=ClasificacionEmpaque.objects.all(), source="origen_clasificacion", write_only=True)

    class Meta:
        model = SurtidoRenglon
        fields = [
            "id", "renglon", "renglon_id", "origen_clasificacion", "origen_clasificacion_id",
            "cantidad",
            "creado_en", "actualizado_en"
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
        consumido = origen.surtidos.aggregate(total=Sum("cantidad"))["total"] or 0
        disponible = (origen.cantidad_cajas or 0) - consumido
        if cantidad > disponible:
            raise serializers.ValidationError("No hay suficiente disponible en la clasificación seleccionada.")

        # Pendiente del renglón
        if cantidad > renglon.pendiente:
            raise serializers.ValidationError("La cantidad excede lo pendiente del renglón.")
        return data

# =======================================================================================
# Camiones (salida) y Items declarativos de embarque
# =======================================================================================

class CamionItemSerializer(serializers.ModelSerializer):
    camion_id = serializers.PrimaryKeyRelatedField(queryset=CamionSalida.objects.all(), source="camion", write_only=True)

    class Meta:
        model = CamionItem
        fields = [
            "id", "camion", "camion_id",
            "material", "calidad", "tipo_mango", "cantidad_cajas",
            "creado_en", "actualizado_en"
        ]
        read_only_fields = ["camion", "creado_en", "actualizado_en"]

    def validate(self, data):
        mat   = data.get("material") or getattr(self.instance, "material", None)
        cal   = data.get("calidad")  or getattr(self.instance, "calidad", None)
        cant  = data.get("cantidad_cajas") or getattr(self.instance, "cantidad_cajas", None)

        if mat not in Material.values:
            raise serializers.ValidationError({"material": "Material inválido."})
        if mat == Material.PLASTICO:
            if cal not in set(CalidadPlastico.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para PLÁSTICO."})
        else:
            if cal not in set(CalidadMadera.values):
                raise serializers.ValidationError({"calidad": "Calidad inválida para MADERA."})
        if cant is None or cant <= 0:
            raise serializers.ValidationError({"cantidad_cajas": "Debe ser mayor a 0."})
        return data


class CamionSalidaSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),    source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)
    items        = CamionItemSerializer(many=True, read_only=True)

    class Meta:
        model = CamionSalida
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "numero", "estado", "fecha_salida", "placas", "chofer",
            "destino", "receptor", "observaciones",
            "items",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
        ]
        read_only_fields = ["bodega", "temporada", "numero", "estado", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada = data.get("temporada") or getattr(self.instance, "temporada", None)
        fecha     = data.get("fecha_salida") or getattr(self.instance, "fecha_salida", None)
        bodega    = data.get("bodega") or getattr(self.instance, "bodega", None)

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

# =======================================================================================
# Consumibles y Cierres
# =======================================================================================

class ConsumibleSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),    source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = Consumible
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "concepto", "cantidad", "costo_unitario", "total", "fecha", "observaciones",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
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
            raise serializers.ValidationError({"costo_unitario": "Debe ser ≥ 0."})
        return data


class CierreSemanalSerializer(serializers.ModelSerializer):
    bodega_id    = serializers.PrimaryKeyRelatedField(queryset=Bodega.objects.all(),    source="bodega",    write_only=True)
    temporada_id = serializers.PrimaryKeyRelatedField(queryset=Temporada.objects.all(), source="temporada", write_only=True)

    class Meta:
        model = CierreSemanal
        fields = [
            "id", "bodega", "temporada", "bodega_id", "temporada_id",
            "iso_semana", "fecha_desde", "fecha_hasta", "locked_by",
            "is_active", "archivado_en", "creado_en", "actualizado_en"
        ]
        read_only_fields = ["bodega", "temporada", "locked_by", "is_active", "archivado_en", "creado_en", "actualizado_en"]

    def validate(self, data):
        temporada  = data.get("temporada") or getattr(self.instance, "temporada", None)
        desde      = data.get("fecha_desde") or getattr(self.instance, "fecha_desde", None)
        hasta      = data.get("fecha_hasta") or getattr(self.instance, "fecha_hasta", None)

        if not temporada or not (desde and hasta):
            return data

        if hasta < desde:
            raise serializers.ValidationError("El rango de cierre es inválido (hasta < desde).")

        if not _temporada_activa(temporada):
            raise serializers.ValidationError("No puedes cerrar semanas en temporadas finalizadas o archivadas.")

        # Evitar traslapes con cierres existentes
        qs = CierreSemanal.objects.filter(bodega=data.get("bodega") or getattr(self.instance, "bodega", None),
                                          temporada=temporada)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.filter(Q(fecha_desde__lte=hasta) & Q(fecha_hasta__gte=desde)).exists():
            raise serializers.ValidationError("Ya existe un cierre solapado en ese rango de fechas.")
        return data
