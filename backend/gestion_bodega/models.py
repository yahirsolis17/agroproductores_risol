from decimal import Decimal, InvalidOperation
from typing import Dict, Optional

from django.conf import settings
from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum, Q, UniqueConstraint, Index, Max
from django.utils import timezone
from datetime import timedelta


# ───────────────────────────────────────────────────────────────────────────
# Helpers (mismos patrones que gestion_huerta)
# ───────────────────────────────────────────────────────────────────────────

def _sum_counts(a: Dict[str, int], b: Dict[str, int]) -> Dict[str, int]:
    if not b:
        return a
    for k, v in b.items():
        a[k] = a.get(k, 0) + int(v or 0)
    return a

def _is_only_archival_fields(update_fields):
    """
    True si update_fields es subconjunto de campos de archivado.
    Permite omitir full_clean() cuando solo hacemos soft-delete/restore.
    """
    if not update_fields:
        return False
    allowed = {"is_active", "archivado_en", "archivado_por_cascada"}
    return set(update_fields).issubset(allowed)

# Resolver semanas sin depender de serializers (alineado a la lógíca de negocio)
def _resolver_semana_por_fecha(bodega_id: int, temporada_id: int, fecha):
    """
    Resuelve el CierreSemanal que cubre 'fecha'.
    Contempla semanas abiertas: end_teorico = fecha_desde + 6 días.
    Devuelve la más reciente por fecha_desde que cubra la fecha.
    """
    if not (bodega_id and temporada_id and fecha):
        return None

    CierreSemanal = apps.get_model("gestion_bodega", "CierreSemanal")

    # P2 Robustez: Optimización DB-side (Order by desc + First)
    candidate = CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        is_active=True,
        fecha_desde__lte=fecha,
    ).order_by("-fecha_desde").first()

    if candidate:
        # Verificamos si la fecha cae dentro del rango efectivo de esa semana
        end = candidate.fecha_hasta or (candidate.fecha_desde + timedelta(days=6))
        if fecha <= end:
            return candidate

    return None

# P1 Robustez: Auto-Cierre Backend
def ensure_week_state(bodega_id: int, temporada_id: int):
    """
    Garantiza el estado consistente de la semana activa.
    Si hay una semana abierta que ya expiró (hoy > inicio + 6), la cierra automáticamente con clamp.
    Retorna la semana activa (si existe) tras el saneamiento.
    """
    CierreSemanal = apps.get_model("gestion_bodega", "CierreSemanal")
    
    # Buscamos semana abierta
    abierta = CierreSemanal.objects.filter(
        bodega_id=bodega_id, 
        temporada_id=temporada_id, 
        is_active=True, 
        fecha_hasta__isnull=True
    ).first()

    if not abierta:
        return None

    hoy = timezone.localdate() # America/Mexico_City
    limite_teorico = abierta.fecha_desde + timedelta(days=6)

    # Si hoy ya superó el límite, la semana es zombie → auto-cerrar
    if hoy > limite_teorico:
        # Clamp: cerramos en el día 7 exacto
        abierta.fecha_hasta = limite_teorico 
        with transaction.atomic():
            abierta.save(update_fields=["fecha_hasta", "actualizado_en"])
        # Ya no está abierta, retornamos None (o la cerrada si fuera útil, pero el contrato es "semana activa")
        return None
    
    return abierta


def _is_today_or_yesterday_date(d):
    hoy = timezone.localdate()
    return d in {hoy, hoy - timedelta(days=1)}


# ───────────────────────────────────────────────────────────────────────────
# Catálogos / Choices
# ───────────────────────────────────────────────────────────────────────────

class Material(models.TextChoices):
    MADERA   = "MADERA", "Madera"
    PLASTICO = "PLASTICO", "Plástico"


class CalidadMadera(models.TextChoices):
    EXTRA   = "EXTRA", "Extra"
    PRIMERA = "PRIMERA", "Primera"
    SEGUNDA = "SEGUNDA", "Segunda"
    TERCERA = "TERCERA", "Tercera"
    CUARTA  = "CUARTA", "Cuarta"
    NINIO   = "NINIO", "Niño"
    MADURO  = "MADURO", "Maduro"
    RONIA   = "RONIA", "Roña"
    MERMA   = "MERMA", "Merma"


class CalidadPlastico(models.TextChoices):
    # En plástico, "segunda/extra" → PRIMERA (normalizada).
    PRIMERA = "PRIMERA", "Primera"
    TERCERA = "TERCERA", "Tercera"
    NINIO   = "NINIO", "Niño"
    RONIA   = "RONIA", "Roña"
    MADURO  = "MADURO", "Maduro"
    MERMA   = "MERMA", "Merma"


class EstadoPedido(models.TextChoices):
    BORRADOR  = "BORRADOR", "Borrador"
    PARCIAL   = "PARCIAL", "Parcial"
    SURTIDO   = "SURTIDO", "Surtido"
    CANCELADO = "CANCELADO", "Cancelado"


class EstadoCamion(models.TextChoices):
    BORRADOR   = "BORRADOR", "Borrador"
    CONFIRMADO = "CONFIRMADO", "Confirmado"
    ANULADO    = "ANULADO", "Anulado"


