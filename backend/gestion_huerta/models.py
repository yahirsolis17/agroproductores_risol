# backend/gestion_huerta/models.py
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from django.core.exceptions import ValidationError

# ────────────── PROPIETARIO ────────────────────────────────────────────────
class Propietario(models.Model):
    # ───── datos básicos ─────
    nombre     = models.CharField(max_length=100)
    apellidos  = models.CharField(max_length=100)
    telefono   = models.CharField(max_length=15, unique=True)
    direccion  = models.CharField(max_length=255)

    # ───── soft-delete ─────
    is_active   = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    # ───── helpers ─────
    def __str__(self):
        return f'{self.nombre} {self.apellidos}'

    def archivar(self):
        if self.is_active:
            self.is_active   = False
            self.archivado_en = timezone.now()
            self.save(update_fields=['is_active', 'archivado_en'])

    def desarchivar(self):
        if not self.is_active:
            self.is_active   = True
            self.archivado_en = None
            self.save(update_fields=['is_active', 'archivado_en'])


# ────────────── HUERTA PROPIA ──────────────────────────────────────────────
class Huerta(models.Model):
    nombre      = models.CharField(max_length=100)
    ubicacion   = models.CharField(max_length=255)
    variedades  = models.CharField(max_length=255)
    historial   = models.TextField(blank=True, null=True)
    hectareas   = models.FloatField(validators=[MinValueValidator(0.1)])
    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)
    propietario = models.ForeignKey(
        Propietario,
        on_delete=models.CASCADE,
        related_name="huertas"
    )

    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering        = ['id']
        indexes         = [models.Index(fields=['nombre'])]

    def __str__(self):
        return f"{self.nombre} ({self.propietario})"


# gestion_huerta/models/huerta.py  (solo el modelo HuertaRentada)
class HuertaRentada(models.Model):
    nombre      = models.CharField(max_length=100)
    ubicacion   = models.CharField(max_length=255)
    variedades  = models.CharField(max_length=255)
    historial   = models.TextField(blank=True, null=True)
    hectareas   = models.FloatField(validators=[MinValueValidator(0.1)])

    propietario = models.ForeignKey(
        Propietario,
        on_delete=models.CASCADE,
        related_name="huertas_rentadas"
    )

    monto_renta = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )

    # 🆕  Paridad con Huerta
    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering        = ['id']
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['ubicacion']),
        ]

    def __str__(self):
        return f"{self.nombre} (Rentada – {self.propietario})"
class Temporada(models.Model):
    """
    Una temporada representa un año agrícola de una huerta propia o rentada.
    - Solo una temporada por año por huerta.
    - Soporta cierre (finalizada) y soft-delete (archivado_en).
    """
    año           = models.PositiveIntegerField()
    huerta         = models.ForeignKey(
        "Huerta",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='temporadas'
    )
    huerta_rentada = models.ForeignKey(
        "HuertaRentada",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='temporadas'
    )

    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin    = models.DateField(null=True, blank=True)
    finalizada   = models.BooleanField(default=False)

    # ── Soft-delete ──
    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-año']
        indexes = [models.Index(fields=['año'])]

    def clean(self):
        if not self.huerta and not self.huerta_rentada:
            raise ValidationError("Debe asignar una huerta propia o rentada.")
        if self.huerta and self.huerta_rentada:
            raise ValidationError("No puede asignar ambas huertas a la vez.")

    def finalizar(self):
        """Marca la temporada como finalizada, bloqueando nuevos registros."""
        if not self.finalizada:
            self.finalizada = True
            # Guardar sólo la parte de fecha (no datetime completo)
            self.fecha_fin = timezone.now().date()
            self.save(update_fields=['finalizada', 'fecha_fin'])

    def archivar(self):
        """Soft-delete: archiva temporada y hace cascada a cosechas/inversiones/ventas."""
        if self.is_active:
            self.is_active = False
            self.archivado_en = timezone.now()
            self.save(update_fields=["is_active", "archivado_en"])

            now = timezone.now()
            cosechas = list(self.cosechas.all())
            for c in cosechas:
                c.is_active = False
                c.archivado_en = now
            from gestion_huerta.models import Cosecha  # import en runtime
            Cosecha.objects.bulk_update(cosechas, ["is_active", "archivado_en"])

            for c in cosechas:
                c.inversiones.update(is_active=False, archivado_en=now)
                c.ventas.update(is_active=False, archivado_en=now)

    def desarchivar(self):
        """Restaura temporada y en cascada todas sus cosechas/inversiones/ventas."""
        if not self.is_active:
            self.is_active    = True
            self.archivado_en = None
            self.save(update_fields=['is_active', 'archivado_en'])
            for cosecha in self.cosechas.all():
                cosecha.is_active    = True
                cosecha.archivado_en = None
                cosecha.save(update_fields=['is_active', 'archivado_en'])
                cosecha.inversiones.update(is_active=True, archivado_en=None)
                cosecha.ventas.update(is_active=True, archivado_en=None)

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        tipo = "Rentada" if self.huerta_rentada else "Propia"
        return f"{origen} – Temporada {self.año} ({tipo})"
    
    
