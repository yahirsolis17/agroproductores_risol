# Generated by Django 5.0.6 on 2025-04-30 07:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion_huerta', '0003_propietario_archivado_en_propietario_is_active_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='huerta',
            name='archivado_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='huerta',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