# ───────────────────────────────────────────────────────────────────────────
# Base (coincide con el estilo del repo)
# ───────────────────────────────────────────────────────────────────────────

class TimeStampedModel(models.Model):
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    # Soft-delete consistente
    is_active = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)
    archivado_por_cascada = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def archivar(self, via_cascada: bool = False):
        if not self.is_active:
            return
        self.is_active = False
        self.archivado_en = timezone.now()
        self.archivado_por_cascada = via_cascada
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])

    def desarchivar(self, via_cascada: bool = False):
        # Igual que en huerta: si via_cascada=True, solo si se archivó por cascada.
        if via_cascada and not self.archivado_por_cascada:
            return
        if self.is_active:
            return
        self.is_active = True
        self.archivado_en = None
        self.archivado_por_cascada = False
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])


# ───────────────────────────────────────────────────────────────────────────
# Núcleo
# ───────────────────────────────────────────────────────────────────────────

class Bodega(TimeStampedModel):
    nombre = models.CharField(max_length=120)
    ubicacion = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-id"]
        indexes = [
            Index(fields=["nombre"], name="idx_bod_nombre"),
            Index(fields=["is_active"], name="idx_bod_is_active"),
            Index(fields=["archivado_en"], name="idx_bod_archivado"),
        ]

    def __str__(self) -> str:
        return self.nombre

    @transaction.atomic
    def archivar(self) -> dict:
        if not self.is_active:
            return {"bodegas": 0, "temporadas": 0, "recepciones": 0, "clasificaciones": 0,
                    "pedidos": 0, "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        super().archivar(via_cascada=False)

        counts = {"bodegas": 1, "temporadas": 0, "recepciones": 0, "clasificaciones": 0,
                  "pedidos": 0, "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        for t in self.temporadas.all():
            if t.is_active:
                c = t.archivar(via_cascada=True)
                counts = _sum_counts(counts, c)

        return counts

    @transaction.atomic
    def desarchivar(self) -> dict:
        if self.is_active:
            return {"bodegas": 0, "temporadas": 0, "recepciones": 0, "clasificaciones": 0,
                    "pedidos": 0, "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        super().desarchivar(via_cascada=False)

        counts = {"bodegas": 1, "temporadas": 0, "recepciones": 0, "clasificaciones": 0,
                  "pedidos": 0, "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        for t in self.temporadas.all():
            if (not t.is_active) and t.archivado_por_cascada:
                c = t.desarchivar(via_cascada=True)
                counts = _sum_counts(counts, c)

        return counts


class TemporadaBodega(TimeStampedModel):
    """
    Temporada de Bodega (independiente).
    """
    año = models.PositiveIntegerField()
    bodega = models.ForeignKey(Bodega, on_delete=models.CASCADE, related_name="temporadas")

    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin = models.DateField(null=True, blank=True)
    finalizada = models.BooleanField(default=False)

    class Meta:
        ordering = ["-año", "-id"]
        indexes = [
            Index(fields=["año"], name="idx_tb_año"),
            Index(fields=["bodega"], name="idx_tb_bodega"),
            Index(fields=["finalizada"], name="idx_tb_finalizada"),
            Index(fields=["is_active"], name="idx_tb_is_active"),
        ]
        constraints = [
            UniqueConstraint(
                fields=["año", "bodega"],
                condition=Q(finalizada=False),
                name="uniq_temporadabodega_activa",
            ),
        ]
        # 👇 Nuevo permiso para alinear con cierres_views._perm_map["temporada"]
        permissions = (
            ("finalize_temporadabodega", "Puede finalizar temporada de bodega"),
        )


    def __str__(self):
        return f"{self.bodega.nombre} – Temporada {self.año}"

    def finalizar(self):
        if self.finalizada:
            return

        self.finalizada = True
        self.fecha_fin = timezone.now().date()
        self.save(update_fields=["finalizada", "fecha_fin"])

        # cerrar semana abierta si existe (opcional pero recomendado)
        abierta = (
            self.cierres
            .filter(is_active=True, fecha_hasta__isnull=True)
            .order_by("-fecha_desde")
            .first()
        )
        if abierta:
            abierta.fecha_hasta = min(timezone.localdate(), abierta.fecha_desde + timedelta(days=6))
            abierta.save(update_fields=["fecha_hasta", "actualizado_en"])

    @transaction.atomic
    def archivar(self, via_cascada: bool = False) -> dict:
        if not self.is_active:
            return {"temporadas": 0, "recepciones": 0, "clasificaciones": 0, "pedidos": 0,
                    "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        super().archivar(via_cascada=via_cascada)

        counts = {"temporadas": 1, "recepciones": 0, "clasificaciones": 0, "pedidos": 0,
                  "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        for r in self.recepciones.all():
            if r.is_active:
                res = r.archivar(via_cascada=True)
                counts = _sum_counts(counts, res)

        for p in self.pedidos.all():
            if p.is_active:
                p.archivar(via_cascada=True); counts["pedidos"] += 1

        for c in self.camiones.all():
            if c.is_active:
                c.archivar(via_cascada=True); counts["camiones"] += 1

        for cm in self.compras_madera.all():
            if cm.is_active:
                cm.archivar(via_cascada=True); counts["compras_madera"] += 1

        for con in self.consumibles.all():
            if con.is_active:
                con.archivar(via_cascada=True); counts["consumibles"] += 1

        for s in self.cierres.all():
            if s.is_active:
                s.archivar(via_cascada=True); counts["semanas"] += 1

        return counts

    @transaction.atomic
    def desarchivar(self, via_cascada: bool = False) -> dict:
        if via_cascada and not self.archivado_por_cascada:
            return {"temporadas": 0, "recepciones": 0, "clasificaciones": 0, "pedidos": 0,
                    "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        if self.is_active:
            return {"temporadas": 0, "recepciones": 0, "clasificaciones": 0, "pedidos": 0,
                    "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        super().desarchivar(via_cascada=via_cascada)

        counts = {"temporadas": 1, "recepciones": 0, "clasificaciones": 0, "pedidos": 0,
                  "camiones": 0, "compras_madera": 0, "consumibles": 0, "semanas": 0}

        for r in self.recepciones.all():
            if (not r.is_active) and r.archivado_por_cascada:
                res = r.desarchivar(via_cascada=True)
                counts = _sum_counts(counts, res)

        for p in self.pedidos.all():
            if (not p.is_active) and p.archivado_por_cascada:
                p.desarchivar(via_cascada=True); counts["pedidos"] += 1

        for c in self.camiones.all():
            if (not c.is_active) and c.archivado_por_cascada:
                c.desarchivar(via_cascada=True); counts["camiones"] += 1

        for cm in self.compras_madera.all():
            if (not cm.is_active) and cm.archivado_por_cascada:
                cm.desarchivar(via_cascada=True); counts["compras_madera"] += 1

        for con in self.consumibles.all():
            if (not con.is_active) and con.archivado_por_cascada:
                con.desarchivar(via_cascada=True); counts["consumibles"] += 1

        for s in self.cierres.all():
            if (not s.is_active) and s.archivado_por_cascada:
                s.desarchivar(via_cascada=True); counts["semanas"] += 1

        return counts


class Cliente(TimeStampedModel):
    """
    Catálogo de clientes para pedidos/consignas de Bodega.
    """
    nombre = models.CharField(max_length=120)
    alias = models.CharField(max_length=20, blank=True, default="")
    rfc = models.CharField(max_length=20, blank=True, default="")
    telefono = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    direccion = models.CharField(max_length=255, blank=True, default="")
    notas = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-id"]
        constraints = [
            UniqueConstraint(fields=["nombre", "rfc"], name="uniq_cliente_bodega_nom_rfc"),
        ]
        indexes = [
            Index(fields=["nombre"], name="idx_cli_nombre"),
            Index(fields=["rfc"], name="idx_cli_rfc"),
            Index(fields=["is_active"], name="idx_cli_is_active"),
        ]

    def __str__(self) -> str:
        return self.alias or self.nombre


# ───────────────────────────────────────────────────────────────────────────
# Operación (Recepciones / Clasificación)
# ───────────────────────────────────────────────────────────────────────────
class Recepcion(TimeStampedModel):
    """
    Entrada de mango de campo (sin empacar) — origen libre.
    Siempre debe pertenecer a una semana activa de la bodega/temporada.
    """
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="recepciones")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="recepciones")
    # Por ahora dejamos null=True/blank=True a nivel DB, pero el clean() lo hará obligatorio.
    semana = models.ForeignKey("CierreSemanal", on_delete=models.PROTECT, null=True, blank=True, related_name="recepciones")
    fecha = models.DateField()
    huertero_nombre = models.CharField(max_length=120, blank=True, default="")
    tipo_mango = models.CharField(max_length=80)
    cajas_campo = models.PositiveIntegerField()
    observaciones = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [
            Index(fields=["bodega", "temporada", "fecha"], name="idx_rec_bod_temp_fecha"),
            Index(fields=["tipo_mango"], name="idx_rec_tipo_mango"),
            Index(fields=["bodega", "temporada", "semana", "fecha"], name="idx_rec_ctx_semana_fecha"),
        ]

    def __str__(self) -> str:
        return f"Recepción #{self.id} ({self.fecha})"

    def clean(self):
        errors = {}

        # Bodega activa
        if self.bodega_id and not self.bodega.is_active:
            errors["bodega"] = "La bodega debe estar activa."

        # Temporada activa y no finalizada + coherencia con bodega
        if self.temporada_id:
            if (not self.temporada.is_active) or self.temporada.finalizada:
                errors["temporada"] = "La temporada debe estar activa y no finalizada."
            if self.bodega_id and self.temporada.bodega_id != self.bodega_id:
                errors["temporada"] = "La temporada no corresponde a la bodega indicada."

        # Cantidad de cajas defensiva (evita TypeError cuando viene None)
        if not self.cajas_campo or self.cajas_campo <= 0:
            errors["cajas_campo"] = "La cantidad de cajas debe ser positiva."

        # Fecha no futura + regla hoy/ayer
        if self.fecha:
            if self.fecha > timezone.localdate():
                errors["fecha"] = "La fecha no puede ser futura."
            if not _is_today_or_yesterday_date(self.fecha):
                errors["fecha"] = "La fecha de recepción solo puede ser HOY o AYER (máx. 24 h)."

        # Resolver semana si no viene (alineado a lo que ya haces en serializer)
        if not self.semana_id and self.bodega_id and self.temporada_id and self.fecha:
            self.semana = _resolver_semana_por_fecha(self.bodega_id, self.temporada_id, self.fecha)

        if not self.semana_id:
            errors["semana"] = "Debe existir una semana que cubra la fecha (inicia una semana desde el tablero)."
        else:
            # Misma bodega/temporada + semana activa
            if not self.semana.is_active:
                errors["semana"] = "La semana está archivada; no es válida para operar."
            if self.semana.bodega_id != self.bodega_id or self.semana.temporada_id != self.temporada_id:
                errors["semana"] = "La semana no pertenece a esta bodega y temporada."

            # Semana cerrada
            if self.semana.fecha_hasta is not None:
                errors["semana"] = "No se pueden registrar recepciones en una semana cerrada."

            # Fecha dentro del rango de la semana
            if self.fecha:
                semana_fin = self.semana.fecha_hasta or (self.semana.fecha_desde + timedelta(days=6))
                if not (self.semana.fecha_desde <= self.fecha <= semana_fin):
                    errors["fecha"] = "La fecha de la recepción debe estar dentro del rango de la semana."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)

    @transaction.atomic
    def archivar(self, via_cascada: bool = False) -> dict:
        """
        Archiva la recepción y cascada sus clasificaciones activas.
        """
        if not self.is_active:
            return {"recepciones": 0, "clasificaciones": 0}

        super().archivar(via_cascada=via_cascada)

        count_cls = 0
        for cl in self.clasificaciones.filter(is_active=True):
            cl.archivar(via_cascada=True)
            count_cls += 1

        return {"recepciones": 1, "clasificaciones": count_cls}

    @transaction.atomic
    def desarchivar(self, via_cascada: bool = False) -> dict:
        """
        Desarchiva la recepción y restaura clasificaciones archivadas por cascada.
        """
        if via_cascada and not self.archivado_por_cascada:
            return {"recepciones": 0, "clasificaciones": 0}
        if self.is_active:
            return {"recepciones": 0, "clasificaciones": 0}

        super().desarchivar(via_cascada=via_cascada)

        count_cls = 0
        for cl in self.clasificaciones.filter(is_active=False, archivado_por_cascada=True):
            cl.desarchivar(via_cascada=True)
            count_cls += 1

        return {"recepciones": 1, "clasificaciones": count_cls}


class ClasificacionEmpaque(TimeStampedModel):
    """
    Cajas empacadas por material/calidad/tipo_mango derivadas de una Recepción.
    En PLÁSTICO, 'SEGUNDA'/'EXTRA' → PRIMERA (normalización).
    Siempre alineada a la semana/bodega/temporada de la recepción.
    """
    recepcion = models.ForeignKey(Recepcion, on_delete=models.PROTECT, related_name="clasificaciones")
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="clasificaciones")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="clasificaciones")
    semana = models.ForeignKey("CierreSemanal", on_delete=models.PROTECT, null=True, blank=True, related_name="clasificaciones")
    fecha = models.DateField()
    material = models.CharField(max_length=10, choices=Material.choices)
    calidad = models.CharField(max_length=12)  # madera/plástico (texto)
    tipo_mango = models.CharField(max_length=80)
    cantidad_cajas = models.PositiveIntegerField()

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [
            Index(fields=["bodega", "temporada", "fecha"], name="idx_emp_bod_temp_fecha"),
            Index(fields=["material", "calidad"], name="idx_emp_mat_cal"),
            Index(fields=["tipo_mango"], name="idx_emp_tipo_mango"),
            Index(fields=["bodega", "temporada", "semana", "fecha"], name="idx_emp_ctx_semana_fecha"),
        ]
        constraints = [
            UniqueConstraint(
                fields=["recepcion", "material", "calidad"],
                condition=Q(is_active=True),
                name="uniq_emp_linea_activa_por_recepcion",
            ),
        ]

    def __str__(self) -> str:
        return f"Empaque #{self.id} {self.material}-{self.calidad} ({self.cantidad_cajas})"

    def clean(self):
        errors = {}

        # Bodega activa
        if self.bodega_id and not self.bodega.is_active:
            errors["bodega"] = "La bodega debe estar activa."

        # Temporada activa + coherencia bodega
        if self.temporada_id:
            if (not self.temporada.is_active) or self.temporada.finalizada:
                errors["temporada"] = "La temporada debe estar activa y no finalizada."
            if self.bodega_id and self.temporada.bodega_id != self.bodega_id:
                errors["temporada"] = "La temporada no corresponde a la bodega indicada."

        # Material/Calidad
        if self.material == Material.PLASTICO:
            if self.calidad in {"SEGUNDA", "EXTRA"}:
                self.calidad = CalidadPlastico.PRIMERA
            if self.calidad not in set(CalidadPlastico.values):
                errors["calidad"] = "Calidad inválida para material PLÁSTICO."
        else:
            if self.calidad not in set(CalidadMadera.values):
                errors["calidad"] = "Calidad inválida para material MADERA."

        if self.cantidad_cajas <= 0:
            errors["cantidad_cajas"] = "La cantidad de cajas debe ser positiva."

        # Fecha no futura + regla hoy/ayer
        if self.fecha:
            if self.fecha > timezone.localdate():
                errors["fecha"] = "La fecha no puede ser futura."
            if not _is_today_or_yesterday_date(self.fecha):
                errors["fecha"] = "La fecha solo puede ser HOY o AYER (máx. 24 h)."

        # Coherencia con recepción
        if self.recepcion_id:
            if not self.recepcion.is_active:
                errors["recepcion"] = "No se pueden registrar clasificaciones en una recepción archivada."

            # La identidad (bodega/temporada/tipo_mango) la hereda del padre (server-truth)
            if self.bodega_id and self.bodega_id != self.recepcion.bodega_id:
                errors["bodega"] = "La clasificación debe usar la misma bodega que la recepción."
            if self.temporada_id and self.temporada_id != self.recepcion.temporada_id:
                errors["temporada"] = "La clasificación debe usar la misma temporada que la recepción."

            self.bodega_id = self.recepcion.bodega_id
            self.temporada_id = self.recepcion.temporada_id
            self.tipo_mango = self.recepcion.tipo_mango

            if self.fecha and self.recepcion.fecha and self.fecha < self.recepcion.fecha:
                errors["fecha"] = "La fecha de clasificación no puede ser anterior a la recepción."

        # Resolver semana si no viene
        if not self.semana_id and self.bodega_id and self.temporada_id and self.fecha:
            # preferimos la semana de la recepción si existe
            if self.recepcion_id and self.recepcion.semana_id:
                self.semana_id = self.recepcion.semana_id
            else:
                self.semana = _resolver_semana_por_fecha(self.bodega_id, self.temporada_id, self.fecha)

        if not self.semana_id:
            errors["semana"] = "Debe existir una semana que cubra la fecha (inicia una semana desde el tablero)."
        else:
            if not self.semana.is_active:
                errors["semana"] = "La semana está archivada; no es válida para operar."
            if self.semana.bodega_id != self.bodega_id or self.semana.temporada_id != self.temporada_id:
                errors["semana"] = "La semana no pertenece a esta bodega y temporada."
            if self.semana.fecha_hasta is not None:
                errors["semana"] = "No se pueden registrar clasificaciones en una semana cerrada."

            if self.fecha:
                semana_fin = self.semana.fecha_hasta or (self.semana.fecha_desde + timedelta(days=6))
                if not (self.semana.fecha_desde <= self.fecha <= semana_fin):
                    errors["fecha"] = "La fecha debe estar dentro del rango de la semana."

            if self.recepcion_id and self.recepcion.semana_id and self.recepcion.semana_id != self.semana_id:
                errors["semana"] = "La semana de la clasificación debe coincidir con la de la recepción."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


# ───────────────────────────────────────────────────────────────────────────
# Inventario Plástico (propio / consigna por Cliente)
# ───────────────────────────────────────────────────────────────────────────

class InventarioPlastico(TimeStampedModel):
    """
    Stock de cajas PLÁSTICAS por bodega/temporada y (opcional) cliente consigna.
    cliente = NULL -> propio (bodega).
    """
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="inventarios_plastico")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="inventarios_plastico")
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True, related_name="inventarios_plastico")
    calidad = models.CharField(max_length=12, choices=CalidadPlastico.choices)  # normalizada
    tipo_mango = models.CharField(max_length=80, blank=True, default="")
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-id"]
        constraints = [
            UniqueConstraint(fields=["bodega", "temporada", "cliente", "calidad", "tipo_mango"], name="uniq_inv_plastico_key"),
        ]
        indexes = [
            Index(fields=["bodega", "temporada", "cliente"], name="idx_invp_bod_temp_cli"),
            Index(fields=["calidad", "tipo_mango"], name="idx_invp_cal_tm"),
        ]

    def __str__(self) -> str:
        dueño = self.cliente_id or "propio"
        return f"InvPlástico({dueño}) {self.calidad}-{self.tipo_mango}: {self.stock}"

    def clean(self):
        errors = {}
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            errors["temporada"] = "La temporada debe estar activa y no finalizada."
        if self.stock < 0:
            errors["stock"] = "El stock no puede ser negativo."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


