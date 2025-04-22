# gestion_usuarios/tests/test_validators_utils.py
import pytest
from gestion_usuarios.validators import validate_telefono, validate_nombre
from gestion_usuarios.utils.notification_handler import NotificationHandler

def test_validate_telefono_ok():
    assert validate_telefono("1234567890") == "1234567890"

def test_validate_telefono_fail():
    with pytest.raises(Exception):
        validate_telefono("abc")

def test_notification_handler_default():
    resp = NotificationHandler.generate_response("nonexistent_key")
    assert resp.data["success"] is True
