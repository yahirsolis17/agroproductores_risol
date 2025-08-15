# backend/gestion_huerta/models.py
from django.db import models, transaction
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import F, Sum, Value, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce, Cast
from decimal import Decimal
from django.db.models import Q

# ───────────────────────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────────────────────

def _sum_counts(a: dict, b: dict) -> dict:
    if not b:
        return a
    for k, v in b.items():
        a[k] = a.get(k, 0) + int(v or 0)
    return a

def _is_only_archival_fields(update_fields):
    """
    Devuelve True si update_fields es un subconjunto de los campos de archivado.
    Se usa para omitir full_clean() en guardados que solo cambian flags de soft-delete.
    """
    if not update_fields:
        return False
    allowed = {"is_active", "archivado_en", "archivado_por_cascada"}
    return set(update_fields).issubset(allowed)

# ────────────── PROPIETARIO ────────────────────────────────────────────────
class Propietario(models.Model):
    nombre     = models.CharField(max_length=100)
    apellidos  = models.CharField(max_length=100)
    telefono   = models.CharField(max_length=15)
    direccion  = models.CharField(max_length=255)

    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['nombre'], name='idx_prop_nombre'),
            models.Index(fields=['apellidos'], name='idx_prop_apellidos'),
            models.Index(fields=['direccion'], name='idx_prop_direccion'),
            models.Index(fields=['is_active'], name='idx_prop_is_active'),
            models.Index(fields=['archivado_en'], name='idx_prop_archivado'),
            models.Index(fields=['nombre', 'apellidos'], name='idx_prop_nom_ape'),
        ]
        ordering = ['-id']

    def __str__(self):
        return f'{self.nombre} {self.apellidos}'

    def archivar(self):
        if self.is_active:
            self.is_active = False
            self.archivado_en = timezone.now()
            self.save(update_fields=['is_active', 'archivado_en'])

    def desarchivar(self):
        if not self.is_active:
            self.is_active = True
            self.archivado_en = None
            self.save(update_fields=['is_active', 'archivado_en'])


# ────────────── HUERTA (PROPIA) ────────────────────────────────────────────
class Huerta(models.Model):
    nombre       = models.CharField(max_length=100)
    ubicacion    = models.CharField(max_length=255)
    variedades   = models.CharField(max_length=255)
    historial    = models.TextField(blank=True, null=True)
    hectareas    = models.FloatField(validators=[MinValueValidator(0.1)])

    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    propietario  = models.ForeignKey(
        'gestion_huerta.Propietario',
        on_delete=models.CASCADE,
        related_name="huertas"
    )

    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering = ['id']
        indexes = [
            models.Index(fields=['nombre'], name='idx_huerta_nombre'),
            models.Index(fields=['archivado_en'], name='idx_huerta_archivado'),
            models.Index(fields=['is_active'], name='idx_huerta_is_active'),
            models.Index(fields=['propietario', 'archivado_en'], name='idx_huerta_prop_arch'),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.propietario})"

    # Reglas de unicidad activa (nivel app)
    def _has_active_duplicate(self) -> bool:
        return Huerta.objects.filter(
            archivado_en__isnull=True,
            nombre=self.nombre,
            ubicacion=self.ubicacion,
            propietario=self.propietario
        ).exclude(pk=self.pk).exists()

    # Cascada
    @transaction.atomic
    def archivar(self) -> dict:
        if not self.is_active:
            return {'huertas': 0, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}

        self.is_active = False
        self.archivado_en = timezone.now()
        self.save(update_fields=['is_active', 'archivado_en'])

        counts = {'huertas': 1, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}
        if hasattr(self, 'temporadas'):
            for temporada in self.temporadas.all():
                c = temporada.archivar(via_cascada=True)
                counts = _sum_counts(counts, c)
        return counts

    @transaction.atomic
    def desarchivar(self) -> dict:
        if self._has_active_duplicate():
            raise ValueError("conflicto_unicidad_al_restaurar")

        if self.is_active:
            return {'huertas': 0, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}

        self.is_active = True
        self.archivado_en = None
        self.save(update_fields=['is_active', 'archivado_en'])

        counts = {'huertas': 1, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}
        if hasattr(self, 'temporadas'):
            for temporada in self.temporadas.all():
                c = temporada.desarchivar(via_cascada=True)
                counts = _sum_counts(counts, c)
        return counts