class MovimientoPlastico(TimeStampedModel):
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"
    AJUSTE = "AJUSTE"
    TIPO_CHOICES = (
        (ENTRADA, "Entrada"),
        (SALIDA, "Salida"),
        (AJUSTE, "Ajuste"),
    )

    inventario = models.ForeignKey(InventarioPlastico, on_delete=models.CASCADE, related_name="movimientos")
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.PositiveIntegerField()
    motivo = models.CharField(max_length=200, blank=True, default="")
    referencia_tipo = models.CharField(max_length=50, blank=True, default="")
    referencia_id = models.CharField(max_length=50, blank=True, default="")
    fecha = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [
            Index(fields=["inventario", "fecha"], name="idx_movp_inv_fecha"),
            Index(fields=["tipo"], name="idx_movp_tipo"),
        ]

    def __str__(self) -> str:
        return f"{self.tipo} {self.cantidad} ({self.motivo})"

    def clean(self):
        if self.cantidad <= 0:
            raise ValidationError({"cantidad": "La cantidad debe ser positiva."})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


# ───────────────────────────────────────────────────────────────────────────
# Madera: Compras y Abonos (dinero real)
# ───────────────────────────────────────────────────────────────────────────

class CompraMadera(TimeStampedModel):
    """
    Compra de cajas de madera (dinero real).
    No hay devolución de cajas; solo abonos monetarios al saldo.
    """
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="compras_madera")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="compras_madera")
    proveedor_nombre = models.CharField(max_length=120)
    cantidad_cajas = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    saldo = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    observaciones = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-creado_en"]
        indexes = [
            Index(fields=["bodega", "temporada"], name="idx_cm_bod_temp"),
            Index(fields=["proveedor_nombre"], name="idx_cm_proveedor"),
        ]

    def __str__(self) -> str:
        return f"CompraMadera #{self.id} ({self.proveedor_nombre})"

    def clean(self):
        errors = {}
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            errors["temporada"] = "La temporada debe estar activa y no finalizada."
        if self.cantidad_cajas <= 0:
            errors["cantidad_cajas"] = "La cantidad de cajas debe ser positiva."
        if self.precio_unitario <= 0:
            errors["precio_unitario"] = "El precio unitario debe ser positivo."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.monto_total = (self.precio_unitario or Decimal("0")) * Decimal(self.cantidad_cajas or 0)
        if self._state.adding:
            self.saldo = self.monto_total
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        super().save(*args, **kwargs)

    @transaction.atomic
    def registrar_abono(self, monto: Decimal, fecha: Optional[str] = None, metodo: Optional[str] = None) -> "AbonoMadera":
        if monto <= 0:
            raise ValidationError("El abono debe ser positivo.")
        if monto > self.saldo:
            raise ValidationError("El abono no puede exceder el saldo.")
        self.saldo = (self.saldo or Decimal("0")) - monto
        self.save(update_fields=["saldo", "actualizado_en"])
        return AbonoMadera.objects.create(
            compra=self,
            fecha=fecha or timezone.now().date(),
            monto=monto,
            metodo=(metodo or "").strip()[:30],
            saldo_resultante=self.saldo,
        )


