NOTIFICATION_MESSAGES = {
    # Autenticación
    "login_success": {
        "message": "Inicio de sesión exitoso",
        "type": "success",
        "action": "redirect",
        "target": "/dashboard"
    },
    "password_change_required": {
        "message": "Debe cambiar su contraseña antes de continuar",
        "type": "warning",
        "action": "redirect",
        "target": "/change-password"
    },
    "logout_success": {
        "message": "Sesión cerrada correctamente",
        "type": "info",
        "action": "redirect",
        "target": "/login"
    },
    
    # Operaciones CRUD
    "create_success": {
        "message": "Registro creado exitosamente",
        "type": "success"
    },
    "update_success": {
        "message": "Actualización realizada con éxito",
        "type": "success"
    },
    "delete_success": {
        "message": "Eliminación completada",
        "type": "success"
    },
    
    # Errores
    "validation_error": {
        "message": "Por favor, corrige los errores en los campos",
        "type": "error"
    },
    "permission_denied": {
        "message": "No tienes permisos para realizar esta acción",
        "type": "error",
        "code": 403
    }
}