# ────────────── HUERTA RENTADA ─────────────────────────────────────────────
class HuertaRentada(models.Model):
    nombre       = models.CharField(max_length=100)
    ubicacion    = models.CharField(max_length=255)
    variedades   = models.CharField(max_length=255)
    historial    = models.TextField(blank=True, null=True)
    hectareas    = models.FloatField(validators=[MinValueValidator(0.1)])
    propietario  = models.ForeignKey(
        'gestion_huerta.Propietario',
        on_delete=models.CASCADE,
        related_name="huertas_rentadas"
    )
    monto_renta  = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0.01)])

    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('nombre', 'ubicacion', 'propietario')
        ordering = ['id']
        indexes = [
            models.Index(fields=['nombre'], name='idx_hr_nombre'),
            models.Index(fields=['ubicacion'], name='idx_hr_ubicacion'),
            models.Index(fields=['archivado_en'], name='idx_hr_archivado'),
            models.Index(fields=['is_active'], name='idx_hr_is_active'),
            models.Index(fields=['propietario', 'archivado_en'], name='idx_hr_prop_arch'),
        ]

    def __str__(self):
        return f"{self.nombre} (Rentada) ({self.propietario})"

    def _has_active_duplicate(self) -> bool:
        return HuertaRentada.objects.filter(
            archivado_en__isnull=True,
            nombre=self.nombre,
            ubicacion=self.ubicacion,
            propietario=self.propietario
        ).exclude(pk=self.pk).exists()

    @transaction.atomic
    def archivar(self) -> dict:
        if not self.is_active:
            return {'huertas_rentadas': 0, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}

        self.is_active = False
        self.archivado_en = timezone.now()
        self.save(update_fields=['is_active', 'archivado_en'])

        counts = {'huertas_rentadas': 1, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}
        if hasattr(self, 'temporadas'):
            for temporada in self.temporadas.all():
                c = temporada.archivar(via_cascada=True)
                counts = _sum_counts(counts, c)
        return counts

    @transaction.atomic
    def desarchivar(self) -> dict:
        if self._has_active_duplicate():
            raise ValueError("conflicto_unicidad_al_restaurar")

        if self.is_active:
            return {'huertas_rentadas': 0, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}

        self.is_active = True
        self.archivado_en = None
        self.save(update_fields=['is_active', 'archivado_en'])

        counts = {'huertas_rentadas': 1, 'temporadas': 0, 'cosechas': 0, 'inversiones': 0, 'ventas': 0}
        if hasattr(self, 'temporadas'):
            for temporada in self.temporadas.all():
                c = temporada.desarchivar(via_cascada=True)
                counts = _sum_counts(counts, c)
        return counts


# ────────────── TEMPORADA ─────────────────────────────────────────────────
class Temporada(models.Model):
    """
    Una temporada representa un año agrícola de una huerta propia o rentada.
    - Solo una temporada por año por huerta (propia o rentada).
    - Soporta cierre (finalizada) y soft-delete (archivado_en).
    """
    año            = models.PositiveIntegerField()
    huerta         = models.ForeignKey("Huerta", on_delete=models.CASCADE, null=True, blank=True, related_name='temporadas')
    huerta_rentada = models.ForeignKey("HuertaRentada", on_delete=models.CASCADE, null=True, blank=True, related_name='temporadas')

    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin    = models.DateField(null=True, blank=True)
    finalizada   = models.BooleanField(default=False)

    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)
    archivado_por_cascada = models.BooleanField(default=False)

    class Meta:
        ordering = ['-año']
        indexes = [
            models.Index(fields=['año']),
            models.Index(fields=['huerta']),
            models.Index(fields=['huerta_rentada']),
            models.Index(fields=['is_active']),
            models.Index(fields=['finalizada']),
            models.Index(fields=['año', 'huerta']),
            models.Index(fields=['año', 'huerta_rentada']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['año', 'huerta'],
                condition=Q(huerta__isnull=False),
                name='uniq_temporada_anio_huerta'
            ),
            models.UniqueConstraint(
                fields=['año', 'huerta_rentada'],
                condition=Q(huerta_rentada__isnull=False),
                name='uniq_temporada_anio_huerta_rentada'
            ),
        ]

    def clean(self):
        if not self.huerta and not self.huerta_rentada:
            raise ValidationError("Debe asignar una huerta propia o rentada.")
        if self.huerta and self.huerta_rentada:
            raise ValidationError("No puede asignar ambas huertas a la vez.")

    def finalizar(self):
        if not self.finalizada:
            self.finalizada = True
            self.fecha_fin  = timezone.now().date()
            self.save(update_fields=['finalizada', 'fecha_fin'])

    @transaction.atomic
    def archivar(self, via_cascada: bool = False):
        if not self.is_active:
            return {"temporadas": 0, "cosechas": 0, "inversiones": 0, "ventas": 0}

        now = timezone.now()
        self.is_active = False
        self.archivado_en = now
        self.archivado_por_cascada = via_cascada
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])

        counts = {"temporadas": 1, "cosechas": 0, "inversiones": 0, "ventas": 0}
        for c in self.cosechas.all():
            rc = c.archivar(via_cascada=True)
            counts = _sum_counts(counts, rc if isinstance(rc, dict) else {})
        return counts

    @transaction.atomic
    def desarchivar(self, via_cascada: bool = False):
        if via_cascada and not self.archivado_por_cascada:
            return {"temporadas": 0, "cosechas": 0, "inversiones": 0, "ventas": 0}

        if self.is_active:
            return {"temporadas": 0, "cosechas": 0, "inversiones": 0, "ventas": 0}

        self.is_active = True
        self.archivado_en = None
        self.archivado_por_cascada = False
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])

        counts = {"temporadas": 1, "cosechas": 0, "inversiones": 0, "ventas": 0}
        for c in self.cosechas.all():
            rc = c.desarchivar(via_cascada=True)
            counts = _sum_counts(counts, rc if isinstance(rc, dict) else {})
        return counts

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        tipo = "Rentada" if self.huerta_rentada else "Propia"
        return f"{origen} – Temporada {self.año} ({tipo})"


