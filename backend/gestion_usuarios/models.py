from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.core.validators import RegexValidator
from django.utils import timezone


class Role(models.TextChoices):
    ADMIN = "admin", "Administrador"
    USER = "usuario", "Usuario"


class CustomUserManager(BaseUserManager):
    def create_user(self, telefono, password=None, **extra_fields):
        if not telefono:
            raise ValueError("El número de teléfono es obligatorio.")
        extra_fields.setdefault("is_active", True)
        user = self.model(telefono=telefono, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, telefono, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(telefono, password, **extra_fields)


class Users(AbstractBaseUser, PermissionsMixin):
    nombre = models.CharField(max_length=255)
    apellido = models.CharField(max_length=255)
    telefono = models.CharField(
        max_length=10,
        unique=True,
        validators=[RegexValidator(r"^\d{10}$", message="Debe tener 10 dígitos")],
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)

    # --- Soft-delete & staff ---
    is_active = models.BooleanField(default=True)
    archivado_en = models.DateTimeField(null=True, blank=True)           # 👈 NUEVO
    is_staff = models.BooleanField(default=False)

    # --- Otros flags ---
    intentos_fallidos = models.IntegerField(default=0)
    must_change_password = models.BooleanField(default=False)

    USERNAME_FIELD = "telefono"
    REQUIRED_FIELDS = ["nombre", "apellido"]

    objects = CustomUserManager()

    # ----- Métodos utilitarios -----
    def __str__(self):
        return f"{self.nombre} {self.apellido}"

    def __repr__(self):
        return f"<User {self.telefono} - {self.role}>"

    @property
    def is_admin(self):
        return self.role == Role.ADMIN

    def get_full_name(self):
        return f"{self.nombre} {self.apellido}"

    def get_short_name(self):
        return self.nombre

    # ---------- Soft-delete helpers ----------
    def archivar(self):
        """Marca el usuario como inactivo y registra fecha de archivado."""
        if self.is_active:
            self.is_active = False
            self.archivado_en = timezone.now()
            self.save(update_fields=["is_active", "archivado_en"])

    def desarchivar(self):
        """Restaura un usuario previamente archivado."""
        if not self.is_active:
            self.is_active = True
            self.archivado_en = None
            self.save(update_fields=["is_active", "archivado_en"])


class RegistroActividad(models.Model):
    usuario = models.ForeignKey(Users, on_delete=models.CASCADE)
    accion = models.CharField(max_length=255)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    detalles = models.TextField(null=True, blank=True)
