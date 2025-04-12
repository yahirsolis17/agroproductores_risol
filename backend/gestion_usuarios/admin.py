# gestion_usuarios/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import Users

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = Users
        fields = ('telefono', 'nombre', 'apellido', 'is_staff')

class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = Users
        fields = ('telefono', 'nombre', 'apellido', 'is_staff')

class CustomUserAdmin(BaseUserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    list_display = ('telefono', 'nombre', 'apellido', 'is_active', 'is_staff')
    list_filter = ('is_active', 'is_staff')
    fieldsets = (
        (None, {'fields': ('telefono', 'password')}),
        ('Información personal', {'fields': ('nombre', 'apellido')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('telefono', 'nombre', 'apellido', 'password1', 'password2', 'is_active', 'is_staff', 'groups', 'user_permissions'),
        }),
    )
    search_fields = ('telefono', 'nombre', 'apellido')
    ordering = ('telefono',)
    filter_horizontal = ('groups', 'user_permissions')

admin.site.register(Users, CustomUserAdmin)
