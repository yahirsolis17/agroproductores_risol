# gestion_huerta/migrations/0013_add_custom_permissions.py
from django.db import migrations

def create_custom_perms(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission  = apps.get_model('auth', 'Permission')

    app_label = 'gestion_huerta'

    # Mapea cada modelo a la lista de codenames de permisos a crear
    perms_by_model = {
        # CRUD ya existen; agregamos de negocio:
        'huerta': [
            ('archive_huerta',   'Puede archivar Huerta'),
            ('restore_huerta',   'Puede restaurar Huerta'),
        ],
        'huertarentada': [
            ('archive_huertarentada', 'Puede archivar Huerta Rentada'),
            ('restore_huertarentada', 'Puede restaurar Huerta Rentada'),
        ],
        'propietario': [
            ('archive_propietario', 'Puede archivar Propietario'),
            ('restore_propietario', 'Puede restaurar Propietario'),
        ],
        'temporada': [
            ('archive_temporada',    'Puede archivar Temporada'),
            ('restore_temporada',    'Puede restaurar Temporada'),
            ('finalize_temporada',   'Puede finalizar Temporada'),
            ('reactivate_temporada', 'Puede reactivar Temporada'),
        ],
        'cosecha': [
            ('archive_cosecha',    'Puede archivar Cosecha'),
            ('restore_cosecha',    'Puede restaurar Cosecha'),
            ('finalize_cosecha',   'Puede finalizar Cosecha'),
            ('reactivate_cosecha', 'Puede reactivar Cosecha'),
        ],
        'inversioneshuerta': [
            ('archive_inversioneshuerta', 'Puede archivar Inversión'),
            ('restore_inversioneshuerta', 'Puede restaurar Inversión'),
        ],
        'categoriainversion': [
            ('archive_categoriainversion', 'Puede archivar Categoría de Inversión'),
            ('restore_categoriainversion', 'Puede restaurar Categoría de Inversión'),
        ],
        'venta': [
            ('archive_venta', 'Puede archivar Venta'),
            ('restore_venta', 'Puede restaurar Venta'),
        ],
    }

    for model, pairs in perms_by_model.items():
        try:
            ct = ContentType.objects.get(app_label=app_label, model=model)
        except ContentType.DoesNotExist:
            continue

        for codename, name in pairs:
            Permission.objects.get_or_create(
                content_type=ct,
                codename=codename,
                defaults={'name': name},
            )

def delete_custom_perms(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission  = apps.get_model('auth', 'Permission')

    app_label = 'gestion_huerta'

    all_codenames = [
        # Huerta
        'archive_huerta', 'restore_huerta',
        # HuertaRentada
        'archive_huertarentada', 'restore_huertarentada',
        # Propietario
        'archive_propietario', 'restore_propietario',
        # Temporada
        'archive_temporada', 'restore_temporada',
        'finalize_temporada', 'reactivate_temporada',
        # Cosecha
        'archive_cosecha', 'restore_cosecha',
        'finalize_cosecha', 'reactivate_cosecha',
        # Inversiones
        'archive_inversioneshuerta', 'restore_inversioneshuerta',
        # Categoría inversión
        'archive_categoriainversion', 'restore_categoriainversion',
        # Venta
        'archive_venta', 'restore_venta',
    ]

    try:
        ct_ids = list(
            ContentType.objects.filter(app_label=app_label).values_list('id', flat=True)
        )
        Permission.objects.filter(
            content_type_id__in=ct_ids,
            codename__in=all_codenames
        ).delete()
    except Exception:
        pass

class Migration(migrations.Migration):

    dependencies = [
        ('gestion_huerta', '0012_alter_propietario_telefono'),  # ajusta al último de tu app
        ('contenttypes', '0002_remove_content_type_name'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(create_custom_perms, delete_custom_perms),
    ]
