# backend/gestion_huerta/models.py
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from django.core.exceptions import ValidationError

class Propietario(models.Model):
    """
    Representa al propietario de una huerta (propia o rentada).
    Almacena datos básicos como nombre, apellidos, teléfono y dirección.
    """
    nombre = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    telefono = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(regex=r'^\d{10}$', message="El teléfono debe contener exactamente 10 dígitos.")
        ]
    )
    direccion = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.nombre} {self.apellidos}"


class Huerta(models.Model):
    """
    Representa una huerta propia, con nombre, ubicación, variedades de mango,
    histórico, hectáreas y un propietario.
    """
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=255)
    variedades = models.CharField(
        max_length=255,  # Ej: "Kent, Ataulfo, Tommy"
    )
    historial = models.TextField(blank=True, null=True)
    hectareas = models.FloatField(validators=[MinValueValidator(0.1)])
    propietario = models.ForeignKey(
        Propietario,
        on_delete=models.CASCADE,
        related_name="huertas"
    )

    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering = ['id']
        indexes = [models.Index(fields=['nombre'])]

    def __str__(self):
        return f"{self.nombre} ({self.propietario})"


class HuertaRentada(models.Model):
    """
    Representa una huerta rentada, con la misma información que una huerta normal
    pero agregando un campo de 'monto_renta'.
    """
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=255)
    variedades = models.CharField(max_length=255)
    historial = models.TextField(blank=True, null=True)
    hectareas = models.FloatField(validators=[MinValueValidator(0.1)])
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

    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering = ['id']
        indexes = [models.Index(fields=['nombre'])]

    def __str__(self):
        return f"{self.nombre} (Rentada - {self.propietario})"


class Cosecha(models.Model):
    """
    Cada huerta (propia o rentada) puede tener múltiples cosechas.
    'huerta' y 'huerta_rentada' son mutuamente excluyentes:
    - Si huerta está presente, huerta_rentada debe ser None (y viceversa).
    """
    nombre = models.CharField(max_length=100)
    huerta = models.ForeignKey(
        Huerta,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cosechas"
    )
    huerta_rentada = models.ForeignKey(
        HuertaRentada,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cosechas_rentadas"
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    finalizada = models.BooleanField(default=False)

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