class CategoriaInversion(models.Model):
    nombre = models.CharField(max_length=100)
class Cosecha(models.Model):
    """
    Cosecha perteneciente a una Temporada (obligatorio).
    El origen (huerta propia o rentada) se hereda de la temporada:
      - Si la temporada es de Huerta → huerta no nula / huerta_rentada nula
      - Si la temporada es de HuertaRentada → huerta_rentada no nula / huerta nula
    """

    # Identidad y relación principal
    nombre = models.CharField(max_length=100)
    temporada = models.ForeignKey(
        "Temporada",
        on_delete=models.CASCADE,
        related_name="cosechas",
    )

    # Origen (normalmente NO es necesario pasarlos si la temporada ya lo define)
    huerta = models.ForeignKey(
        "Huerta",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="cosechas"
    )
    huerta_rentada = models.ForeignKey(
        "HuertaRentada",
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="cosechas_rentadas"
    )

    # Ciclo de vida
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio   = models.DateTimeField(null=True, blank=True)
    fecha_fin      = models.DateTimeField(null=True, blank=True)
    finalizada     = models.BooleanField(default=False)

    # Soft-delete / archivado
    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]
        indexes  = [models.Index(fields=["nombre"])]
        unique_together = (
            # Un nombre de cosecha no se repite dentro de la misma temporada
            ("temporada", "nombre"),
        )

    # ── Agregados económicos (ventas / inversiones) ──────────────────────────
    @property
    def total_ventas(self):
        # Venta.total_venta = num_cajas * precio_por_caja
        # Como total_venta no está en DB, agregamos por columnas:
        from django.db.models import F, ExpressionWrapper, IntegerField
        expr = ExpressionWrapper(F("num_cajas") * F("precio_por_caja"), output_field=IntegerField())
        return self.ventas.aggregate(total=Coalesce(Sum(expr), Value(0)))["total"]

    @property
    def total_gastos(self):
        # InversionesHuerta.gastos_totales = gastos_insumos + gastos_mano_obra
        from django.db.models import F, DecimalField, ExpressionWrapper
        expr = ExpressionWrapper(
            Coalesce(F("gastos_insumos"), Value(0)) + Coalesce(F("gastos_mano_obra"), Value(0)),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
        return self.inversiones.aggregate(total=Coalesce(Sum(expr), Value(0)))["total"]

    @property
    def ganancia_neta(self):
        # Nota: tipos distintos (int vs decimal) pueden requerir normalizar en DB si lo necesitas con precisión fija
        return (self.total_ventas or 0) - (self.total_gastos or 0)

    # ── Validaciones y consistencia con Temporada ────────────────────────────
    def clean(self):
        # Temporada obligatoria
        if not self.temporada_id:
            raise ValidationError("La cosecha debe pertenecer a una temporada.")

        # La temporada define el origen: o huerta o huerta_rentada (exclusivo)
        t = self.temporada
        t_origen_huerta = bool(t.huerta_id)
        t_origen_rentada = bool(t.huerta_rentada_id)

        if not t_origen_huerta and not t_origen_rentada:
            raise ValidationError("La temporada no tiene origen asignado (huerta / huerta_rentada).")

        # Si la temporada está finalizada o archivada, no se pueden crear/editar cosechas activas
        if self._state.adding and (t.finalizada or not t.is_active):
            raise ValidationError("No se pueden registrar cosechas en una temporada finalizada o archivada.")

        # Consistencia de origen: autocompletar si no viene, validar si viene
        if t_origen_huerta:
            # La cosecha debe ser de huerta propia
            if self.huerta_rentada_id:
                raise ValidationError("Esta temporada es de huerta propia; no puede asignar huerta rentada en la cosecha.")
            # Autocompletar si no viene
            if not self.huerta_id:
                self.huerta_id = t.huerta_id
            # Validar coincidencia si sí vino
            if self.huerta_id and self.huerta_id != t.huerta_id:
                raise ValidationError("La huerta asignada en la cosecha no coincide con la huerta de la temporada.")
        else:
            # La cosecha debe ser de huerta rentada
            if self.huerta_id:
                raise ValidationError("Esta temporada es de huerta rentada; no puede asignar huerta propia en la cosecha.")
            if not self.huerta_rentada_id:
                self.huerta_rentada_id = t.huerta_rentada_id
            if self.huerta_rentada_id and self.huerta_rentada_id != t.huerta_rentada_id:
                raise ValidationError("La huerta rentada asignada en la cosecha no coincide con la de la temporada.")

        # Exclusividad interna por si alguien setea ambos por error
        if self.huerta_id and self.huerta_rentada_id:
            raise ValidationError("No puede asignar huerta y huerta rentada simultáneamente.")

    # ── Ciclo de vida ────────────────────────────────────────────────────────
    def save(self, *args, **kwargs):
        # Setear fecha_inicio por defecto al crear
        if self._state.adding and not self.fecha_inicio:
            self.fecha_inicio = timezone.now()
        # Validaciones de consistencia
        self.full_clean()
        super().save(*args, **kwargs)

    def finalizar(self):
        """Marca la cosecha como finalizada, con fecha_fin = hoy."""
        if not self.finalizada:
            self.finalizada = True
            self.fecha_fin = timezone.now()
            self.save(update_fields=["finalizada", "fecha_fin"])

    def archivar(self):
        """Soft-delete de la cosecha y sus movimientos (inversiones / ventas)."""
        if self.is_active:
            now = timezone.now()
            self.is_active = False
            self.archivado_en = now
            self.save(update_fields=["is_active", "archivado_en"])

            # Cascada blanda en movimientos
            self.inversiones.update(is_active=False, archivado_en=now)
            self.ventas.update(is_active=False, archivado_en=now)

    def desarchivar(self):
        """Restaura cosecha y sus movimientos."""
        if not self.is_active:
            self.is_active = True
            self.archivado_en = None
            self.save(update_fields=["is_active", "archivado_en"])

            self.inversiones.update(is_active=True, archivado_en=None)
            self.ventas.update(is_active=True, archivado_en=None)

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        return f"{self.nombre} – {origen} – Temp {self.temporada.año}"


class InversionesHuerta(models.Model):
    """
    Registro de inversiones realizadas en una cosecha específica.
    Se guarda un nombre, fecha, descripción, gastos en insumos y mano de obra,
    además de su categoría y la huerta a la que pertenece.
    """
    nombre = models.CharField(max_length=100)
    fecha = models.DateField()
    descripcion = models.TextField(blank=True, null=True)
    gastos_insumos = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    gastos_mano_obra = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    categoria = models.ForeignKey(CategoriaInversion, on_delete=models.CASCADE)
    cosecha = models.ForeignKey(Cosecha, on_delete=models.CASCADE, related_name="inversiones")
    huerta = models.ForeignKey(Huerta, on_delete=models.CASCADE)

    @property
    def gastos_totales(self):
        return (self.gastos_insumos or 0) + (self.gastos_mano_obra or 0)

    def __str__(self):
        return f"{self.nombre} ({self.categoria})"


class Venta(models.Model):
    """
    Representa la venta de productos (p.ej. cajas de mango) en una cosecha dada.
    Almacena fecha de venta, número de cajas, precio por caja, tipo de mango,
    gastos (como transporte, empaque, etc.) y calcula la ganancia neta.
    """
    cosecha = models.ForeignKey(Cosecha, on_delete=models.CASCADE, related_name="ventas")
    fecha_venta = models.DateField()
    num_cajas = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_por_caja = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    tipo_mango = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True, null=True)
    gasto = models.PositiveIntegerField(validators=[MinValueValidator(0)])

    @property
    def total_venta(self):
        return self.num_cajas * self.precio_por_caja

    @property
    def ganancia_neta(self):
        return self.total_venta - self.gasto

    def __str__(self):
        return f"{self.num_cajas} cajas - {self.tipo_mango} - {self.cosecha}"
