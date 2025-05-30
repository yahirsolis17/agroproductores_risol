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
        Huerta,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='temporadas'
    )
    huerta_rentada = models.ForeignKey(
        HuertaRentada,
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
        unique_together = [
            ('año', 'huerta'),
            ('año', 'huerta_rentada'),
        ]
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
            self.fecha_fin = timezone.now()
            self.save(update_fields=['finalizada', 'fecha_fin'])

    def archivar(self):
        if self.is_active:
            self.is_active = False
            self.archivado_en = timezone.now()
            self.save(update_fields=["is_active", "archivado_en"])

            now = timezone.now()
            cosechas = list(self.cosechas.all())
            for c in cosechas:
                c.is_active = False
                c.archivado_en = now
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

class Cosecha(models.Model):
    nombre = models.CharField(max_length=100)
    huerta = models.ForeignKey(Huerta, on_delete=models.CASCADE, null=True, blank=True, related_name="cosechas")
    temporada = models.ForeignKey(Temporada, on_delete=models.CASCADE, related_name='cosechas', null=True, blank=True)
    huerta_rentada = models.ForeignKey(HuertaRentada, on_delete=models.CASCADE, null=True, blank=True, related_name="cosechas_rentadas")
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    finalizada = models.BooleanField(default=False)

    # ✅ Agrega esto:
    is_active = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['nombre'])]

    def save(self, *args, **kwargs):
        if not self.fecha_inicio:
            self.fecha_inicio = self.fecha_creacion
        super().save(*args, **kwargs)

    def clean(self):
        if not self.huerta and not self.huerta_rentada:
            raise ValidationError("Debe asignar una huerta o una huerta rentada.")
        if self.huerta and self.huerta_rentada:
            raise ValidationError("No puede asignar ambas huertas a la vez.")

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        return f"{self.nombre} - {origen}"

class CategoriaInversion(models.Model):
    """
    Categoría para clasificar inversiones (insumos, mano de obra, etc.).
    """
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre


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