class AbonoMadera(TimeStampedModel):
    compra = models.ForeignKey(CompraMadera, on_delete=models.CASCADE, related_name="abonos")
    fecha = models.DateField(default=timezone.now)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo = models.CharField(max_length=30, blank=True, default="")
    saldo_resultante = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [
            Index(fields=["compra", "fecha"], name="idx_abm_compra_fecha"),
        ]

    def __str__(self) -> str:
        return f"Abono #{self.id} (${self.monto})"


# ───────────────────────────────────────────────────────────────────────────
# Pedidos y Surtidos
# ───────────────────────────────────────────────────────────────────────────

class Pedido(TimeStampedModel):
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="pedidos")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="pedidos")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="pedidos_bodega")
    fecha = models.DateField(default=timezone.now)
    estado = models.CharField(max_length=12, choices=EstadoPedido.choices, default=EstadoPedido.BORRADOR)
    observaciones = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [
            Index(fields=["bodega", "temporada", "cliente", "estado"], name="idx_ped_claves"),
        ]

    def __str__(self) -> str:
        return f"Pedido #{self.id} ({self.estado})"

    def clean(self):
        errors = {}
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            errors["temporada"] = "La temporada debe estar activa y no finalizada."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


class PedidoRenglon(TimeStampedModel):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="renglones")
    material = models.CharField(max_length=10, choices=Material.choices)
    calidad = models.CharField(max_length=12)  # madera/plástico según material (texto)
    tipo_mango = models.CharField(max_length=80, blank=True, default="")
    cantidad_solicitada = models.PositiveIntegerField()
    cantidad_surtida = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]
        indexes = [
            Index(fields=["pedido", "material", "calidad"], name="idx_pedr_pmc"),
        ]

    def __str__(self) -> str:
        return f"Renglón #{self.id} {self.material}-{self.calidad} {self.cantidad_surtida}/{self.cantidad_solicitada}"

    @property
    def pendiente(self) -> int:
        return max(0, (self.cantidad_solicitada or 0) - (self.cantidad_surtida or 0))

    def clean(self):
        if self.cantidad_solicitada <= 0:
            raise ValidationError({"cantidad_solicitada": "Debe ser positiva."})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


