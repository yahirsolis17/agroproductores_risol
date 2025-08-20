from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_huerta.models import Propietario, Huerta


class ArchiveRestorePermissionTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="1234567890",
            password="pass",
            nombre="Normal",
            apellido="User",
            role="usuario",
        )
        # Usuario con permisos básicos de ver/agregar huertas
        for codename in ["view_huerta", "add_huerta"]:
            perm = Permission.objects.get(codename=codename)
            self.user.user_permissions.add(perm)

        self.propietario = Propietario.objects.create(
            nombre="Juan",
            apellidos="Pérez",
            telefono="1111111111",
            direccion="Calle 1",
        )
        self.huerta = Huerta.objects.create(
            nombre="Mi huerta",
            ubicacion="Ubic",
            variedades="Var",
            hectareas=1.0,
            propietario=self.propietario,
        )

    def test_user_without_archive_permission_cannot_archive(self):
        self.client.force_authenticate(self.user)
        url = reverse("huerta:huerta-archivar", args=[self.huerta.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_archive_permission_can_archive(self):
        perm = Permission.objects.get(codename="archive_huerta")
        self.user.user_permissions.add(perm)
        self.client.force_authenticate(self.user)
        url = reverse("huerta:huerta-archivar", args=[self.huerta.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.huerta.refresh_from_db()
        self.assertFalse(self.huerta.is_active)

    def test_user_without_restore_permission_cannot_restore(self):
        self.huerta.is_active = False
        self.huerta.save(update_fields=["is_active"])
        self.client.force_authenticate(self.user)
        url = reverse("huerta:huerta-restaurar", args=[self.huerta.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_restore_permission_can_restore(self):
        self.huerta.is_active = False
        self.huerta.save(update_fields=["is_active"])
        perm = Permission.objects.get(codename="restore_huerta")
        self.user.user_permissions.add(perm)
        self.client.force_authenticate(self.user)
        url = reverse("huerta:huerta-restaurar", args=[self.huerta.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.huerta.refresh_from_db()
        self.assertTrue(self.huerta.is_active)

