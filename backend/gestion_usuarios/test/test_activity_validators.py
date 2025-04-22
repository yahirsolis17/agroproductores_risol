import unittest
from gestion_usuarios.utils.activity import registrar_actividad
from gestion_usuarios.validators import validate_nombre
from gestion_usuarios.models import Users

class ActivityValidatorsTests(unittest.TestCase):
    def test_registrar_actividad_no_explode(self):
        u = Users.objects.create_user(
            telefono="1231231234", password="p",
            nombre="Foo", apellido="Bar"
        )
        # No debe lanzar excepción
        registrar_actividad(u, "Prueba", "Algo")

    def test_validate_nombre_fail(self):
        with self.assertRaises(Exception):
            validate_nombre("1234", field_name="nombre")
