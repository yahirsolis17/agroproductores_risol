from __future__ import annotations

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Permission
from gestion_usuarios.permissions_policy import MODEL_CAPABILITIES, is_codename_allowed


class Command(BaseCommand):
    help = (
        "Elimina de la base de datos los permisos que no estén contemplados en la policy. "
        "Por seguridad, sólo afecta a apps del dominio y no toca CRUD si el modelo no está en policy."
    )

    def handle(self, *args, **options):
        to_delete = []
        qs = Permission.objects.select_related('content_type').all()
        domain_apps = {app for (app, _) in MODEL_CAPABILITIES.keys()}
        for p in qs:
            app = p.content_type.app_label
            model = p.content_type.model
            code = p.codename
            if app not in domain_apps:
                continue
            if (app, model) not in MODEL_CAPABILITIES:
                # Conserva CRUD aunque el modelo no esté declarado; evita borrar algo legítimo
                if code.startswith(('add_', 'change_', 'delete_', 'view_')):
                    continue
                to_delete.append(p.id)
                continue
            if not is_codename_allowed(app, model, code):
                to_delete.append(p.id)

        if not to_delete:
            self.stdout.write(self.style.SUCCESS("No hay permisos por podar."))
            return

        deleted = Permission.objects.filter(id__in=to_delete).delete()
        self.stdout.write(self.style.WARNING(f"Permisos eliminados (count, breakdown): {deleted}"))