# ────────────── CATEGORÍA DE INVERSIÓN ────────────────────────────────────
class CategoriaInversion(models.Model):
    nombre       = models.CharField(max_length=100)

    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['id']
        indexes  = [models.Index(fields=['nombre'])]

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


# ────────────── COSECHA ───────────────────────────────────────────────────
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
    archivado_por_cascada = models.BooleanField(default=False)

    class Meta:
        ordering = ["-id"]
        unique_together = (("temporada", "nombre"),)
        indexes = [
            models.Index(fields=["nombre"]),
            models.Index(fields=["temporada"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["temporada", "is_active"]),
        ]

    @property
    def total_ventas(self):
        qty   = Cast(F("num_cajas"), DecimalField(max_digits=14, decimal_places=2))
        price = Cast(F("precio_por_caja"), DecimalField(max_digits=14, decimal_places=2))
        expr  = ExpressionWrapper(qty * price, output_field=DecimalField(max_digits=18, decimal_places=2))
        return self.ventas.aggregate(total=Coalesce(Sum(expr), Value(Decimal("0.00"))))["total"]

    @property
    def total_gastos(self):
        gi   = Coalesce(Cast(F("gastos_insumos"), DecimalField(max_digits=18, decimal_places=2)), Value(Decimal("0.00")))
        gm   = Coalesce(Cast(F("gastos_mano_obra"),  DecimalField(max_digits=18, decimal_places=2)), Value(Decimal("0.00")))
        expr = ExpressionWrapper(gi + gm, output_field=DecimalField(max_digits=18, decimal_places=2))
        return self.inversiones.aggregate(total=Coalesce(Sum(expr), Value(Decimal("0.00"))))["total"]

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
            if not (self.nombre or "").strip():
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

    @transaction.atomic
    def archivar(self, via_cascada: bool = False):
        """
        Archiva la cosecha y baja inversiones/ventas con via_cascada=True.
        Si ya estaba inactiva, no toca nada. Devuelve conteos.
        """
        if not self.is_active:
            return {"cosechas": 0, "inversiones": 0, "ventas": 0}

        now = timezone.now()
        self.is_active = False
        self.archivado_en = now
        self.archivado_por_cascada = via_cascada
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])

        inv_count = ven_count = 0
        for inv in self.inversiones.all():
            if inv.archivar(via_cascada=True):
                inv_count += 1
        for v in self.ventas.all():
            if v.archivar(via_cascada=True):
                ven_count += 1

        return {"cosechas": 1, "inversiones": inv_count, "ventas": ven_count}

    @transaction.atomic
    def desarchivar(self, via_cascada: bool = False):
        """
        Desarchiva la cosecha.
        - Si via_cascada=True, SOLO si fue archivada por cascada.
        - Sube inversiones/ventas solo si ellas también fueron cascada.
        """
        if via_cascada and not self.archivado_por_cascada:
            return {"cosechas": 0, "inversiones": 0, "ventas": 0}

        if self.is_active:
            return {"cosechas": 0, "inversiones": 0, "ventas": 0}

        self.is_active = True
        self.archivado_en = None
        self.archivado_por_cascada = False
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])

        inv_count = ven_count = 0
        for inv in self.inversiones.all():
            if inv.desarchivar(via_cascada=True):
                inv_count += 1
        for v in self.ventas.all():
            if v.desarchivar(via_cascada=True):
                ven_count += 1

        return {"cosechas": 1, "inversiones": inv_count, "ventas": ven_count}

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        return f"{self.nombre} – {origen} – Temp {self.temporada.año}"