class SurtidoRenglon(TimeStampedModel):
    """
    Consumo de cajas clasificadas hacia un renglón de pedido.
    Disponible = clasificacion.cantidad_cajas - sum(surtidos.cantidad)
    y jamás se permite overpicking en renglón.
    """
    renglon = models.ForeignKey(PedidoRenglon, on_delete=models.CASCADE, related_name="surtidos")
    origen_clasificacion = models.ForeignKey(ClasificacionEmpaque, on_delete=models.PROTECT, related_name="surtidos")
    cantidad = models.PositiveIntegerField()

    class Meta:
        ordering = ["id"]
        indexes = [
            Index(fields=["renglon", "origen_clasificacion"], name="idx_sur_reng_origen"),
        ]

    def __str__(self) -> str:
        return f"Surtido #{self.id} {self.cantidad}"

    def clean(self):
        if self.cantidad <= 0:
            raise ValidationError("La cantidad de surtido debe ser positiva.")

        if self.renglon.material != self.origen_clasificacion.material:
            raise ValidationError("Material del renglón y del origen no coincide.")
        if self.renglon.calidad != self.origen_clasificacion.calidad:
            raise ValidationError("La calidad del renglón y de la clasificación no coincide.")

        cons_qs = self.origen_clasificacion.surtidos.all()
        if self.pk:
            cons_qs = cons_qs.exclude(pk=self.pk)

        consumido = cons_qs.aggregate(total=Sum("cantidad"))["total"] or 0
        disponible = (self.origen_clasificacion.cantidad_cajas or 0) - consumido
        if self.cantidad > disponible:
            raise ValidationError("No hay suficiente disponible en esa clasificación (overpicking origen).")

        if self.cantidad > self.renglon.pendiente:
            raise ValidationError("La cantidad excede lo pendiente en el renglón (overpicking renglón).")

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


