# gestion_usuarios/tests/test_utils_extra.py
import unittest
from unittest.mock import patch
from gestion_usuarios.utils.audit import AuditMixin
from gestion_usuarios.models import Users


class DummyReq:
    """Objeto request minimal para el mixin."""
    def __init__(self):
        self.META = {
            "REMOTE_ADDR": "127.0.0.1",
            "HTTP_USER_AGENT": "pytest‑bot",
        }


class AuditMixinTests(unittest.TestCase):
    def setUp(self):
        self.user_admin = Users.objects.create_superuser(
            telefono="9000000000",
            password="p",
            nombre="Root",
            apellido="Admin",
        )
        self.mixin = AuditMixin()

    def test_audit_mixin_calls_registrar(self):
        with patch("gestion_usuarios.utils.audit.registrar_actividad") as mocked:
            self.mixin.audit(DummyReq(), self.user_admin, "Acción X", "Detalle Y")
            mocked.assert_called_once()           # ✅ ahora sí se registra


if __name__ == "__main__":
    unittest.main()
