from gestion_usuarios.utils.activity import registrar_actividad


class ViewSetAuditMixin:
    """
    Añade auditoría automática a los métodos *create* / *update* / *destroy*
    de cualquier `ModelViewSet`.

    • Registra IP y User-Agent.  
    • Permite personalizar los textos con los atributos
      `audit_create_fmt`, `audit_update_fmt`, `audit_delete_fmt`.
    """

    # Textos por defecto ── usa `{obj}` como placeholder.
    audit_create_fmt = "Creó {obj}"
    audit_update_fmt = "Actualizó {obj}"
    audit_delete_fmt = "Eliminó {obj}"

    # ───────── helpers internos ─────────
    def _audit_msg(self, fmt: str, obj, detalles: str | None = None):
        registrar_actividad(
            usuario=self.request.user,
            accion=fmt.format(obj=obj),
            detalles=detalles,
            ip=self.request.META.get("REMOTE_ADDR"),
        )

    # ───────── hooks de DRF ─────────
    def perform_create(self, serializer):
        instance = serializer.save()
        self._audit_msg(self.audit_create_fmt, instance)
        return instance                                           # devuelve el objeto por consistencia

    def perform_update(self, serializer):
        # 1) Estado previo
        instance = self.get_object()
        prev = {f: getattr(instance, f) for f in serializer.validated_data.keys()}

        # 2) Guardar cambios
        instance = serializer.save()

        # 3) Estado posterior
        post = {f: getattr(instance, f) for f in serializer.validated_data.keys()}

        # 4) Construir lista de cambios
        diffs = []
        for field, old in prev.items():
            new = post[field]
            if old != new:
                diffs.append(f"{field}: '{old}' → '{new}'")
        detalles = "; ".join(diffs) if diffs else None

        # 5) Registrar con detalles
        self._audit_msg(self.audit_update_fmt, str(instance), detalles=detalles)
        return instance

    def perform_destroy(self, instance):
        name = str(instance)                                      # conservamos el nombre para el log
        instance.delete()
        self._audit_msg(self.audit_delete_fmt, name)
