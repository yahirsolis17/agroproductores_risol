from __future__ import annotations

from typing import Iterable

from django.core.management.base import BaseCommand
from django.apps import apps as django_apps
from django.contrib.auth.management import create_permissions

from gestion_usuarios.signals import ALLOWED_APPS, _ensure_permissions_for_model
from gestion_usuarios.permissions_policy import MODEL_CAPABILITIES


class Command(BaseCommand):
    help = (
        "Regenera permisos de Django (add/change/delete/view) y garantiza "
        "permisos personalizados (archive/restore/finalize/reactivate/exportpdf/exportexcel) "
        "para modelos de las apps de dominio."
    )

    def handle(self, *args, **options):
        # 1) Ejecuta generador nativo de permisos por cada app
        for app_config in django_apps.get_app_configs():
            create_permissions(app_config, verbosity=1)

        # 2) Crea/garantiza permisos personalizados según policy declarativa
        for (app_label, _model) in sorted(MODEL_CAPABILITIES.keys()):
            app_config = django_apps.get_app_config(app_label)
            for model in app_config.get_models():
                if model._meta.model_name != _model:
                    continue
                codenames = _ensure_permissions_for_model(model)
                if codenames:
                    self.stdout.write(self.style.SUCCESS(
                        f"OK {app_label}.{model.__name__}: {', '.join(codenames)}"
                    ))

        self.stdout.write(self.style.SUCCESS("Permisos regenerados correctamente."))
