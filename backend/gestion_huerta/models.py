# backend/gestion_huerta/models.py
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.db.models import F, Value, Sum, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce, Cast
from datetime import date

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

            cosechas = list(self.cosechas.all())
            for c in cosechas:
                c.is_active = True
                c.archivado_en = None
            from gestion_huerta.models import Cosecha  # import en runtime
            Cosecha.objects.bulk_update(cosechas, ["is_active", "archivado_en"])

            for c in cosechas:
                c.inversiones.update(is_active=True, archivado_en=None)
                c.ventas.update(is_active=True, archivado_en=None)

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        tipo = "Rentada" if self.huerta_rentada else "Propia"
        return f"{origen} – Temporada {self.año} ({tipo})"
    
    
# ────────────── CATEGORÍA DE INVERSIÓN ────────────────────────────────────
class CategoriaInversion(models.Model):
    nombre       = models.CharField(max_length=100, unique=True)

    # Soft-delete
    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['id']
        indexes  = [models.Index(fields=['nombre'])]

    # ─── helpers ───
    def archivar(self):
        if self.is_active:
            self.is_active    = False
            self.archivado_en = timezone.now()
            self.save(update_fields=["is_active", "archivado_en"])

    def desarchivar(self):
        if not self.is_active:
            self.is_active    = True
            self.archivado_en = None
            self.save(update_fields=["is_active", "archivado_en"])

    def __str__(self):
        return self.nombre
