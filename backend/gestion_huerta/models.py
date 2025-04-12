# agroproductores_risol/backend/gestion_huerta/models.py

from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

# MODELOS PARA GESTIÓN DE HUERTAS

class Propietario(models.Model):
    telefono_regex = RegexValidator(
        regex=r'^\+?\d{7,15}$',
        message="Formato de teléfono inválido."
    )
    nombre = models.CharField(max_length=100)
    telefono = models.CharField(max_length=15, validators=[telefono_regex])
    direccion = models.CharField(max_length=255)

    def __str__(self):
        return self.nombre

class Huerta(models.Model):
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=255)
    variedades = models.CharField(max_length=255)
    historial = models.TextField()
    hectareas = models.FloatField(validators=[MinValueValidator(0.1)])
    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE)

    class Meta:
        ordering = ['id']
        indexes = [models.Index(fields=['nombre'])]

    def save(self, *args, **kwargs):
        if self.hectareas is not None and self.hectareas % 1 == 0:
            self.hectareas = int(self.hectareas)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} - Propietario: {self.propietario.nombre}"

class HuertaRentada(models.Model):
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=255)
    variedades = models.CharField(max_length=255)
    historial = models.TextField()
    hectareas = models.FloatField(validators=[MinValueValidator(0.1)])
    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE)
    monto_renta = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])

    class Meta:
        ordering = ['id']
        indexes = [models.Index(fields=['nombre'])]

    def save(self, *args, **kwargs):
        if self.hectareas <= 0:
            raise ValueError("El número de hectáreas debe ser positivo.")
        if self.monto_renta <= 0:
            raise ValueError("El monto de renta debe ser positivo.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.nombre} - Rentada'

class CategoriaInversion(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

class Cosecha(models.Model):
    nombre = models.CharField(max_length=100)
    huerta = models.ForeignKey(
        Huerta,
        on_delete=models.CASCADE,
        related_name="cosechas_huerta",
        null=True,
        blank=True
    )
    huerta_rentada = models.ForeignKey(
        HuertaRentada,
        on_delete=models.CASCADE,
        related_name="cosechas_rentada",
        null=True,
        blank=True
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField(blank=True, null=True)
    fecha_inicio = models.DateTimeField(blank=True, null=True)
    fecha_fin = models.DateTimeField(blank=True, null=True)
    finalizada = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=['nombre'])]

    def clean(self):
        if not self.huerta and not self.huerta_rentada:
            raise ValueError("La cosecha debe pertenecer a una Huerta o HuertaRentada.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre

class InversionesHuerta(models.Model):
    nombre = models.CharField(max_length=100)
    fecha = models.DateField()
    descripcion = models.TextField(null=True, blank=True)
    gastos_insumos = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    gastos_mano_obra = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    categoria = models.ForeignKey(CategoriaInversion, on_delete=models.CASCADE)
    cosecha = models.ForeignKey(Cosecha, on_delete=models.CASCADE)
    huerta = models.ForeignKey(Huerta, on_delete=models.CASCADE)

    class Meta:
        indexes = [models.Index(fields=['cosecha', 'categoria'])]

    @property
    def gastos_totales(self):
        return (self.gastos_insumos or 0) + (self.gastos_mano_obra or 0)

    def __str__(self):
        return self.nombre

class InformeProduccion(models.Model):
    ESTADO_CHOICES = [
        ('editable', 'Editable'),
        ('revision', 'Revisión'),
        ('finalizado', 'Finalizado'),
    ]
    huerta = models.ForeignKey(Huerta, on_delete=models.CASCADE)
    fecha = models.DateField()
    variedad_mango = models.CharField(max_length=100)
    gastos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='editable')
    bloqueado = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=['fecha'])]

    def save(self, *args, **kwargs):
        recalcular = kwargs.pop('recalcular', True)
        if recalcular:
            self.recalcular_gastos()
        if self.estado == 'finalizado':
            self.bloqueado = True
        super().save(*args, **kwargs)

    def recalcular_gastos(self):
        inversiones_totales = InversionesHuerta.objects.filter(
            huerta=self.huerta,
            fecha__lte=self.fecha
        ).aggregate(
            total=Coalesce(Sum('gastos_insumos') + Sum('gastos_mano_obra'), Value(0))
        )['total'] or 0
        self.gastos = inversiones_totales
        super().save(recalcular=False)

    def __str__(self):
        return f"Informe de {self.huerta.nombre} - {self.fecha}"

class Venta(models.Model):
    cosecha = models.ForeignKey(Cosecha, on_delete=models.CASCADE, related_name='ventas')
    fecha_venta = models.DateField()
    num_cajas = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_por_caja = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    tipo_mango = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True, null=True)
    gasto = models.PositiveIntegerField(validators=[MinValueValidator(0)])

    class Meta:
        indexes = [models.Index(fields=['fecha_venta']), models.Index(fields=['cosecha'])]

    @property
    def total_venta(self):
        return self.num_cajas * self.precio_por_caja

    @property
    def ganancia_neta(self):
        return self.total_venta - self.gasto

    def __str__(self):
        return f"Venta de {self.num_cajas} cajas en {self.cosecha.nombre}"

@receiver(post_save, sender=InversionesHuerta)
@receiver(post_delete, sender=InversionesHuerta)
def actualizar_informe_produccion(sender, instance, **kwargs):
    informes_relacionados = InformeProduccion.objects.filter(
        huerta=instance.huerta,
        fecha__gte=instance.fecha
    )
    for informe in informes_relacionados:
        informe.recalcular_gastos()
