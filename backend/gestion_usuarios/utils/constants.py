NOTIFICATION_MESSAGES = {
    # --- Autenticación ---
    "login_success": {
        "message": "Inicio de sesión exitoso back",
        "type": "success",
        "action": "redirect",
        "target": "/dashboard"
    },
    "logout_success": {
        "message": "Sesión cerrada correctamente back",
        "type": "info",
        "action": "redirect",
        "target": "/login"
    },
    "password_change_required": {
        "message": "Debe cambiar su contraseña antes de continuar back",
        "type": "warning",
        "action": "redirect",
        "target": "/change-password"
    },

    # --- Usuario ---
    "register_success": {
        "message": "Usuario registrado exitosamente back",
        "type": "success",
        "action": "redirect",
        "target": "/dashboard"
    },
    "password_change_success": {
        "message": "Contraseña actualizada correctamente back",
        "type": "success",
        "action": "redirect",
        "target": "/dashboard"
    },
    "permission_update_success": {
        "message": "Permisos actualizados correctamente back",
        "type": "success",
        "action": "redirect",
        "target": "/user-permissions"
    },
    # --- CRUD generales ---
    "create_success": {
        "message": "Registro creado exitosamente back",
        "type": "success"
    },
    "update_success": {
        "message": "Actualización realizada con éxito back",
        "type": "success"
    },
    "delete_success": {
        "message": "Eliminación completada back",
        "type": "success"
    },

    # --- Errores ---
    "validation_error": {
        "message": "Por favor, corrige los errores en los campos back",
        "type": "error"
    },
    "permission_denied": {
        "message": "No tienes permisos para realizar esta acción back",
        "type": "error",
        "code": 403
    },
    "server_error": {
        "message": "Ha ocurrido un error en el servidor back",
        "type": "error",
        "code": 500
    }
}