# ────────────── INVERSIONES ───────────────────────────────────────────────
class InversionesHuerta(models.Model):
    """
    Inversión asociada a una Cosecha. Soporta huerta propia o rentada.
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
    huerta           = models.ForeignKey(Huerta,         on_delete=models.CASCADE, null=True, blank=True)
    huerta_rentada   = models.ForeignKey(HuertaRentada,  on_delete=models.CASCADE, null=True, blank=True)

    is_active        = models.BooleanField(default=True)
    archivado_en     = models.DateTimeField(null=True, blank=True)
    archivado_por_cascada = models.BooleanField(default=False)

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

    # Validaciones de negocio (para creación/edición normal)
    def clean(self):
        errors = {}
        if self.cosecha_id and (not self.cosecha.is_active or self.cosecha.finalizada):
            errors['cosecha'] = 'La cosecha debe estar activa y no finalizada.'
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            errors['temporada'] = 'La temporada debe estar activa y no finalizada.'
        if self.huerta_id and not self.huerta.is_active:
            errors['huerta'] = 'La huerta debe estar activa.'
        if self.huerta_rentada_id and not self.huerta_rentada.is_active:
            errors['huerta_rentada'] = 'La huerta rentada debe estar activa.'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)

    @transaction.atomic
    def archivar(self, via_cascada: bool = False) -> bool:
        if not self.is_active:
            return False
        self.is_active = False
        self.archivado_en = timezone.now()
        self.archivado_por_cascada = via_cascada
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])
        return True

    @transaction.atomic
    def desarchivar(self, via_cascada: bool = False) -> bool:
        if self.is_active:
            return False
        if via_cascada and not self.archivado_por_cascada:
            return False
        self.is_active = True
        self.archivado_en = None
        self.archivado_por_cascada = False
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])
        return True

    def __str__(self):
        origen = self.huerta or self.huerta_rentada
        return f"{self.categoria.nombre} – {self.fecha} – {origen}"


# ────────────── VENTAS ────────────────────────────────────────────────────
class Venta(models.Model):
    """
    Venta asociada a una cosecha. Soporta huerta propia o rentada.
    """
    fecha_venta      = models.DateField()
    num_cajas        = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    precio_por_caja  = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    tipo_mango       = models.CharField(max_length=50)
    descripcion      = models.TextField(blank=True, null=True)
    gasto            = models.PositiveIntegerField(validators=[MinValueValidator(0)])

    cosecha          = models.ForeignKey('gestion_huerta.Cosecha',   on_delete=models.CASCADE, related_name="ventas")
    temporada        = models.ForeignKey('gestion_huerta.Temporada', on_delete=models.CASCADE, related_name="ventas")
    huerta           = models.ForeignKey('gestion_huerta.Huerta',         on_delete=models.CASCADE, null=True, blank=True)
    huerta_rentada   = models.ForeignKey('gestion_huerta.HuertaRentada',  on_delete=models.CASCADE, null=True, blank=True)

    is_active    = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)
    archivado_por_cascada = models.BooleanField(default=False)

    @property
    def total_venta(self) -> int:
        return self.num_cajas * self.precio_por_caja

    @property
    def ganancia_neta(self) -> int:
        return self.total_venta - self.gasto

    def __str__(self) -> str:
        return f"{self.num_cajas} cajas - {self.tipo_mango} – {self.fecha_venta}"

    # Validaciones de negocio (para creación/edición normal)
    def clean(self):
        errors = {}
        if self.cosecha_id and (not self.cosecha.is_active or self.cosecha.finalizada):
            errors['cosecha'] = 'La cosecha debe estar activa y no finalizada.'
        if self.temporada_id and (not self.temporada.is_active or self.temporada.finalizada):
            errors['temporada'] = 'La temporada debe estar activa y no finalizada.'
        if self.huerta_id and not self.huerta.is_active:
            errors['huerta'] = 'La huerta debe estar activa.'
        if self.huerta_rentada_id and not self.huerta_rentada.is_active:
            errors['huerta_rentada'] = 'La huerta rentada debe estar activa.'
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if not _is_only_archival_fields(update_fields):
            self.full_clean()
        return super().save(*args, **kwargs)

    @transaction.atomic
    def archivar(self, via_cascada: bool = False) -> bool:
        if not self.is_active:
            return False
        self.is_active = False
        self.archivado_en = timezone.now()
        self.archivado_por_cascada = via_cascada
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])
        return True

    @transaction.atomic
    def desarchivar(self, via_cascada: bool = False) -> bool:
        if self.is_active:
            return False
        if via_cascada and not self.archivado_por_cascada:
            return False
        self.is_active = True
        self.archivado_en = None
        self.archivado_por_cascada = False
        self.save(update_fields=["is_active", "archivado_en", "archivado_por_cascada"])
        return True