class Cosecha(models.Model):
    """
    Cosecha de una Temporada (obligatoria).
    El origen (huerta vs huerta_rentada) se hereda de la Temporada.
    """
    nombre         = models.CharField(max_length=100)
    temporada      = models.ForeignKey("Temporada", on_delete=models.CASCADE, related_name="cosechas")
    huerta         = models.ForeignKey("Huerta", on_delete=models.CASCADE, null=True, blank=True, related_name="cosechas")
    huerta_rentada = models.ForeignKey("HuertaRentada", on_delete=models.CASCADE, null=True, blank=True, related_name="cosechas_rentadas")

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_inicio   = models.DateTimeField(null=True, blank=True)
    fecha_fin      = models.DateTimeField(null=True, blank=True)
    finalizada     = models.BooleanField(default=False)

    is_active      = models.BooleanField(default=True)
    archivado_en   = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]
        indexes  = [models.Index(fields=["nombre"])]
        unique_together = (("temporada", "nombre"),)

    @property
    def total_ventas(self):
        qty   = Cast(F("num_cajas"), DecimalField(max_digits=14, decimal_places=2))
        price = Cast(F("precio_por_caja"), DecimalField(max_digits=14, decimal_places=2))
        expr  = ExpressionWrapper(qty * price, output_field=DecimalField(max_digits=18, decimal_places=2))
        return self.ventas.aggregate(
            total=Coalesce(Sum(expr), Value(Decimal("0.00")))
        )["total"]

    @property
    def total_gastos(self):
        gi   = Coalesce(Cast(F("gastos_insumos"), DecimalField(max_digits=18, decimal_places=2)), Value(Decimal("0.00")))
        gm   = Coalesce(Cast(F("gastos_mano_obra"),  DecimalField(max_digits=18, decimal_places=2)), Value(Decimal("0.00")))
        expr = ExpressionWrapper(gi + gm, output_field=DecimalField(max_digits=18, decimal_places=2))
        return self.inversiones.aggregate(
            total=Coalesce(Sum(expr), Value(Decimal("0.00")))
        )["total"]

    @property
    def ganancia_neta(self):
        return (self.total_ventas or Decimal("0.00")) - (self.total_gastos or Decimal("0.00"))

    def clean(self):
        if not self.temporada_id:
            raise ValidationError("La cosecha debe pertenecer a una temporada.")
        t = self.temporada
        if (t.finalizada or not t.is_active) and self._state.adding:
            raise ValidationError("No se pueden registrar cosechas en una temporada finalizada o archivada.")

        # Consistencia de origen
        if bool(t.huerta_id):
            if self.huerta_rentada_id:
                raise ValidationError("Esta temporada es de huerta propia; no asigne huerta rentada.")
            self.huerta_id = t.huerta_id
        else:
            if self.huerta_id:
                raise ValidationError("Esta temporada es de huerta rentada; no asigne huerta propia.")
            self.huerta_rentada_id = t.huerta_rentada_id

    def save(self, *args, **kwargs):
        if self._state.adding:
            if not self.fecha_inicio:
                self.fecha_inicio = timezone.now()
            if not self.nombre.strip():
                # Genera nombre único
                base = "Cosecha"
                exist = set(self.temporada.cosechas.values_list("nombre", flat=True))
                cnt = 1
                cand = base
                while cand in exist:
                    cnt += 1
                    cand = f"{base} {cnt}"
                self.nombre = cand
        self.full_clean()
        super().save(*args, **kwargs)

    def finalizar(self):
        if not self.finalizada:
            self.finalizada = True
            self.fecha_fin = timezone.now()
            self.save(update_fields=["finalizada", "fecha_fin"])

    def archivar(self):
        if self.is_active:
            now = timezone.now()
            self.is_active = False
            self.archivado_en = now
            self.save(update_fields=["is_active", "archivado_en"])
            self.inversiones.update(is_active=False, archivado_en=now)
            self.ventas.update(is_active=False, archivado_en=now)

    def desarchivar(self):
        if not self.is_active:
            self.is_active = True
            self.archivado_en = None
            self.save(update_fields=["is_active", "archivado_en"])
            self.inversiones.update(is_active=True, archivado_en=None)
            self.ventas.update(is_active=True, archivado_en=None)

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        return f"{self.nombre} – {origen} – Temp {self.temporada.año}"
# ────────────── INVERSIONES ───────────────────────────────────────────────
class InversionesHuerta(models.Model):
    """
    Inversión asociada a una Cosecha. Soporta huerta propia o rentada (mutuamente excluyentes).
    """
    categoria        = models.ForeignKey(
        CategoriaInversion,
        on_delete=models.PROTECT,
        related_name="inversiones",
    )
    fecha            = models.DateField()
    descripcion      = models.TextField(blank=True, null=True)
    gastos_insumos   = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    gastos_mano_obra = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    cosecha          = models.ForeignKey(Cosecha,   on_delete=models.CASCADE, related_name="inversiones")
    temporada        = models.ForeignKey(Temporada, on_delete=models.CASCADE, related_name="inversiones")
    # Ambos presentes para capturar IDs explícitamente en el front:
    huerta           = models.ForeignKey(Huerta,         on_delete=models.CASCADE, null=True, blank=True)
    huerta_rentada   = models.ForeignKey(HuertaRentada,  on_delete=models.CASCADE, null=True, blank=True)

    is_active        = models.BooleanField(default=True)
    archivado_en     = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-fecha', '-id']
        indexes  = [
            models.Index(fields=['fecha']),
            models.Index(fields=['categoria']),
            models.Index(fields=['cosecha']),
            models.Index(fields=['temporada']),
        ]

    @property
    def gastos_totales(self) -> Decimal:
        return (self.gastos_insumos or Decimal('0')) + (self.gastos_mano_obra or Decimal('0'))

    def clean(self):
        """
        Coherencia con la cosecha: si la cosecha es de huerta propia → huerta obligatoria y huerta_rentada = None.
        Si la cosecha es de huerta rentada → huerta_rentada obligatoria y huerta = None.
        Además, la temporada debe coincidir con la de la cosecha.
        """
        if not self.cosecha_id or not self.temporada_id:
            # DRF validará que vengan; aquí evitamos errores cuando se instancia incompleta
            return

        # Temporada debe coincidir con la de la cosecha
        if self.temporada_id != self.cosecha.temporada_id:
            from django.core.exceptions import ValidationError
            raise ValidationError("La temporada no coincide con la temporada de la cosecha.")

        # Origen de la cosecha determina qué FK de huerta aplicar
        if self.cosecha.huerta_id:
            # Propia
            if not self.huerta_id or self.huerta_id != self.cosecha.huerta_id:
                from django.core.exceptions import ValidationError
                raise ValidationError("La huerta no coincide con la huerta de la cosecha.")
            if self.huerta_rentada_id:
                from django.core.exceptions import ValidationError
                raise ValidationError("No asignes huerta rentada en una cosecha de huerta propia.")
        elif self.cosecha.huerta_rentada_id:
            # Rentada
            if not self.huerta_rentada_id or self.huerta_rentada_id != self.cosecha.huerta_rentada_id:
                from django.core.exceptions import ValidationError
                raise ValidationError("La huerta rentada no coincide con la de la cosecha.")
            if self.huerta_id:
                from django.core.exceptions import ValidationError
                raise ValidationError("No asignes huerta propia en una cosecha de huerta rentada.")
        else:
            from django.core.exceptions import ValidationError
            raise ValidationError("La cosecha no tiene origen (huerta/huerta_rentada) definido.")

        # La fecha no puede ser anterior al inicio de la cosecha (si existe)
        if self.fecha and self.cosecha.fecha_inicio and self.fecha < self.cosecha.fecha_inicio.date():
            from django.core.exceptions import ValidationError
            raise ValidationError(
                {"fecha": f"La fecha debe ser ≥ {self.cosecha.fecha_inicio.date().isoformat()} (inicio de la cosecha)."}
            )

        # La fecha no puede ser futura
        if self.fecha and self.fecha > date.today():
            from django.core.exceptions import ValidationError
            raise ValidationError({"fecha": "La fecha no puede ser futura."})

        # Temporada debe estar activa y no finalizada
        t = self.temporada
        if t.finalizada or not t.is_active:
            from django.core.exceptions import ValidationError
            raise ValidationError("No se pueden registrar inversiones en una temporada finalizada o archivada.")

        # Total > 0
        total = (self.gastos_insumos or Decimal('0')) + (self.gastos_mano_obra or Decimal('0'))
        if total <= 0:
            from django.core.exceptions import ValidationError
            raise ValidationError("Los gastos totales deben ser mayores a 0.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def archivar(self):
        if self.is_active:
            self.is_active    = False
            self.archivado_en = timezone.now()
            self.save(update_fields=["is_active", "archivado_en"])

    def desarchivar(self):
        if not self.is_active:
            self.is_active    = True
            self.archivado_en = None
            self.save(update_fields=["is_active", "archivado_en"])

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        return f"{self.categoria.nombre} – {self.fecha} – {origen}"
# ────────────── VENTAS ────────────────────────────────────────────────────
# ────────────── VENTAS ────────────────────────────────────────────────────
class Venta(models.Model):
    fecha_venta      = models.DateField()
    num_cajas        = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_por_caja  = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    tipo_mango       = models.CharField(max_length=50)
    descripcion      = models.TextField(blank=True, null=True)
    gasto            = models.PositiveIntegerField(validators=[MinValueValidator(0)])

    cosecha          = models.ForeignKey(Cosecha, on_delete=models.CASCADE, related_name="ventas")
    temporada        = models.ForeignKey(Temporada, on_delete=models.CASCADE, related_name="ventas")
    huerta           = models.ForeignKey(Huerta, on_delete=models.CASCADE)

    is_active        = models.BooleanField(default=True)
    archivado_en     = models.DateTimeField(null=True, blank=True)

    @property
    def total_venta(self):
        return self.num_cajas * self.precio_por_caja

    @property
    def ganancia_neta(self):
        return self.total_venta - self.gasto

    def __str__(self):
        return f"{self.num_cajas} cajas - {self.tipo_mango} – {self.fecha_venta}"