# ───────────────────────────────────────────────────────────────────────────
# Camiones (embarque) y manifiesto
# ───────────────────────────────────────────────────────────────────────────

class CamionSalida(TimeStampedModel):
    """
    Camión de salida (embarque).
    Numeración correlativa por (bodega, temporada) al confirmar.
    """
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="camiones")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="camiones")
    numero = models.PositiveIntegerField(null=True, blank=True)  # correlativo al confirmar
    estado = models.CharField(max_length=12, choices=EstadoCamion.choices, default=EstadoCamion.BORRADOR)
    fecha_salida = models.DateField(default=timezone.now)
    placas = models.CharField(max_length=20, blank=True, default="")
    chofer = models.CharField(max_length=80, blank=True, default="")
    destino = models.CharField(max_length=120, blank=True, default="")
    receptor = models.CharField(max_length=120, blank=True, default="")
    observaciones = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-fecha_salida", "-id"]
        constraints = [
            UniqueConstraint(
                fields=["bodega", "temporada", "numero"],
                name="uniq_camion_numero_por_bodega_temporada",
                condition=Q(numero__isnull=False),
            )
        ]
        indexes = [
            Index(fields=["bodega", "temporada", "numero"], name="idx_cam_bod_temp_num"),
            Index(fields=["estado"], name="idx_cam_estado"),
        ]

    def __str__(self) -> str:
        nro = self.numero if self.numero is not None else "S/N"
        return f"Camión {nro} ({self.estado})"

    def clean(self):
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            raise ValidationError({"temporada": "La temporada debe estar activa y no finalizada."})

    @transaction.atomic
    def confirmar(self):
        if self.estado == EstadoCamion.ANULADO:
            raise ValidationError("No se puede confirmar un camión anulado.")
        if self.numero is not None and self.estado == EstadoCamion.CONFIRMADO:
            return  # idempotente

        # Evitar condiciones de carrera al asignar número correlativo
        with transaction.atomic():
            last = (CamionSalida.objects
                    .select_for_update()
                    .filter(bodega=self.bodega, temporada=self.temporada, numero__isnull=False)
                    .order_by("-numero")
                    .first())
            siguiente = (last.numero if last else 0) + 1
            self.numero = siguiente
            self.estado = EstadoCamion.CONFIRMADO
            self.save(update_fields=["numero", "estado", "actualizado_en"])

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


