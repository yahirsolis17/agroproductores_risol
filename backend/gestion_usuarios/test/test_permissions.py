from django.test import TestCase
from rest_framework.test import APIRequestFactory
from gestion_usuarios.permissions import IsAdmin, IsSelfOrAdmin
from gestion_usuarios.models import Users

class PermissionsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = Users.objects.create_superuser(
            telefono='0000000000', password='p', nombre='A', apellido='A'
        )
        self.user  = Users.objects.create_user(
            telefono='1111111111', password='p', nombre='B', apellido='B'
        )

    def test_is_admin(self):
        req = self.factory.get('/')
        req.user = self.admin
        self.assertTrue(IsAdmin().has_permission(req, None))
        req.user = self.user
        self.assertFalse(IsAdmin().has_permission(req, None))

    def test_is_self_or_admin(self):
        perm = IsSelfOrAdmin()
        # usuario sobre sí mismo
        req = self.factory.get('/')
        req.user = self.user
        self.assertTrue(perm.has_object_permission(req, None, self.user))
        # admin sobre cualquier usuario
        req.user = self.admin
        self.assertTrue(perm.has_object_permission(req, None, self.user))
        # user normal sobre otro usuario
        another = Users.objects.create_user(
            telefono='2222222222', password='p', nombre='C', apellido='C'
        )
        req.user = self.user
        self.assertFalse(perm.has_object_permission(req, None, another))