class CamionItem(TimeStampedModel):
    """
    Ítems del manifiesto del camión (no mueven stock).
    """
    camion = models.ForeignKey(CamionSalida, on_delete=models.CASCADE, related_name="items")
    material = models.CharField(max_length=10, choices=Material.choices)
    calidad = models.CharField(max_length=12)
    tipo_mango = models.CharField(max_length=80, blank=True, default="")
    cantidad_cajas = models.PositiveIntegerField()

    class Meta:
        ordering = ["id"]
        indexes = [
            Index(fields=["camion"], name="idx_cami_camion"),
            Index(fields=["material", "calidad"], name="idx_cami_mat_cal"),
        ]

    def __str__(self) -> str:
        return f"ItemCamión #{self.id} {self.material}-{self.calidad} {self.cantidad_cajas}"

    def clean(self):
        if self.cantidad_cajas <= 0:
            raise ValidationError({"cantidad_cajas": "Debe ser positiva."})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)


# ───────────────────────────────────────────────────────────────────────────
# Gastos/Consumibles (bodega)
# ───────────────────────────────────────────────────────────────────────────

class Consumible(TimeStampedModel):
    """
    Gastos/consumos de bodega (rafias, gises, tega, papel, ...).
    Afecta costo de bodega global por temporada (no por cliente).
    """
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="consumibles")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="consumibles")
    concepto = models.CharField(max_length=120)
    cantidad = models.PositiveIntegerField(default=1)
    costo_unitario = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    fecha = models.DateField(default=timezone.now)
    observaciones = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-fecha", "-id"]
        indexes = [
            Index(fields=["bodega", "temporada", "fecha"], name="idx_con_bod_temp_fecha"),
            Index(fields=["concepto"], name="idx_con_concepto"),
        ]

    def __str__(self) -> str:
        return f"Consumible #{self.id} {self.concepto} (${self.total})"

    def clean(self):
        errors = {}
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            errors["temporada"] = "La temporada debe estar activa y no finalizada."
        if self.cantidad <= 0:
            errors["cantidad"] = "La cantidad debe ser positiva."
        if self.costo_unitario < 0:
            errors["costo_unitario"] = "El costo unitario no puede ser negativo."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        try:
            self.total = (self.cantidad or 0) * (self.costo_unitario or Decimal("0"))
        except InvalidOperation:
            self.total = Decimal("0.00")
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        super().save(*args, **kwargs)


# ───────────────────────────────────────────────────────────────────────────
# Cierre semanal (lock de edición por semana ISO)
# ───────────────────────────────────────────────────────────────────────────

class CierreSemanal(TimeStampedModel):
    """
    Semana operativa (manual) por bodega y temporada.
    - ABIERTA  => fecha_hasta = null
    - CERRADA  => fecha_hasta != null (no se reabre).
    - Duración máxima: 7 días (inclusive).
    - Sin solapes entre semanas (regla por bodega+temporada).
    - iso_semana es opcional y solo actúa como etiqueta si coincide con ISO.
    """
    bodega = models.ForeignKey(Bodega, on_delete=models.PROTECT, related_name="cierres")
    temporada = models.ForeignKey(TemporadaBodega, on_delete=models.CASCADE, related_name="cierres")

    iso_semana = models.CharField(max_length=10, blank=True, default="")  # p.ej. "2025-W36"

    fecha_desde = models.DateField()
    # Semana ABIERTA => fecha_hasta = null
    fecha_hasta = models.DateField(null=True, blank=True)

    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cierres_bodega_lock",
    )

    class Meta:
        ordering = ["-fecha_desde", "-id"]
        constraints = [
            # A lo sumo 1 semana ABIERTA por (bodega, temporada)
            UniqueConstraint(
                fields=["bodega", "temporada"],
                condition=Q(fecha_hasta__isnull=True, is_active=True),
                name="uniq_cierre_semana_abierta_bod_temp",
            ),
        ]
        indexes = [
            Index(fields=["bodega", "temporada", "fecha_desde", "fecha_hasta"], name="idx_cierre_rango"),
            Index(fields=["iso_semana"], name="idx_cierre_iso"),
        ]
        permissions = (
            ("close_week", "Puede cerrar semana"),
            ("view_dashboard", "Puede ver el tablero de bodega"),
        )

    def __str__(self) -> str:
        hasta = self.fecha_hasta or "—"
        etiqueta = f" {self.iso_semana}" if self.iso_semana else ""
        return f"Cierre{etiqueta} ({self.fecha_desde}→{hasta})"

    # 👇 NUEVO: semántica estándar de semana activa
    @property
    def activa(self) -> bool:
        return self.fecha_hasta is None

    def clean(self):
        errors = {}

        # Bloqueos por bodega/temporada
        if self.bodega_id and not self.bodega.is_active:
            errors["bodega"] = "La bodega debe estar activa."

        if self.temporada_id:
            if (not self.temporada.is_active) or self.temporada.finalizada:
                errors["temporada"] = "La temporada debe estar activa y no finalizada."
            if self.bodega_id and self.temporada.bodega_id != self.bodega_id:
                errors["temporada"] = "La temporada no corresponde a la bodega indicada."

        # No permitir fechas futuras
        hoy = timezone.localdate()
        if self.fecha_desde and self.fecha_desde > hoy:
            errors["fecha_desde"] = "No se puede iniciar una semana en fecha futura."
        if self.fecha_hasta and self.fecha_hasta > hoy:
            errors["fecha_hasta"] = "No se puede cerrar una semana con fecha futura."

        if self.fecha_hasta and self.fecha_hasta < self.fecha_desde:
            errors["fecha_hasta"] = "La fecha de cierre no puede ser anterior a la fecha de inicio."

        # Máximo 7 días al cerrar
        if self.fecha_hasta:
            delta = (self.fecha_hasta - self.fecha_desde).days
            if delta > 6:
                errors["fecha_hasta"] = "La semana no puede exceder 7 días."

        # No permitir reabrir NI editar rangos de una semana ya cerrada
        if self.pk:
            old = CierreSemanal.objects.filter(pk=self.pk).only("fecha_desde", "fecha_hasta").first()
            if old and old.fecha_hasta is not None:
                if (self.fecha_desde != old.fecha_desde) or (self.fecha_hasta != old.fecha_hasta):
                    errors["fecha_hasta"] = "Una semana cerrada no se puede editar ni reabrir."

            if old and old.fecha_hasta is not None and self.fecha_hasta is None:
                errors["fecha_hasta"] = "No se puede reabrir una semana que ya fue cerrada."

        # Solapes (ignoramos semanas archivadas)
        self_start = self.fecha_desde
        self_end = self.fecha_hasta or (self.fecha_desde + timedelta(days=6))

        qs = CierreSemanal.objects.filter(
            bodega=self.bodega,
            temporada=self.temporada,
            is_active=True,
        ).exclude(pk=self.pk)

        for other in qs:
            other_start = other.fecha_desde
            other_end = other.fecha_hasta or (other.fecha_desde + timedelta(days=6))
            if self_start <= other_end and self_end >= other_start:
                errors["fecha_desde"] = "El rango de la semana solapa con otra semana existente."
                break

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not self.iso_semana and self.fecha_desde:
            try:
                iso = self.fecha_desde.isocalendar()
                self.iso_semana = f"{iso.year}-W{str(iso.week).zfill(2)}"
            except Exception:
                pass
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)
